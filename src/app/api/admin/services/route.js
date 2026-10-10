import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("business_id");

    if (!businessId) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("services")
      .select(
        `
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
      staff!staff_services_staff_business_fkey (
        id,
        name,
        role
      )
    )
  `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Services API error:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const services = (data || []).map((service) => ({
      ...service,
      staff_count: service.staff_services?.length || 0,
    }));

    return NextResponse.json({
      services,
      total: services.length,
    });
  } catch (error) {
    console.error("Unexpected services API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

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

    if (
      !business_id ||
      !name?.trim() ||
      price == null ||
      duration_minutes == null
    ) {
      return NextResponse.json(
        {
          error: "business_id, name, price and duration_minutes are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        business_id,
        name: name.trim(),
        description: description || null,
        price: Number(price),
        duration_minutes: Number(duration_minutes),
        buffer_minutes: Number(buffer_minutes ?? 0),
        category: category || "Others",
        badge: badge || null,
        image: image || null,
        is_active: is_active ?? true,
        status: "incomplete",
      })
      .select()
      .single();

    if (error) {
      console.error("Create service API error:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected create service error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const {
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
      is_active,
    } = body;

    if (!id || !business_id) {
      return NextResponse.json(
        { error: "id and business_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("services")
      .update({
        name,
        description: description || null,
        price,
        duration_minutes,
        buffer_minutes: buffer_minutes ?? 0,
        category: category || "Others",
        badge: badge || null,
        image: image || null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", business_id)
      .select()
      .single();

    if (error) {
      console.error("Update service API error:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ service: data });
  } catch (error) {
    console.error("Unexpected update service error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id, business_id } = body;

    if (!id || !business_id) {
      return NextResponse.json(
        { error: "id and business_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("services")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", business_id)
      .select()
      .single();

    if (error) {
      console.error("Deactivate service API error:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Service deactivated successfully",
      service: data,
    });
  } catch (error) {
    console.error("Unexpected deactivate service error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
