import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

async function verifyStaff(context, staffId) {
  const { data, error } = await context.supabase
    .from("staff")
    .select("id, business_id, name, role, is_active, status")
    .eq("id", staffId)
    .eq("business_id", context.businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function readAssignments(context, staffId) {
  const { data, error } = await context.supabase
    .from("staff_services")
    .select("service_id")
    .eq("business_id", context.businessId)
    .eq("staff_id", staffId);

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.service_id))];
}

async function readStaff(context, staffId) {
  const { data, error } = await context.supabase
    .from("staff")
    .select("id, business_id, name, role, is_active, status, created_at")
    .eq("id", staffId)
    .eq("business_id", context.businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request, { params }) {
  const { staff_id: staffId } = await params;
  const context = await authorizeBusinessAdmin(request);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    const staff = await verifyStaff(context, staffId);
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    const [serviceIds, servicesResult] = await Promise.all([
      readAssignments(context, staffId),
      context.supabase
        .from("services")
        .select("id, name, price, duration_minutes, is_active, status")
        .eq("business_id", context.businessId)
        .order("name", { ascending: true }),
    ]);

    if (servicesResult.error) throw servicesResult.error;
    return adminJson(context, {
      staff,
      services: servicesResult.data || [],
      service_ids: serviceIds,
    });
  } catch (error) {
    console.error("Staff service assignments fetch error:", error);
    return adminJson(context, { error: "Failed to load service assignments." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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

  if (typeof body.service_id !== "string" || !body.service_id.trim()) {
    return adminJson(context, { error: "service_id is required." }, { status: 400 });
  }

  try {
    const staff = await verifyStaff(context, staffId);
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    const { data: service, error: serviceError } = await context.supabase
      .from("services")
      .select("id")
      .eq("id", body.service_id)
      .eq("business_id", context.businessId)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service) {
      return adminJson(context, { error: "Service not found for this business." }, { status: 404 });
    }

    const existingIds = await readAssignments(context, staffId);
    if (!existingIds.includes(body.service_id)) {
      const { error } = await context.supabase.from("staff_services").insert({
        business_id: context.businessId,
        staff_id: staffId,
        service_id: body.service_id,
      });
      if (error) throw error;
    }

    const [updatedStaff, serviceIds] = await Promise.all([
      readStaff(context, staffId),
      readAssignments(context, staffId),
    ]);

    return adminJson(context, { staff: updatedStaff, service_ids: serviceIds }, { status: 201 });
  } catch (error) {
    console.error("Staff service assignment create error:", error);
    return adminJson(context, { error: "Failed to assign service." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
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

  if (
    !Array.isArray(body.service_ids) ||
    body.service_ids.some((id) => typeof id !== "string" || !id.trim())
  ) {
    return adminJson(context, { error: "service_ids must be an array of service IDs." }, { status: 400 });
  }

  try {
    const staff = await verifyStaff(context, staffId);
    if (!staff) {
      return adminJson(context, { error: "Staff member not found." }, { status: 404 });
    }

    const serviceIds = [...new Set(body.service_ids)];
    if (serviceIds.length) {
      const { data: validServices, error } = await context.supabase
        .from("services")
        .select("id")
        .eq("business_id", context.businessId)
        .in("id", serviceIds);

      if (error) throw error;
      if ((validServices || []).length !== serviceIds.length) {
        return adminJson(context, { error: "One or more services do not belong to this business." }, { status: 400 });
      }
    }

    const currentIds = await readAssignments(context, staffId);
    const idsToAdd = serviceIds.filter((id) => !currentIds.includes(id));
    const idsToRemove = currentIds.filter((id) => !serviceIds.includes(id));

    if (idsToAdd.length) {
      const { error } = await context.supabase.from("staff_services").insert(
        idsToAdd.map((service_id) => ({
          business_id: context.businessId,
          staff_id: staffId,
          service_id,
        }))
      );
      if (error) throw error;
    }

    if (idsToRemove.length) {
      const { error } = await context.supabase
        .from("staff_services")
        .delete()
        .eq("business_id", context.businessId)
        .eq("staff_id", staffId)
        .in("service_id", idsToRemove);

      if (error) {
        if (idsToAdd.length) {
          const { error: rollbackError } = await context.supabase
            .from("staff_services")
            .delete()
            .eq("business_id", context.businessId)
            .eq("staff_id", staffId)
            .in("service_id", idsToAdd);
          if (rollbackError) console.error("Assignment rollback failed:", rollbackError);
        }
        throw error;
      }
    }

    const [updatedStaff, updatedIds] = await Promise.all([
      readStaff(context, staffId),
      readAssignments(context, staffId),
    ]);

    return adminJson(context, { staff: updatedStaff, service_ids: updatedIds });
  } catch (error) {
    console.error("Staff service assignments save error:", error);
    return adminJson(context, { error: "Failed to save service assignments." }, { status: 500 });
  }
}
