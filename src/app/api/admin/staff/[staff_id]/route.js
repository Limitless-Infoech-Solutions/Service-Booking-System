import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

async function findStaff(context, staffId) {
  return context.supabase
    .from("staff")
    .select("id, business_id, name, role, is_active, status, created_at")
    .eq("id", staffId)
    .eq("business_id", context.businessId)
    .maybeSingle();
}

export async function GET(request, { params }) {
  const { staff_id: staffId } = await params;
  const context = await authorizeBusinessAdmin(request);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    const { data: staff, error: staffError } = await findStaff(context, staffId);
    if (staffError) throw staffError;
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    const [assignmentsResult, hoursResult] = await Promise.all([
      context.supabase
        .from("staff_services")
        .select(
          "service_id, services!staff_services_service_business_fkey(id, name, price, duration_minutes, is_active, status)"
        )
        .eq("business_id", context.businessId)
        .eq("staff_id", staffId),
      context.supabase
        .from("business_hours")
        .select("day_of_week, is_open, open_time, close_time")
        .eq("business_id", context.businessId)
        .order("day_of_week", { ascending: true }),
    ]);

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (hoursResult.error) throw hoursResult.error;

    const assignments = assignmentsResult.data || [];
    return adminJson(context, {
      staff: {
        ...staff,
        assigned_services_count: assignments.length,
      },
      services: assignments.map((assignment) => assignment.services).filter(Boolean),
      business_hours: hoursResult.data || [],
    });
  } catch (error) {
    console.error("Staff details fetch error:", error);
    return adminJson(context, { error: "Failed to load staff details." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { staff_id: staffId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await authorizeBusinessAdmin(request, body?.business_id);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  const updates = {};
  for (const field of ["name", "role"]) {
    if (Object.hasOwn(body, field)) {
      if (typeof body[field] !== "string" || !body[field].trim() || body[field].trim().length > 100) {
        return adminJson(
          context,
          { error: `${field} must be a non-empty string of 100 characters or fewer.` },
          { status: 400 }
        );
      }
      updates[field] = body[field].trim();
    }
  }

  if (Object.hasOwn(body, "is_active")) {
    if (typeof body.is_active !== "boolean") {
      return adminJson(context, { error: "is_active must be a boolean." }, { status: 400 });
    }
    updates.is_active = body.is_active;
  }

  if (!Object.keys(updates).length) {
    return adminJson(context, { error: "No supported staff fields were provided." }, { status: 400 });
  }

  try {
    const { data: staff, error } = await context.supabase
      .from("staff")
      .update(updates)
      .eq("id", staffId)
      .eq("business_id", context.businessId)
      .select("id, business_id, name, role, is_active, status, created_at")
      .maybeSingle();

    if (error) throw error;
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    return adminJson(context, { staff });
  } catch (error) {
    console.error("Staff update error:", error);
    return adminJson(context, { error: "Failed to update staff member." }, { status: 500 });
  }
}
