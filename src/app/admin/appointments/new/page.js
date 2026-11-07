import { redirect } from "next/navigation";

export default async function NewAdminAppointmentPage({ searchParams }) {
  const params = await searchParams;
  redirect(params?.type === "walk-in" ? "/book/appointment?mode=walk-in" : "/book/appointment?mode=admin");
}
