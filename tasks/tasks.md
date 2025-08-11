## Relevant Files

- docs/backend-stack-analysis.md - Comprehensive analysis of backend stack options (Firebase/Supabase vs custom Node+SQL) with recommendation for custom Node.js + PostgreSQL.
- package.json - Root package.json with workspace configuration and scripts for managing backend and frontend.
- .prettierrc - Prettier configuration for consistent code formatting across the project.
- .gitignore - Comprehensive gitignore file for Node.js, frontend, and environment files.
- backend/package.json - Backend dependencies including Express.js, PostgreSQL, JWT, Zod, and testing tools.
- backend/tsconfig.json - TypeScript configuration for backend with strict type checking.
- backend/.eslintrc.js - ESLint configuration for backend TypeScript code.
- backend/jest.config.js - Jest configuration for backend testing with TypeScript support.
- backend/src/index.ts - Main Express.js server entry point with middleware setup and health check endpoint.
- frontend/package.json - Frontend dependencies including Chart.js, Vite, and testing tools.
- frontend/vite.config.js - Vite configuration for frontend development with API proxy.
- frontend/.eslintrc.js - ESLint configuration for frontend JavaScript code.
- frontend/jest.config.js - Jest configuration for frontend testing with JSDOM.
- frontend/src/index.html - Main HTML file with mobile-first meta tags and basic app structure.
- frontend/src/app.js - Main JavaScript application with routing and state management.
- frontend/src/styles/main.css - Mobile-first responsive CSS with accessible color palette and design system.
- .github/workflows/ci.yml - GitHub Actions CI workflow for testing, linting, and building.
- backend/src/test/setup.ts - Jest setup file for backend tests with environment configuration.
- frontend/src/test/setup.js - Jest setup file for frontend tests with browser API mocks.
- backend/env.example - Example environment configuration file for backend with all necessary variables.
- backend/env.test - Test environment configuration file for backend testing.
- frontend/env.example - Example environment configuration file for frontend.
- backend/src/lib/config.ts - Configuration management system with Zod validation for environment variables.
- backend/src/lib/secrets.ts - Secret management utilities for handling sensitive configuration and encryption.
- backend/scripts/setup-db.js - Database setup script for local development with PostgreSQL.
- backend/scripts/check-env.js - Environment configuration validation script.
- backend/scripts/generate-secrets.js - Script to generate secure secrets for the application.
- scripts/setup-dev.js - Root-level development environment setup script.
- README.md - Comprehensive project documentation with setup instructions and API reference.
- backend/api/auth.ts - Auth handlers for signup, login, session management; enforce per-user data isolation.
- backend/api/funds.ts - CRUD endpoints for funds, input validation, ownership checks.
- backend/api/monthly-entries.ts - CRUD endpoints for monthly dividend/prize entries with recalculation triggers.
- backend/api/bids.ts - CRUD for bids plus CSV import endpoint with schema validation and preview.
- backend/api/analytics.ts - Server-side heavy calculations (XIRR, projections, FD comparison) to ensure consistency with Excel.
- backend/lib/db.ts - Database client/ORM setup and schema helpers with connection pooling and transaction support.
- backend/lib/schema.sql - PostgreSQL schema with tables for users, funds, monthly_entries, bids, settings including constraints, indexes, and triggers.
- backend/lib/migrate.ts - TypeScript migration system for database schema versioning and updates.
- backend/scripts/migrate.js - JavaScript migration script for running migrations via npm scripts.
- backend/src/test/db.test.ts - Database connection and schema validation tests.
- backend/README.md - Backend documentation with database setup instructions and API reference.
- backend/lib/validation.ts - Shared schemas (e.g., zod/yup) for server-side validation.
- backend/lib/xirr.ts - Wrapper around a proven XIRR library; parity tests vs Excel.
- backend/lib/forecast.ts - Average-based forecasting utilities, encapsulated for future upgrades.
- backend/lib/format.ts - INR currency formatting, Indian digit grouping, DD/MM/YYYY utilities (server).
- backend/lib/csv.ts - CSV parsing, sanitization, template generation, and error reporting helpers.
- frontend/index.html - App shell with mobile-first meta and base layout.
- frontend/styles/main.css - Global styles; accessible color palette; responsive layout; print-friendly tables.
- frontend/app.js - App bootstrap, simple router, and centralized state management.
- frontend/components/NavBar.js - Bottom navigation (mobile) and sidebar (desktop).
- frontend/components/Dashboard.js - Total Profit card and Fund vs Profit chart.
- frontend/components/FundsList.js - List of funds with key metrics and navigation.
- frontend/components/FundForm.js - Create/Edit fund form with client-side validation and helpful tooltips.
- frontend/components/FundDetail.js - Summary KPIs, entries list, cash flow chart, XIRR, FD comparison.
- frontend/components/MonthlyEntryForm.js - Add/edit monthly dividend and prize money entries.
- frontend/components/Insights.js - Strategic bidding insights UI with trends and scenario projections.
- frontend/components/CSVImportDialog.js - CSV import flow with mapped preview, line-level errors, and confirm.
- frontend/components/ExportDialog.js - CSV/JSON export options.
- frontend/components/Charts.js - Chart helpers (Chart.js/ECharts) with color-blind friendly palettes.
- frontend/lib/apiClient.js - Wrapper for calling backend APIs with auth and error handling.
- frontend/lib/formatters.js - INR currency, Indian digit grouping, date formatting for UI.
- frontend/lib/validators.js - Client-side validation mirroring server rules.
- tests/backend/xirr.test.ts - Excel parity tests for XIRR.
- tests/backend/validation.test.ts - Server-side validation and edge case tests.
- tests/backend/api-funds.test.ts - Funds API contract tests.
- tests/backend/api-entries.test.ts - Monthly entries API tests including recalculation triggers.
- tests/backend/api-bids.test.ts - Bids API and CSV import tests.
- tests/frontend/formatters.test.js - UI formatting utilities tests.
- tests/frontend/flows.test.js - E2E: create fund, add entry, view analytics on mobile.
- tests/frontend/csv-import.test.js - CSV import preview and error handling tests.
- tests/frontend/charts.accessibility.test.js - Chart labels, legends, contrast, and keyboard focus tests.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., MyComponent.tsx and MyComponent.test.tsx in the same directory).
- Use npx jest [optional/path/to/test/file] to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Project Setup and Architecture
  - [x] 1.1 Choose backend stack (Firebase/Supabase vs custom Node+SQL); document choice and rationale.
  - [x] 1.2 Initialize repo with Node.js backend and frontend folders, ESLint, Prettier, and basic CI.
- [x] 1.3 Set up environment configs (.env), secret handling, and local dev scripts for Node.js + PostgreSQL.
- [x] 1.4 Define PostgreSQL schema (users, funds, monthly_entries, bids, settings) and migrations using pg library.
- [x] 1.5 Establish Express.js API conventions (REST paths, error shape, JWT auth headers).
- [x] 1.6 Add Zod validation library for server and client parity.
- [x] 1.7 Add utility modules for formatting (INR, DD/MM/YYYY) and date handling.
- [x] 1.8 Pick charting library (Chart.js) and set up a themed wrapper with accessible palettes.
- [x] 1.9 Create sample seed data scripts for dev/demo with PostgreSQL.

- [ ] 2.0 Authentication, Authorization, and Data Security
  - [x] 2.1 Implement signup/login/logout with email/password using JWT tokens and bcrypt password hashing.
- [ ] 2.2 Protect all Express.js APIs with per-user authorization; enforce row-level ownership in PostgreSQL.
- [ ] 2.3 Store credentials securely in PostgreSQL; enable encryption at rest and HTTPS in deployment.
- [ ] 2.4 Implement rate limiting and input sanitization for all Express.js endpoints.
- [ ] 2.5 Add auth guards in frontend router and persistent JWT session restore.
- [ ] 2.6 Write auth and security tests (happy paths and unauthorized access).

- [ ] 3.0 Data Model and Backend APIs
  - [ ] 3.1 Express.js Funds API: create, read (list/detail), update, delete; validate inputs and uniqueness per user with Zod.
- [ ] 3.2 Express.js Monthly Entries API: create/update/delete entries; mark month as paid on save with PostgreSQL transactions.
- [ ] 3.3 Handle irregularities: zero/missing months, mid-year start, early exit flag in PostgreSQL queries.
- [ ] 3.4 Express.js Bids API: manual entry of historical winning bids and notes with PostgreSQL.
- [ ] 3.5 CSV Import for bids: upload, schema validation with Zod, preview response with per-line errors using Node.js file processing.
- [ ] 3.6 Export endpoints: CSV for funds/entries using Node.js streams; JSON for full backup/restore from PostgreSQL.
- [ ] 3.7 Express.js Analytics API: XIRR using financial libraries, cash flow series, projections, FD comparison; cache results per fund/version.
- [ ] 3.8 Recalculation triggers on data edits (entries, bids) to keep analytics consistent using PostgreSQL triggers or application logic.
- [ ] 3.9 Input validation rules for unrealistic values (negative dividends, prizeMoney > chitValue) using Zod schemas.

- [ ] 4.0 Frontend UI: Mobile-first Screens and Navigation
  - [ ] 4.1 Global layout: index.html, responsive grid, accessible color tokens, typography.
  - [ ] 4.2 Navigation: bottom nav (Dashboard, Funds, Add, Insights); desktop sidebar.
  - [ ] 4.3 Dashboard: Total Profit card and Fund vs Profit chart with loading/empty states.
  - [ ] 4.4 Funds List: cards with chit value, installment, progress (months paid/total), and navigation.
  - [ ] 4.5 Fund Form: create/edit with validation, helper tooltips, and success/error toasts.
  - [ ] 4.6 Fund Detail: KPIs (Current Profit, ROI, Avg Monthly Dividend, Months to Completion, XIRR), monthly entries list.
  - [ ] 4.7 Monthly Entry Form: add/edit dividend and prize money; mark month as paid; handle zero values.
  - [ ] 4.8 Insights Page: historical bidding trends (table + chart), borrower vs investor guidance, projected payouts.
  - [ ] 4.9 Import/Export UI: CSV import dialog with preview/errors; JSON/CSV export controls.
  - [ ] 4.10 Accessibility: keyboard navigation, focus states, ARIA labels, color-blind palettes.
  - [ ] 4.11 Performance: pagination/virtualization for long lists; debounce recalculations; skeleton loaders.

- [ ] 5.0 Analytics and Calculations
  - [ ] 5.1 Implement XIRR using financial libraries (xirr or similar) in Node.js; define cash flow sign conventions and dates.
  - [ ] 5.2 Add Excel parity tests for XIRR calculations; accept ±0.1% absolute difference.
  - [ ] 5.3 Compute net monthly cash flow: installment − dividend; expose historical series via PostgreSQL queries.
  - [ ] 5.4 Forecast future net cash flows using simple averages in Node.js; encapsulate for future upgrades.
  - [ ] 5.5 FD comparison: accept session FD rate, compute annualized benchmark vs fund XIRR using financial calculations.
  - [ ] 5.6 Document and surface assumptions in UI (tooltips/notes) for projections.

- [ ] 6.0 Import/Export with Validation and Preview
  - [ ] 6.1 Define CSV templates (funds, monthly entries, bids) with headers and data types for Node.js processing.
  - [ ] 6.2 Implement client-side file selection, parsing, and mapping preview.
  - [ ] 6.3 Server-side validation with Zod: line numbers, field errors, duplicate detection in Node.js.
  - [ ] 6.4 Display preview with error badges and only-validated rows ready to import.
  - [ ] 6.5 JSON export for full backup/restore from PostgreSQL; CSV export per-entity using Node.js streams.
  - [ ] 6.6 Add guardrails: size limits, safe error messages, and timeout handling for file uploads.

- [ ] 7.0 Charts and Visualizations
  - [ ] 7.1 Create Chart.js helper to standardize colors, legends, axis formats (INR, Indian grouping).
  - [ ] 7.2 Dashboard chart: Fund vs Profit bar chart using Chart.js; responsive on small screens; print-friendly.
  - [ ] 7.3 Fund Detail charts: cash flow over time, cumulative profit using Chart.js; accessible labels.
  - [ ] 7.4 Insights charts: historical winning bid/discount trend using Chart.js.
  - [ ] 7.5 Add data table alternatives for all Chart.js charts; ensure export to CSV/print.

- [ ] 8.0 Error Handling, Validation, and Edge Cases
  - [ ] 8.1 Centralized error boundary and toasts for API failures.
  - [ ] 8.2 Client-side validators mirroring server rules; inline field errors.
  - [ ] 8.3 Edge cases: mid-year start, early exit, editing past entries, multiple active funds, zero dividend months.
  - [ ] 8.4 Data validation for unrealistic inputs with warnings (not always blocking).
  - [ ] 8.5 Logging/monitoring hooks for unexpected conditions (non-PII).

- [ ] 9.0 Localization and Formatting
  - [ ] 9.1 Display currency as INR with Indian digit grouping everywhere.
  - [ ] 9.2 Dates in DD/MM/YYYY; month keys as YYYY-MM; consistent parsing and display.
  - [ ] 9.3 Print/export-friendly tables with correct number/date formats.

- [ ] 10.0 Testing, Performance, and Acceptance Criteria Verification
  - [ ] 10.1 Unit tests for formatters, validators, and API clients using Jest.
  - [ ] 10.2 Backend tests: Express.js auth, funds, entries, bids, CSV import, analytics endpoints with PostgreSQL.
  - [ ] 10.3 Frontend tests: flows for create fund, add entry, view analytics, CSV import.
  - [ ] 10.4 Accessibility tests for Chart.js charts and forms; contrast and keyboard navigation.
  - [ ] 10.5 Performance: load testing of Express.js analytics endpoints; profiling rendering on mobile.
  - [ ] 10.6 Verify acceptance criteria (AC1–AC8) with test cases and manual QA checklist.

***
