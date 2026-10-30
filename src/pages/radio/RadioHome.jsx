import { useCallback, useEffect, useRef, useState } from "react";
import { useRadio } from "../../context/RadioContext";

const CHAVE_AVISO = "thiro-radio-aviso-visto";
const NOME_AREA = { garcom: "Garçom", cozinha: "Cozinha", gestao: "Gestão" };

function avisoJaVisto() {
  try {
    return localStorage.getItem(CHAVE_AVISO) === "1";
  } catch {
    return false;
  }
}

const TEXTO_STATUS = {
  desligado: "Rádio desligado neste aparelho",
  conectando: "Conectando...",
  online: "Rádio ligado",
  erro: "Sem conexão",
  nao_configurado: "Rádio indisponível",
};

export default function RadioHome() {
  const r = useRadio();
  const [visto, setVisto] = useState(avisoJaVisto);
  const apertado = useRef(false);

  // "falar" muda a cada atualização do rádio; guardamos a versão mais nova numa referência pra que
  // comecar/parar fiquem SEMPRE iguais. (Se mudassem, o efeito da barra de espaço rodaria de novo e soltaria
  // o botão sozinho logo depois de apertar, cortando a fala.)
  const falarRef = useRef(r.falar);
  useEffect(() => {
    falarRef.current = r.falar;
  }, [r.falar]);

  const comecar = useCallback(() => {
    if (apertado.current) return;
    apertado.current = true;
    falarRef.current(true);
  }, []);

  const parar = useCallback(() => {
    if (!apertado.current) return;
    apertado.current = false;
    falarRef.current(false);
  }, []);

  // Barra de espaço (computador): não dispara enquanto a pessoa digita e solta se a janela perder o foco.
  useEffect(() => {
    if (!r.conectado) return undefined;
    const digitando = (el) => el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
    const aoApertar = (e) => {
      if (e.code !== "Space" || e.repeat || digitando(e.target)) return;
      e.preventDefault();
      comecar();
    };
    const aoSoltar = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      parar();
    };
    window.addEventListener("keydown", aoApertar);
    window.addEventListener("keyup", aoSoltar);
    window.addEventListener("blur", parar);
    return () => {
      window.removeEventListener("keydown", aoApertar);
      window.removeEventListener("keyup", aoSoltar);
      window.removeEventListener("blur", parar);
      parar();
    };
  }, [r.conectado, comecar, parar]);

  // Pede ao aparelho para não apagar a tela enquanto o rádio está ligado (quando o navegador permite).
  useEffect(() => {
    if (!r.conectado || !("wakeLock" in navigator)) return undefined;
    let trava = null;
    const pedir = async () => {
      try {
        trava = await navigator.wakeLock.request("screen");
      } catch {
        trava = null;
      }
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") pedir();
    };
    pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      trava?.release().catch(() => {});
    };
  }, [r.conectado]);

  const entendi = () => {
    try {
      localStorage.setItem(CHAVE_AVISO, "1");
    } catch {
      /* sem armazenamento: o aviso volta na próxima vez */
    }
    setVisto(true);
  };

  const cozinhaOnline = r.participantes.some((p) => p.area === "cozinha" && !p.eu);
  const outros = r.participantes.filter((p) => !p.eu);

  return (
    <div className="radio">
      <div className="radio-topo">
        <h1>Rádio</h1>
        <p className={`radio-status ${r.status}`}>{TEXTO_STATUS[r.status]}</p>
      </div>

      {!visto && (
        <div className="card radio-aviso">
          <h2>Antes de usar</h2>
          <ul>
            <li>Deixe esta página aberta e a tela do aparelho ligada. Se ela apagar ou o app for para segundo plano, o rádio pode parar.</li>
            <li>Para falar, <strong>segure o botão da tela</strong> (ou a barra de espaço no computador). O botão do fone Bluetooth não serve para isso.</li>
            <li>Com fone Bluetooth a voz pode ficar com qualidade de "ligação". É normal.</li>
            <li>Na primeira vez, o navegador pede permissão para usar o microfone. Toque em "Permitir".</li>
            <li>Todos do seu restaurante (garçom, cozinha e gestão) ouvem quem fala.</li>
          </ul>
          <button className="btn-primary" onClick={entendi} style={{ width: "auto", padding: "10px 24px" }}>
            Entendi
          </button>
        </div>
      )}

      {r.mensagem && r.status !== "online" && <div className="error-box">{r.mensagem}</div>}
      {r.mensagem && r.status === "online" && <div className="error-box">{r.mensagem}</div>}

      {r.status === "nao_configurado" ? null : !r.ativo ? (
        <div className="card">
          <h2>Ligar o rádio</h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
            Ao ligar, este aparelho passa a ouvir o rádio do restaurante, mesmo quando você troca de tela.
          </p>
          <button className="btn-primary btn-accent" onClick={r.ligar} style={{ width: "auto", padding: "12px 28px" }}>
            Ligar rádio
          </button>
        </div>
      ) : (
        <>
          {r.audioBloqueado && (
            <button className="radio-som" onClick={r.tocarParaAtivarSom}>
              🔈 Toque aqui para ativar o som
            </button>
          )}

          <div className="radio-presenca">
            <span className={`radio-chip ${cozinhaOnline ? "on" : "off"}`}>Cozinha {cozinhaOnline ? "online ✓" : "offline"}</span>
            <span className="radio-chip on">{outros.length} {outros.length === 1 ? "pessoa" : "pessoas"} no canal</span>
          </div>

          <button
            type="button"
            className={`radio-falar${r.falando ? " falando" : ""}`}
            disabled={!r.conectado}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              comecar();
            }}
            onPointerUp={parar}
            onPointerCancel={parar}
            onLostPointerCapture={parar}
            onContextMenu={(e) => e.preventDefault()}
          >
            {r.falando ? "Falando..." : r.conectado ? "Segure para falar" : "Aguarde..."}
            <small>{r.conectado ? "ou segure a barra de espaço" : ""}</small>
          </button>

          <div className="card">
            <h2>No canal agora</h2>
            {r.participantes.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Ninguém conectado.</p>
            ) : (
              <ul className="radio-lista">
                {r.participantes.map((p) => (
                  <li key={p.id} className={p.falando ? "falando" : ""}>
                    <span>
                      {NOME_AREA[p.area] || p.nome}
                      {p.eu ? " (você)" : ""}
                    </span>
                    {p.falando && <strong>🎙 falando</strong>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button className="btn-secondary" onClick={r.desligar} style={{ width: "auto", padding: "8px 18px" }}>
            Desligar rádio neste aparelho
          </button>
        </>
      )}
    </div>
  );
}
