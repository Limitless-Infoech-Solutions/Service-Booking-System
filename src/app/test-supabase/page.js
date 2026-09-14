import { supabase } from "@/lib/supabase";

export default async function TestSupabase() {
  const { data, error } = await supabase
    .from("services")
    .select("*");

  return (
    <main style={{ padding: "40px" }}>
      <h1>Supabase Test</h1>

      {error ? (
        <pre>{error.message}</pre>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}