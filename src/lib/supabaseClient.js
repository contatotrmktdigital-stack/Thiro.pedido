import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Isso normalmente significa que o arquivo .env ainda não foi criado/preenchido.
  console.warn(
    "[Thiro.pedido] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. " +
      "Copie .env.example para .env e preencha com os dados do seu projeto Supabase."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
