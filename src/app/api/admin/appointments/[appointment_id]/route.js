import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request, { params }) {
  const context = await authorizeBusinessAdmin(request);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    const { appointment_id } = await params;

    if (!appointment_id) {
      return adminJson(context,
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await context.supabase
      .from("appointments")
      .select(`
        id,
        customer_id,
        start_time,
        end_time,
        status,
        total_amount,
        business_id,

        customers!appointments_customer_id_fkey (
          id,
          name,
          phone,
          email
        ),

        appointment_services (
          id,
          service_id,
          staff_id,
          price,
          duration_minutes,
          buffer_minutes,
          start_time,
          end_time,

          services (
            id,
            name,
            description
          ),

          staff (
            id,
            name,
            role
          )
        )
      `)
      .eq("id", appointment_id)
      .eq("business_id", context.businessId)
      .maybeSingle();

    if (error) {
      console.error("Appointment details API error:", error);

      return adminJson(context,
        { error: "Failed to load appointment." },
        { status: 500 }
      );
    }

    if (!data) {
      return adminJson(context,
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return adminJson(context, {
      appointment: data,
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return adminJson(context,
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
