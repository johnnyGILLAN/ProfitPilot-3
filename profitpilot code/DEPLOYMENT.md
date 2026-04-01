# Deployment guide — Firebase (Hosting + Cloud Run)

This repository contains a Next.js frontend and Express backend which uses Firestore as the database. Below are recommended steps to host both in Firebase.

High-level approach
- Frontend (Next.js) — recommended hosting options:
  - Vercel (recommended - simplest for App Router) OR
  - Firebase Hosting + Cloud Run: build a production Node server envoy using Next.js `output: 'standalone'` and deploy the server portion to Cloud Run; use Firebase Hosting rewrites to Cloud Run for dynamic requests.

- Backend (Express) — deploy to Cloud Run or Cloud Functions for Firebase; Cloud Run is suggested for minimal configuration and compatibility with Node 18+.

Steps to deploy backend to Cloud Run
1. Ensure you have a Google Cloud project and Firebase configured: `firebase login` and `firebase init`.
2. Containerize the backend (or use Cloud Build) and deploy to Cloud Run.
3. Provide `GOOGLE_APPLICATION_CREDENTIALS` or use Workload Identity to allow Cloud Run service to access Firestore.
4. Configure the service id and region in `firebase.json` rewrites.

Where your app will be reachable after deploy
- Firebase Hosting: once deployed via `firebase deploy --only hosting` the primary addresses are:
  - https://<YOUR_FIREBASE_PROJECT>.web.app
  - https://<YOUR_FIREBASE_PROJECT>.firebaseapp.com

- Cloud Run backend: the command that deploys to Cloud Run returns the service URL (for example https://profitpilot-backend-xxxx.a.run.app). Use that value for `NEXT_PUBLIC_API_BASE_URL` in your frontend hosting configuration (or use Hosting rewrites to Cloud Run). 

To get a public preview while we work:
1. Add your Firebase project id to `.firebaserc` under `projects.default`.
2. Add a `FIREBASE_TOKEN` to GitHub Secrets (create a token with `firebase login:ci`) and add `GCP_SA_KEY` (service account JSON) and `JWT_SECRET`.
3. Use the `deploy.template.yml` as a base—rename it to a production deploy file and adjust region/service names.


Steps to deploy frontend with Hosting + Cloud Run
1. Build Next.js in production — produce a standalone Node server or use a static export if your app doesn't require server rendering.
2. Deploy the Node server to Cloud Run and point Hosting rewrites to it, or deploy static assets to Hosting directly.

Example: deploy backend using gcloud (simplified)
```powershell
# from backend folder
gcloud builds submit --tag gcr.io/YOUR_PROJECT/backend:latest
gcloud run deploy backend-service --image gcr.io/YOUR_PROJECT/backend:latest --region=us-central1 --allow-unauthenticated --set-env-vars "JWT_SECRET=..."
```

Important environment variables
- For backend: `JWT_SECRET`, `SERVICE_ACCOUNT_JSON` (or GOOGLE_APPLICATION_CREDENTIALS path), `NODE_ENV`.
- For frontend: `NEXT_PUBLIC_API_BASE_URL` should point to the public URL for your backend service (Cloud Run / Cloud Functions / other).

Security
- Never commit `service-account.json` or real secret values to the repo.
- Use Firebase/GCP secret managers or CI/CD variable stores in GitHub Actions to provide secrets.
