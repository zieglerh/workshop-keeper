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
import type { Request, Response } from "express";
import { upload, deleteUploadedFile } from "./upload";
import { sendBorrowNotification, sendPurchaseNotification, sendUserRegistrationNotification } from "./emailService";
import { downloadImageFromUrl, isValidImageUrl } from "./imageDownloader";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    // Add proper headers for images
    res.header('Cache-Control', 'public, max-age=31536000');
    next();
  });

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

  // Profile image upload
  app.post('/api/users/:id/upload-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      
      // Users can upload their own image, admins can upload for anyone
      if (req.params.id !== req.user.id && currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Permission denied" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const imagePath = req.file.path;
      
      // Get current user to delete old image
      const userToUpdate = await storage.getUser(req.params.id);
      if (userToUpdate?.profileImagePath) {
        deleteUploadedFile(userToUpdate.profileImagePath);
      }

      // Update user with new image path
      const updatedUser = await storage.updateUserProfile(req.params.id, {
        profileImagePath: imagePath,
      });

      res.json({ 
        success: true, 
        imagePath,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Error uploading image" });
    }
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

      const { username, firstName, lastName, email, phone, password, role } = req.body;
      
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
        phone: phone || null,
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

  // Image download route
  app.post("/api/download-image", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      if (!isValidImageUrl(imageUrl)) {
        return res.status(400).json({ message: "Invalid image URL" });
      }

      console.log('Downloading image from URL:', imageUrl);
      const result = await downloadImageFromUrl(imageUrl);
      
      if (result.success) {
        res.json({ 
          success: true, 
          localPath: result.localPath,
          message: "Image downloaded successfully"
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || "Failed to download image"
        });
      }
    } catch (error) {
      console.error("Error in image download:", error);
      res.status(500).json({ message: "Failed to download image" });
    }
  });

  // Google Shopping search route
  app.post("/api/search-google-shopping", isAuthenticated, async (req: Request & { user: any }, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const { searchGoogleShopping } = await import('./googleShopping');
      const results = await searchGoogleShopping(query);
      
      console.log('Sending results to frontend:', { results });
      res.json({ results });
    } catch (error) {
      console.error("Error searching Google Shopping:", error);
      res.status(500).json({ message: "Failed to search Google Shopping" });
    }
  });

  // Google Shopping Product Details route
  app.post("/api/get-product-details", isAuthenticated, async (req: Request & { user: any }, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const { getProductDetails } = await import('./googleShopping');
      const details = await getProductDetails(productId);
      
      console.log('Sending product details to frontend:', details);
      res.json(details);
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({ message: "Failed to fetch product details" });
    }
  });

  // Idealo Product Extraction route
  app.post("/api/extract-idealo-product", isAuthenticated, async (req: Request & { user: any }, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { productUrl } = req.body;
      if (!productUrl) {
        return res.status(400).json({ message: "Product URL is required" });
      }

      if (!productUrl.includes('idealo.de')) {
        return res.status(400).json({ message: "URL must be from idealo.de" });
      }

      const { extractIdealoProduct } = await import('./idealoExtractor');
      const result = await extractIdealoProduct(productUrl);
      
      res.json(result);
    } catch (error) {
      console.error("Error extracting Idealo product:", error);
      res.status(500).json({ message: error.message || "Failed to extract product from Idealo" });
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
      // Get item and user details for email notification
      const item = await storage.getInventoryItem(req.params.id);
      const borrower = await storage.getUser(req.user.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!item.isAvailable) {
        return res.status(400).json({ message: "Item is not available for borrowing" });
      }

      // Borrow the item
      await storage.borrowItem(req.params.id, req.user.id);
      
      // Send email notification to all admins
      try {
        const allAdmins = await storage.getUsersByRole('admin');
        const adminEmails = allAdmins
          .map(admin => admin.email)
          .filter(email => email !== null && email !== '') as string[];
        
        if (adminEmails.length > 0) {
          const borrowerName = borrower ? 
            (borrower.firstName && borrower.lastName 
              ? `${borrower.firstName} ${borrower.lastName}`
              : borrower.username || borrower.email || 'Unknown User')
            : 'Unknown User';

          await sendBorrowNotification({
            itemName: item.name,
            borrowerName,
            borrowerEmail: borrower?.email || undefined,
            borrowDate: new Date().toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            adminEmails
          });
        }
      } catch (emailError) {
        console.error("Error sending borrow notification email:", emailError);
        // Don't fail the borrowing process if email fails
      }
      
      // Get notification template for borrowing
      const template = await storage.getNotificationTemplateByType('borrow');
      
      res.json({ 
        success: true,
        notification: template || null
      });
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

  // Inventory image upload
  app.post('/api/inventory/:id/upload-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const imagePath = req.file.path;
      
      // Get current item to delete old image
      const itemToUpdate = await storage.getInventoryItem(req.params.id);
      if (itemToUpdate?.imagePath) {
        deleteUploadedFile(itemToUpdate.imagePath);
      }

      // Update inventory item with new image path
      const updatedItem = await storage.updateInventoryItem(req.params.id, {
        imagePath,
      });

      res.json({ 
        success: true, 
        imagePath,
        item: updatedItem
      });
    } catch (error) {
      console.error("Error uploading inventory image:", error);
      res.status(500).json({ message: "Error uploading image" });
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
      
      // Get item and buyer details for email notification
      const item = await storage.getInventoryItem(purchaseData.itemId);
      const buyer = await storage.getUser(req.user.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      const purchase = await storage.purchaseItem(purchaseData);
      
      // Send email notification to all admins
      try {
        const allAdmins = await storage.getUsersByRole('admin');
        const adminEmails = allAdmins
          .map(admin => admin.email)
          .filter(email => email !== null && email !== '') as string[];
        
        if (adminEmails.length > 0) {
          const buyerName = buyer ? 
            (buyer.firstName && buyer.lastName 
              ? `${buyer.firstName} ${buyer.lastName}`
              : buyer.username || buyer.email || 'Unknown User')
            : 'Unknown User';

          await sendPurchaseNotification({
            itemName: item.name,
            buyerName,
            buyerEmail: buyer?.email || undefined,
            quantity: purchaseData.quantity,
            totalPrice: purchaseData.quantity * (item.price || 0),
            purchaseDate: new Date().toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            adminEmails
          });
        }
      } catch (emailError) {
        console.error("Error sending purchase notification email:", emailError);
        // Don't fail the purchase process if email fails
      }
      
      // Get notification template for purchase
      const template = await storage.getNotificationTemplateByType('purchase');
      
      res.json({
        ...purchase,
        notification: template || null
      });
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

  // Test email endpoints (admin only)
  app.post("/api/test-email/borrow", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const success = await sendBorrowNotification({
        itemName: "Test-Ausleih-Gegenstand",
        borrowerName: "Test-Benutzer",
        borrowerEmail: "test@example.com",
        borrowDate: new Date().toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminEmails: currentUser.email ? [currentUser.email] : []
      });

      res.json({ 
        success, 
        message: success ? "Test borrow email sent successfully" : "Failed to send test borrow email",
        email: currentUser.email
      });
    } catch (error) {
      console.error("Error sending test borrow email:", error);
      res.status(500).json({ message: "Error sending test borrow email" });
    }
  });

  app.post("/api/test-email/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const success = await sendPurchaseNotification({
        itemName: "Test-Kauf-Artikel",
        buyerName: "Test-Käufer",
        buyerEmail: "test-buyer@example.com",
        quantity: 2,
        totalPrice: 25.99,
        purchaseDate: new Date().toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminEmails: currentUser.email ? [currentUser.email] : []
      });

      res.json({ 
        success, 
        message: success ? "Test purchase email sent successfully" : "Failed to send test purchase email",
        email: currentUser.email
      });
    } catch (error) {
      console.error("Error sending test purchase email:", error);
      res.status(500).json({ message: "Error sending test purchase email" });
    }
  });

  app.post("/api/test-email/registration", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const success = await sendUserRegistrationNotification({
        username: "test-user-123",
        firstName: "Max",
        lastName: "Mustermann",
        email: "max.mustermann@example.com",
        registrationDate: new Date().toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminEmails: currentUser.email ? [currentUser.email] : []
      });

      res.json({ 
        success, 
        message: success ? "Test registration email sent successfully" : "Failed to send test registration email",
        email: currentUser.email
      });
    } catch (error) {
      console.error("Error sending test registration email:", error);
      res.status(500).json({ message: "Error sending test registration email" });
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

  // Notification Templates Routes
  app.get("/api/notification-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllNotificationTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ message: "Failed to fetch notification templates" });
    }
  });

  app.get("/api/notification-templates/:type", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getNotificationTemplateByType(req.params.type);
      res.json(template);
    } catch (error) {
      console.error("Error fetching notification template:", error);
      res.status(500).json({ message: "Failed to fetch notification template" });
    }
  });

  app.post("/api/notification-templates", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const template = await storage.createNotificationTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Error creating notification template:", error);
      res.status(500).json({ message: "Failed to create notification template" });
    }
  });

  app.patch("/api/notification-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const template = await storage.updateNotificationTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating notification template:", error);
      res.status(500).json({ message: "Failed to update notification template" });
    }
  });

  app.delete("/api/notification-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteNotificationTemplate(req.params.id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification template:", error);
      res.status(500).json({ message: "Failed to delete notification template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}