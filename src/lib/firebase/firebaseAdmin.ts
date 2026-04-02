import admin from "firebase-admin";

let adminDb: admin.database.Database | null = null;
let adminAuth: admin.auth.Auth | null = null;

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL:
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
        serviceAccount.databaseURL ||
        "",
    });
  } catch (error) {
    console.error("Firebase admin initialization failed:", error);
  }
}

if (admin.apps.length) {
  adminDb = admin.database();
  adminAuth = admin.auth();
}

export { adminDb, adminAuth };
