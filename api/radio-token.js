// Gera o "ingresso" (token) para entrar na sala de rádio (LiveKit) do restaurante de quem está logado.
//
// Segurança:
//  - quem chama precisa mandar o login do Supabase (Authorization: Bearer ...); a função confere com o
//    próprio Supabase quem é a pessoa e de qual restaurante ela é;
//  - a sala é SEMPRE a do restaurante dessa pessoa (nunca vem do navegador), então um restaurante não
//    consegue entrar na sala de outro;
//  - a API Secret do LiveKit só existe aqui no servidor (variáveis de ambiente da Vercel).
import crypto from "node:crypto";
import { AccessToken } from "livekit-server-sdk";

const AREAS = { garcom: "Garçom", cozinha: "Cozinha", gestao: "Gestão" };

async function supabaseGet(caminho, token) {
  const base = process.env.VITE_SUPABASE_URL;
  const resposta = await fetch(`${base}${caminho}`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) return null;
  return resposta.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "metodo_nao_permitido" });
  }

  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    return res.status(503).json({ erro: "radio_nao_configurado" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ erro: "sem_login" });

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const area = AREAS[corpo.area] ? corpo.area : "garcom";

  // quem é a pessoa?
  const usuario = await supabaseGet("/auth/v1/user", token);
  if (!usuario?.id) return res.status(401).json({ erro: "login_invalido" });

  // de qual restaurante? (a leitura segue as regras de segurança do banco, com o login da própria pessoa)
  const perfis = await supabaseGet(`/rest/v1/profiles?select=restaurant_id&id=eq.${usuario.id}`, token);
  const restaurantId = perfis?.[0]?.restaurant_id;
  if (!restaurantId) return res.status(403).json({ erro: "sem_restaurante" });

  const sala = `thiro-${restaurantId}`;
  const identidade = `${area}-${usuario.id.slice(0, 8)}-${crypto.randomBytes(3).toString("hex")}`;

  const ingresso = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: identidade,
    name: AREAS[area],
    metadata: JSON.stringify({ area }),
    ttl: "8h",
  });
  ingresso.addGrant({
    room: sala,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  return res.status(200).json({ token: await ingresso.toJwt(), url: LIVEKIT_URL, sala });
}
