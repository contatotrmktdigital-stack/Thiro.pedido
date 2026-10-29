import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const CHAVE_GARCOM = "thiro-garcom-nome";

const ERROS = {
  ja_lancada_hoje: "Esse cliente já tem uma visita lançada hoje.",
  cliente_nao_encontrado: "Cliente não encontrado.",
};

function lerNomeGarcom() {
  try {
    return localStorage.getItem(CHAVE_GARCOM) || "";
  } catch {
    return "";
  }
}

// Link discreto "Lançar visita de fidelidade" + janela de busca do cliente (CPF, nome, telefone ou e-mail).
// Na tela do garçom a visita fica PENDENTE até a Gestão aprovar; dentro da Gestão já entra aprovada.
// Só aparece se o restaurante ligou o programa de fidelidade.
export default function VisitaFidelidade({ origem }) {
  const { restaurant } = useAuth();
  const [ativa, setAtiva] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [garcom, setGarcom] = useState(lerNomeGarcom);
  const [lancandoId, setLancandoId] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    let vivo = true;
    supabase
      .from("restaurants")
      .select("fidelidade_ativa")
      .eq("id", restaurant.id)
      .single()
      .then(({ data, error }) => {
        if (vivo) setAtiva(!error && Boolean(data?.fidelidade_ativa));
      });
    return () => {
      vivo = false;
    };
  }, [restaurant?.id]);

  if (!ativa) return null;

  const fechar = () => {
    setAberto(false);
    setTermo("");
    setResultados(null);
    setMensagem(null);
  };

  const buscar = async (e) => {
    e.preventDefault();
    setMensagem(null);
    setBuscando(true);
    const { data, error } = await supabase.rpc("fidelidade_buscar", { p_termo: termo });
    setBuscando(false);
    if (error) {
      setMensagem({ erro: true, texto: "Não foi possível buscar agora. Tente de novo." });
      return;
    }
    setResultados(data || []);
  };

  const lancar = async (cliente) => {
    setLancandoId(cliente.id);
    setMensagem(null);
    try {
      localStorage.setItem(CHAVE_GARCOM, garcom);
    } catch {
      /* sem armazenamento: só não lembra o nome */
    }
    const { data, error } = await supabase.rpc("fidelidade_lancar_visita", {
      p_cliente_id: cliente.id,
      p_origem: origem,
      p_garcom_nome: origem === "atendente" ? garcom : null,
    });
    setLancandoId(null);
    if (error || !data?.ok) {
      setMensagem({ erro: true, texto: ERROS[data?.erro] || "Não foi possível lançar a visita. Tente de novo." });
      return;
    }
    setMensagem({
      erro: false,
      texto:
        data.status === "aprovada"
          ? `Visita de ${cliente.nome} lançada e aprovada.`
          : `Visita de ${cliente.nome} lançada. Fica pendente até a Gestão aprovar.`,
    });
    setResultados(null);
    setTermo("");
  };

  return (
    <>
      <button type="button" className="fid-link" onClick={() => setAberto(true)}>
        Cliente de fidelidade? Lançar visita
      </button>

      {aberto && (
        <div className="modal-backdrop" onClick={fechar}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Lançar visita de fidelidade</h3>

            <form onSubmit={buscar}>
              <div className="field">
                <label>Buscar cliente (CPF, nome, telefone ou e-mail)</label>
                <input
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Mínimo de 3 letras ou números"
                  autoFocus
                />
              </div>
              {origem === "atendente" && (
                <div className="field">
                  <label>Seu nome (garçom)</label>
                  <input value={garcom} onChange={(e) => setGarcom(e.target.value)} placeholder="Ex.: João" />
                </div>
              )}
              <button className="btn-primary" type="submit" disabled={buscando || termo.trim().length < 3}>
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {mensagem && (
              <p className={mensagem.erro ? "error-box" : "fid-sucesso"} style={{ marginTop: 12 }}>
                {mensagem.texto}
              </p>
            )}

            {resultados && resultados.length === 0 && (
              <p style={{ color: "var(--color-text-muted)" }}>Nenhum cliente encontrado.</p>
            )}
            {resultados && resultados.length > 0 && (
              <ul className="fid-lista">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.nome}</strong>
                      <span>
                        CPF {c.cpf_mascara} · {c.visitas} visita{c.visitas === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-accent"
                      style={{ width: "auto", padding: "6px 12px" }}
                      disabled={lancandoId === c.id}
                      onClick={() => lancar(c)}
                    >
                      {lancandoId === c.id ? "..." : "Lançar visita"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 14, width: "100%" }}
              onClick={fechar}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
