import admin from "firebase-admin";

let adminDb: admin.database.Database | null = null;
let adminAuth: admin.auth.Auth | null = null;

if (!admin.apps.length) {
  try {
    let serviceAccount: object | null = null;

    // Try to parse from FIREBASE_SERVICE_ACCOUNT JSON string first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    // Fallback to individual env vars
    else if (
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PROJECT_ID
    ) {
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || "",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "",
        universe_domain: "googleapis.com",
      };
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL:
          process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
      });
      console.log("[Firebase Admin] Initialized successfully");
    } else {
      console.warn(
        "[Firebase Admin] Skipped: No service account credentials provided. Set FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_* env vars.",
      );
    }
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error);
  }
}

if (admin.apps.length) {
  adminDb = admin.database();
  adminAuth = admin.auth();
}

export { adminDb, adminAuth };
