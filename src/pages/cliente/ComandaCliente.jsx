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
  const [aba, setAba] = useState("comanda");

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
  // A aba Cardápio só existe quando o restaurante liga o cardápio digital e informou o link.
  const temCardapio = Boolean(restaurante.cardapio_url) && restaurante.cardapio_ativo !== false;
  const abaAtual = temCardapio ? aba : "comanda";

  return (
    <div className="cc" style={temaCss}>
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

      {temCardapio && (
        <nav className="cc-abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={abaAtual === "comanda"}
            className={`cc-aba${abaAtual === "comanda" ? " ativa" : ""}`}
            onClick={() => setAba("comanda")}
          >
            Minha comanda
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtual === "cardapio"}
            className={`cc-aba${abaAtual === "cardapio" ? " ativa" : ""}`}
            onClick={() => setAba("cardapio")}
          >
            Cardápio
          </button>
        </nav>
      )}

      <main className="cc-main">
        {abaAtual === "comanda" ? (
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
        ) : (
          <div className="cc-card cc-link-cardapio">
            <h2>Cardápio</h2>
            <p>Veja o cardápio completo do {restaurante.nome}.</p>
            <a
              className="cc-botao"
              href={restaurante.cardapio_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir cardápio
            </a>
          </div>
        )}
      </main>

      <footer className="cc-rodape">
        <Link to="/login">Sou do restaurante</Link>
      </footer>
    </div>
  );
}
