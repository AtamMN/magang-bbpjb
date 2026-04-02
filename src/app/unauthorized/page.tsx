import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card variant="elevated" className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle>Akses Ditolak</CardTitle>
          <CardDescription>
            Akun Anda tidak memiliki izin untuk mengakses halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/dashboard">
            <Button>Kembali ke Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
