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
- **AI Insights** → **AI Goal + Budget Creation** (single click creates both)
- Goal Tracker (localStorage), Budget Tracker (MongoDB API)
- Admin Panel, Onboarding Flow, Email Notifications (Resend), Dark Mode
- Billing (Stripe), Settings (profile, security, notification toggles)
- **Full Responsive Design** — All 14+ pages tested at mobile (375px), tablet (768px), and desktop (1920px)

## Responsive Design Patterns
- `flex-col sm:flex-row` for mobile wrapping on list items
- `w-full sm:w-[180px]` for filter selects
- `grid sm:grid-cols-2 lg:grid-cols-4` for stats cards
- `flex-wrap` for button groups
- `min-w-0 truncate` for text overflow handling
- Sidebar collapses to hamburger menu on mobile

## Credentials
- **Demo/Admin**: demo@profitpilot.com / demo123
- **Test**: test@test.com / password123

## Backlog
- Bank account integration (Plaid), Mobile app, Team collaboration
