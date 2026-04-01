const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK using the path set in GOOGLE_APPLICATION_CREDENTIALS
// or via the SERVICE_ACCOUNT_JSON environment variable (JSON string).
function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length > 0) return admin;

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  } else if (process.env.SERVICE_ACCOUNT_JSON) {
    try {
      const creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } catch (e) {
      console.error('Failed to parse SERVICE_ACCOUNT_JSON:', e);
      throw e;
    }
  } else {
    // Let firebase-admin try default credentials (useful in CI / deployed environments)
    admin.initializeApp();
  }

  return admin;
}

const adminApp = initFirebaseAdmin();
const firestore = adminApp.firestore();

module.exports = { admin: adminApp, firestore };
