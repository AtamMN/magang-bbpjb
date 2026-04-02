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
      name: string;
      email: string;
      password: string;
      role?: string;
    };

    const role = body.role || "user";

    const userRecord = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: body.name,
    });

    await adminDb.ref(`accounts/users/${userRecord.uid}`).set({
      name: body.name,
      email: body.email,
      role,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
