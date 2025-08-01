import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Notification templates for admin configuration
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'purchase' or 'borrow'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  profileImagePath: varchar("profile_image_path"), // for uploaded images
  role: varchar("role").notNull().default("user"), // 'admin' or 'user'
  name: varchar("name"),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  color: varchar("color").notNull().default("#1976D2"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory items table
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  location: varchar("location").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  purchaseDate: timestamp("purchase_date"),
  imageUrl: text("image_url"), // optional URL fallback
  imagePath: text("image_path"), // primary uploaded image path
  externalLink: text("external_link"),
  isPurchasable: boolean("is_purchasable").notNull().default(false),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").default(1),
  isAvailable: boolean("is_available").notNull().default(true),
  currentBorrowerId: varchar("current_borrower_id").references(() => users.id),
  borrowedAt: timestamp("borrowed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase transactions table
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").references(() => inventoryItems.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// Borrowing history table
export const borrowingHistory = pgTable("borrowing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").references(() => inventoryItems.id).notNull(),
  borrowerId: varchar("borrower_id").references(() => users.id).notNull(),
  borrowedAt: timestamp("borrowed_at").notNull(),
  returnedAt: timestamp("returned_at"),
  isReturned: boolean("is_returned").notNull().default(false),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  borrowedItems: many(inventoryItems),
  purchases: many(purchases),
  borrowingHistory: many(borrowingHistory),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [inventoryItems.categoryId],
    references: [categories.id],
  }),
  currentBorrower: one(users, {
    fields: [inventoryItems.currentBorrowerId],
    references: [users.id],
  }),
  purchases: many(purchases),
  borrowingHistory: many(borrowingHistory),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [purchases.itemId],
    references: [inventoryItems.id],
  }),
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
}));

export const borrowingHistoryRelations = relations(borrowingHistory, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [borrowingHistory.itemId],
    references: [inventoryItems.id],
  }),
  borrower: one(users, {
    fields: [borrowingHistory.borrowerId],
    references: [users.id],
  }),
}));

// Zod schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  name: true,
  phone: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isAvailable: true,
  currentBorrowerId: true,
  borrowedAt: true,
}).extend({
  purchaseDate: z.preprocess(
      (val) => {
        if (val === null || val === undefined || val === '') return undefined;
        if (typeof val === 'string') return new Date(val);
        return val;
      },
      z.date().optional()
  ),
  purchasePrice: z.preprocess(
      (val) => (typeof val === 'number' ? val.toFixed(2) : val),
      z.string()
  ),
  pricePerUnit: z.preprocess(
      (val) => (typeof val === 'number' ? val.toFixed(2) : val),
      z.string()
  )

});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchasedAt: true,
}).extend({
  pricePerUnit: z.preprocess(
      (val) => (typeof val === 'number' ? val.toFixed(2) : val),
      z.string()
  ),
  totalPrice: z.preprocess(
      (val) => (typeof val === 'number' ? val.toFixed(2) : val),
      z.string()
  ),
});

export const insertBorrowingHistorySchema = createInsertSchema(borrowingHistory).omit({
  id: true,
  borrowedAt: true,
  returnedAt: true,
  isReturned: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type BorrowingHistory = typeof borrowingHistory.$inferSelect;
export type InsertBorrowingHistory = z.infer<typeof insertBorrowingHistorySchema>;

// Extended types with relations
export type InventoryItemWithRelations = InventoryItem & {
  category: Category;
  currentBorrower?: User;
};

export type PurchaseWithRelations = Purchase & {
  item: InventoryItem;
  user: User;
};

export type BorrowingHistoryWithRelations = BorrowingHistory & {
  item: InventoryItem;
  borrower: User;
};

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;
