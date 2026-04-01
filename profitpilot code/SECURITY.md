# Secrets & environment management

This project uses Firebase (Firestore) and JWT secrets for server tokens. Do not commit service account JSON files or production secrets to the repository.

Recommended local and CI practices
- Local development: keep a local `backend/.env` with `JWT_SECRET` and either `GOOGLE_APPLICATION_CREDENTIALS` pointing to a downloaded service-account.json or `SERVICE_ACCOUNT_JSON` set in environment.
- Git: add `backend/service-account.json` and any `.env*` files to .gitignore (already configured).
- CI / Deploy: store secrets in your CI provider's encrypted variables (GitHub Secrets, GitLab CI variables, etc.). Use a small `GCP_SA_KEY` secret (base64 or JSON string) or use Workload Identity when deploying in Google Cloud.

Example recommended GitHub Secrets
- `GCP_SA_KEY` — the contents of your service account JSON used to access Firestore.
- `JWT_SECRET` — the backend JWT secret.
- `FIREBASE_PROJECT_ID` — your Firebase project id.
- `FIREBASE_TOKEN` — optional for Firebase CLI deploys.

Never put real secret JSON into your public repos. Prefer using CI-hosted secrets and GCP IAM / Workload Identity for production apps.
