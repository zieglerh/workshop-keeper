import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Wait for database connection before starting
  async function waitForDatabase(maxRetries = 10, delay = 5000) {
    const { storage } = await import("./storage");
    for (let i = 0; i < maxRetries; i++) {
      try {
        await storage.getAllUsers();
        log('✅ Database connection established');
        return true;
      } catch (error) {
        log(`⏳ Waiting for database connection... (${i + 1}/${maxRetries})`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error('Failed to connect to database after maximum retries');
  }

  try {
    // Wait for database to be ready
    await waitForDatabase();
    
    // Create default admin user if it doesn't exist
    try {
      const { storage } = await import("./storage");
      const bcrypt = await import("bcrypt");
      
      const existingAdmin = await storage.getUserByUsername('admin');
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        await storage.createUser({
          username: 'admin',
          passwordHash,
          email: 'admin@workshop.local',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
        });
        log('✅ Default admin user created: admin/admin123');
      } else {
        log('✅ Default admin user already exists');
      }
    } catch (error) {
      console.error('Error creating default admin user:', error);
    }

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`Database: ${process.env.DATABASE_URL?.includes('neon') ? 'Neon' : 'PostgreSQL'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
