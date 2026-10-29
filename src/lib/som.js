// Bipe curto pelo Web Audio (sem arquivo de áudio), tocado só com a página aberta.
// "conta" toca duas vezes e mais agudo; "pedido" (cozinha) toca duas vezes mais grave.
const PADROES = {
  garcom: { frequencia: 660, atrasos: [0] },
  conta: { frequencia: 880, atrasos: [0, 0.28] },
  pedido: { frequencia: 520, atrasos: [0, 0.22] },
};

export function tocarSom(audioRef, tipo) {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    if (!audioRef.current) audioRef.current = new Contexto();
    const ctx = audioRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const { frequencia, atrasos } = PADROES[tipo] || PADROES.garcom;
    atrasos.forEach((atraso) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia;
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

// Navegadores só liberam som depois de um toque na página; chame uma vez no começo.
export function liberarSomNoPrimeiroToque(audioRef) {
  const liberar = () => {
    try {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (Contexto && !audioRef.current) audioRef.current = new Contexto();
      if (audioRef.current?.state === "suspended") audioRef.current.resume();
    } catch {
      /* ignora */
    }
  };
  window.addEventListener("pointerdown", liberar, { once: true });
  return () => window.removeEventListener("pointerdown", liberar);
}
