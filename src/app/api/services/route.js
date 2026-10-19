import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdminMode = searchParams.get("mode") === "admin";
    let businessId = searchParams.get("business_id");
    let serviceClient = supabase;
    let adminContext = null;
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(
        request,
        businessId || undefined
      );
      if (adminContext.error) {
        return adminJson(
          adminContext,
          { error: adminContext.error },
          { status: adminContext.status }
        );
      }
      businessId = adminContext.businessId;
      serviceClient = adminContext.supabase;
    }
    const respond = (body, init) =>
      adminContext
        ? adminJson(adminContext, body, init)
        : NextResponse.json(body, init);

    if (!businessId && !isAdminMode) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 }
      );
    }

    const { data: services, error: servicesError } = await serviceClient
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "completed")
      .order("name");

    if (servicesError) throw servicesError;

    if (!services?.length) {
      return respond([]);
    }

    const serviceIds = services.map((service) => service.id);
    const { data: assignments, error: assignmentsError } = await serviceClient
      .from("staff_services")
      .select(
        "service_id, staff!staff_services_staff_business_fkey!inner(id, business_id, is_active, status)"
      )
      .eq("business_id", businessId)
      .eq("staff.business_id", businessId)
      .eq("staff.is_active", true)
      .eq("staff.status", "completed")
      .in("service_id", serviceIds);

    if (assignmentsError) throw assignmentsError;

    const bookableServiceIds = new Set(
      (assignments || []).map((assignment) => assignment.service_id)
    );

    return respond(
      services.filter((service) => bookableServiceIds.has(service.id))
    );
  } catch (error) {
    console.error("Services API error:", error);
    return NextResponse.json(
      { error: "Failed to load services." },
      { status: 500 }
    );
  }
}
