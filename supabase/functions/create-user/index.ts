// Thiro.pedido — Fase 1
// Edge Function usada para criar novos logins (restaurantes/funcionários)
// com segurança, sem expor a chave de serviço no navegador.
//
// Quem pode chamar:
//  - super_admin: pode criar qualquer papel, inclusive outro super_admin
//    (sem restaurant_id) ou o primeiro "gestao" de um novo restaurante
//  - gestao: só pode criar usuários (garcom/cozinha/caixa/gestao) dentro
//    do próprio restaurante
//
// Deploy: supabase functions deploy create-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente com o token de quem chamou, só para descobrir quem é
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    // Cliente com a chave de serviço, usado só dentro desta função (nunca no navegador)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("role, restaurant_id, active")
      .eq("id", authData.user.id)
      .single();

    if (callerProfileError || !callerProfile || !callerProfile.active) {
      return json({ error: "Perfil de quem está chamando não encontrado ou inativo." }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, role, restaurant_id } = body ?? {};

    if (!email || !password || !full_name || !role) {
      return json({ error: "Preencha e-mail, senha, nome e papel." }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const validRoles = ["super_admin", "gestao", "caixa", "cozinha", "garcom"];
    if (!validRoles.includes(role)) {
      return json({ error: "Papel inválido." }, 400);
    }

    const callerIsSuperAdmin = callerProfile.role === "super_admin";
    const callerIsGestaoDoRestaurante =
      callerProfile.role === "gestao" && callerProfile.restaurant_id === restaurant_id;

    if (role === "super_admin") {
      if (!callerIsSuperAdmin) {
        return json({ error: "Só um super admin pode criar outro super admin." }, 403);
      }
      if (restaurant_id) {
        return json({ error: "Super admin não pertence a nenhum restaurante." }, 400);
      }
    } else {
      if (!restaurant_id) {
        return json({ error: "Informe o restaurante." }, 400);
      }
      if (!callerIsSuperAdmin && !callerIsGestaoDoRestaurante) {
        return json({ error: "Sem permissão para criar usuários neste restaurante." }, 403);
      }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !created?.user) {
      return json({ error: createError?.message || "Não foi possível criar o usuário." }, 400);
    }

    const { error: insertError } = await admin.from("profiles").insert({
      id: created.user.id,
      restaurant_id: role === "super_admin" ? null : restaurant_id,
      full_name,
      role,
      active: true,
    });

    if (insertError) {
      // Se o perfil não pôde ser criado, desfaz o usuário de autenticação criado acima
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertError.message }, 400);
    }

    return json({ id: created.user.id }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
