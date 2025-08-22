# ChitJar - Personal Chit Fund Tracker

A comprehensive web application to track and analyze personal chit fund investments with advanced analytics including XIRR calculations, strategic bidding insights, and mobile-first responsive design.

## Features

- 📊 **Dashboard**: Overview of fund performance
- 💰 **Fund Management**: Create and track multiple chit funds
- 📈 **Analytics**: XIRR calculations, ROI analysis, and projections
- 🎯 **Strategic Insights**: Bidding guidance for borrowers vs investors
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 📊 **Charts**: Interactive visualizations with Chart.js
- 📥 **Import/Export**: CSV import/export with validation
- 🔐 **Authentication**: Secure JWT-based authentication
- ♿ **Accessibility**: Full keyboard navigation, screen reader support, and ARIA labels
- 🎨 **Accessible Design**: Color-blind friendly design with proper contrast ratios

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **PostgreSQL** database with **pg** library
- **TypeScript** for type safety
- **JWT** authentication with **bcrypt** password hashing
- **Zod** for schema validation
- **Jest** for testing

### Frontend
- **Vanilla JavaScript** with ES6+ features
- **Vite** for fast development and building
- **Chart.js** for data visualizations
- **CSS Custom Properties** for theming
- **Mobile-first responsive design**

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm 8+

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chitjar
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb chitjar_dev
   
   # Run migrations
   cd backend
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start individually
   npm run dev:backend  # Backend on http://localhost:5000
   npm run dev:frontend # Frontend on http://localhost:3000
   ```

## Development

### Project Structure

```
chitjar/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── api/            # API route handlers
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

### Available Scripts

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
npm run dev              # Start development server
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
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run tests
npm run lint             # Lint JavaScript code
```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/chitjar_dev

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=ChitJar
```

## Testing

### Backend Tests
```bash
cd backend
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

### Frontend Tests
```bash
cd frontend
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

## API Documentation

The API follows RESTful conventions with the following endpoints:

- `GET /api/health` - Health check
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `GET /api/v1/funds` - List user's funds
- `POST /api/v1/funds` - Create new fund
- `GET /api/v1/funds/:id` - Get fund details
- `PUT /api/v1/funds/:id` - Update fund
- `DELETE /api/v1/funds/:id` - Delete fund
- `GET /api/v1/funds/:fundId/entries` - Get fund entries
- `POST /api/v1/funds/:fundId/entries` - Add entry to fund
- `GET /api/v1/analytics/dashboard` - Dashboard analytics
- `GET /api/v1/analytics/funds/:id` - Fund-specific analytics
- `GET /api/v1/export/funds.csv` - Export all funds as CSV
- `GET /api/v1/export/funds.json` - Export all funds as JSON
- `GET /api/v1/export/entries.csv` - Export all monthly entries as CSV
- `GET /api/v1/export/entries.json` - Export all monthly entries as JSON
- `GET /api/v1/export/bids.csv` - Export all bids as CSV
- `GET /api/v1/export/bids.json` - Export all bids as JSON
- `GET /api/v1/export/backup.json` - Complete backup export in JSON format
- `POST /api/v1/bids/import/csv` - Import bids from CSV
- `POST /api/v1/bids/import/csv/confirm` - Confirm bids import from CSV

## Security

- Rate limiting
  - GET endpoints: 200 requests per 15 minutes per IP ([TypeScript.readOnlyRateLimiter](backend/src/lib/rate-limiting.ts:112))
  - POST/PUT/DELETE endpoints: 50 requests per 15 minutes per IP ([TypeScript.dataModificationRateLimiter](backend/src/lib/rate-limiting.ts:101))
  - Authentication endpoints (signup, login, refresh): strict limits ([TypeScript.authRateLimiter](backend/src/lib/rate-limiting.ts:69))
  - Applied per-route using the method-aware middleware ([TypeScript.methodRateLimiter()](backend/src/lib/rate-limiting.ts:197))
  - In development, limits are relaxed via ([TypeScript.getRateLimiter](backend/src/lib/rate-limiting.ts:175))

- Input sanitization
  - All body, query, and path parameters are sanitized before validation using:
    - ([TypeScript.sanitizeString()](backend/src/lib/sanitization.ts:37)) for request bodies
    - ([TypeScript.sanitizeQueryString()](backend/src/lib/sanitization.ts:43)) for query parameters
    - ([TypeScript.sanitizeParamString()](backend/src/lib/sanitization.ts:49)) for route params
  - Sanitization runs before Zod schema validation to reduce risk from XSS and script injection

- Security headers, HTTPS, and CORS
  - Helmet with HSTS is enabled in production and HTTPS is enforced behind a reverse proxy in ([backend/src/index.ts](backend/src/index.ts:31))
  - CORS origin is configured via environment variable ([TypeScript.config.corsOrigin](backend/src/lib/config.ts:28))

- Error responses
  - Rate limit exceed responses return standardized error JSON with code ([TypeScript.ERROR_CODES.RATE_LIMIT_EXCEEDED](backend/src/lib/api-conventions.ts:1)) and HTTP 429

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue in the GitHub repository. 
