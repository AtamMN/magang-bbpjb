import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";
import { requireAuthorizedRole } from "@/lib/server/requireAuthorizedRole";

export async function POST(req: Request) {
  const access = await requireAuthorizedRole(req, ["sadmin"]);
  if (!access.ok) {
    return access.response;
  }

  const authClient = adminAuth;
  if (!authClient) {
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

    await authClient.updateUser(body.uid, { password: body.newPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
