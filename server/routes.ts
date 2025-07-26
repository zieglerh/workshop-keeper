import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated as replitAuth } from "./replitAuth";
import { setupLocalAuth, isAuthenticated as localAuth } from "./localAuth";
import {
  insertCategorySchema,
  insertInventoryItemSchema,
  insertPurchaseSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - use local auth for Docker environment
  const isLocalDevelopment = process.env.NODE_ENV === 'production' && 
    process.env.DATABASE_URL?.includes('localhost') || 
    process.env.DATABASE_URL?.includes('db:5432');
  
  if (isLocalDevelopment) {
    await setupLocalAuth(app);
  } else {
    await setupAuth(app);
  }

  const authMiddleware = isLocalDevelopment ? localAuth : replitAuth;

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.patch("/api/users/:id/role", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Category routes
  app.get("/api/categories", authMiddleware, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.patch("/api/categories/:id", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.delete("/api/categories/:id", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", authMiddleware, async (req, res) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", authMiddleware, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  app.post("/api/inventory", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch("/api/inventory/:id", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/inventory/:id", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteInventoryItem(req.params.id);
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Borrowing routes
  app.post("/api/inventory/:id/borrow", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;
      
      const item = await storage.getInventoryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!item.isAvailable) {
        return res.status(400).json({ message: "Item is not available for borrowing" });
      }

      await storage.borrowItem(itemId, userId);
      res.json({ message: "Item borrowed successfully" });
    } catch (error) {
      console.error("Error borrowing item:", error);
      res.status(500).json({ message: "Failed to borrow item" });
    }
  });

  app.post("/api/inventory/:id/return", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const itemId = req.params.id;
      
      const item = await storage.getInventoryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Allow admin to return any item, or user to return their own borrowed item
      if (currentUser?.role !== 'admin' && item.currentBorrowerId !== req.user.claims.sub) {
        return res.status(403).json({ message: "You can only return items you borrowed" });
      }

      await storage.returnItem(itemId);
      res.json({ message: "Item returned successfully" });
    } catch (error) {
      console.error("Error returning item:", error);
      res.status(500).json({ message: "Failed to return item" });
    }
  });

  app.get("/api/borrowing-history", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      let history;
      
      if (currentUser?.role === 'admin') {
        history = await storage.getBorrowingHistory();
      } else {
        history = await storage.getUserBorrowingHistory(req.user.claims.sub);
      }
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching borrowing history:", error);
      res.status(500).json({ message: "Failed to fetch borrowing history" });
    }
  });

  // Purchase routes
  app.post("/api/inventory/:id/purchase", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;
      const { quantity = 1 } = req.body;

      const item = await storage.getInventoryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (!item.isPurchasable) {
        return res.status(400).json({ message: "Item is not purchasable" });
      }

      if (!item.stockQuantity || item.stockQuantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      if (!item.pricePerUnit) {
        return res.status(400).json({ message: "Item price not set" });
      }

      const pricePerUnit = parseFloat(item.pricePerUnit);
      const totalPrice = pricePerUnit * quantity;

      const purchaseData = {
        itemId,
        userId,
        quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: totalPrice.toString(),
      };

      const purchase = await storage.purchaseItem(purchaseData);
      res.json(purchase);
    } catch (error) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ message: "Failed to purchase item" });
    }
  });

  app.get("/api/purchases", authMiddleware, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      let purchases;
      
      if (currentUser?.role === 'admin') {
        purchases = await storage.getAllPurchases();
      } else {
        purchases = await storage.getUserPurchases(req.user.claims.sub);
      }
      
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Statistics route
  app.get("/api/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
