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

## Security: Credentials, HTTPS, and Encryption

### Refresh Tokens: Secure Storage, Rotation, Revocation
- Refresh tokens are now stored server-side in PostgreSQL as bcrypt hashes with unique JWT IDs (jti).
- Table: refresh_tokens (migration 002). See [SQL](backend/src/lib/migrations/002_refresh_tokens.sql:1).
- On signup/login, the server:
  - Issues access + refresh tokens via [createTokenResponse()](backend/src/lib/auth-middleware.ts:360).
  - Hashes and stores the refresh token with client metadata via [saveRefreshToken()](backend/src/lib/token-store.ts:40).
- On refresh:
  - Verifies signature/expiry [verifyRefreshToken()](backend/src/lib/auth-middleware.ts:139).
  - Looks up token record by jti and compares the bcrypt hash [findRefreshTokenByJti()](backend/src/lib/token-store.ts:77), [compareRefreshToken()](backend/src/lib/token-store.ts:33).
  - Rotates tokens by revoking the old record [revokeRefreshTokenByJti()](backend/src/lib/token-store.ts:96) and storing a new refresh token [saveRefreshToken()](backend/src/lib/token-store.ts:40).
- On logout:
  - Optionally revokes the submitted refresh token [logoutHandler()](backend/src/api/auth.ts:290).

Endpoints:
- POST /api/v1/auth/signup -> returns accessToken + refreshToken [router.post()](backend/src/api/auth.ts:407)
- POST /api/v1/auth/login -> returns accessToken + refreshToken [router.post()](backend/src/api/auth.ts:410)
- POST /api/v1/auth/refresh -> rotates refresh token, returns new pair [router.post()](backend/src/api/auth.ts:416)
- POST /api/v1/auth/logout -> optionally revokes submitted refresh token [router.post()](backend/src/api/auth.ts:413)

Notes:
- Refresh tokens include a JWT ID (jti) for DB lookup [generateRefreshToken()](backend/src/lib/auth-middleware.ts:88).
- Hashing uses configured bcrypt rounds [hashRefreshToken()](backend/src/lib/token-store.ts:27).
- An optional job can purge expired tokens [deleteExpiredTokens()](backend/src/lib/token-store.ts:113).

### HTTPS, HSTS, and Reverse Proxy
- In production, the API enforces HTTPS and sets strict HSTS via [index.ts](backend/src/index.ts:1):
  - trust proxy enabled (app.set('trust proxy', 1)) to honor X-Forwarded-* headers.
  - HTTP -> HTTPS redirect using req.secure/X-Forwarded-Proto.
  - helmet HSTS enabled in production with preload and includeSubDomains.
- Behind a reverse proxy (Nginx, Caddy, Cloudflare):
  - Terminate TLS at the proxy.
  - Ensure X-Forwarded-Proto: https header is passed to the app.
  - Configure the upstream to forward real client IP to support logging and optional IP-based auditing.

Example Nginx location (reference only):
```
location /api/ {
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:5000;
}
```

### Optional Column-Level Encryption (pgcrypto)
- Migration 003 enables pgcrypto in PostgreSQL [SQL](backend/src/lib/migrations/003_pgcrypto.sql:1).
- Use PGP_SYM_ENCRYPT/PGP_SYM_DECRYPT when adding future sensitive columns.
- Keep encryption keys outside the database (e.g., KMS or vault). Do not hardcode keys.

### Operational Guidance
- Always serve the app over HTTPS in production.
- Keep JWT secrets strong and rotated regularly ([.env](backend/.env:9)).
- Use short-lived access tokens (e.g., 1h) and longer refresh tokens (e.g., 7d).
- Enable DB backups and ensure secure storage and access controls for infrastructure.
