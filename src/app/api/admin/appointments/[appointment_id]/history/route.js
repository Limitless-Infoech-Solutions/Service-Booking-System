import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

function historyTime(entry) {
  const value = entry.transitioned_at || entry.created_at || entry.changed_at;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

export async function GET(request, { params }) {
  const context = await authorizeBusinessAdmin(request);
  if (context.error) {
    return adminJson(
      context,
      { error: context.error },
      { status: context.status }
    );
  }

  try {
    const { appointment_id: appointmentId } = await params;
    if (!appointmentId) {
      return adminJson(
        context,
        { error: "Appointment ID is required." },
        { status: 400 }
      );
    }
    if (
      typeof appointmentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        appointmentId
      )
    ) {
      return adminJson(
        context,
        { error: "Invalid appointment ID." },
        { status: 400 }
      );
    }

    const { data: appointment, error: appointmentError } =
      await context.supabase
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .eq("business_id", context.businessId)
        .maybeSingle();

    if (appointmentError) throw appointmentError;
    if (!appointment) {
      return adminJson(
        context,
        { error: "Appointment not found." },
        { status: 404 }
      );
    }

    const { data: history, error } = await context.supabase
      .from("appointment_status_history")
      // The deployed timestamp column name is not documented in this repository;
      // normalize below and only return the fields needed by the history UI.
      .select("*")
      .eq("appointment_id", appointmentId)
      .eq("business_id", context.businessId);

    if (error) throw error;

    const orderedHistory = (history || [])
      .sort((a, b) => historyTime(a) - historyTime(b))
      .map((entry) => ({
        id: entry.id ?? null,
        appointment_id: entry.appointment_id,
        business_id: entry.business_id,
        previous_status: entry.previous_status ?? null,
        new_status: entry.new_status ?? null,
        transitioned_at:
          entry.transitioned_at ?? entry.created_at ?? entry.changed_at ?? null,
        business_admin_id: entry.business_admin_id ?? null,
        skipped_stages: Array.isArray(entry.skipped_stages)
          ? entry.skipped_stages
          : [],
      }));
    return adminJson(context, { history: orderedHistory });
  } catch (error) {
    console.error("Appointment status history API error:", {
      code: error?.code || null,
      message: error?.message || "Unknown database error",
      details: error?.details || null,
      hint: error?.hint || null,
    });
    return adminJson(
      context,
      { error: "Failed to load appointment status history." },
      { status: 500 }
    );
  }
}
