import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(request, searchParams.get("business_id"));
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    const { data, error } = await context.supabase
      .from("services")
      .select(`
        id,
        business_id,
        name,
        description,
        price,
        duration_minutes,
        buffer_minutes,
        category,
        badge,
        image,
        status,
        is_active,
        created_at,
        updated_at,
        staff_services!staff_services_service_business_fkey (
          staff_id,
          staff!staff_services_staff_business_fkey (id, name, role)
        )
      `)
      .eq("business_id", context.businessId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const services = (data || []).map((service) => ({
      ...service,
      staff_count: service.staff_services?.length || 0,
    }));
    return adminJson(context, { services, total: services.length });
  } catch (error) {
    console.error("Services API error:", error);
    return adminJson(context, { error: "Failed to load services." }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await authorizeBusinessAdmin(request, body.business_id);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  const duration = Number(body.duration_minutes);
  const buffer = Number(body.buffer_minutes ?? 0);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0 || !Number.isInteger(buffer) || buffer < 0) {
    return adminJson(context, { error: "Enter a name, non-negative price, positive duration, and non-negative buffer." }, { status: 400 });
  }

  try {
    const { data, error } = await context.supabase
      .from("services")
      .insert({
        business_id: context.businessId,
        name,
        description: body.description || null,
        price,
        duration_minutes: duration,
        buffer_minutes: buffer,
        category: body.category || "Others",
        badge: body.badge || null,
        image: body.image || null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      })
      .select()
      .single();

    if (error) throw error;
    return adminJson(context, { service: data }, { status: 201 });
  } catch (error) {
    console.error("Create service API error:", error);
    return adminJson(context, { error: "Failed to create service." }, { status: 500 });
  }
}

export async function PUT(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await authorizeBusinessAdmin(request, body.business_id);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }
  if (!body.id) return adminJson(context, { error: "id is required." }, { status: 400 });

  try {
    const { data, error } = await context.supabase
      .from("services")
      .update({
        name: body.name,
        description: body.description || null,
        price: body.price,
        duration_minutes: body.duration_minutes,
        buffer_minutes: body.buffer_minutes ?? 0,
        category: body.category || "Others",
        badge: body.badge || null,
        image: body.image || null,
        is_active: body.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("business_id", context.businessId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return adminJson(context, { error: "Service not found." }, { status: 404 });
    return adminJson(context, { service: data });
  } catch (error) {
    console.error("Update service API error:", error);
    return adminJson(context, { error: "Failed to update service." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await authorizeBusinessAdmin(request, body.business_id);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }
  if (!body.id) return adminJson(context, { error: "id is required." }, { status: 400 });

  try {
    const { data, error } = await context.supabase
      .from("services")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("business_id", context.businessId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return adminJson(context, { error: "Service not found." }, { status: 404 });
    return adminJson(context, { message: "Service deactivated successfully", service: data });
  } catch (error) {
    console.error("Deactivate service API error:", error);
    return adminJson(context, { error: "Failed to deactivate service." }, { status: 500 });
  }
}
