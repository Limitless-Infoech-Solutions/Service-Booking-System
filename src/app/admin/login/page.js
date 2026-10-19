import AdminLoginPageClient from "@/components/admin/AdminLoginPage";

function getSafeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/admin";
  }

  try {
    const parsed = new URL(value, "https://local.invalid");
    if (parsed.origin !== "https://local.invalid" || parsed.pathname === "/admin/login") {
      return "/admin";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/admin";
  }
}

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  return <AdminLoginPageClient returnTo={getSafeReturnTo(params?.returnTo)} />;
}
