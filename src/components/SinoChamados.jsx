import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const LABEL_TIPO = {
  garcom: "chamou o garçom",
  conta: "pediu a conta",
};

function identificar(chamado) {
  const c = chamado.comandas;
  const numero = chamado.comandas_fisicas?.numero;
  if (c?.tipo === "mesa" && c.mesa_numero) {
    return `Mesa ${c.mesa_numero}${c.cliente_nome ? ` · ${c.cliente_nome}` : ""}`;
  }
  return numero ? `Comanda ${numero}` : "Comanda";
}

function tempoDesde(iso, agora) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

// Bipe curto pelo Web Audio (sem arquivo de áudio). "conta" toca duas vezes, pra diferenciar.
function tocarSom(audioRef, tipo) {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    if (!audioRef.current) audioRef.current = new Contexto();
    const ctx = audioRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const bipes = tipo === "conta" ? [0, 0.28] : [0];
    bipes.forEach((atraso) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tipo === "conta" ? 880 : 660;
      const inicio = ctx.currentTime + atraso;
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.22);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.25);
    });
  } catch {
    /* sem áudio: o aviso visual continua */
  }
}

export default function SinoChamados() {
  const { restaurant } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState("");
  const [busyId, setBusyId] = useState(null);
  const conhecidos = useRef(null);
  const audioRef = useRef(null);
  const caixaRef = useRef(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("chamados")
      .select(
        "id, tipo, created_at, comandas(tipo, mesa_numero, cliente_nome), comandas_fisicas(numero)"
      )
      .eq("status", "pendente")
      .order("created_at");
    if (error) return;
    const lista = data || [];

    if (conhecidos.current === null) {
      conhecidos.current = new Set(lista.map((c) => c.id));
    } else {
      const novos = lista.filter((c) => !conhecidos.current.has(c.id));
      if (novos.length > 0) {
        novos.forEach((c) => conhecidos.current.add(c.id));
        tocarSom(audioRef, novos.some((c) => c.tipo === "conta") ? "conta" : "garcom");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }
    setChamados(lista);
  }, []);

  useEffect(() => {
    if (!restaurant?.id) return undefined;
    carregar();

    const canal = supabase
      .channel("sino-chamados")
      .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => carregar())
      .subscribe();
    // Rede de segurança caso o tempo real caia.
    const poll = setInterval(carregar, 30000);

    // Navegadores só liberam som depois de um toque na página.
    const liberarSom = () => {
      try {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        if (Contexto && !audioRef.current) audioRef.current = new Contexto();
        if (audioRef.current?.state === "suspended") audioRef.current.resume();
      } catch {
        /* ignora */
      }
    };
    window.addEventListener("pointerdown", liberarSom, { once: true });

    return () => {
      supabase.removeChannel(canal);
      clearInterval(poll);
      window.removeEventListener("pointerdown", liberarSom);
    };
  }, [restaurant?.id, carregar]);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const atender = async (chamado) => {
    setBusyId(chamado.id);
    setErro("");
    const { data, error } = await supabase
      .from("chamados")
      .update({ status: "atendido", atendido_at: new Date().toISOString() })
      .eq("id", chamado.id)
      .select("id");
    setBusyId(null);
    if (error || !data || data.length === 0) {
      setErro("Não foi possível marcar como atendido. Tente de novo.");
      return;
    }
    await carregar();
  };

  const total = chamados.length;
  const temConta = chamados.some((c) => c.tipo === "conta");

  return (
    <div className="sino" ref={caixaRef}>
      <button
        type="button"
        className={`sino-botao${total > 0 ? " ativo" : ""}${temConta ? " conta" : ""}`}
        onClick={() => setAberto((v) => !v)}
        aria-label={total > 0 ? `${total} chamados dos clientes` : "Chamados dos clientes"}
        aria-expanded={aberto}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {total > 0 && <span className="sino-numero">{total}</span>}
      </button>

      {aberto && (
        <div className="sino-painel" role="dialog" aria-label="Chamados dos clientes">
          <div className="sino-painel-topo">
            <strong>Chamados</strong>
            <span>{total === 0 ? "nenhum no momento" : `${total} pendente${total > 1 ? "s" : ""}`}</span>
          </div>

          {erro && <div className="error-box" style={{ margin: "8px 12px" }}>{erro}</div>}

          {total === 0 ? (
            <p className="sino-vazio">Quando um cliente chamar o garçom ou pedir a conta, aparece aqui.</p>
          ) : (
            <ul className="sino-lista">
              {chamados.map((c) => (
                <li key={c.id} className={`sino-item ${c.tipo}`}>
                  <div className="sino-item-texto">
                    <strong>{identificar(c)}</strong>
                    <span>
                      {LABEL_TIPO[c.tipo]} · {tempoDesde(c.created_at, agora)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sino-atender"
                    disabled={busyId === c.id}
                    onClick={() => atender(c)}
                  >
                    {busyId === c.id ? "..." : "Atender"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
