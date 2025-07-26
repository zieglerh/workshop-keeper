import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
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
      secure: false, // Set to false for local development
      maxAge: sessionTtl,
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Simple login endpoint for local development
  app.post("/api/login", async (req, res) => {
    const { username, role = 'admin' } = req.body;
    
    try {
      // Create or get user
      let user = await storage.getUserByEmail(username || 'admin@localhost');
      if (!user) {
        user = await storage.upsertUser({
          id: '1',
          email: username || 'admin@localhost',
          firstName: 'Local',
          lastName: 'Admin',
          profileImageUrl: null,
        });
        // Update role for local development
        user = await storage.updateUserRole(user.id, role);
      }

      // Set session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`.trim(),
      };

      res.json({ success: true, user });
    } catch (error) {
      console.error("Local login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Auto-login for local development
  app.get("/api/login", async (req, res) => {
    try {
      // Auto-create admin user for local development
      let user = await storage.getUserByEmail('admin@localhost');
      if (!user) {
        user = await storage.upsertUser({
          id: '1',
          email: 'admin@localhost',
          firstName: 'Local',
          lastName: 'Admin',
          profileImageUrl: null,
        });
        // Set as admin for local development  
        user = await storage.updateUserRole(user.id, 'admin');
      }

      // Set session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`.trim(),
      };

      res.redirect("/");
    } catch (error) {
      console.error("Auto-login error:", error);
      res.status(500).json({ message: "Auto-login failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request for compatibility
  (req as any).user = {
    claims: {
      sub: user.id
    }
  };

  next();
};