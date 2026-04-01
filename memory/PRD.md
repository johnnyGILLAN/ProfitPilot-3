# ProfitPilot - Complete Financial Tracker for Solopreneurs

## Product Overview
ProfitPilot is a comprehensive financial management platform designed for solopreneurs, freelancers, coaches, and small business owners. It provides complete income/expense tracking, client management, invoice generation, tax estimation, and goal tracking.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Recharts, next-themes
- **Backend**: Node.js/Express.js (proxied via FastAPI), MongoDB (Mongoose ODM)
- **Payments**: Stripe Checkout integration
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations)
- **Email**: Resend (notification emails)
- **Exchange Rates**: frankfurter.app (free, no API key)
- **Authentication**: JWT-based auth with bcryptjs

## Architecture
```
/app/
├── backend/
│   ├── models/ (MongoDB: User, Transaction, Invoice, RecurringTransaction, etc.)
│   ├── controllers/ (Express: auth, transactions, recurring, export, etc.)
│   ├── routes/ (Express routes)
│   ├── index.js (Express server on port 8002, subprocess)
│   └── server.py (FastAPI on port 8001 - proxies to Express, handles AI/Stripe/Admin/Exchange/Notifications natively)
├── frontend/
│   ├── src/app/ (Next.js 15 app router)
│   │   ├── (app)/ (Dashboard, transactions, recurring, insights, export, tax-calculator, admin, etc.)
│   │   └── (auth)/ (Login, Register)
│   ├── src/components/ (React UI: theme-toggle, onboarding-flow, client-providers, etc.)
│   ├── src/config/site.ts (Navigation config - 12 main + 4 secondary items)
│   └── .env.local (NEXT_PUBLIC_API_BASE_URL)
```

## Features Implemented (All Tested, All Passing)

### Core Financial Features
- Dashboard with KPI cards, interactive charts (bar, line, pie), recent transactions, pending invoices
- Transactions - Full CRUD with multi-currency support (17 currencies)
- Currency Conversion - Live exchange rates, USD equivalent shown for foreign-currency transactions
- Recurring Transactions - Create, manage, toggle, process recurring income/expenses
- Invoices - Create, track, mark paid, PDF generation/download
- Reports - Revenue/expense breakdown, profit margins, monthly trends
- Categories - Custom income/expense categories with color coding
- Data Export - CSV export for transactions (with currency), invoices, clients, financial reports

### Business Intelligence
- AI Financial Insights - GPT-4o analysis of spending patterns, income sources, recommendations
- Dashboard Charts - Monthly income vs expenses (bar), profit trend (line), category breakdown (pie)

### Tax & Finance
- Tax Calculator - 11 countries with real tax brackets (USA, UK, Canada, Germany, France, Australia, India, Netherlands, UAE, Singapore, Japan)
- Multi-Currency Support - 17 currencies on transactions with proper formatting and symbols
- Budgets - Set spending limits, track progress, over-budget alerts
- Goal Tracker - Financial goals with progress tracking

### Platform Management
- Admin Panel - System-wide stats (users, transactions, invoices, revenue), user management with role assignment
- Onboarding Flow - 5-step interactive walkthrough for first-time users (localStorage persisted)
- Email Notifications - Resend integration with user toggles (master, transaction alerts, weekly reports, overdue reminders)

### UX & Accessibility
- Dark Mode - Full dark theme with one-click toggle (persisted via next-themes)
- Responsive sidebar navigation with 12 main items + 4 secondary items

### Payments & Account
- Billing - Stripe subscription plans (Starter/Pro/Enterprise)
- Settings - Profile, security, notification preferences, subscription management
- Authentication - Login, register, password change

## API Endpoints Summary
- Auth (5): register, login, me, profile, change-password
- Transactions (6): CRUD + stats
- Recurring (5): CRUD + process + toggle
- Invoices (7): CRUD + mark paid + PDF
- Clients (5): CRUD
- Categories (4): CRUD
- Budgets (4): CRUD
- Export (4): transactions, invoices, clients, report (CSV)
- Exchange Rates (2): rates, convert
- Admin (3): stats, users, update-role
- Notifications (3): preferences (GET/PUT), send-test
- Payments (4): packages, checkout, status, webhook
- AI (2): insights, cached insights

## Credentials
- **Demo/Admin**: demo@profitpilot.com / demo123 (role: admin)
- **Test**: test@test.com / password123 (role: user)

## Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `STRIPE_API_KEY`: Stripe test key
- `EMERGENT_LLM_KEY`: Emergent LLM key for AI insights
- `RESEND_API_KEY`: Resend API key for email notifications (optional - graceful fallback if not set)
- `SENDER_EMAIL`: Email sender address (default: onboarding@resend.dev)

## Completed All Phases
- [x] Phase 1: Core CRUD, Auth, Stripe, Dashboard Charts
- [x] Phase 2: Recurring Transactions, AI Insights, Data Export, Dark Mode, Multi-Currency, Tax Calculator Countries
- [x] Phase 3: Admin Panel, Onboarding Flow, Email Notifications, Currency Conversion

## Remaining Backlog
- Bank account integration (Plaid)
- Mobile app
- Team collaboration
