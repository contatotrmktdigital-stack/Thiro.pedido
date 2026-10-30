import { useCallback, useEffect, useRef } from "react";
import { useRadio } from "../context/RadioContext";

// "Apertar para falar": devolve comecar/parar (sempre os mesmos, de propósito) e liga a barra de espaço.
//
// - "falar" muda a cada atualização do rádio; guardamos a versão mais nova numa referência pra que
//   comecar/parar fiquem estáveis. (Se mudassem, o efeito rodaria de novo e soltaria o botão sozinho.)
// - A barra de espaço não dispara enquanto a pessoa digita, e solta se a janela perder o foco.
// - ignorarBotoes: nas telas com muitos botões (Cozinha) a barra de espaço não vale se o foco estiver
//   num botão ou link, pra não apertar "Marcar pronto" sem querer.
export function usePushToTalk({ ignorarBotoes = false } = {}) {
  const radio = useRadio();
  const apertado = useRef(false);
  const falarRef = useRef(radio.falar);

  useEffect(() => {
    falarRef.current = radio.falar;
  }, [radio.falar]);

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

  useEffect(() => {
    if (!radio.conectado) return undefined;
    const tags = ignorarBotoes ? ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"] : ["INPUT", "TEXTAREA", "SELECT"];
    const digitando = (el) => el && (tags.includes(el.tagName) || el.isContentEditable);
    const aoApertar = (e) => {
      if (e.code !== "Space" || e.repeat || digitando(e.target)) return;
      e.preventDefault();
      comecar();
    };
    const aoSoltar = (e) => {
      if (e.code !== "Space" || !apertado.current) return;
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
  }, [radio.conectado, ignorarBotoes, comecar, parar]);

  // Eventos do botão da tela (toque ou mouse).
  const aoApertarBotao = useCallback(
    (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      comecar();
    },
    [comecar]
  );

  return { comecar, parar, aoApertarBotao, falando: radio.falando, conectado: radio.conectado };
}
