import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { requireAuthorizedRole } from "@/lib/server/requireAuthorizedRole";

export async function POST(req: Request) {
  const access = await requireAuthorizedRole(req, ["sadmin"]);
  if (!access.ok) {
    return access.response;
  }

  const authClient = adminAuth;
  const database = adminDb;
  if (!authClient || !database) {
    return NextResponse.json(
      { error: "Firebase admin belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      uid: string;
      newEmail: string;
    };

    if (!body.uid || !body.newEmail) {
      return NextResponse.json({ error: "uid dan newEmail wajib diisi." }, { status: 400 });
    }

    await authClient.updateUser(body.uid, { email: body.newEmail });
    await database.ref(`accounts/users/${body.uid}/email`).set(body.newEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
