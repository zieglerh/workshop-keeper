import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  // Check if we're using Neon vs regular PostgreSQL
  const isNeonDatabase = process.env.DATABASE_URL?.includes('wss://') || 
                         process.env.DATABASE_URL?.includes('neon.tech') ||
                         process.env.DATABASE_URL?.includes('pooler.neon');
  
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && isNeonDatabase,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Login attempt for username: ${username}`);
    
    if (!username || !password) {
      console.log("Missing username or password");
      return res.status(400).json({ message: "Benutzername und Passwort sind erforderlich" });
    }

    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }

      console.log(`User found: ${user.id}, checking password...`);
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      console.log(`Password valid: ${isValidPassword}`);
      
      if (!isValidPassword) {
        console.log("Invalid password");
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }

      // Check if user is pending approval
      if (user.role === 'pending') {
        console.log(`User ${username} is pending approval`);
        return res.status(403).json({ message: "Ihr Konto wartet noch auf Admin-Freischaltung" });
      }

      // Set session
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      console.log(`Login successful for ${username}`);
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ message: "Anmeldung fehlgeschlagen" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Abmeldung fehlgeschlagen" });
      }
      res.json({ success: true });
    });
  });

  // Public registration endpoint (creates inactive users)
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Benutzername und Passwort sind erforderlich" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Benutzername bereits vergeben" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create inactive user (pending admin approval)
      const newUser = await storage.createUser({
        username,
        passwordHash,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'pending', // Special role for pending approval
      });

      res.json({ 
        success: true, 
        message: "Registrierung erfolgreich. Warten auf Admin-Freischaltung.",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registrierung fehlgeschlagen" });
    }
  });

  // Admin endpoint to approve/activate users
  app.patch("/api/users/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const currentUser = (req.session as any).user;
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Nur Administratoren können Benutzer freischalten" });
      }

      const { role = 'user' } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Ungültige Rolle" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json({ 
        success: true, 
        user: updatedUser,
        message: "Benutzer erfolgreich freigeschaltet" 
      });
    } catch (error) {
      console.error("User activation error:", error);
      res.status(500).json({ message: "Benutzer-Freischaltung fehlgeschlagen" });
    }
  });

  // Profile endpoints
  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const currentUser = (req.session as any).user;
      const { firstName, lastName, email } = req.body;
      
      const updatedUser = await storage.updateUserProfile(currentUser.id, {
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
      });
      
      res.json({ 
        success: true, 
        user: updatedUser,
        message: "Profil erfolgreich aktualisiert" 
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Profil-Aktualisierung fehlgeschlagen" });
    }
  });

  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const currentUser = (req.session as any).user;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Aktuelles und neues Passwort sind erforderlich" });
      }

      // Get full user data to verify current password
      const user = await storage.getUser(currentUser.id);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash!);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Aktuelles Passwort ist falsch" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await storage.updateUserPassword(currentUser.id, newPasswordHash);
      
      res.json({ 
        success: true,
        message: "Passwort erfolgreich geändert" 
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Passwort-Änderung fehlgeschlagen" });
    }
  });

  app.delete("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const currentUser = (req.session as any).user;
      
      // Don't allow deleting the last admin
      if (currentUser.role === 'admin') {
        const allAdmins = await storage.getUsersByRole('admin');
        if (allAdmins.length <= 1) {
          return res.status(400).json({ message: "Der letzte Administrator kann nicht gelöscht werden" });
        }
      }
      
      await storage.deleteUser(currentUser.id);
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
      });
      
      res.json({ 
        success: true,
        message: "Konto erfolgreich gelöscht" 
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Konto-Löschung fehlgeschlagen" });
    }
  });

  // Create default admin user if none exists
  try {
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await storage.createUser({
        username: 'admin',
        passwordHash,
        email: 'admin@werkstatt.de',
        firstName: 'Workshop',
        lastName: 'Administrator',
        role: 'admin',
      });
      console.log('Default admin user created: admin / admin123');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = (req.session as any)?.user;
  
  if (!user) {
    return res.status(401).json({ message: "Nicht authentifiziert" });
  }

  req.user = user;
  next();
};