import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertCategorySchema,
  insertInventoryItemSchema,
  insertPurchaseSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ 
        success: true,
        message: "Erfolgreich abgemeldet" 
      });
    });
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!role || !['admin', 'user', 'pending'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Error updating user role" });
    }
  });

  // Update user profile (admin only)
  app.patch("/api/users/:id/profile", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { firstName, lastName, email, username } = req.body;
      
      // Check if username is already taken (if username is being changed)
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      const updatedUser = await storage.updateUserProfile(req.params.id, {
        firstName,
        lastName,
        email,
        username,
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Change user password (admin only)
  app.patch("/api/users/:id/password", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      await storage.updateUserPassword(req.params.id, password);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ message: "Error updating user password" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { username, firstName, lastName, email, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const newUser = await storage.createUser({
        username,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        password,
        role: role || 'user',
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // Get pending users (admin only)
  app.get("/api/users/pending", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin-Zugriff erforderlich" });
      }
      
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Fehler beim Abrufen wartender Benutzer" });
    }
  });



  // Delete user by admin
  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin-Zugriff erforderlich" });
      }

      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Don't allow deleting the last admin
      if (userToDelete.role === 'admin') {
        const allAdmins = await storage.getUsersByRole('admin');
        if (allAdmins.length <= 1) {
          return res.status(400).json({ message: "Der letzte Administrator kann nicht gelöscht werden" });
        }
      }

      // Don't allow deleting self
      if (req.params.id === currentUser?.id) {
        return res.status(400).json({ message: "Sie können sich nicht selbst löschen" });
      }
      
      await storage.deleteUser(req.params.id);
      res.json({ message: "Benutzer erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Borrowing routes
  app.post("/api/inventory/:id/borrow", isAuthenticated, async (req: any, res) => {
    try {
      await storage.borrowItem(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error borrowing item:", error);
      res.status(500).json({ message: "Failed to borrow item" });
    }
  });

  app.post("/api/inventory/:id/return", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.returnItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error returning item:", error);
      res.status(500).json({ message: "Failed to return item" });
    }
  });

  app.get("/api/borrowing", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      let history;
      
      if (currentUser?.role === 'admin') {
        history = await storage.getBorrowingHistory();
      } else {
        history = await storage.getUserBorrowingHistory(req.user.id);
      }
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching borrowing history:", error);
      res.status(500).json({ message: "Failed to fetch borrowing history" });
    }
  });

  // Purchase routes
  app.post("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const purchase = await storage.purchaseItem(purchaseData);
      res.json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      let purchases;
      
      if (currentUser?.role === 'admin') {
        purchases = await storage.getAllPurchases();
      } else {
        purchases = await storage.getUserPurchases(req.user.id);
      }
      
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Statistics route
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Health check endpoint for Docker
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}