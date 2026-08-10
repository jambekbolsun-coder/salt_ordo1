import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is missing" }, 500);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: actor, error: actorError } = await service
      .from("staff")
      .select("id,role,is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (actorError || !actor?.is_active || !["owner", "admin"].includes(actor.role)) {
      return json({ error: "Недостаточно прав" }, 403);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "manager");

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Введите корректный email" }, 400);
    if (fullName.length < 2) return json({ error: "Введите имя сотрудника" }, 400);
    if (password.length < 8) return json({ error: "Пароль должен содержать минимум 8 символов" }, 400);
    if (!["admin", "manager", "content"].includes(role)) return json({ error: "Недопустимая роль" }, 400);
    if (actor.role !== "owner" && role === "admin") return json({ error: "Только владелец может создавать администратора" }, 403);

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) return json({ error: createError?.message || "Не удалось создать пользователя" }, 400);

    const { data: staff, error: staffError } = await service.from("staff").insert({
      user_id: created.user.id,
      email,
      full_name: fullName,
      role,
      created_by: user.id,
    }).select().single();

    if (staffError) {
      await service.auth.admin.deleteUser(created.user.id);
      return json({ error: staffError.message }, 400);
    }

    return json({ staff });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
