import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request, { params }) {
  try {
    const isAdminMode =
      new URL(request.url).searchParams.get("mode") === "admin";
    let appointmentClient = supabase;
    let adminContext = null;
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(request);
      if (adminContext.error)
        return adminJson(
          adminContext,
          { success: false, error: adminContext.error },
          { status: adminContext.status }
        );
      appointmentClient = adminContext.supabase;
    }
    const { appointment_id } = await params;

    let appointmentQuery = appointmentClient
      .from("appointments")
      .select(
        `
        id,
        business_id,
        customer_id,
        start_time,
        end_time,
        status,
        total_amount,
        created_at,
        appointment_services (
          id,
          service_id,
          price,
          duration_minutes,
          buffer_minutes,
          start_time,
          end_time,
          staff_id,
          services (
            id,
            name,
            image
          )
        ),
       customers!appointments_customer_id_fkey (
  id,
  name,
  phone,
  email
)
      `
      )
      .eq("id", appointment_id);
    if (isAdminMode)
      appointmentQuery = appointmentQuery.eq(
        "business_id",
        adminContext.businessId
      );
    const { data: appointment, error } = await appointmentQuery.single();

    if (error) {
      console.error("Fetch appointment error:", error);

      return adminContext
        ? adminJson(
            adminContext,
            {
              success: false,
              error: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
            { status: 500 }
          )
        : NextResponse.json(
            {
              success: false,
              error: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
            { status: 500 }
          );
    }

    let appointmentResponse = appointment;
    if (isAdminMode && appointment.appointment_services?.length) {
      const staffIds = [
        ...new Set(
          appointment.appointment_services
            .map((item) => item.staff_id)
            .filter(Boolean)
        ),
      ];
      let staffRows = [];
      if (staffIds.length) {
        const { data, error: staffError } = await appointmentClient
          .from("staff")
          .select("id, name")
          .eq("business_id", adminContext.businessId)
          .in("id", staffIds);
        if (staffError) throw staffError;
        staffRows = data || [];
      }
      const staffById = new Map(
        (staffRows || []).map((staff) => [staff.id, staff])
      );
      appointmentResponse = {
        ...appointment,
        appointment_services: appointment.appointment_services.map((item) => ({
          ...item,
          staff: staffById.get(item.staff_id) || null,
        })),
      };
    }
    const responseBody = {
      success: true,
      appointment: appointmentResponse,
    };
    return adminContext
      ? adminJson(adminContext, responseBody)
      : NextResponse.json(responseBody);
  } catch (error) {
    console.error("Appointment API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}
