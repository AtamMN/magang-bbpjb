import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";

export async function POST(req: Request) {
  if (!adminAuth || !adminDb) {
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

    await adminAuth.updateUser(body.uid, { email: body.newEmail });
    await adminDb.ref(`accounts/users/${body.uid}/email`).set(body.newEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
