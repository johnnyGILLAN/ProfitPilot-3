# ProfitPilot - Complete Financial Tracker for Solopreneurs

## Product Overview
ProfitPilot is a comprehensive financial management platform designed for solopreneurs, freelancers, coaches, and small business owners. It provides complete income/expense tracking, client management, invoice generation, tax estimation, and goal tracking.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Recharts, next-themes
- **Backend**: Node.js/Express.js (proxied via FastAPI), MongoDB (Mongoose ODM)
- **Payments**: Stripe Checkout integration
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations)
- **Authentication**: JWT-based auth with bcryptjs

## Architecture
```
/app/
├── backend/
│   ├── models/ (MongoDB: User, Transaction, Invoice, RecurringTransaction, etc.)
│   ├── controllers/ (Express: auth, transactions, recurring, export, etc.)
│   ├── routes/ (Express routes)
│   ├── index.js (Express server on port 8002, subprocess)
│   └── server.py (FastAPI on port 8001, proxies to Express, handles AI/Stripe)
├── frontend/
│   ├── src/app/ (Next.js 15 app router)
│   │   ├── (app)/ (Dashboard, transactions, recurring, insights, export, tax-calculator, etc.)
│   │   └── (auth)/ (Login, Register)
│   ├── src/components/ (React UI + theme-toggle, client-providers)
│   ├── src/config/site.ts (Navigation config)
│   └── .env.local (NEXT_PUBLIC_API_BASE_URL)
```

## Features Implemented

### Core Financial Features
- Dashboard with KPI cards, interactive charts (bar, line, pie), recent transactions, pending invoices
- Transactions - Full CRUD with multi-currency support (17 currencies)
- Recurring Transactions - Create, manage, toggle, process recurring income/expenses
- Invoices - Create, track, mark paid, PDF generation/download
- Reports - Revenue/expense breakdown, profit margins, monthly trends
- Categories - Custom income/expense categories with color coding

### Business Intelligence
- AI Financial Insights - GPT-4o analysis of spending patterns, income sources, recommendations
- Dashboard Charts - Monthly income vs expenses (bar), profit trend (line), category breakdown (pie)
- Data Export - CSV export for transactions (with currency), invoices, clients, financial reports

### Tax & Finance
- Tax Calculator - 11 countries with real tax brackets (USA, UK, Canada, Germany, France, Australia, India, Netherlands, UAE, Singapore, Japan)
- Multi-Currency Support - 17 currencies on transactions with proper formatting and symbols
- Budgets - Set spending limits, track progress, over-budget alerts
- Goal Tracker - Financial goals with progress tracking

### Business Management
- Clients (CRM) - Full client management with contacts, companies, notes
- Billing - Stripe subscription plans (Starter/Pro/Enterprise)

### UX & Accessibility
- Dark Mode - Full dark theme with one-click toggle (persisted via next-themes)
- Responsive sidebar navigation with 12 main items + 4 secondary items

### Account Management
- Settings - Profile, security, notifications, subscription
- Authentication - Login, register, password change

## Supported Currencies
USD, EUR, GBP, JPY, CAD, AUD, INR, AED, SGD, CHF, SEK, NOK, DKK, NZD, BRL, MXN, ZAR

## Tax Calculator Countries
USA, UK, Canada, Germany, France, Australia, India, Netherlands, UAE, Singapore, Japan

## Credentials
- **Demo**: demo@profitpilot.com / demo123
- **Test**: test@test.com / password123

## Live URL
https://ai-insights-stage.preview.emergentagent.com

## Completed Tasks
- [x] Core CRUD (transactions, invoices, clients, budgets, categories)
- [x] JWT Authentication
- [x] Stripe Payment Integration
- [x] Recurring Transactions (backend + frontend)
- [x] AI Insights (backend + frontend)
- [x] Data Export (backend CSV + frontend download UI)
- [x] Dashboard Charts (bar, line, pie charts with recharts)
- [x] Navigation wiring (all new pages in sidebar)
- [x] Dark Mode (next-themes, class-based, persisted)
- [x] Multi-Currency Support (17 currencies on transactions)
- [x] Tax Calculator Country Selection (11 countries with real tax brackets)

## Upcoming Tasks (P2)
- [ ] Admin Panel - User management, system overview for admin role
- [ ] Onboarding Flow - First-time user walkthrough/tutorial
- [ ] Email Notifications - Transaction alerts, invoice reminders

## Backlog
- Bank account integration (Plaid)
- Mobile app
- Team collaboration
