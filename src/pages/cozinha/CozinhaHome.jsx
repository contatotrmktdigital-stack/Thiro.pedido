import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { liberarSomNoPrimeiroToque, tocarSom } from "../../lib/som";
import AvisosPush from "../../components/AvisosPush";

// "Marcar pronto" já grava direto como "entregue" — o garçom não confirma entrega à parte.
const PROXIMO_STATUS = {
  pendente: "preparo",
  preparo: "entregue",
};

const LABEL_ACAO = {
  pendente: "Iniciar preparo",
  preparo: "Marcar pronto",
};

// Passou desse tempo esperando, o cartão ganha destaque de atraso.
const MINUTOS_ATRASO = 10;

function minutosDesde(isoString, agora) {
  return Math.max(0, Math.floor((agora - new Date(isoString).getTime()) / 60000));
}

function textoTempo(min) {
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `há ${h} h` : `há ${h} h ${m} min`;
}

function labelAtendimento(comanda) {
  if (!comanda) return "";
  if (comanda.tipo === "mesa") {
    return `Mesa ${comanda.mesa_numero} · Comanda ${comanda.comandas_fisicas?.numero}${comanda.cliente_nome ? ` · ${comanda.cliente_nome}` : ""}`;
  }
  if (comanda.tipo === "balcao") {
    return `Balcão · ${comanda.cliente_nome}`;
  }
  return comanda.cliente_nome ? `Delivery · ${comanda.cliente_nome}` : "Delivery";
}

function Coluna({ titulo, itens, agora, busyId, onAvancar, vazio, visivel }) {
  return (
    <section className={`cozinha-coluna${visivel ? "" : " oculta"}`}>
      <h2 className="cozinha-coluna-titulo">
        {titulo} <span>{itens.length}</span>
      </h2>
      {itens.length === 0 ? (
        <p className="cozinha-vazio">{vazio}</p>
      ) : (
        <div className="cozinha-lista">
          {itens.map((item) => {
            const min = minutosDesde(item.created_at, agora);
            const atrasado = min >= MINUTOS_ATRASO;
            return (
              <article key={item.id} className={`cozinha-card${atrasado ? " atrasado" : ""}`}>
                <div className="cozinha-card-topo">
                  <strong>{labelAtendimento(item.comandas)}</strong>
                  <span className={`cozinha-tempo${atrasado ? " atrasado" : ""}`}>{textoTempo(min)}</span>
                </div>
                <p className="cozinha-card-item">
                  {item.quantidade}x {item.nome_produto}
                  {item.setor === "bar" && <span className="cozinha-bar-tag">🍹 Bar</span>}
                </p>
                {item.observacao && <p className="cozinha-card-obs">⚠ {item.observacao}</p>}
                <button
                  type="button"
                  className="cozinha-acao"
                  disabled={busyId === item.id}
                  onClick={() => onAvancar(item)}
                >
                  {busyId === item.id ? "Atualizando..." : LABEL_ACAO[item.status]}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function CozinhaHome() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [aba, setAba] = useState("novos");
  const [agora, setAgora] = useState(() => Date.now());
  const conhecidos = useRef(null);
  const audioRef = useRef(null);

  const loadItens = useCallback(async () => {
    setError("");
    // Não filtra pela comanda estar "aberta" de propósito: às vezes o cliente paga (fechando a
    // comanda) antes da cozinha terminar de preparar — o pedido tem que continuar aparecendo pra
    // cozinha até ela mesma marcar como pronto, independente da comanda já estar fechada ou não.
    const { data, error: fetchError } = await supabase
      .from("comanda_itens")
      .select(
        "id, nome_produto, setor, quantidade, observacao, status, created_at, comandas!inner(tipo, mesa_numero, cliente_nome, comandas_fisicas(numero))"
      )
      .in("status", ["pendente", "preparo"])
      .order("created_at");

    if (fetchError) setError(fetchError.message);
    else {
      const lista = data || [];
      // Bipe com a página aberta quando chega item novo (o aviso com o site fechado é o push).
      const pendentes = lista.filter((i) => i.status === "pendente");
      if (conhecidos.current === null) {
        conhecidos.current = new Set(pendentes.map((i) => i.id));
      } else if (pendentes.some((i) => !conhecidos.current.has(i.id))) {
        pendentes.forEach((i) => conhecidos.current.add(i.id));
        tocarSom(audioRef, "pedido");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      setItens(lista);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItens();

    const channel = supabase
      .channel("cozinha-comanda-itens")
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_itens" }, () => {
        loadItens();
      })
      .subscribe();

    const soltarSom = liberarSomNoPrimeiroToque(audioRef);

    return () => {
      supabase.removeChannel(channel);
      soltarSom();
    };
  }, [loadItens]);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleAvancar = async (item) => {
    const novoStatus = PROXIMO_STATUS[item.status];
    if (!novoStatus) return;

    setBusyId(item.id);
    setError("");
    const { data, error: updateError } = await supabase
      .from("comanda_itens")
      .update({ status: novoStatus })
      .eq("id", item.id)
      .select("id");
    setBusyId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Não foi possível atualizar esse pedido (nenhuma alteração foi salva). Tente de novo.");
      return;
    }
    await loadItens();
  };

  if (loading) {
    return <p>Carregando pedidos...</p>;
  }

  const novos = itens.filter((i) => i.status === "pendente");
  const emPreparo = itens.filter((i) => i.status === "preparo");

  return (
    <div className="cozinha">
      {error && <div className="error-box">{error}</div>}

      <div className="cozinha-resumo">
        <div>
          <h1>Cozinha</h1>
          <p>Atualiza sozinha quando o garçom lança novos itens.</p>
          <AvisosPush />
        </div>
        <div className="cozinha-contadores">
          <span className="novos">{novos.length} novos</span>
          <span className="preparo">{emPreparo.length} em preparo</span>
        </div>
      </div>

      <div className="cozinha-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "novos"}
          className={`cozinha-aba${aba === "novos" ? " ativa" : ""}`}
          onClick={() => setAba("novos")}
        >
          Novos ({novos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "preparo"}
          className={`cozinha-aba${aba === "preparo" ? " ativa" : ""}`}
          onClick={() => setAba("preparo")}
        >
          Em preparo ({emPreparo.length})
        </button>
      </div>

      <div className="cozinha-colunas">
        <Coluna
          titulo="Novos"
          itens={novos}
          agora={agora}
          busyId={busyId}
          onAvancar={handleAvancar}
          vazio="Nenhum pedido novo. Assim que o garçom enviar, aparece aqui."
          visivel={aba === "novos"}
        />
        <Coluna
          titulo="Em preparo"
          itens={emPreparo}
          agora={agora}
          busyId={busyId}
          onAvancar={handleAvancar}
          vazio="Nada em preparo no momento."
          visivel={aba === "preparo"}
        />
      </div>
    </div>
  );
}
