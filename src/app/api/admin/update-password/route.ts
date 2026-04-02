import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req: Request) {
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Firebase admin belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      uid: string;
      newPassword: string;
    };

    if (!body.uid || !body.newPassword) {
      return NextResponse.json({ error: "uid dan newPassword wajib diisi." }, { status: 400 });
    }

    await adminAuth.updateUser(body.uid, { password: body.newPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
