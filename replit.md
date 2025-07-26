# replit.md

## Overview

WorkshopTracker is a professional inventory management system designed for workshops. It provides comprehensive tools for managing tools, equipment, categories, user access, and tracking borrowing/sales activities. The application follows a full-stack architecture with a React frontend, Express.js backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom workshop-themed design tokens
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API with proper error handling and logging middleware
- **Database ORM**: Drizzle ORM for type-safe database operations

### Database Schema
The application uses PostgreSQL with the following core entities:
- **Users**: User profiles with role-based access (admin/user)
- **Categories**: Equipment categorization with color coding
- **Inventory Items**: Tools and equipment with purchase tracking, borrowing status, and optional sales functionality
- **Borrowing History**: Track who borrowed what and when
- **Purchases**: Sales transaction records
- **Sessions**: Secure session storage

## Key Components

### Authentication & Authorization
- **Replit Auth Integration**: Secure OAuth flow with session management
- **Role-Based Access**: Admin users can manage categories and users, regular users can browse and borrow
- **Session Security**: Secure cookies with PostgreSQL session storage

### Inventory Management
- **Item Tracking**: Comprehensive item information including location, purchase date, and images
- **Category Organization**: Color-coded categories for easy visual organization
- **Borrowing System**: Track item availability and borrowing history
- **Optional Sales**: Items can be marked as purchasable with pricing

### User Interface
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Professional Theme**: Workshop-focused color scheme and iconography
- **Component Library**: Consistent UI components using Radix UI primitives
- **Real-time Updates**: Optimistic updates with React Query caching

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **Data Fetching**: React Query manages API calls with caching and error handling
3. **State Updates**: Optimistic updates for better UX, with server-side validation
4. **Real-time Sync**: Automatic query invalidation keeps data fresh across components

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection (Neon serverless)
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Authentication
- **openid-client**: OpenID Connect implementation for Replit Auth
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Production build optimization
- **vite**: Frontend development server and bundling

## Deployment Strategy

### Development
- **Local Development**: Uses tsx for hot-reloading TypeScript execution
- **Database**: Expects DATABASE_URL environment variable for PostgreSQL connection
- **Session Security**: Requires SESSION_SECRET for secure session management

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code with external dependencies
- **Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Session encryption key
  - `REPL_ID`: Replit environment identifier
  - `ISSUER_URL`: OAuth issuer URL (defaults to Replit)

### Database Setup
- **Migrations**: Uses Drizzle Kit for schema management
- **Schema Location**: Database schema defined in `shared/schema.ts`
- **Push Command**: `npm run db:push` applies schema changes

The application is designed to run efficiently on Replit's infrastructure with automatic environment provisioning and secure authentication integration.