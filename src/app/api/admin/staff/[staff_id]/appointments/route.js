import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request, { params }) {
  const { staff_id: staffId } = await params;
  const { searchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(request, searchParams.get("business_id"));
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  const period = searchParams.get("period") || "upcoming";
  if (!["upcoming", "past"].includes(period)) {
    return adminJson(context, { error: "period must be upcoming or past." }, { status: 400 });
  }

  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
  const pageSize = 10;

  try {
    const { data: staff, error: staffError } = await context.supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .eq("business_id", context.businessId)
      .maybeSingle();

    if (staffError) throw staffError;
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    let query = context.supabase
      .from("appointments")
      .select(
        `id, customer_id, start_time, end_time, status, customers!appointments_customer_id_fkey(id, name), appointment_services!inner(id, staff_id, service_id, duration_minutes, services(id, name))`,
        { count: "exact" }
      )
      .eq("business_id", context.businessId)
      .eq("appointment_services.staff_id", staffId);

    query = period === "upcoming"
      ? query.gte("start_time", now).order("start_time", { ascending: true })
      : query.lt("start_time", now).order("start_time", { ascending: false });

    const first = (page - 1) * pageSize;
    const { data, error, count } = await query.range(first, first + pageSize - 1);
    if (error) throw error;

    const uniqueAppointments = [...new Map((data || []).map((item) => [item.id, item])).values()];
    const total = count || 0;

    return adminJson(context, {
      appointments: uniqueAppointments,
      pagination: {
        page,
        per_page: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
      time_zone: "Asia/Kolkata",
    });
  } catch (error) {
    console.error("Staff appointment history fetch error:", error);
    return adminJson(context, { error: "Failed to load appointment history." }, { status: 500 });
  }
}
