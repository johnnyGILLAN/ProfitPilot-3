# ProfitPilot Backend

This is the complete backend for the ProfitPilot app, built with Express.js and MongoDB.

## 🚀 Features
- Authentication (JWT)
- File uploads
- Transactions, Invoices, KPIs
- Forecasting and Tax Estimations
- PDF Invoice Generator
- Modular route and controller structure
- Postman collection included

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/profitpilot-backend.git
cd profitpilot-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add environment variables
```bash
cp .env.example .env
```

### 4. Start the server
```bash
npm start
```

The server will run on `http://localhost:5000`.

---

## 🔗 How to Integrate with the Frontend (in VS Code)

### 1. Clone Frontend and Backend
Ensure both frontend (Next.js) and backend (this project) are cloned and opened in separate VS Code windows or folders.

### 2. Start the Backend Server
In the backend folder:
```bash
npm install
cp .env.example .env
npm start
```

### 3. Set the API Base URL in Frontend
In your frontend project, edit `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### 4. Make API Calls from Frontend
Use fetch/axios like this:
```js
const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await res.json();
```

---

## ✅ What's Included

- Express.js backend with modular structure
- JWT auth, bcrypt password hashing
- Multer for file uploads
- jsPDF for invoice PDF exports
- Nodemailer for email flows
- MongoDB models via Mongoose
- Postman collection (in `/postman`)
- Ready for deployment and testing

---

## 📬 Contact

For questions or support, open an issue or contact the ProfitPilot dev team.
