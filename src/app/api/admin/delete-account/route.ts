import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { requireAuthorizedRole } from "@/lib/server/requireAuthorizedRole";

const ROLE_BUCKETS = ["sadmins", "admins", "users", "interns", "mentors"];

export async function POST(req: Request) {
  const access = await requireAuthorizedRole(req, ["sadmin"]);
  if (!access.ok) {
    return access.response;
  }

  const database = adminDb;
  const authClient = adminAuth;
  if (!database) {
    return NextResponse.json(
      { error: "Firebase admin belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as { uid?: string };
    const uid = body.uid?.trim();

    if (!uid) {
      return NextResponse.json({ error: "uid wajib diisi." }, { status: 400 });
    }

    const updates: Record<string, null> = {};
    for (const bucket of ROLE_BUCKETS) {
      updates[`accounts/${bucket}/${uid}`] = null;
    }

    await database.ref().update(updates);

    if (authClient) {
      try {
        await authClient.deleteUser(uid);
      } catch (error) {
        console.warn("Delete user auth skipped:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
