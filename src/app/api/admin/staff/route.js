import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");

    if (!business_id) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 }
      );
    }

    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, name, role, is_active, status, created_at")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .order("name", { ascending: true });


    if (error) {
      console.error("Staff fetch error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
     // Fetch service assignments for this business
     const { data: assignments, error: assignmentsError } = await supabase
     .from("staff_services")
     .select("staff_id")
     .eq("business_id", business_id);

   if (assignmentsError) {
     console.error("Staff assignments fetch error:", assignmentsError);

     return NextResponse.json(
       { error: assignmentsError.message },
       { status: 500 }
     );
   }

   // Count assigned services for each staff member
   const serviceCountByStaff = {};

   (assignments || []).forEach((assignment) => {
     serviceCountByStaff[assignment.staff_id] =
       (serviceCountByStaff[assignment.staff_id] || 0) + 1;
   });

   // Include assigned service count in each staff object
   const staffWithServiceCount = (staff || []).map((member) => ({
     ...member,
     assigned_services_count: serviceCountByStaff[member.id] || 0,
   }));

    return NextResponse.json({
      staff: staffWithServiceCount,
    });
  } catch (error) {
    console.error("Staff API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
// POST: create New Staff 

export async function POST(request) {
  try {
    const body = await request.json();

    const { business_id, name, role, service_ids = [] } = body;

    // 1. Validate required fields
    if (!business_id || !name?.trim() || !role?.trim()) {
      return NextResponse.json(
        { error: "business_id, name, and role are required" },
        { status: 400 }
      );
    }

    // 2. Validate service_ids
    if (
      !Array.isArray(service_ids) ||
      service_ids.some(
        (id) => typeof id !== "string" || !id.trim()
      )
    ) {
      return NextResponse.json(
        { error: "service_ids must be an array of service IDs" },
        { status: 400 }
      );
    }

    // 3. Call the PostgreSQL function
    const { data, error } = await supabase.rpc(
      "create_staff_with_services",
      {
        p_business_id: business_id,
        p_name: name.trim(),
        p_role: role.trim(),
        p_service_ids: [...new Set(service_ids)],
      }
    );

    if (error) {
      console.error("Staff creation error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 4. Return the created staff member
    return NextResponse.json(
      {
        message: "Staff member created successfully",
        staff: data.staff,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}