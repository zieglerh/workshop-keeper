# replit.md

## Overview

WorkshopTracker is a professional inventory management system designed for workshops with German language interface. It provides comprehensive tools for managing tools, equipment, categories, user access, and tracking borrowing/sales activities. The application features username/password authentication with admin approval for new registrations, replacing the previous OAuth system. The application follows a full-stack architecture with a React frontend, Express.js backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.
Image handling: No placeholder images - manual image adjustments preferred.

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
- **Username/Password Authentication**: Secure login system with bcrypt password hashing
- **Admin Approval System**: New user registrations require admin activation (pending role)
- **Role-Based Access**: Admin users can manage categories and users, regular users can browse and borrow
- **Session Security**: Secure cookies with PostgreSQL session storage
- **Default Admin**: System creates admin/admin123 credentials on initialization

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
- **bcrypt**: Password hashing for secure credential storage
- **express-session**: Session management middleware
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

### Database Setup
- **Migrations**: Uses Drizzle Kit for schema management
- **Schema Location**: Database schema defined in `shared/schema.ts`
- **Push Command**: `npm run db:push` applies schema changes

## Recent Changes

### January 2025 - Authentication System Overhaul & Profile Management
- **OAuth Removal**: Completely removed Replit OAuth authentication system
- **Username/Password Implementation**: Created traditional login/registration system
- **German Language Interface**: All authentication pages now use German language
- **Admin Approval Workflow**: New registrations create 'pending' users requiring admin activation
- **User Management**: Enhanced admin interface with tabs for pending and active users
- **Profile Page**: Complete user profile management with password changes and account deletion
- **Admin User Management**: Full CRUD operations for user management (edit, delete, role changes)
- **Default Admin Account**: System automatically creates admin/admin123 for initial access
- **Session Management**: Maintained existing PostgreSQL session storage
- **UI Components**: Added AlertDialog component for confirmation dialogs
- **Security**: Admin prevents deletion of last administrator and self-deletion
- **Docker Build Setup**: Complete Docker configuration with multi-stage builds and PostgreSQL
- **Database Initialization**: Enhanced init.sql with all tables, default admin user, and current categories
- **API Bug Fixes**: Corrected apiRequest parameter order across all components
- **Schema Synchronization**: Fixed init.sql to match Drizzle schema with correct bcrypt hash
- **Email Notification System**: Complete SMTP integration with German email templates for admin notifications
- **Phone Number Support**: Added optional phone field across all user forms and management interfaces
- **Email Events**: Automated notifications for item borrowing, purchases, and new user registrations
- **Configurable User Notifications**: Database-driven notification templates system with admin management interface
- **Intelligent Price Calculator**: Automatic price-per-unit calculation based on total purchase cost and quantity in add item form
- **Automatic Image Download**: URLs entered in image fields are automatically downloaded and stored locally for offline access
- **Google Shopping Links**: Direct product links using product_link for accurate shop redirects
- **Product Data Import**: Automated data import from Google Shopping using SerpAPI product details
- **Enhanced Product Descriptions**: Google Shopping selection now fetches detailed API product descriptions when available
- **Idealo.de Integration**: ChatGPT-powered product analysis from Idealo.de URLs with automatic categorization and realistic product data generation


The application is designed to run efficiently on Replit's infrastructure with secure username/password authentication and admin-controlled user registration.