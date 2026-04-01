# Test Credentials for ProfitPilot

## Test User Account
- **Email**: test@test.com
- **Password**: password123
- **Name**: Test User
- **Role**: user

## Additional Test Account
- **Email**: newuser@test.com
- **Password**: password123
- **Name**: New User
- **Role**: user

## API Testing
```bash
# Login
curl -X POST "https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Register
curl -X POST "https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"New User","email":"new@test.com","password":"password123"}'
```

## Database
- MongoDB running locally on mongodb://localhost:27017/profitpilot
