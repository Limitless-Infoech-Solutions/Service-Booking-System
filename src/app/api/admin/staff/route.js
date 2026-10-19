import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function getSafeSearch(value) {
  return (value || "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(
    request,
    searchParams.get("business_id")
  );

  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
    const requestedPageSize = Number.parseInt(
      searchParams.get("per_page") || String(DEFAULT_PAGE_SIZE),
      10
    );
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE)
    );
    const activeFilter = searchParams.get("active") || "all";
    const statusFilter = searchParams.get("status") || "all";
    const search = getSafeSearch(searchParams.get("search"));

    if (!(["all", "active", "inactive"].includes(activeFilter))) {
      return adminJson(context, { error: "Invalid active filter." }, { status: 400 });
    }
    if (!(["all", "completed", "incomplete"].includes(statusFilter))) {
      return adminJson(context, { error: "Invalid completion filter." }, { status: 400 });
    }

    let query = context.supabase
      .from("staff")
      .select("id, name, role, is_active, status, created_at", { count: "exact" })
      .eq("business_id", context.businessId)
      .order("name", { ascending: true });

    if (activeFilter === "active") query = query.eq("is_active", true);
    if (activeFilter === "inactive") query = query.eq("is_active", false);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search) query = query.or(`name.ilike.%${search}%,role.ilike.%${search}%`);

    if (searchParams.get("all") !== "true") {
      const first = (page - 1) * pageSize;
      query = query.range(first, first + pageSize - 1);
    }

    const { data: staff, error, count } = await query;
    if (error) throw error;

    const staffIds = (staff || []).map((member) => member.id);
    let assignments = [];

    if (staffIds.length) {
      const { data, error: assignmentsError } = await context.supabase
        .from("staff_services")
        .select("staff_id")
        .eq("business_id", context.businessId)
        .in("staff_id", staffIds);

      if (assignmentsError) throw assignmentsError;
      assignments = data || [];
    }

    const serviceCountByStaff = new Map();
    for (const assignment of assignments) {
      serviceCountByStaff.set(
        assignment.staff_id,
        (serviceCountByStaff.get(assignment.staff_id) || 0) + 1
      );
    }

    const staffWithCounts = (staff || []).map((member) => ({
      ...member,
      assigned_services_count: serviceCountByStaff.get(member.id) || 0,
    }));
    const total = count || 0;
    const allRecordsRequested = searchParams.get("all") === "true";

    return adminJson(context, {
      staff: staffWithCounts,
      pagination: {
        page: allRecordsRequested ? 1 : page,
        per_page: allRecordsRequested ? staffWithCounts.length : pageSize,
        total,
        total_pages: allRecordsRequested ? 1 : Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Staff fetch error:", error);
    return adminJson(
      context,
      { error: "Failed to load staff." },
      { status: 500 }
    );
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const serviceIds = body.service_ids ?? [];

  if (!name || name.length > 100 || !role || role.length > 100) {
    return adminJson(
      context,
      { error: "Name and role are required and must be 100 characters or fewer." },
      { status: 400 }
    );
  }
  if (
    !Array.isArray(serviceIds) ||
    serviceIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    return adminJson(
      context,
      { error: "service_ids must be an array of service IDs." },
      { status: 400 }
    );
  }

  try {
    const uniqueServiceIds = [...new Set(serviceIds)];
    if (uniqueServiceIds.length) {
      const { data: services, error: servicesError } = await context.supabase
        .from("services")
        .select("id")
        .eq("business_id", context.businessId)
        .in("id", uniqueServiceIds);

      if (servicesError) throw servicesError;
      if ((services || []).length !== uniqueServiceIds.length) {
        return adminJson(
          context,
          { error: "One or more services do not belong to this business." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await context.supabase.rpc(
      "create_staff_with_services",
      {
        p_business_id: context.businessId,
        p_name: name,
        p_role: role,
        p_service_ids: uniqueServiceIds,
      }
    );

    if (error) throw error;

    return adminJson(
      context,
      { message: "Staff member created successfully", staff: data?.staff },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff creation error:", error);
    return adminJson(
      context,
      { error: "Failed to create staff member." },
      { status: 500 }
    );
  }
}
