"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await login(email, password);
    if (!result.ok) {
      setError(result.message || "Login gagal.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <CardTitle>Masuk</CardTitle>
          <CardDescription>
            Gunakan akun Presensi Anda untuk mengakses dashboard magang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="nama@bbpjb.go.id"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Masukkan password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" isLoading={submitting}>
              Login
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            <Link href="/" className="font-medium text-[#00509D] hover:underline">
              Kembali ke beranda
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
