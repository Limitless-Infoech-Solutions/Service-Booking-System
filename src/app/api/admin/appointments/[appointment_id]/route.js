import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

const APPOINTMENT_STATUSES = new Set([
  "confirmed",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
]);
const SERVICE_START_GRACE_MS = 2 * 60 * 1000;

function getBusinessTimestamp(value) {
  if (!value || typeof value !== "string") return NaN;
  const normalized = value.replace(" ", "T");
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return Date.parse(hasTimezone ? normalized : `${normalized}+05:30`);
}

function getTransitionErrorResponse(error) {
  const code = error?.code;
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();

  if (code === "P0002" || /appointment (was )?not found/.test(message)) {
    return { status: 404, error: "Appointment not found." };
  }

  if (code === "28000") {
    return { status: 401, error: "Authentication is required." };
  }

  if (
    code === "40001" ||
    code === "40P01" ||
    /stale|expected status|status conflict|concurrent/.test(message)
  ) {
    return { status: 409, error: "Appointment status changed. Reload and try again." };
  }

  if (
    code === "42501" ||
    /not authorized|permission denied|business access|membership/.test(message)
  ) {
    return { status: 403, error: "You do not have access to this appointment." };
  }

  if (/invalid transition|transition.*not allowed|no.show.*(before|start)/.test(message)) {
    return { status: 400, error: "This appointment status transition is not allowed." };
  }

  return { status: 500, error: "Failed to update appointment status." };
}

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

export async function PATCH(request, { params }) {
  const context = await authorizeBusinessAdmin(request);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  let appointmentId;
  try {
    ({ appointment_id: appointmentId } = await params);
  } catch (error) {
    console.error("Appointment status route params error:", error);
    return adminJson(context, { error: "Invalid appointment ID." }, { status: 400 });
  }

  if (!appointmentId) {
    return adminJson(context, { error: "Appointment ID is required." }, { status: 400 });
  }

  if (
    typeof appointmentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId)
  ) {
    return adminJson(context, { error: "Invalid appointment ID." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return adminJson(context, { error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return adminJson(context, { error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { expected_status: expectedStatus, new_status: newStatus } = body;
  if (
    typeof expectedStatus !== "string" ||
    !APPOINTMENT_STATUSES.has(expectedStatus) ||
    typeof newStatus !== "string" ||
    !APPOINTMENT_STATUSES.has(newStatus)
  ) {
    return adminJson(
      context,
      { error: "expected_status and new_status must be valid appointment statuses." },
      { status: 400 }
    );
  }

  if (newStatus === "cancelled" && expectedStatus !== "confirmed") {
    return adminJson(
      context,
      { error: "Only confirmed appointments can be cancelled." },
      { status: 400 }
    );
  }

  // Check the scoped appointment before invoking the transition function so
  // every API path observes its current status and scheduled timestamp.
  const { data: appointment, error: lookupError } = await context.supabase
    .from("appointments")
    .select("id, status, start_time")
    .eq("id", appointmentId)
    .eq("business_id", context.businessId)
    .maybeSingle();

  if (lookupError) {
    console.error("Appointment timing lookup failed:", lookupError);
    return adminJson(context, { error: "Failed to verify appointment timing." }, { status: 500 });
  }
  if (!appointment) {
    return adminJson(context, { error: "Appointment not found." }, { status: 404 });
  }
  if (appointment.status !== expectedStatus) {
    return adminJson(context, { error: "Appointment status changed. Reload and try again." }, { status: 409 });
  }

  const startMs = getBusinessTimestamp(appointment.start_time);
  const now = Date.now();
  if (!Number.isFinite(startMs)) {
    return adminJson(context, { error: "The scheduled appointment start time is unavailable." }, { status: 400 });
  }
  if (["in_service", "completed"].includes(newStatus) && now < startMs + SERVICE_START_GRACE_MS) {
    return adminJson(context, {
      error: "Service time has not started yet. You can mark the customer as arrived, but the appointment cannot be marked In Service or Completed until the scheduled start time and two-minute grace period have passed.",
      available_at: new Date(startMs + SERVICE_START_GRACE_MS).toISOString(),
    }, { status: 400 });
  }
  if (newStatus === "no_show" && now <= startMs) {
    return adminJson(context, { error: "No-show is available only after the scheduled start time." }, { status: 400 });
  }

  try {
    const { data, error } = await context.supabase.rpc(
      "transition_appointment_status",
      {
        p_appointment_id: appointmentId,
        p_expected_status: expectedStatus,
        p_new_status: newStatus,
      }
    );

    if (error) {
      const mapped = getTransitionErrorResponse(error);
      console.error("Appointment status transition failed:", {
        appointmentId,
        code: error.code || null,
        httpStatus: mapped.status,
      });
      return adminJson(context, { error: mapped.error }, { status: mapped.status });
    }

    return adminJson(context, { success: true, transition: data });
  } catch (error) {
    console.error("Unexpected appointment status transition error:", {
      appointmentId,
      code: error?.code || null,
    });
    return adminJson(
      context,
      { error: "Failed to update appointment status." },
      { status: 500 }
    );
  }
}
