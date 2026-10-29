import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const CHAVE_GARCOM = "thiro-garcom-nome";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function lerNomeGarcom() {
  try {
    return localStorage.getItem(CHAVE_GARCOM) || "";
  } catch {
    return "";
  }
}

const ERROS = {
  item_na_cozinha: "Esse item ainda está na cozinha. Só dá para mover ele inteiro, ou espere ficar pronto para dividir.",
  so_uma_unidade: "Dividir igualmente só vale para 1 unidade. Use “Mover unidades”.",
  destino_nao_encontrado: "Não encontramos a comanda de destino.",
  destino_fechado: "A comanda de destino já foi fechada.",
  destino_nao_e_mesa: "A comanda de destino precisa ser de mesa.",
  mesma_comanda: "O destino é esta mesma comanda.",
  outro_restaurante: "Essa comanda é de outro restaurante.",
  comanda_origem_fechada: "Esta comanda já foi fechada.",
  quantidade_invalida: "Quantidade inválida.",
  destino_repetido: "A mesma comanda foi adicionada duas vezes.",
  minimo_duas_partes: "Para dividir, precisa ter pelo menos 2 partes.",
  item_cancelado: "Esse item foi cancelado.",
};

function mensagem(erro) {
  const achada = Object.keys(ERROS).find((k) => String(erro?.message || "").includes(k));
  return achada ? ERROS[achada] : "Não foi possível concluir. Nada foi alterado. Tente de novo.";
}

// Mesma regra do banco: centavos que sobram vão para as primeiras partes.
function partes(precoUnitario, n) {
  const total = Math.round(Number(precoUnitario) * 100);
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 100);
}

// Janela "Dividir / transferir" de um item da comanda.
export default function DividirItem({ item, comandaId, onClose, onDone }) {
  const feito = ["pronto", "entregue"].includes(item.status);
  const podeIgual = item.quantidade === 1 && feito;

  const [modo, setModo] = useState("unidades");
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [numero, setNumero] = useState("");
  const [candidata, setCandidata] = useState(null);
  const [destinos, setDestinos] = useState([]);
  const [inclui, setInclui] = useState(true);
  const [garcom, setGarcom] = useState(lerNomeGarcom);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const buscar = async (e) => {
    e.preventDefault();
    setErro("");
    setCandidata(null);
    const n = parseInt(numero, 10);
    if (!n) return;
    setBuscando(true);
    const { data, error } = await supabase
      .from("comandas")
      .select("id, mesa_numero, cliente_nome, comandas_fisicas!inner(numero)")
      .eq("status", "aberta")
      .eq("tipo", "mesa")
      .eq("comandas_fisicas.numero", n)
      .neq("id", comandaId);
    setBuscando(false);
    if (error || !data || data.length === 0) {
      setErro("Nenhuma comanda de mesa aberta com esse número (ou é esta mesma comanda).");
      return;
    }
    const c = data[0];
    setCandidata({
      id: c.id,
      label: `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? n}${c.cliente_nome ? ` · ${c.cliente_nome}` : ""}`,
    });
  };

  const confirmarDestino = () => {
    if (!candidata) return;
    if (modo === "unidades") setDestinos([candidata]);
    else if (!destinos.some((d) => d.id === candidata.id)) setDestinos([...destinos, candidata]);
    setCandidata(null);
    setNumero("");
  };

  const qtd = parseInt(quantidade, 10);
  const qtdOk = qtd >= 1 && qtd <= item.quantidade;
  const nPartes = destinos.length + (inclui ? 1 : 0);
  const valoresPartes = modo === "igual" && nPartes >= 2 ? partes(item.preco_unitario, nPartes) : [];

  const podeEnviar =
    modo === "unidades" ? destinos.length === 1 && qtdOk : destinos.length >= 1 && nPartes >= 2 && podeIgual;

  const enviar = async () => {
    setErro("");
    setEnviando(true);
    try {
      localStorage.setItem(CHAVE_GARCOM, garcom);
    } catch {
      /* sem armazenamento: só não lembra o nome */
    }
    const { error } =
      modo === "unidades"
        ? await supabase.rpc("dividir_item_unidades", {
            p_item_id: item.id,
            p_destino_id: destinos[0].id,
            p_quantidade: qtd,
            p_garcom_nome: garcom,
          })
        : await supabase.rpc("dividir_item_igual", {
            p_item_id: item.id,
            p_destinos: destinos.map((d) => d.id),
            p_inclui_origem: inclui,
            p_garcom_nome: garcom,
          });
    setEnviando(false);
    if (error) {
      setErro(mensagem(error));
      return;
    }
    await onDone();
  };

  const trocarModo = (novo) => {
    setModo(novo);
    setDestinos([]);
    setCandidata(null);
    setErro("");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card di-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Dividir / transferir item</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          {item.quantidade}x {item.nome_produto} · {formatMoeda(item.preco_unitario)} cada
        </p>

        <div className="di-modos">
          <button type="button" className={`di-modo${modo === "unidades" ? " ativo" : ""}`} onClick={() => trocarModo("unidades")}>
            Mover unidades
          </button>
          <button
            type="button"
            className={`di-modo${modo === "igual" ? " ativo" : ""}`}
            disabled={!podeIgual}
            onClick={() => trocarModo("igual")}
            title={podeIgual ? "" : "Só para 1 unidade já entregue"}
          >
            Dividir igualmente
          </button>
        </div>
        {!podeIgual && (
          <p className="di-dica">“Dividir igualmente” vale só para 1 unidade já entregue.</p>
        )}

        {modo === "unidades" && (
          <div className="field">
            <label>Quantas unidades mover?</label>
            <input
              type="number"
              min="1"
              max={item.quantidade}
              value={quantidade}
              disabled={!feito}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            {!feito && (
              <small className="di-dica">Esse item ainda está na cozinha: só dá para mover ele inteiro.</small>
            )}
          </div>
        )}

        {modo === "igual" && (
          <label className="di-inclui">
            <input type="checkbox" checked={inclui} onChange={(e) => setInclui(e.target.checked)} />
            <span>Esta comanda também paga uma parte</span>
          </label>
        )}

        <form onSubmit={buscar} className="di-busca">
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label>{modo === "igual" ? "Adicionar comanda (número)" : "Comanda de destino (número)"}</label>
            <input
              inputMode="numeric"
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                setCandidata(null);
              }}
              placeholder="Ex.: 7"
            />
          </div>
          <button className="btn-secondary" type="submit" disabled={buscando || !numero} style={{ width: "auto", padding: "8px 14px" }}>
            {buscando ? "..." : "Buscar"}
          </button>
        </form>

        {candidata && (
          <div className="di-confirma">
            <span>
              <strong>{candidata.label}</strong>
            </span>
            <button type="button" className="btn-primary btn-accent" onClick={confirmarDestino} style={{ width: "auto", padding: "6px 14px" }}>
              {modo === "igual" ? "Adicionar" : "Usar essa"}
            </button>
          </div>
        )}

        {destinos.length > 0 && (
          <ul className="di-destinos">
            {destinos.map((d, i) => (
              <li key={d.id}>
                <span>
                  {d.label}
                  {modo === "igual" && valoresPartes.length > 0 && (
                    <strong> · {formatMoeda(valoresPartes[(inclui ? 1 : 0) + i])}</strong>
                  )}
                </span>
                <button type="button" className="pd-remover" onClick={() => setDestinos(destinos.filter((x) => x.id !== d.id))}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {modo === "igual" && valoresPartes.length > 0 && (
          <p className="di-resumo">
            {inclui && (
              <>
                Esta comanda fica com <strong>{formatMoeda(valoresPartes[0])}</strong>.{" "}
              </>
            )}
            Total {formatMoeda(item.preco_unitario)} dividido em {nPartes} partes.
          </p>
        )}
        {modo === "igual" && destinos.length >= 1 && nPartes < 2 && (
          <p className="di-dica">Para dividir, adicione mais uma comanda ou marque que esta também paga uma parte.</p>
        )}

        <div className="field">
          <label>Seu nome (garçom)</label>
          <input value={garcom} onChange={(e) => setGarcom(e.target.value)} placeholder="Ex.: João" />
        </div>

        {erro && <div className="error-box">{erro}</div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-primary btn-accent" disabled={!podeEnviar || enviando} onClick={enviar} style={{ width: "auto", padding: "10px 20px" }}>
            {enviando ? "Salvando..." : modo === "igual" ? "Dividir" : "Mover"}
          </button>
          <button className="btn-secondary" disabled={enviando} onClick={onClose} style={{ width: "auto", padding: "10px 20px" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
