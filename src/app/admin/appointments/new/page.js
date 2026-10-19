import { redirect } from "next/navigation";

export default function NewAdminAppointmentPage() {
  redirect("/book/appointment?mode=admin");
}
