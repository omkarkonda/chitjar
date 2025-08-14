# ChitJar Project Context for Qwen Code

This document provides comprehensive context about the ChitJar project for Qwen Code to use in future interactions.

## Project Overview

**ChitJar** is a comprehensive web application for tracking and analyzing personal chit fund investments with advanced analytics including XIRR calculations, strategic bidding insights, and mobile-first responsive design.

### Core Purpose
- Help individuals in India track their chit fund investments
- Provide advanced financial analytics (XIRR, ROI, projections)
- Offer strategic bidding insights for borrowers vs investors
- Enable data import/export functionality

### Key Features
- 📊 Dashboard with total profit and fund performance visualization
- 💰 Fund management for multiple chit funds
- 📈 Advanced analytics including XIRR calculations and ROI analysis
- 🎯 Strategic bidding insights with historical trend analysis
- 📱 Mobile-first responsive design
- 📊 Interactive charts using Chart.js
- 📥 CSV import/export with validation
- 🔐 Secure JWT-based authentication

## Tech Stack

### Backend
- **Node.js** with **Express.js** framework
- **TypeScript** for type safety
- **PostgreSQL** database with **pg** library
- **JWT** authentication with **bcrypt** password hashing
- **Zod** for schema validation
- **Jest** for testing

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Vite** for development and building
- **Chart.js** for data visualizations
- **CSS Custom Properties** for theming
- Mobile-first responsive design

## Project Structure

```
chitjar/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── api/            # API route handlers
│   │   │   ├── analytics.ts # Analytics API endpoints
│   │   │   ├── auth.ts     # Authentication API
│   │   │   ├── bids.ts     # Bids API
│   │   │   ├── export.ts   # Export API endpoints
│   │   │   ├── funds.ts    # Funds API
│   │   │   └── monthly-entries.ts # Monthly entries API
│   │   ├── lib/            # Utility libraries
│   │   ├── test/           # Test files
│   │   └── index.ts        # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Vanilla JS frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── lib/           # Utility libraries
│   │   ├── styles/        # CSS files
│   │   ├── test/          # Test files
│   │   ├── app.js         # Main app
│   │   └── index.html     # HTML entry point
│   ├── package.json
│   └── vite.config.js
├── docs/                   # Documentation
├── tasks/                  # Task management
└── package.json           # Root package.json
```

## API Structure

The backend API follows RESTful conventions with the following key endpoints:

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile

### Funds Management
- `GET /api/v1/funds` - List user's funds
- `POST /api/v1/funds` - Create new fund
- `GET /api/v1/funds/:id` - Get fund details
- `PUT /api/v1/funds/:id` - Update fund
- `DELETE /api/v1/funds/:id` - Delete fund

### Monthly Entries
- `GET /api/v1/entries` - List all entries for user
- `POST /api/v1/entries` - Create new entry
- `GET /api/v1/entries/:id` - Get entry details
- `PUT /api/v1/entries/:id` - Update entry
- `DELETE /api/v1/entries/:id` - Delete entry
- `GET /api/v1/funds/:fundId/entries` - Get entries for specific fund

### Bids
- `GET /api/v1/bids` - List all bids for user
- `POST /api/v1/bids` - Create new bid
- `GET /api/v1/bids/:id` - Get bid details
- `PUT /api/v1/bids/:id` - Update bid
- `DELETE /api/v1/bids/:id` - Delete bid
- `GET /api/v1/funds/:fundId/bids` - Get bids for specific fund

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard analytics with total profit and fund performance
- `GET /api/v1/analytics/funds/:id` - Fund-specific analytics including XIRR and cash flow series
- `POST /api/v1/analytics/funds/:id/fd-comparison` - Compare fund XIRR with FD rate
- `GET /api/v1/analytics/insights` - Strategic bidding insights based on historical data

### Import/Export
- `GET /api/v1/export/funds.csv` - Export all funds as CSV
- `GET /api/v1/export/funds.json` - Export all funds as JSON
- `GET /api/v1/export/entries.csv` - Export all monthly entries as CSV
- `GET /api/v1/export/entries.json` - Export all monthly entries as JSON
- `GET /api/v1/export/bids.csv` - Export all bids as CSV
- `GET /api/v1/export/bids.json` - Export all bids as JSON
- `GET /api/v1/export/backup.json` - Complete backup export in JSON format

## Data Model

The application uses PostgreSQL with the following key tables:

### Users
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique email address
- `password_hash` (VARCHAR) - Hashed password
- `name` (VARCHAR) - User's name
- `created_at`, `updated_at`, `last_login_at` (TIMESTAMP)
- `is_active` (BOOLEAN)

### Funds
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `name` (VARCHAR) - Fund name
- `chit_value` (DECIMAL) - Total value of fund
- `installment_amount` (DECIMAL) - Monthly payment
- `total_months` (INTEGER) - Number of months
- `start_month`, `end_month` (VARCHAR) - Date range (YYYY-MM format)
- `is_active` (BOOLEAN)
- `early_exit_month` (VARCHAR) - Early exit date if applicable
- `notes` (TEXT)

### Monthly Entries
- `id` (UUID) - Primary key
- `fund_id` (UUID) - Foreign key to funds
- `month_key` (VARCHAR) - Month identifier (YYYY-MM)
- `dividend_amount` (DECIMAL) - Dividend received
- `prize_money` (DECIMAL) - Prize money received
- `is_paid` (BOOLEAN) - Payment status
- `notes` (TEXT)

### Bids
- `id` (UUID) - Primary key
- `fund_id` (UUID) - Foreign key to funds
- `month_key` (VARCHAR) - Month identifier (YYYY-MM)
- `winning_bid` (DECIMAL) - Winning bid amount
- `discount_amount` (DECIMAL) - Discount amount
- `bidder_name` (VARCHAR) - Name of bidder
- `notes` (TEXT)

## Development Workflow

### Key Commands

#### Root Level
```bash
npm run dev              # Start both backend and frontend
npm run build            # Build both backend and frontend
npm run test             # Run all tests
npm run lint             # Lint all code
npm run format           # Format all code with Prettier
npm run install:all      # Install dependencies for all packages
```

#### Backend
```bash
cd backend
npm run dev              # Start development server (port 5000)
npm run build            # Build TypeScript
npm run start            # Start production server
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Lint TypeScript code
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data
```

#### Frontend
```bash
cd frontend
npm run dev              # Start Vite dev server (port 3000)
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run tests
npm run lint             # Lint JavaScript code
```

### Environment Setup

1. **Prerequisites**: Node.js 18+, PostgreSQL 15+, npm 8+
2. **Installation**: `npm run install:all`
3. **Environment Variables**: Copy `.env.example` files and configure
4. **Database Setup**: Create database and run migrations
5. **Development**: `npm run dev` to start both servers

## Testing

The project uses Jest for both backend and frontend testing:

- Backend tests are located in `backend/src/test/`
- Frontend tests are located in `frontend/src/test/`
- Run all tests with `npm test` from root
- Run backend tests with `npm test` in backend directory
- Run frontend tests with `npm test` in frontend directory

## Current Status

Based on the task tracking file, the project has made significant progress:

### Completed Major Components
- ✅ Project setup and architecture
- ✅ Authentication, authorization, and data security
- ✅ Data model and backend APIs
- ✅ Basic frontend UI structure with routing
- ✅ Analytics and calculations
- ✅ Import/Export functionality

### In Progress
- 🔄 Frontend UI implementation
- 🔄 Charts and visualizations

## Key Development Considerations

1. **Security**: 
   - All endpoints are protected with JWT authentication
   - Rate limiting is implemented
   - Input sanitization and validation using Zod
   - Row-level ownership enforcement in database queries

2. **Financial Calculations**:
   - XIRR calculations using the `xirr` library
   - ROI and other financial metrics
   - Currency formatting in INR with Indian digit grouping
   - Date formatting in DD/MM/YYYY

3. **Mobile-First Design**:
   - Responsive CSS with mobile-first approach
   - Accessible color palettes (color-blind friendly)
   - Touch-friendly navigation

4. **Data Validation**:
   - Comprehensive Zod schemas for all data models
   - Database-level constraints for data integrity
   - Input sanitization before validation

## Future Work

The project is still in development with several key areas to be completed:

1. Implement full frontend UI with all components
2. Add charting and data visualization
3. Complete testing coverage
4. Finalize documentation

This context should provide Qwen Code with the necessary information to understand and work with the ChitJar project effectively.