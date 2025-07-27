import * as schema from "@shared/schema";

// Check if we're using Neon (has wss:// or specific Neon host) vs local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL?.includes('wss://') || 
                      process.env.DATABASE_URL?.includes('neon.tech') ||
                      process.env.DATABASE_URL?.includes('pooler.neon');

let db: any;

async function createDbConnection() {
  if (isNeonDatabase) {
    // Use Neon serverless for production
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import("ws");
    
    neonConfig.webSocketConstructor = ws.default;
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for Neon database");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzle({ client: pool, schema });
  } else {
    // Use regular PostgreSQL for local development/Docker
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for PostgreSQL");
    }
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: false // No SSL for local PostgreSQL
    });
    
    return drizzle({ client: pool, schema });
  }
}

// Initialize database connection
db = await createDbConnection();

export { db };