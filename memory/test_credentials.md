# Test Credentials for ProfitPilot

## Demo Account (For Investor Demos)
- **Email**: demo@profitpilot.com
- **Password**: demo123
- **Name**: Demo User
- **Company**: Demo Business LLC
- **Pre-loaded**: 24 transactions, 5 clients, 4 invoices, 10 categories

## Test User Account
- **Email**: test@test.com
- **Password**: password123
- **Name**: Test User
- **Role**: user

## API Testing Examples

```bash
# Login
curl -X POST "https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@profitpilot.com","password":"demo123"}'

# Get transactions (with token)
curl "https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com/api/transactions" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get financial stats
curl "https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com/api/transactions/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database
- MongoDB: mongodb://localhost:27017/profitpilot

## Stripe Test Mode
- Test card: 4242 4242 4242 4242
- Any future expiry date
- Any 3-digit CVC
