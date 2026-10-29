// Envia notificações push (Web Push) para os aparelhos inscritos de um restaurante.
//
// Quem chama é o banco (Supabase, via pg_net) quando entra um pedido novo ou um chamado do cliente.
// O banco já manda junto a lista de aparelhos (assim esta função não precisa de chave do Supabase)
// e prova que é ele com o cabeçalho "x-push-secret". Sem o segredo certo, ninguém consegue disparar.
import crypto from "node:crypto";
import webpush from "web-push";

const URL_POR_AREA = { garcom: "/garcom", cozinha: "/cozinha", gestao: "/gestao" };

function segredoConfere(recebido) {
  const esperado = process.env.PUSH_SECRET || "";
  if (!esperado || typeof recebido !== "string") return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });
  }
  if (!segredoConfere(req.headers["x-push-secret"])) {
    return res.status(401).json({ ok: false, erro: "nao_autorizado" });
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, erro: "vapid_nao_configurado" });
  }
  webpush.setVapidDetails("https://thiro-pedido.vercel.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const aparelhos = Array.isArray(corpo.subscriptions) ? corpo.subscriptions : [];

  const resultados = await Promise.allSettled(
    aparelhos.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          titulo: String(corpo.titulo || "Thiro.pedido").slice(0, 80),
          corpo: String(corpo.corpo || "").slice(0, 200),
          tag: corpo.tag || undefined,
          url: corpo.url === "@area" ? URL_POR_AREA[s.area] || "/" : corpo.url || "/",
        }),
        { TTL: 120, urgency: "high" }
      )
    )
  );

  const enviados = resultados.filter((r) => r.status === "fulfilled").length;
  return res.status(200).json({ ok: true, enviados, falhas: aparelhos.length - enviados });
}
