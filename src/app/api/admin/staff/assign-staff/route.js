import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(request, searchParams.get("business_id"));
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    let query = context.supabase
      .from("staff")
      .select("id, name, role, is_active, status, created_at")
      .eq("business_id", context.businessId)
      .order("name", { ascending: true });
    if (searchParams.get("active") !== "all") query = query.eq("is_active", true);
    if (searchParams.get("all") !== "true") query = query.range(0, 99);

    const { data: staff, error } = await query;
    if (error) throw error;

    const staffIds = (staff || []).map((member) => member.id);
    let assignments = [];
    if (staffIds.length) {
      const { data, error: assignmentError } = await context.supabase
        .from("staff_services")
        .select("staff_id")
        .eq("business_id", context.businessId)
        .in("staff_id", staffIds);
      if (assignmentError) throw assignmentError;
      assignments = data || [];
    }

    const counts = new Map();
    for (const assignment of assignments) {
      counts.set(assignment.staff_id, (counts.get(assignment.staff_id) || 0) + 1);
    }
    return adminJson(context, {
      staff: (staff || []).map((member) => ({
        ...member,
        assigned_services_count: counts.get(member.id) || 0,
      })),
    });
  } catch (error) {
    console.error("Staff fetch error:", error);
    return adminJson(context, { error: "Failed to load staff." }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await authorizeBusinessAdmin(request, body?.business_id);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  const { service_id: serviceId, staff_ids: requestedStaffIds } = body || {};
  if (!serviceId || !Array.isArray(requestedStaffIds)) {
    return adminJson(context, { error: "service_id and staff_ids are required." }, { status: 400 });
  }
  if (requestedStaffIds.some((id) => typeof id !== "string" || !id.trim())) {
    return adminJson(context, { error: "staff_ids must contain valid staff IDs." }, { status: 400 });
  }

  try {
    const staffIds = [...new Set(requestedStaffIds)];
    const { data: service, error: serviceError } = await context.supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("business_id", context.businessId)
      .maybeSingle();
    if (serviceError) throw serviceError;
    if (!service) {
      return adminJson(context, { error: "Service not found for this business." }, { status: 404 });
    }

    if (staffIds.length) {
      const { data: validStaff, error: staffError } = await context.supabase
        .from("staff")
        .select("id")
        .eq("business_id", context.businessId)
        .in("id", staffIds);
      if (staffError) throw staffError;
      if ((validStaff || []).length !== staffIds.length) {
        return adminJson(context, { error: "One or more staff members do not belong to this business." }, { status: 400 });
      }
    }

    const { data: existingRows, error: existingError } = await context.supabase
      .from("staff_services")
      .select("staff_id")
      .eq("business_id", context.businessId)
      .eq("service_id", serviceId);
    if (existingError) throw existingError;

    const currentIds = [...new Set((existingRows || []).map((row) => row.staff_id))];
    const idsToAdd = staffIds.filter((id) => !currentIds.includes(id));
    const idsToRemove = currentIds.filter((id) => !staffIds.includes(id));

    if (idsToAdd.length) {
      const { error } = await context.supabase.from("staff_services").insert(
        idsToAdd.map((staff_id) => ({
          business_id: context.businessId,
          service_id: serviceId,
          staff_id,
        }))
      );
      if (error) throw error;
    }

    if (idsToRemove.length) {
      const { error } = await context.supabase
        .from("staff_services")
        .delete()
        .eq("business_id", context.businessId)
        .eq("service_id", serviceId)
        .in("staff_id", idsToRemove);

      if (error) {
        if (idsToAdd.length) {
          const { error: rollbackError } = await context.supabase
            .from("staff_services")
            .delete()
            .eq("business_id", context.businessId)
            .eq("service_id", serviceId)
            .in("staff_id", idsToAdd);
          if (rollbackError) console.error("Staff assignment rollback failed:", rollbackError);
        }
        throw error;
      }
    }

    return adminJson(context, {
      message: "Staff assignments saved successfully",
      service_id: serviceId,
      staff_ids: staffIds,
    });
  } catch (error) {
    console.error("Assign staff API error:", error);
    return adminJson(context, { error: "Failed to save staff assignments." }, { status: 500 });
  }
}
