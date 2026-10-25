import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { buildRestaurantThemeVars } from "../../lib/theme";
import "./ComandaCliente.css";

const INTERVALO_ATUALIZACAO_MS = 15000;

const LABEL_STATUS = {
  pendente: "Recebido",
  preparo: "Em preparo",
  pronto: "Entregue",
  entregue: "Entregue",
};

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function ComandaCliente() {
  const { comandaFisicaId } = useParams();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState("");
  // Animação de boas-vindas: aparece uma vez por visita (por comanda), assim que os dados chegam.
  const [fase, setFase] = useState("espera"); // espera | mostrando | saindo | fim
  const temDados = Boolean(dados);
  const [enviando, setEnviando] = useState(""); // "garcom" | "conta" | ""
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("comanda_publica", {
      p_comanda_fisica_id: comandaFisicaId,
    });
    if (error || !data) {
      setNaoEncontrada(true);
    } else {
      setNaoEncontrada(false);
      setDados(data);
      setAtualizadoEm(horaAgora());
    }
    setCarregando(false);
  }, [comandaFisicaId]);

  const chamar = async (tipo) => {
    setEnviando(tipo);
    setAviso("");
    const { data, error } = await supabase.rpc("chamar_atendimento", {
      p_comanda_fisica_id: comandaFisicaId,
      p_tipo: tipo,
    });
    setEnviando("");
    if (error || !data?.ok) {
      setAviso(
        data?.erro === "sem_consumo"
          ? "Ainda não há pedidos para fechar a conta."
          : "Não conseguimos avisar agora. Tente de novo ou chame o garçom."
      );
      return;
    }
    await carregar();
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  useEffect(() => {
    if (!temDados || fase !== "espera") return undefined;

    const chave = `cc-boasvindas-${comandaFisicaId}`;
    let jaViu = false;
    try {
      jaViu = sessionStorage.getItem(chave) === "1";
    } catch {
      jaViu = false;
    }
    const reduzirMovimento =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (jaViu || reduzirMovimento) {
      setFase("fim");
      return undefined;
    }

    setFase("mostrando");
    return undefined;
  }, [temDados, fase, comandaFisicaId]);

  // Etapa separada: os temporizadores só nascem quando a fase vira "mostrando" (senão o próprio
  // setFase acima cancelaria eles ao re-renderizar).
  useEffect(() => {
    if (fase === "mostrando") {
      const sair = setTimeout(() => setFase("saindo"), 3300);
      return () => clearTimeout(sair);
    }
    if (fase === "saindo") {
      const fim = setTimeout(() => {
        setFase("fim");
        try {
          sessionStorage.setItem(`cc-boasvindas-${comandaFisicaId}`, "1");
        } catch {
          /* sem armazenamento: a animação só repete se a página for aberta de novo */
        }
      }, 600);
      return () => clearTimeout(fim);
    }
    return undefined;
  }, [fase, comandaFisicaId]);

  const pularBoasVindas = () => {
    setFase("fim");
    try {
      sessionStorage.setItem(`cc-boasvindas-${comandaFisicaId}`, "1");
    } catch {
      /* ignora */
    }
  };

  if (carregando) {
    return (
      <div className="cc cc-centro">
        <p>Carregando sua comanda...</p>
      </div>
    );
  }

  if (naoEncontrada || !dados) {
    return (
      <div className="cc cc-centro">
        <div className="cc-card cc-erro">
          <h1>Comanda não encontrada</h1>
          <p>Confira se o QR code é de um restaurante ativo ou fale com o garçom.</p>
        </div>
      </div>
    );
  }

  const { restaurante, comanda, itens } = dados;
  const temaCss = restaurante.cor_primaria ? buildRestaurantThemeVars(restaurante.cor_primaria) : {};
  const subtotal = (itens || []).reduce((s, i) => s + Number(i.preco) * i.quantidade, 0);
  const taxa = comanda?.taxa_servico ? subtotal * 0.1 : 0;
  // O botão do cardápio só existe quando o restaurante liga o cardápio digital e informou o link.
  const temCardapio = Boolean(restaurante.cardapio_url) && restaurante.cardapio_ativo !== false;
  const temConsumo = Boolean(comanda) && (itens || []).length > 0;
  const garcomPendente = (dados.chamados || []).includes("garcom");
  const contaPendente = (dados.chamados || []).includes("conta");
  const primeiroNome = (comanda?.cliente_nome || "").trim().split(/\s+/)[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : "Olá, seja bem-vindo!";

  return (
    <div className="cc" style={temaCss}>
      {(fase === "mostrando" || fase === "saindo") && (
        <button
          type="button"
          className={`cc-boasvindas${fase === "saindo" ? " saindo" : ""}`}
          onClick={pularBoasVindas}
          aria-label="Boas-vindas. Toque para continuar"
        >
          <span className="cc-bv-aneis" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="cc-bv-logo">
            {restaurante.logo_url ? (
              <span style={{ backgroundImage: `url(${restaurante.logo_url})` }} />
            ) : (
              <b>{(restaurante.nome || "?").charAt(0)}</b>
            )}
          </span>
          <span className="cc-bv-ola">{saudacao}</span>
          <span className="cc-bv-texto">Seja bem-vindo ao {restaurante.nome}</span>
          <span className="cc-bv-dica">Toque para continuar</span>
        </button>
      )}

      <header className="cc-topo">
        <div className="cc-marca">
          {restaurante.logo_url ? (
            <span className="cc-logo" style={{ backgroundImage: `url(${restaurante.logo_url})` }} />
          ) : (
            <span className="cc-logo cc-logo-texto">{(restaurante.nome || "?").charAt(0)}</span>
          )}
          <div>
            <strong>{restaurante.nome}</strong>
            <span>Comanda {dados.comanda_fisica}</span>
          </div>
        </div>
      </header>

      <main className="cc-main">
        <div className="cc-saudacao">
          <h1>{saudacao}</h1>
          <p>Bem-vindo ao {restaurante.nome}. Acompanhe sua comanda por aqui.</p>
        </div>

        {temCardapio && (
          <a
            className="cc-botao cc-botao-grande"
            href={restaurante.cardapio_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir cardápio
          </a>
        )}

        <div className="cc-acoes">
          <button
            type="button"
            className="cc-acao"
            disabled={garcomPendente || enviando === "garcom"}
            onClick={() => chamar("garcom")}
          >
            {garcomPendente ? "Garçom avisado ✓" : enviando === "garcom" ? "Avisando..." : "Chamar garçom"}
          </button>
          {temConsumo && (
            <button
              type="button"
              className="cc-acao cc-acao-conta"
              disabled={contaPendente || enviando === "conta"}
              onClick={() => chamar("conta")}
            >
              {contaPendente ? "Conta solicitada ✓" : enviando === "conta" ? "Avisando..." : "Pedir a conta"}
            </button>
          )}
        </div>
        {(garcomPendente || contaPendente || aviso) && (
          <p className={`cc-aviso${aviso && !garcomPendente && !contaPendente ? " erro" : ""}`}>
            {aviso ||
              (contaPendente
                ? "Pedimos ao garçom que traga sua conta. Já já ele chega."
                : "O garçom foi avisado e já está a caminho.")}
          </p>
        )}

        <>
            {!comanda || itens.length === 0 ? (
              <div className="cc-card cc-vazio-card">
                <h2>{comanda ? "Nada pedido ainda" : "Comanda livre"}</h2>
                <p>
                  {comanda
                    ? "Quando o garçom lançar seus pedidos, eles aparecem aqui."
                    : "Não há consumo nessa comanda no momento. Assim que for aberta, você acompanha tudo por aqui."}
                </p>
              </div>
            ) : (
              <div className="cc-card">
                <div className="cc-topo-comanda">
                  <h2>{comanda.mesa ? `Mesa ${comanda.mesa}` : "Sua comanda"}</h2>
                  <span>Comanda {dados.comanda_fisica}</span>
                </div>
                <ul className="cc-itens">
                  {itens.map((item, i) => (
                    <li key={`${item.nome}-${i}`}>
                      <div className="cc-item-info">
                        <strong>
                          {item.quantidade}x {item.nome}
                        </strong>
                        {item.observacao && <small>Obs: {item.observacao}</small>}
                        <span className={`cc-status ${item.status}`}>
                          {LABEL_STATUS[item.status] || item.status}
                        </span>
                      </div>
                      <span className="cc-item-valor">{formatMoeda(item.preco * item.quantidade)}</span>
                    </li>
                  ))}
                </ul>
                <div className="cc-totais">
                  <div>
                    <span>Subtotal</span>
                    <span>{formatMoeda(subtotal)}</span>
                  </div>
                  {taxa > 0 && (
                    <div>
                      <span>Taxa de serviço (10%)</span>
                      <span>{formatMoeda(taxa)}</span>
                    </div>
                  )}
                  <div className="cc-total">
                    <span>Total</span>
                    <strong>{formatMoeda(subtotal + taxa)}</strong>
                  </div>
                </div>
                <p className="cc-nota">
                  Valor parcial: pode mudar se novos itens forem pedidos. O fechamento é feito pelo
                  garçom.
                </p>
              </div>
            )}

            <p className="cc-atualiza">
              Atualiza sozinha
              {atualizadoEm ? ` · última vez às ${atualizadoEm}` : ""}{" "}
              <button type="button" onClick={carregar}>
                Atualizar agora
              </button>
            </p>
        </>
      </main>

      <footer className="cc-rodape">
        <Link to="/login">Sou do restaurante</Link>
      </footer>
    </div>
  );
}
