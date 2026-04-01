# Backend (Express) — local dev and Firestore integration

This backend is a simple Express app that uses Firestore (via `firebase-admin`) as the primary database and uses JWTs for authentication.

Quick setup (local development):

1. Install dependencies
```powershell
npm install
```

2. Provide Firebase credentials
- Option A: download a service account JSON from your Firebase project and set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the file path (e.g. `./service-account.json`).
- Option B: paste JSON into `SERVICE_ACCOUNT_JSON` environment variable (not recommended for prod).

3. Copy `.env.example` to `.env` and set `JWT_SECRET` and other vars.

4. Run the server
```powershell
npm run dev
```

The backend exposes:
- POST /auth/register -> { name, email, password }
- POST /auth/login -> { email, password } -> returns token + user
- POST /auth/request-password-reset -> { email } -> creates a short-lived token (in development token is returned)
- POST /auth/reset-password -> { token, newPassword }
- GET /profile -> requires Authorization: Bearer <token>

Deploy: you can host this with Firebase Cloud Run / Cloud Functions or any node host. Make sure to provide credentials via environment variables or use workload identity to access Firestore.
