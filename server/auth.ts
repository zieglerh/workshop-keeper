import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
    
    if (!username || !password) {
      return res.status(400).json({ message: "Benutzername und Passwort sind erforderlich" });
    }

    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
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

  // Register endpoint (only for admins to create new users)
  app.post("/api/register", isAuthenticated, async (req, res) => {
    try {
      const currentUser = (req.session as any).user;
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Nur Administratoren können neue Benutzer erstellen" });
      }

      const { username, password, email, firstName, lastName, role = 'user' } = req.body;
      
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

      // Create user
      const newUser = await storage.createUser({
        username,
        passwordHash,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      });

      res.json({ 
        success: true, 
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registrierung fehlgeschlagen" });
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