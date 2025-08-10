# ChitJar - Personal Chit Fund Tracker

A comprehensive web application to track and analyze personal chit fund investments with advanced analytics including XIRR calculations, strategic bidding insights, and mobile-first responsive design.

## Features

- 📊 **Dashboard**: Overview of total profit and fund performance
- 💰 **Fund Management**: Create and track multiple chit funds
- 📈 **Analytics**: XIRR calculations, ROI analysis, and projections
- 🎯 **Strategic Insights**: Bidding guidance for borrowers vs investors
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 📊 **Charts**: Interactive visualizations with Chart.js
- 📥 **Import/Export**: CSV import/export with validation
- 🔐 **Authentication**: Secure JWT-based authentication
- 🎨 **Accessible**: Color-blind friendly design with ARIA support

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
   
   # Run migrations (will be implemented in task 1.4)
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
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/funds` - List user's funds
- `POST /api/funds` - Create new fund
- `GET /api/funds/:id` - Get fund details
- `PUT /api/funds/:id` - Update fund
- `DELETE /api/funds/:id` - Delete fund
- `GET /api/funds/:id/entries` - Get fund entries
- `POST /api/funds/:id/entries` - Add entry to fund
- `GET /api/analytics/xirr/:fundId` - Calculate XIRR for fund

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
