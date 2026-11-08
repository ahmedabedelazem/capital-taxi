import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!projectId) {
    throw new Error("Firebase Admin is not configured: FIREBASE_PROJECT_ID is missing.");
  }

  if (serviceAccountJson) {
    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch {
      throw new Error("Firebase Admin service-account JSON is invalid.");
    }

    if (
      !serviceAccount.projectId ||
      serviceAccount.projectId !== projectId ||
      !serviceAccount.clientEmail ||
      !serviceAccount.privateKey
    ) {
      throw new Error("Firebase Admin service-account fields do not match the configured project.");
    }

    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  // On managed Google environments, Application Default Credentials may be used.
  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export function getServerAuth() {
  return getAuth(getFirebaseAdminApp());
}
