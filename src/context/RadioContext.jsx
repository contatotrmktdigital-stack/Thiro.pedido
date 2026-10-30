import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

// Rádio Talk (walkie-talkie). Uma sala por restaurante (LiveKit). A conexão mora aqui, no layout,
// então continua ligada quando a pessoa troca de tela (ex.: o garçom segue ouvindo a cozinha).
//
// Quando conecta:
//  - a Cozinha conecta sozinha enquanto a tela da Cozinha está aberta (se a chavinha estiver ligada);
//  - qualquer pessoa pode ligar o rádio na tela "Rádio" e ele fica ligado neste aparelho.
const RadioContext = createContext(null);

const EVENTOS_DESBLOQUEIO = ["click", "touchend", "pointerup", "keydown"];
const CHAVE_ATIVO = "thiro-radio-ativo";
const CHAVE_COZINHA = "thiro-radio-cozinha";
const CHAVE_AREA = "thiro-radio-area";

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : v;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

function areaDaRota(pathname) {
  if (pathname.startsWith("/cozinha")) return "cozinha";
  if (pathname.startsWith("/gestao") && pathname !== "/gestao") return "gestao";
  if (pathname.startsWith("/garcom") || pathname.startsWith("/caixa")) return "garcom";
  return null;
}

export function RadioProvider({ children }) {
  const { session, profile } = useAuth();
  const { pathname } = useLocation();

  const [ativo, setAtivo] = useState(() => ler(CHAVE_ATIVO, "0") === "1");
  const [cozinhaLigada, setCozinhaLigadaEstado] = useState(() => ler(CHAVE_COZINHA, "1") === "1");
  const [area, setArea] = useState(() => ler(CHAVE_AREA, "garcom"));
  const [status, setStatus] = useState("desligado"); // desligado | conectando | online | erro | nao_configurado
  const [mensagem, setMensagem] = useState("");
  const [participantes, setParticipantes] = useState([]);
  const [falando, setFalando] = useState(false);
  const [audioBloqueado, setAudioBloqueado] = useState(false);
  const [tentativa, setTentativa] = useState(0); // sobe quando a conexão cai de vez, pra reconectar

  const roomRef = useRef(null);
  const areaRef = useRef(area);

  // guarda em qual área a pessoa está trabalhando (aparece como o "nome" dela no rádio)
  useEffect(() => {
    const a = areaDaRota(pathname);
    if (a && a !== areaRef.current) {
      areaRef.current = a;
      setArea(a);
      gravar(CHAVE_AREA, a);
    }
  }, [pathname]);

  const naCozinha = pathname.startsWith("/cozinha");
  const logado = Boolean(session?.access_token) && Boolean(profile);
  const deveConectar = logado && (ativo || (naCozinha && cozinhaLigada));

  const atualizarParticipantes = useCallback((room) => {
    if (!room) {
      setParticipantes([]);
      return;
    }
    const lista = [room.localParticipant, ...room.remoteParticipants.values()].map((p) => {
      let a = "garcom";
      try {
        a = JSON.parse(p.metadata || "{}").area || a;
      } catch {
        /* metadado inválido */
      }
      return { id: p.identity, nome: p.name || a, area: a, falando: p.isSpeaking, eu: p === room.localParticipant };
    });
    setParticipantes(lista);
  }, []);

  // Conecta / desconecta conforme "deveConectar".
  useEffect(() => {
    if (!deveConectar) return undefined;
    let cancelado = false;
    let room = null;
    let desbloquear = null;
    let religar = null;

    const conectar = async () => {
      setStatus("conectando");
      setMensagem("");
      try {
        const { data } = await supabase.auth.getSession();
        const resposta = await fetch("/api/radio-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
          body: JSON.stringify({ area: areaRef.current }),
        });
        if (resposta.status === 503 || resposta.status === 404) {
          if (!cancelado) {
            setStatus("nao_configurado");
            setMensagem("O rádio ainda não foi configurado neste sistema.");
          }
          return;
        }
        if (!resposta.ok) throw new Error("token");
        const { token, url } = await resposta.json();
        if (cancelado) return;

        const { Room, RoomEvent, Track } = await import("livekit-client");
        room = new Room({ adaptiveStream: false, dynacast: false });
        roomRef.current = room;

        const atualizar = () => atualizarParticipantes(room);
        room
          .on(RoomEvent.ParticipantConnected, atualizar)
          .on(RoomEvent.ParticipantDisconnected, atualizar)
          .on(RoomEvent.ActiveSpeakersChanged, atualizar)
          .on(RoomEvent.ParticipantMetadataChanged, atualizar)
          .on(RoomEvent.ParticipantNameChanged, atualizar)
          .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              el.style.display = "none";
              el.setAttribute("playsinline", "");
              document.body.appendChild(el);
            }
          })
          .on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()))
          .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBloqueado(!room.canPlaybackAudio))
          .on(RoomEvent.Reconnecting, () => setStatus("conectando"))
          .on(RoomEvent.Reconnected, () => setStatus("online"))
          .on(RoomEvent.Disconnected, () => {
            if (!cancelado) {
              setStatus("erro");
              setMensagem("Conexão do rádio perdida. Tentando de novo em instantes...");
              setParticipantes([]);
              religar = setTimeout(() => setTentativa((n) => n + 1), 5000);
            }
          });

        await room.connect(url, token);
        if (cancelado) {
          room.disconnect();
          return;
        }
        setStatus("online");
        setAudioBloqueado(!room.canPlaybackAudio);
        atualizarParticipantes(room);

        // O navegador só libera áudio depois de um toque na página.
        // No celular o navegador só libera o som depois de um toque de verdade (soltar o dedo / clicar),
        // então tentamos a cada toque até o som estar liberado.
        desbloquear = () => {
          if (!room.canPlaybackAudio) room.startAudio().catch(() => {});
        };
        EVENTOS_DESBLOQUEIO.forEach((ev) => window.addEventListener(ev, desbloquear));
      } catch {
        if (!cancelado) {
          setStatus("erro");
          setMensagem("Não foi possível conectar ao rádio. Tentando de novo em instantes...");
          religar = setTimeout(() => setTentativa((n) => n + 1), 8000);
        }
      }
    };

    conectar();

    return () => {
      cancelado = true;
      if (religar) clearTimeout(religar);
      if (desbloquear) EVENTOS_DESBLOQUEIO.forEach((ev) => window.removeEventListener(ev, desbloquear));
      if (room) {
        room.removeAllListeners();
        room.disconnect();
      }
      roomRef.current = null;
      document.querySelectorAll("audio[data-lk-audio]").forEach((el) => el.remove());
      setParticipantes([]);
      setFalando(false);
      setStatus("desligado");
    };
  }, [deveConectar, tentativa, atualizarParticipantes]);

  // avisa a sala quando a pessoa muda de área (Garçom → Cozinha etc.)
  useEffect(() => {
    const room = roomRef.current;
    if (!room || status !== "online") return;
    room.localParticipant.setMetadata(JSON.stringify({ area })).catch(() => {});
    room.localParticipant.setName(area === "cozinha" ? "Cozinha" : area === "gestao" ? "Gestão" : "Garçom").catch(() => {});
  }, [area, status]);

  const ligar = useCallback(() => {
    setAtivo(true);
    gravar(CHAVE_ATIVO, "1");
  }, []);

  const desligar = useCallback(() => {
    setAtivo(false);
    gravar(CHAVE_ATIVO, "0");
  }, []);

  const setCozinhaLigada = useCallback(
    (valor) => {
      setCozinhaLigadaEstado(valor);
      gravar(CHAVE_COZINHA, valor ? "1" : "0");
      // desligar na Cozinha desliga o rádio do aparelho de vez (mesmo se foi ligado na tela Rádio)
      if (!valor) desligar();
    },
    [desligar]
  );

  // Aperta para falar / solta. O microfone só é pedido na primeira vez que a pessoa aperta.
  const falar = useCallback(
    async (ligadoAgora) => {
      const room = roomRef.current;
      if (!room || status !== "online") return false;
      try {
        await room.localParticipant.setMicrophoneEnabled(ligadoAgora);
        setFalando(ligadoAgora);
        setMensagem("");
        if (ligadoAgora) room.startAudio().catch(() => {});
        return true;
      } catch {
        setFalando(false);
        setMensagem("Não foi possível usar o microfone. Libere o microfone nas permissões do navegador.");
        return false;
      }
    },
    [status]
  );

  const tocarParaAtivarSom = useCallback(() => {
    roomRef.current?.startAudio().catch(() => {});
    setAudioBloqueado(false);
  }, []);

  const valor = useMemo(
    () => ({
      ativo,
      ligar,
      desligar,
      cozinhaLigada,
      setCozinhaLigada,
      status,
      mensagem,
      participantes,
      falando,
      falar,
      audioBloqueado,
      tocarParaAtivarSom,
      conectado: status === "online",
    }),
    [ativo, ligar, desligar, cozinhaLigada, setCozinhaLigada, status, mensagem, participantes, falando, falar, audioBloqueado, tocarParaAtivarSom]
  );

  return <RadioContext.Provider value={valor}>{children}</RadioContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio precisa estar dentro de <RadioProvider>");
  return ctx;
}
