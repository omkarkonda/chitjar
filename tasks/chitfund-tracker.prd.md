
# PRD: Chit Fund Tracker Web App

## 1. Introduction/Overview
Build a mobile-first web app for individuals in India to track personal chit fund investments. Users can set up funds, log monthly dividends and prize money, and view analytics including ROI, XIRR, cash flow forecasting, and FD comparisons. The app also provides strategic bidding insights using historical bids and manual inputs.

Goal: Enable a first-time user to set up a fund and get accurate return metrics (including XIRR) and actionable bidding/forecast insights, with clarity suitable for non-finance users.

Primary user: Individual retail participant in Indian chit funds.

Scope: Frontend-focused web app (mobile-first), with mixed computation (client + server) and cloud backend for persistence.

## 2. Goals
- G1: Allow a user to create and manage multiple chit funds with required setup fields.
- G2: Enable monthly entries for dividends and optional prize money; auto-mark months as paid.
- G3: Provide analytics per fund: net amount, ROI, average monthly dividend, months to completion.
- G4: Provide advanced analytics: XIRR, future value projection, cash flow analysis with simple forecasting, and FD comparison via user-entered rate.
- G5: Offer strategic bidding insights from manual and CSV-imported historical winning bids.
- G6: Achieve XIRR accuracy comparable to Excel within a reasonable tolerance.
- G7: Mobile-first UI with clear, minimal design and accessible charts.

Success constraints:
- Platform: Mobile-first web app (PWA-friendly posture, but no explicit offline-first in v1).
- Data: Cloud database with an option to start locally and migrate later (3d).
- Privacy/Security: Encrypt at rest; basic auth.

## 3. User Stories
- As a user, I can create a fund by entering fund name, chit value, monthly installment, number of members, start date, and an optional goal, so I can start tracking.
- As a user, I can log monthly dividend and optional prize money, and the month becomes marked as paid automatically, so my records stay consistent.
- As a user, I can view a dashboard with total profit and a fund vs. profit graph, so I understand overall performance.
- As a user, I can view a list of my funds with key details and tap into an individual fund view for deep analytics.
- As a user, I can see net amount, ROI, average monthly dividend, and months to completion for a specific fund, so I can track progress.
- As a user, I can compare my fund’s XIRR against a user-entered FD rate on the fund page, so I can benchmark performance.
- As a user, I can import historical winning bids via CSV or input them manually, so I can get better strategic bidding insights.
- As a user, I can see projected payouts at different months and simple goal-based advice (borrower vs investor), so I can decide when to bid.
- As a user, I can export my data (CSV and JSON) to back up or analyze elsewhere.
- As a user, I can view charts that are readable on mobile and accessible to color-blind users.

## 4. Functional Requirements
4.1 Authentication and Privacy
1) The system must support basic user accounts (email/password or OAuth) with each user seeing only their data.
2) All cloud-stored data must be encrypted at rest.

4.2 Fund Setup and Management
3) The system must allow creating a fund with: Fund Name (unique per user), Chit Value, Monthly Installment, Number of Members, Start Date (DD/MM/YYYY), Goal (optional).
4) The system must validate inputs (e.g., positive numbers, realistic ranges, start date not in far past/future).
5) The system must allow editing fund setup fields (except unique constraints) with audit-safe recalculations.
6) The system must list all funds with key details: name, chit value, monthly installment, progress (months paid/total).

4.3 Monthly Data Entry
7) The system must allow monthly entries of Dividend Received (required) and Prize Money Received (optional).
8) Upon saving a monthly entry, the month must be marked as “paid.”
9) The system must allow editing or deleting past monthly entries and reflect recalculations accordingly.
10) The system must handle irregular dividends (zero or missing months), mid-year fund start, and early exit (fund closed before full term).

4.4 Dashboard
11) The system must display Total Profit across all active funds.
12) The system must show a Fund vs. Profit graph (bar or comparable) per fund.

4.5 Individual Fund View
13) The system must show a summary of fund setup details.
14) The system must compute and display: Net Amount, ROI, Average Monthly Dividend, Months to Completion.
15) The system must show a chronological list of monthly entries with clear indicators for paid/missing months.

4.6 Strategic Bidding Insights
16) The system must allow manual entry of historical winning bids per month for a fund.
17) The system must support importing a CSV of historical winning bids with validation and error reporting.
18) The system must display historical bidding trends (table + simple chart).
19) The system must provide goal-based strategy guidance for borrowers (early bidding) vs investors (later bidding).
20) The system must display projected payout examples at selected months based on entered or average discounts.
21) The system must clearly state assumptions used for projections.

4.7 Advanced Analytics
22) The system must compute XIRR for each fund using a known library or reliable server-side function; accuracy should be comparable to Excel within tolerance (see Acceptance Criteria).
23) The system must provide a simple future value at completion projection using current trends/assumptions documented in the UI.
24) The system must show cash flow analysis: net monthly payment = installment − dividend; visualize historically.
25) The system must forecast future net cash flows using a simple approach (start with averages; design to upgrade later).
26) The system must offer an FD comparison: user can input an FD rate for that session; display side-by-side with XIRR.

4.8 Charts and Visualization
27) The system must use a charting library (e.g., Chart.js/ECharts/Recharts) for dashboard and fund views.
28) Charts must be accessible (color-blind friendly palette) and readable on mobile.
29) Provide both charts and tables where possible; tables must be export/print friendly.

4.9 Import/Export
30) The system must support CSV import/export for funds and monthly entries, with templates and validation.
31) The system must support JSON export for full backup/restore.
32) The system must provide import previews and error feedback (line numbers, reasons).

4.10 Localization and Formats
33) The system must display currency in INR and dates in DD/MM/YYYY.
34) Numbers must use Indian digit grouping where feasible (e.g., 1,00,000).

4.11 Tech/Architecture Notes (functional expectations)
35) Mixed computation model: simple calculations client-side; heavy/consistency-critical ones (e.g., XIRR and certain projections) may be computed server-side via API.
36) Ensure recalculation triggers on data edits, including retroactive monthly changes.

4.12 Error Handling and Validation
37) The system must validate inputs and handle unrealistic values (e.g., negative dividends, prize money > chit value).
38) The system must surface clear error messages and non-blocking warnings for suspicious data.

## 5. Non-Goals (Out of Scope for v1)
- Team sharing/collaboration.
- Bank integrations.
- Notifications/reminders.
- OCR/statement parsing.
- Multi-currency/i18n beyond INR and Indian date formats.
- Real-time sync/offline-first behavior.
- Complex time-series models beyond simple averages/upgrade-ready design.
- Native mobile apps (web only in v1).

## 6. Design Considerations
- Mobile-first, scales to desktop; minimal custom UI; clear and accessible.
- Use a standard, readable typography and spacing; emphasize data tables and compact cards.
- Color-blind friendly palettes for charts; ensure sufficient contrast.
- Provide concise tooltips explaining financial terms: dividend, prize money, discount, ROI, XIRR.
- Simple navigation: bottom nav (Dashboard, My Funds, Add, Insights) for mobile; left sidebar for desktop.
- Empty states with guided steps and sample data option.
- CSV templates downloadable from Import dialogs.

## 7. Technical Considerations
- Frontend: Plain HTML/CSS/JS acceptable per preference (4e); consider lightweight framework later if needed. Use TypeScript optionally for safety, but not required by selection.
- Backend: Cloud database with basic auth; consider Firebase/Supabase for rapid setup; server functions for XIRR and heavier calcs to ensure consistency.
- XIRR and financial math: Recommend using a known library or a backend function for reliability; validate against Excel.
- Forecasting: Start with simple average/moving average approach (8d), encapsulated to allow upgrading to exponential smoothing later.
- Data model suggestions:
  - users
  - funds: id, userId, name, chitValue, monthlyInstallment, members, startDate, goal, status (active/closed), createdAt, updatedAt
  - monthlyEntries: id, fundId, month (YYYY-MM), dividend, prizeMoney (optional), paid (bool), createdAt, updatedAt
  - bids: id, fundId, month (YYYY-MM), winningBidAmount/discount, notes, source (manual/csv)
  - settings: per-user preferences (e.g., default FD rate if ever expanded)
- Security: Encrypt at rest; HTTPS; basic rate limiting on APIs; input sanitation for CSV imports.
- Performance: Paginate or virtualize long monthly lists; debounce recalculations on edits.

## 8. Success Metrics
- SM1: XIRR accuracy within ±0.1% absolute difference compared to Excel for representative datasets.
- SM2: User can create a fund and add first monthly entry within 5 minutes on mobile.
- SM3: Import success rate > 95% for valid CSV files; clear error reporting for invalid rows.
- SM4: At least 70% of users engage with the FD comparison on first fund setup session (proxy for understanding returns).

## 9. Open Questions
- Should "Net Amount" include unrealized estimates for remaining months or only realized cash flows to date?
- For ROI calculation, confirm exact formula: simple (profit/total paid to date) vs annualized vs per-term?
- Define a default assumption for projected payouts (e.g., use average historical discount vs user-entered scenarios).
- Early exit handling: what is the data flow when a fund is closed prematurely? Any settlement entries?

## 10. Acceptance Criteria (derived from selections and goals)
- AC1: User can create a fund with required fields; invalid inputs show clear messages.
- AC2: Adding a monthly entry marks the month as paid and updates analytics immediately.
- AC3: Dashboard shows Total Profit and a Fund vs. Profit chart on mobile and desktop.
- AC4: Individual Fund View shows Net Amount, ROI, Avg Monthly Dividend, Months to Completion, XIRR, future value projection, cash flow chart, and FD comparison with user-entered rate.
- AC5: Strategic Insights page allows manual and CSV import of historical winning bids; displays trends and simple goal-based guidance with assumptions explained.
- AC6: CSV and JSON import/export work with previews and validation.
- AC7: XIRR results match Excel within ±0.1% on test cases.
- AC8: All currency displayed in INR; dates in DD/MM/YYYY; charts use color-blind friendly palettes.

--- 
