# ProfitPilot - Financial Tracker App

## Original Problem Statement
User requested to unzip and deploy a financial tracker app (ProfitPilot) for solopreneurs, coaches, e-commerce sellers, and freelancers.

## Architecture
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js/Express.js proxied through FastAPI (for platform compatibility)
- **Database**: MongoDB (local instance)
- **Authentication**: JWT-based auth

## Tech Stack
- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI
- Backend: Express.js, Node.js
- Database: MongoDB (Mongoose ODM)
- Auth: JWT tokens, bcryptjs for password hashing

## User Personas
1. **Solopreneurs**: Track business income and expenses
2. **Freelancers**: Manage client payments and project costs
3. **Coaches**: Monitor coaching session revenue
4. **E-commerce Sellers**: Track sales and inventory costs

## Core Requirements (Static)
- [x] User authentication (login/register)
- [x] Dashboard with financial KPIs
- [x] Transaction tracking
- [x] User profile management

## What's Been Implemented (Jan 2026)
- [x] JWT-based authentication system
- [x] User registration with password hashing
- [x] User login with token generation
- [x] Dashboard page with KPI cards
- [x] Navigation sidebar with menu items
- [x] Login page with form validation
- [x] Register page with form validation
- [x] Auth context for state management
- [x] API proxy from Python/FastAPI to Node.js backend
- [x] **Stripe Payment Integration**
  - Billing page with 3 subscription tiers (Starter $29, Professional $79, Enterprise $199)
  - Secure checkout session creation
  - Payment status tracking
  - Payment success/cancel pages
  - Transaction history stored in MongoDB

## Prioritized Backlog
### P0 (Critical)
- None currently

### P1 (High Priority)
- [ ] Implement transactions CRUD
- [ ] Real financial data integration
- [ ] User profile edit functionality

### P2 (Medium Priority)
- [ ] Invoice generation
- [ ] Monthly summary reports
- [ ] Financial insights/analytics
- [ ] Budget planning

### P3 (Low Priority)
- [ ] Tax calculator
- [ ] Goal tracker
- [ ] Data import/export
- [ ] AI chat support

## API Endpoints
### Auth
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user (protected)
- PUT /api/auth/profile - Update profile (protected)
- PUT /api/auth/change-password - Change password (protected)

### Payments (Stripe)
- GET /api/payments/packages - List available subscription plans
- POST /api/payments/checkout - Create Stripe checkout session
- GET /api/payments/status/{session_id} - Get payment status
- GET /api/payments/history - Get payment history
- POST /api/webhook/stripe - Stripe webhook handler

## Next Tasks
1. Implement transactions API and UI
2. Connect dashboard KPIs to real data
3. Add user settings page
4. Implement invoice generation
