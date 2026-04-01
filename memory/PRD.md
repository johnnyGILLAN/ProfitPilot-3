# ProfitPilot - Complete Financial Tracker for Solopreneurs

## Product Overview
ProfitPilot is a comprehensive financial management platform designed for solopreneurs, freelancers, coaches, and small business owners.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts, next-themes
- **Backend**: Node.js/Express.js (proxied via FastAPI), MongoDB (Mongoose ODM)
- **Payments**: Stripe Checkout | **AI**: OpenAI GPT-4o (Emergent LLM Key)
- **Email**: Resend | **Exchange Rates**: frankfurter.app | **Auth**: JWT + bcryptjs

## Architecture
```
backend/
├── models/ (User, Transaction, Invoice, Client, Supplier, Category, Budget, RecurringTransaction)
├── controllers/ (auth, transactions, recurring, export, clients, suppliers, invoices, categories, budgets)
├── routes/ (Express routes for all controllers)
├── index.js (Express on port 8002)
└── server.py (FastAPI on port 8001 - proxies to Express, handles AI/Stripe/Admin/Exchange/Notifications)
frontend/
├── src/app/(app)/ (dashboard, transactions, recurring, insights, export, tax-calculator, admin, suppliers, clients, etc.)
├── src/components/ (theme-toggle, onboarding-flow, UI components)
└── src/config/site.ts (13 main + 4 secondary nav items)
```

## All Features (Tested & Passing)
- Dashboard (KPIs, charts), Transactions (CRUD + multi-currency + USD conversion)
- Recurring Transactions, Invoices (CRUD + PDF), Clients (CRUD), **Suppliers (CRUD)**
- Reports, AI Insights, Data Export (CSV), Tax Calculator (11 countries)
- Admin Panel, Onboarding Flow, Email Notifications (Resend), Dark Mode
- Billing (Stripe), Settings, Categories, Budgets, Goal Tracker

## Credentials
- **Demo/Admin**: demo@profitpilot.com / demo123
- **Test**: test@test.com / password123

## Backlog
- Bank account integration (Plaid)
- Mobile app
- Team collaboration
