# ChitJar Backend

Backend API for ChitJar - Chit Fund Tracker

## Database Setup

### Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ installed

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Update the database connection in `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/chitjar_dev
   DATABASE_TEST_URL=postgresql://username:password@localhost:5432/chitjar_test
   ```

### Database Initialization

1. Create the databases:
   ```bash
   # For development
   createdb chitjar_dev
   
   # For testing
   createdb chitjar_test
   ```

2. Run migrations to create the schema:
   ```bash
   npm run db:migrate
   ```

3. Check migration status:
   ```bash
   npm run db:migrate:status
   ```

### Database Schema

The application uses the following tables:

- **users**: User authentication and profiles
- **funds**: Chit fund definitions with metadata
- **monthly_entries**: Monthly dividend and prize money entries
- **bids**: Historical winning bids for each month
- **settings**: User preferences and application configuration
- **schema_migrations**: Migration tracking table

### Key Features

- **Row-level security**: All data is isolated per user
- **Data validation**: Comprehensive constraints and checks
- **Audit trails**: Created/updated timestamps on all records
- **Flexible date handling**: Support for early exits and irregular schedules

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run migrations
npm run db:migrate

# Reset database (WARNING: deletes all data)
npm run db:migrate:reset
```

### API Endpoints

- `GET /api/health` - Health check with database status

More endpoints will be added as the application develops.

### Database Connection

The application uses connection pooling with the following configuration:

- **Max connections**: 20
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds
- **SSL**: Enabled in production

### Migration System

The migration system tracks schema changes and ensures consistent database state across environments.

- **Versioned migrations**: Each migration has a unique version
- **Transaction safety**: Migrations run in transactions
- **Rollback support**: Basic rollback functionality
- **Status tracking**: View applied migrations

### Testing

Database tests verify:

- Connection health
- Schema structure
- Foreign key constraints
- Data validation functions
- Migration system

Run tests with:
```bash
npm test
```
