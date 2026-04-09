import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import type { UserRoleType } from "@/types/auth";

const ROLE_COLLECTIONS: Array<{ key: string; role: UserRoleType }> = [
  { key: "sadmins", role: "sadmin" },
  { key: "admins", role: "admin" },
  { key: "users", role: "user" },
  { key: "interns", role: "intern" },
  { key: "mentors", role: "mentor" },
  { key: "sadmin", role: "sadmin" },
  { key: "admin", role: "admin" },
  { key: "user", role: "user" },
  { key: "intern", role: "intern" },
  { key: "mentor", role: "mentor" },
];

const VALID_ROLES = new Set<UserRoleType>([
  "sadmin",
  "admin",
  "user",
  "intern",
  "mentor",
]);

function normalizeRole(value: unknown, fallbackRole: UserRoleType): UserRoleType {
  const normalized = String(value || "").trim().toLowerCase() as UserRoleType;
  if (VALID_ROLES.has(normalized)) {
    return normalized;
  }
  return fallbackRole;
}

async function resolveRoleByUid(uid: string): Promise<UserRoleType | null> {
  if (!adminDb) {
    return null;
  }

  for (const roleCollection of ROLE_COLLECTIONS) {
    const snapshot = await adminDb.ref(`accounts/${roleCollection.key}/${uid}`).get();
    if (!snapshot.exists()) {
      continue;
    }

    const roleData = snapshot.val() as { role?: unknown };
    return normalizeRole(roleData?.role, roleCollection.role);
  }

  return null;
}

export async function requireAuthorizedRole(
  req: Request,
  allowedRoles: UserRoleType[],
): Promise<{ ok: true; uid: string; role: UserRoleType } | { ok: false; response: NextResponse }> {
  if (!adminAuth || !adminDb) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Firebase admin belum dikonfigurasi." },
        { status: 503 },
      ),
    };
  }

  const authorizationHeader = req.headers.get("authorization") || "";
  if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Akses ditolak." }, { status: 401 }),
    };
  }

  const idToken = authorizationHeader.slice(7).trim();
  if (!idToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Akses ditolak." }, { status: 401 }),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const role = await resolveRoleByUid(decoded.uid);

    if (!role || !allowedRoles.includes(role)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Akses ditolak." }, { status: 403 }),
      };
    }

    return { ok: true, uid: decoded.uid, role };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Akses ditolak." }, { status: 401 }),
    };
  }
}
