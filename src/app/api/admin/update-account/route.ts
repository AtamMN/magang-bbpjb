import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { requireAuthorizedRole } from "@/lib/server/requireAuthorizedRole";
import type { UserRoleType } from "@/types/auth";

const ROLE_COLLECTIONS: Array<{ key: string; role: UserRoleType }> = [
  { key: "sadmins", role: "sadmin" },
  { key: "admins", role: "admin" },
  { key: "users", role: "user" },
  { key: "interns", role: "intern" },
  { key: "mentors", role: "mentor" },
];

const ROLE_TO_BUCKET: Record<string, string> = {
  sadmin: "sadmins",
  admin: "admins",
  user: "users",
  intern: "interns",
  mentor: "mentors",
};

const ROLE_HIERARCHY: Record<string, number> = {
  sadmin: 4,
  admin: 3,
  user: 2,
  intern: 1,
  mentor: 1,
};

function canChangeRoleTo(currentUserRole: string, targetRole: string): boolean {
  const currentHierarchy = ROLE_HIERARCHY[currentUserRole];
  const targetHierarchy = ROLE_HIERARCHY[targetRole];

  if (currentUserRole === "sadmin") {
    return true;
  }

  if (currentUserRole === "admin") {
    return targetHierarchy <= currentHierarchy;
  }

  return false;
}

export async function POST(req: Request) {
  const access = await requireAuthorizedRole(req, ["sadmin", "admin"]);
  if (!access.ok) {
    return access.response;
  }

  const database = adminDb;
  if (!database) {
    return NextResponse.json(
      { error: "Firebase admin belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as { uid?: string; data?: { name?: string; email?: string; role?: string } };
    const uid = body.uid?.trim();
    const data = body.data;

    if (!uid || !data) {
      return NextResponse.json({ error: "uid dan data wajib diisi." }, { status: 400 });
    }

    // Find user bucket
    let targetBucket = null;
    let currentAccountData: any = null;
    for (const bucket of ROLE_COLLECTIONS) {
      const snapshot = await database.ref(`accounts/${bucket.key}/${uid}`).get();
      if (snapshot.exists()) {
        targetBucket = bucket.key;
        currentAccountData = snapshot.val();
        break;
      }
    }

    if (!targetBucket || !currentAccountData) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    // Prevent modifying an account that has higher or equal role if not sadmin
    // (e.g. admin modifying sadmin)
    const currentRole = currentAccountData.role;
    if (
      access.role !== "sadmin" && 
      ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[access.role]
    ) {
      return NextResponse.json({ error: "Akses ditolak untuk mengedit akun ini." }, { status: 403 });
    }

    // If role is changing, check if allowed
    const nextRole = data.role || currentRole;
    if (nextRole !== currentRole) {
      if (!canChangeRoleTo(access.role, nextRole)) {
        return NextResponse.json({ error: "Akses ditolak untuk mengubah ke role tersebut." }, { status: 403 });
      }

      const nextBucket = ROLE_TO_BUCKET[nextRole];
      const payload = {
        ...currentAccountData,
        ...data,
        role: nextRole,
      };

      await database.ref(`accounts/${nextBucket}/${uid}`).set(payload);

      if (nextBucket !== targetBucket) {
        await database.ref(`accounts/${targetBucket}/${uid}`).remove();
      }
    } else {
      // Just update current bucket
      await database.ref(`accounts/${targetBucket}/${uid}`).update(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
