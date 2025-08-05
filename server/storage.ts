import {
  users,
  categories,
  inventoryItems,
  purchases,
  borrowingHistory,
  notificationTemplates,
  type User,
  type UpsertUser,
  type InsertUser,
  type Category,
  type InsertCategory,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryItemWithRelations,
  type Purchase,
  type InsertPurchase,
  type PurchaseWithRelations,
  type BorrowingHistoryWithRelations,
  type NotificationTemplate,
  type InsertNotificationTemplate,
} from "@shared/schema";
import { db } from "./db";
import {eq, desc, and, sql, asc} from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserProfile(id: string, profile: Partial<User>): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Category operations
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Inventory operations
  getAllInventoryItems(): Promise<InventoryItemWithRelations[]>;
  getInventoryItem(id: string): Promise<InventoryItemWithRelations | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;

  // Borrowing operations
  borrowItem(itemId: string, userId: string): Promise<void>;
  returnItem(itemId: string): Promise<void>;
  getBorrowingHistory(): Promise<BorrowingHistoryWithRelations[]>;
  getUserBorrowingHistory(userId: string): Promise<BorrowingHistoryWithRelations[]>;

  // Purchase operations
  purchaseItem(purchase: InsertPurchase): Promise<Purchase>;
  getAllPurchases(): Promise<PurchaseWithRelations[]>;
  getUserPurchases(userId: string): Promise<PurchaseWithRelations[]>;

  // Statistics
  getStats(): Promise<{
    totalItems: number;
    borrowedItems: number;
    availableItems: number;
    totalUsers: number;
    totalCategories: number;
  }>;

  // Notification Templates
  getAllNotificationTemplates(): Promise<NotificationTemplate[]>;
  getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined>;
  getNotificationTemplateByType(type: string): Promise<NotificationTemplate | undefined>;
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate>;
  deleteNotificationTemplate(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // For legacy OAuth support - convert to InsertUser format with required fields
    const insertData: InsertUser = {
      username: userData.email || 'unknown',
      passwordHash: 'oauth-user', // placeholder for OAuth users
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: userData.role || 'user',
      name: userData.name,
      phone: userData.phone,
    };

    const [user] = await db
      .insert(users)
      .values(insertData)
      .onConflictDoUpdate({
        target: users.username,
        set: {
          email: insertData.email,
          firstName: insertData.firstName,
          lastName: insertData.lastName,
          profileImageUrl: insertData.profileImageUrl,
          role: insertData.role,
          name: insertData.name,
          phone: insertData.phone,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'pending')).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profile: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        username: profile.username,
        profileImagePath: profile.profileImagePath,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Inventory operations
  async getAllInventoryItems(): Promise<InventoryItemWithRelations[]> {
    return await db
      .select()
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(users, eq(inventoryItems.currentBorrowerId, users.id))
      .orderBy(asc(inventoryItems.name))
      .then(rows =>
        rows.map(row => ({
          ...row.inventory_items,
          category: row.categories!,
          currentBorrower: row.users || undefined,
        }))
      );
  }

  async getInventoryItem(id: string): Promise<InventoryItemWithRelations | undefined> {
    const result = await db
      .select()
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(users, eq(inventoryItems.currentBorrowerId, users.id))
      .where(eq(inventoryItems.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    console.log('row:', row);
    return {
      ...row.inventory_items,
      category: row.categories!,
      currentBorrower: row.users || undefined,
    };
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  // Borrowing operations
  async borrowItem(itemId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update item status
      await tx
        .update(inventoryItems)
        .set({
          currentBorrowerId: userId,
          borrowedAt: new Date(),
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, itemId));

      // Add to borrowing history
      await tx
        .insert(borrowingHistory)
        .values({
          itemId,
          borrowerId: userId,
          borrowedAt: new Date(),
        });
    });
  }

  async returnItem(itemId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update item status
      await tx
        .update(inventoryItems)
        .set({
          currentBorrowerId: null,
          borrowedAt: null,
          isAvailable: true,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, itemId));

      // Update borrowing history
      await tx
        .update(borrowingHistory)
        .set({
          returnedAt: new Date(),
          isReturned: true,
        })
        .where(
          and(
            eq(borrowingHistory.itemId, itemId),
            eq(borrowingHistory.isReturned, false)
          )
        );
    });
  }

  async getBorrowingHistory(): Promise<BorrowingHistoryWithRelations[]> {
    return await db
      .select()
      .from(borrowingHistory)
      .leftJoin(inventoryItems, eq(borrowingHistory.itemId, inventoryItems.id))
      .leftJoin(users, eq(borrowingHistory.borrowerId, users.id))
      .orderBy(desc(borrowingHistory.borrowedAt))
      .then(rows =>
        rows.map(row => ({
          ...row.borrowing_history,
          item: row.inventory_items!,
          borrower: row.users!,
        }))
      );
  }

  async getUserBorrowingHistory(userId: string): Promise<BorrowingHistoryWithRelations[]> {
    return await db
      .select()
      .from(borrowingHistory)
      .leftJoin(inventoryItems, eq(borrowingHistory.itemId, inventoryItems.id))
      .leftJoin(users, eq(borrowingHistory.borrowerId, users.id))
      .where(eq(borrowingHistory.borrowerId, userId))
      .orderBy(desc(borrowingHistory.borrowedAt))
      .then(rows =>
        rows.map(row => ({
          ...row.borrowing_history,
          item: row.inventory_items!,
          borrower: row.users!,
        }))
      );
  }

  // Purchase operations
  async purchaseItem(purchase: InsertPurchase): Promise<Purchase> {
    console.log('purchases:', purchase);
    return await db.transaction(async (tx) => {
      // Create purchase record
      const [newPurchase] = await tx
        .insert(purchases)
        .values(purchase)
        .returning();

      // Update item stock if purchasable
      await tx
        .update(inventoryItems)
        .set({
          stockQuantity: sql`${inventoryItems.stockQuantity} - ${purchase.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, purchase.itemId));

      return newPurchase;
    });
  }

  async getAllPurchases(): Promise<PurchaseWithRelations[]> {
    return await db
      .select()
      .from(purchases)
      .leftJoin(inventoryItems, eq(purchases.itemId, inventoryItems.id))
      .leftJoin(users, eq(purchases.userId, users.id))
      .orderBy(desc(purchases.purchasedAt))
      .then(rows =>
        rows.map(row => ({
          ...row.purchases,
          item: row.inventory_items!,
          user: row.users!,
        }))
      );
  }

  async getUserPurchases(userId: string): Promise<PurchaseWithRelations[]> {
    return await db
      .select()
      .from(purchases)
      .leftJoin(inventoryItems, eq(purchases.itemId, inventoryItems.id))
      .leftJoin(users, eq(purchases.userId, users.id))
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.purchasedAt))
      .then(rows =>
        rows.map(row => ({
          ...row.purchases,
          item: row.inventory_items!,
          user: row.users!,
        }))
      );
  }

  // Statistics
  async getStats(): Promise<{
    totalItems: number;
    borrowedItems: number;
    availableItems: number;
    totalUsers: number;
    totalCategories: number;
  }> {
    const [totalItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems);

    const [borrowedItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(eq(inventoryItems.isAvailable, false));

    const [availableItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(eq(inventoryItems.isAvailable, true));

    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [totalCategoriesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories);

    return {
      totalItems: totalItemsResult.count,
      borrowedItems: borrowedItemsResult.count,
      availableItems: availableItemsResult.count,
      totalUsers: totalUsersResult.count,
      totalCategories: totalCategoriesResult.count,
    };
  }

  // Notification Templates
  async getAllNotificationTemplates(): Promise<NotificationTemplate[]> {
    return await db.select().from(notificationTemplates).orderBy(notificationTemplates.type, notificationTemplates.createdAt);
  }

  async getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id));
    return template;
  }

  async getNotificationTemplateByType(type: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates)
      .where(and(eq(notificationTemplates.type, type), eq(notificationTemplates.isActive, true)));
    return template;
  }

  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [newTemplate] = await db
      .insert(notificationTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate> {
    const [updatedTemplate] = await db
      .update(notificationTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteNotificationTemplate(id: string): Promise<void> {
    await db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  }
}

export const storage = new DatabaseStorage();
