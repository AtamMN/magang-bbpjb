import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { requireAuthorizedRole } from "@/lib/server/requireAuthorizedRole";

const ROLE_BUCKETS = ["sadmins", "admins", "users", "interns", "mentors"];

export async function POST(req: Request) {
  const access = await requireAuthorizedRole(req, ["sadmin", "admin"]);
  if (!access.ok) {
    return access.response;
  }

  const database = adminDb;
  const authClient = adminAuth;
  if (!database || !authClient) {
    return NextResponse.json(
      { error: "Firebase admin belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as { uid?: string; action?: "soft_delete" | "permanent_delete" | "restore" };
    const uid = body.uid?.trim();
    let action = body.action || "soft_delete";

    if (!uid) {
      return NextResponse.json({ error: "uid wajib diisi." }, { status: 400 });
    }

    // Force admin to only be able to soft delete
    if (access.role === "admin") {
      action = "soft_delete";
    }

    let targetBucket = null;
    for (const bucket of ROLE_BUCKETS) {
      const snapshot = await database.ref(`accounts/${bucket}/${uid}`).get();
      if (snapshot.exists()) {
        targetBucket = bucket;
        break;
      }
    }

    if (!targetBucket) {
      return NextResponse.json({ error: "Akun tidak ditemukan di database." }, { status: 404 });
    }

    if (action === "permanent_delete") {
      await database.ref(`accounts/${targetBucket}/${uid}`).remove();

      try {
        await authClient.deleteUser(uid);
      } catch (error) {
        console.warn("Delete user auth skipped:", error);
      }
    } else if (action === "restore") {
      await database.ref(`accounts/${targetBucket}/${uid}/isDeleted`).remove();

      try {
        await authClient.updateUser(uid, { disabled: false });
      } catch (error) {
        console.warn("Restore user auth skipped:", error);
      }
    } else {
      // soft_delete
      await database.ref(`accounts/${targetBucket}/${uid}`).update({ isDeleted: true });

      try {
        await authClient.updateUser(uid, { disabled: true });
      } catch (error) {
        console.warn("Disable user auth skipped:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
