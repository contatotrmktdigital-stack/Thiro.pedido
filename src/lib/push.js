import { supabase } from "./supabaseClient";

const CHAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// A chave pública vem em base64 "url-safe"; o navegador quer os bytes.
function chaveEmBytes(base64) {
  const preenchido = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(preenchido);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

export function ehIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function instaladoNaTela() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

export function pushSuportado() {
  return (
    Boolean(CHAVE_PUBLICA) &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registro() {
  return navigator.serviceWorker.register("/sw.js");
}

// "ativo" | "inativo" | "bloqueado" | "nao_suportado"
export async function estadoPush() {
  if (!pushSuportado()) return "nao_suportado";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "ativo" : "inativo";
  } catch {
    return "inativo";
  }
}

// Precisa ser chamada a partir de um toque do usuário (o navegador exige).
export async function ativarPush({ restaurantId, area }) {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { ok: false, erro: "permissao_negada" };

  const reg = await registro();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveEmBytes(CHAVE_PUBLICA),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      restaurant_id: restaurantId,
      area,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, erro: "falha_ao_salvar" };
  return { ok: true };
}

export async function desativarPush() {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return { ok: true };
}
