# ProfitPilot - Complete Financial Tracker for Solopreneurs

## Product Overview
ProfitPilot is a comprehensive financial management platform for solopreneurs, freelancers, and small business owners.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts, next-themes
- **Backend**: Node.js/Express.js (proxied via FastAPI), MongoDB (Mongoose ODM)
- **Payments**: Stripe | **AI**: OpenAI GPT-4o (Emergent LLM Key) | **Email**: Resend | **FX Rates**: frankfurter.app

## All Features (Tested & Passing)
- Dashboard (KPIs, charts), Transactions (CRUD + multi-currency + USD conversion)
- Recurring Transactions, Invoices (CRUD + PDF), Clients (CRUD), Suppliers (CRUD)
- Reports, Data Export (CSV), Tax Calculator (11 countries), Categories
- **AI Insights** — GPT-4o analysis → **AI Goal + Budget Creation** (single click creates both)
- Goal Tracker (localStorage), Budget Tracker (MongoDB API)
- Admin Panel, Onboarding Flow, Email Notifications (Resend), Dark Mode
- Billing (Stripe), Settings (profile, security, notification toggles)

## AI Insights → Goals + Budgets Flow
1. User generates AI insights on /insights page
2. "Turn Insights into Action" card appears
3. User clicks "Create Goals & Budgets from Insights"
4. Backend POST /api/ai/generate-goals calls GPT-4o → returns goals[] + budgets[]
5. Goals saved to localStorage → visible in /goal-tracker
6. Budgets created via POST /api/budgets → visible in /budgets

## Credentials
- **Demo/Admin**: demo@profitpilot.com / demo123
- **Test**: test@test.com / password123

## Backlog
- Bank account integration (Plaid), Mobile app, Team collaboration
