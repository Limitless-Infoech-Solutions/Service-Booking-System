"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminLoginModal from "@/components/admin/AdminLoginModal";

export default function AdminLoginPage({ returnTo }) {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <Link href="/" className="sr-only">Return to the public site</Link>
      <AdminLoginModal onClose={() => router.push("/")} returnTo={returnTo} />
    </main>
  );
}
