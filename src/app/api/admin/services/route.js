import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("business_id");

    if (!businessId) {
      return NextResponse.json(
        {
          error: "business_id is required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        price,
        duration_minutes,
        buffer_minutes,
        category,
        badge,
        image,
        is_active,
        created_at,
        updated_at,
        staff_services!staff_services_service_business_fkey (
          staff_id,
          staff!staff_services_staff_business_fkey (
            id,
            name,
            role
          )
        )
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Services API error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const services = data.map((service) => ({
      ...service,
      staff_count: service.staff_services?.length || 0,
      is_bookable:
        service.is_active &&
        (service.staff_services?.length || 0) > 0,
    }));

    return NextResponse.json({
      services,
      total: services.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }

}
//post Api 
export async function POST(request) {
    try {
      const body = await request.json();
  
      const {
        business_id,
        name,
        description,
        price,
        duration_minutes,
        buffer_minutes,
        category,
        badge,
        image,
        is_active,
      } = body;
  
      if (!business_id || !name || price == null || !duration_minutes) {
        return NextResponse.json(
          {
            error:
              "business_id, name, price and duration_minutes are required",
          },
          { status: 400 }
        );
      }
  
      const { data, error } = await supabase
        .from("services")
        .insert({
          business_id,
          name,
          description: description || null,
          price,
          duration_minutes,
          buffer_minutes: buffer_minutes ?? 0,
          category: category || "Others",
          badge: badge || null,
          image: image || null,
          is_active: is_active ?? true,
        })
        .select()
        .single();
  
      if (error) {
        console.error("Create service API error:", error);
  
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
  
      return NextResponse.json(
        {
          service: data,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Unexpected error:", error);
  
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }