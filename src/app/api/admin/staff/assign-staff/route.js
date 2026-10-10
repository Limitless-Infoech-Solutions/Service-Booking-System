import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();

    const { business_id, service_id, staff_ids } = body;

    if (!business_id || !service_id || !Array.isArray(staff_ids)) {
      return NextResponse.json(
        {
          error: "business_id, service_id and staff_ids are required",
        },
        { status: 400 }
      );
    }

    const uniqueStaffIds = [...new Set(staff_ids)];

    // Verify that the service belongs to this business.
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", service_id)
      .eq("business_id", business_id)
      .maybeSingle();

    if (serviceError) {
      throw serviceError;
    }

    if (!service) {
      return NextResponse.json(
        { error: "Service not found for this business" },
        { status: 404 }
      );
    }

    // Verify that all selected staff belong to the same business
    // and are active.
    if (uniqueStaffIds.length > 0) {
      const { data: validStaff, error: staffError } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", business_id)
        .eq("is_active", true)
        .in("id", uniqueStaffIds);

      if (staffError) {
        throw staffError;
      }

      if ((validStaff || []).length !== uniqueStaffIds.length) {
        return NextResponse.json(
          {
            error:
              "One or more selected staff members are invalid or inactive.",
          },
          { status: 400 }
        );
      }
    }

    // Fetch the assignments that currently exist.
    const { data: existingAssignments, error: existingError } =
      await supabase
        .from("staff_services")
        .select("staff_id")
        .eq("business_id", business_id)
        .eq("service_id", service_id);

    if (existingError) {
      throw existingError;
    }

    const existingStaffIds = (existingAssignments || []).map(
      (assignment) => assignment.staff_id
    );

    const idsToAdd = uniqueStaffIds.filter(
      (id) => !existingStaffIds.includes(id)
    );

    const idsToRemove = existingStaffIds.filter(
      (id) => !uniqueStaffIds.includes(id)
    );

    // Add new assignments first so an insert failure does not
    // remove the existing assignments.
    if (idsToAdd.length > 0) {
      const rowsToInsert = idsToAdd.map((staff_id) => ({
        business_id,
        service_id,
        staff_id,
      }));

      const { error: insertError } = await supabase
        .from("staff_services")
        .insert(rowsToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    // Remove assignments the admin unchecked.
    if (idsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("staff_services")
        .delete()
        .eq("business_id", business_id)
        .eq("service_id", service_id)
        .in("staff_id", idsToRemove);

      if (deleteError) {
        throw deleteError;
      }
    }

    return NextResponse.json({
      message: "Staff assignments saved successfully",
      service_id,
      staff_ids: uniqueStaffIds,
    });
  } catch (error) {
    console.error("Assign staff API error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to save staff assignments" },
      { status: 500 }
    );
  }
}