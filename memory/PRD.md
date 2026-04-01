# ProfitPilot - Complete Financial Tracker for Solopreneurs

## Product Overview
ProfitPilot is a comprehensive financial management platform designed for solopreneurs, freelancers, coaches, and small business owners. It provides complete income/expense tracking, client management, invoice generation, tax estimation, and goal tracking.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Recharts
- **Backend**: Node.js/Express.js (proxied via FastAPI), MongoDB (Mongoose ODM)
- **Payments**: Stripe Checkout integration
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations)
- **Authentication**: JWT-based auth with bcryptjs

## Architecture
```
/app/
├── backend/
│   ├── models/ (MongoDB models: User, Transaction, Invoice, etc.)
│   ├── controllers/ (Express logic: auth, transactions, recurring, export, etc.)
│   ├── routes/ (Express routes)
│   ├── index.js (Express server on port 8002, subprocess)
│   └── server.py (FastAPI on port 8001, proxies to Express, handles AI/Stripe natively)
├── frontend/
│   ├── src/app/ (Next.js 15 app router)
│   │   ├── (app)/ (Dashboard, transactions, recurring, insights, export, etc.)
│   │   └── (auth)/ (Login, Register)
│   ├── src/components/ (React UI components)
│   ├── src/config/site.ts (Navigation config)
│   └── .env.local (NEXT_PUBLIC_API_BASE_URL)
```

## Features Implemented

### Core Financial Features
- Dashboard with KPI cards, interactive charts (bar, line, pie), recent transactions, pending invoices
- Transactions - Full CRUD, categories, tags, filtering, search
- Recurring Transactions - Create, manage, toggle, process recurring income/expenses
- Invoices - Create, track, mark paid, PDF generation/download
- Reports - Revenue/expense breakdown, profit margins, monthly trends
- Categories - Custom income/expense categories with color coding

### Business Intelligence
- AI Financial Insights - GPT-4o powered analysis of spending patterns, income sources, recommendations
- Dashboard Charts - Monthly income vs expenses (bar), profit trend (line), category breakdown (pie)
- Data Export - CSV export for transactions, invoices, clients, and financial reports with filters

### Business Management
- Clients (CRM) - Full client management with contacts, companies, notes
- Budgets - Set spending limits, track progress, over-budget alerts
- Goal Tracker - Financial goals with progress tracking

### Financial Planning
- Tax Calculator - Self-employment tax estimation, quarterly payments
- Billing - Stripe subscription plans (Starter/Pro/Enterprise)

### Account Management
- Settings - Profile, security, notifications, subscription
- Authentication - Login, register, password change

## API Endpoints (35+ Total)

### Auth (5): POST register, POST login, GET me, PUT profile, PUT change-password
### Transactions (6): CRUD + stats
### Recurring (5): CRUD + process + toggle
### Invoices (7): CRUD + mark paid + PDF
### Clients (5): CRUD
### Categories (4): CRUD
### Budgets (4): CRUD
### Export (4): GET transactions, invoices, clients, report (all CSV)
### Payments (4): packages, checkout, status, webhook
### AI (2): POST insights, GET cached insights

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
- [x] Data Export (backend + frontend with CSV download)
- [x] Dashboard Charts (bar, line, pie charts with recharts)
- [x] Navigation wiring (all new pages in sidebar)

## Upcoming Tasks (P1)
- [ ] Dark Mode - Theme toggle with TailwindCSS dark mode support
- [ ] Multi-Currency Support - Currency selection per transaction with conversion display

## Future Tasks (P2)
- [ ] Admin Panel - User management, system overview for admin role
- [ ] Onboarding Flow - First-time user walkthrough/tutorial
- [ ] Email Notifications - Transaction alerts, invoice reminders

## Backlog
- Bank account integration (Plaid)
- Mobile app
- Team collaboration
