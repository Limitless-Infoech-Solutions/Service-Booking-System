import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedBusinessId = searchParams.get("business_id");
    const context = await authorizeBusinessAdmin(
      request,
      requestedBusinessId || undefined
    );
    if (context.error) {
      return adminJson(
        context,
        { error: context.error },
        { status: context.status }
      );
    }
    const businessId = context.businessId;
    const customerId = searchParams.get("customer_id");
    let date = searchParams.get("date");
    const status = searchParams.get("status") || "";
    const search = (searchParams.get("search") || "")
      .trim()
      .toLocaleLowerCase("en-IN");
    const validStatuses = [
      "confirmed",
      "arrived",
      "in_service",
      "completed",
      "cancelled",
      "no_show",
    ];
    if (status && !validStatuses.includes(status)) {
      return adminJson(
        context,
        { error: "Invalid appointment status." },
        { status: 400 }
      );
    }

    if (
      customerId !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)
    ) {
      return adminJson(context, { error: "Invalid customer ID." }, { status: 400 });
    }

    // Business ID is required.
    // Default to today's date in India if no date is provided.
    if (!date) {
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());

      const parts = Object.fromEntries(
        dateParts.map(({ type, value }) => [type, value])
      );

      date = `${parts.year}-${parts.month}-${parts.day}`;
    }

    // Validate the date format.
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(date)) {
      return NextResponse.json(
        {
          error: "Invalid date. Use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    // Validate that the date actually exists.
    const validationDate = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(validationDate.getTime()) ||
      validationDate.toISOString().slice(0, 10) !== date
    ) {
      return NextResponse.json(
        {
          error: "Invalid calendar date.",
        },
        { status: 400 }
      );
    }

    // Calculate the selected day's boundaries in India time.
    const startOfDay = new Date(`${date}T00:00:00+05:30`);

    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const appointmentSelection = `
        id,
        customer_id,
        start_time,
        end_time,
        status,
        booking_source,
        total_amount,
        appointment_services (
          staff_id,
          staff (id, name)${customerId !== null ? ",\n          services (id, name)" : ""}
        ),
        customers!appointments_customer_id_fkey (
          id,
          name,
          phone
        )
      `;
    let appointmentRows = [];

    if (customerId !== null) {
      const { data: customer, error: customerError } = await context.supabase
        .from("customers")
        .select("id")
        .eq("id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (customerError) {
        console.error("Customer appointment access check failed:", customerError);
        return adminJson(context, { error: "Failed to verify customer." }, { status: 500 });
      }
      if (!customer) {
        return adminJson(context, { error: "Customer not found." }, { status: 404 });
      }

      // Load the full history in bounded batches so Supabase's per-request row
      // limit cannot silently truncate statistics or customer filters.
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data: batch, error } = await context.supabase
          .from("appointments")
          .select(appointmentSelection)
          .eq("business_id", businessId)
          .eq("customer_id", customerId)
          .order("start_time", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error("Customer appointments API error:", error);
          return adminJson(context, { error: "Failed to load appointments." }, { status: 500 });
        }

        appointmentRows.push(...(batch || []));
        if (!batch || batch.length < pageSize) break;
      }
    } else {
      let query = context.supabase
        .from("appointments")
        .select(appointmentSelection)
        .eq("business_id", businessId)
        .gte("start_time", startOfDay.toISOString())
        .lt("start_time", startOfNextDay.toISOString())
        .order("start_time", { ascending: true });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        console.error("Appointments API error:", error);
        return adminJson(context, { error: "Failed to load appointments." }, { status: 500 });
      }
      appointmentRows = data || [];
    }

    const data = appointmentRows.filter((appointment) => {
      if (customerId !== null || !search) return true;
      const name = appointment.customers?.name || "";
      const phone = appointment.customers?.phone || "";
      return `${name} ${phone}`.toLocaleLowerCase("en-IN").includes(search);
    });

    const appointmentIds = data.map((appointment) => appointment.id);
    let historyEventsAvailable = true;
    const eventTypesByAppointment = new Map();
    for (let offset = 0; offset < appointmentIds.length; offset += 200) {
      const ids = appointmentIds.slice(offset, offset + 200);
      const { data: events, error: eventsError } = await context.supabase
        .from("appointment_events")
        .select("appointment_id, event_type")
        .eq("business_id", businessId)
        .in("appointment_id", ids)
        .in("event_type", ["rescheduled", "booked_again"]);

      if (eventsError) {
        // Direct scoped reads return every relevant event, unlike the existing
        // RPC, which keeps only the latest event per appointment.
        console.error("Appointment event lookup failed:", {
          code: eventsError.code || null,
          message: eventsError.message || null,
        });
        historyEventsAvailable = false;
        break;
      }

      for (const event of events || []) {
        // event.appointment_id is the appointment carrying this event. In
        // particular, never associate Book Again using source_appointment_id.
        const types = eventTypesByAppointment.get(event.appointment_id) || new Set();
        types.add(event.event_type);
        eventTypesByAppointment.set(event.appointment_id, types);
      }
    }

    const appointmentsWithHistory = data.map((appointment) => ({
      ...appointment,
      history_event_types: historyEventsAvailable
        ? [...(eventTypesByAppointment.get(appointment.id) || [])]
        : null,
    }));

    return adminJson(context, {
      date,
      appointments: appointmentsWithHistory,
      total: data.length,
      historyEventsAvailable,
      ...(customerId !== null ? { fullHistory: true } : {}),
    });
  } catch (error) {
    console.error("Unexpected appointments API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}
