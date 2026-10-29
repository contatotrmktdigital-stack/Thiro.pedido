import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ConfirmButton from "../../components/ConfirmButton";
import AdminPinGate from "./AdminPinGate";

const ORIGEM = { cadastro: "Cadastro", atendente: "Garçom", gestao: "Gestão" };

function normalizarLink(texto) {
  const limpo = texto.trim();
  if (!limpo) return "";
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

function linkValido(url) {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

function dataHora(iso) {
  return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function dataCurta(iso) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";
}

const ERROS = {
  ja_lancada_hoje: "Esse cliente já tem uma visita lançada hoje.",
  visitas_insuficientes: "O cliente ainda não tem visitas suficientes para esse prêmio.",
  ja_resgatado: "Esse prêmio já foi resgatado por esse cliente.",
};

// ---------------------------------------------------------------- Configuração
function Configuracao({ restaurantId }) {
  const [ativa, setAtiva] = useState(false);
  const [google, setGoogle] = useState("");
  const [salvo, setSalvo] = useState({ ativa: false, google: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("fidelidade_ativa, google_avaliacao_url")
      .eq("id", restaurantId)
      .single()
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else {
          const a = Boolean(data?.fidelidade_ativa);
          const g = data?.google_avaliacao_url || "";
          setAtiva(a);
          setGoogle(g);
          setSalvo({ ativa: a, google: g });
        }
        setLoading(false);
      });
  }, [restaurantId]);

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    setOk("");
    const url = normalizarLink(google);
    if (url && !linkValido(url)) {
      setErro("Esse link do Google não parece válido. Cole o endereço completo.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({ fidelidade_ativa: ativa, google_avaliacao_url: url || null })
      .eq("id", restaurantId);
    setSaving(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setGoogle(url);
    setSalvo({ ativa, google: url });
    setOk(ativa ? "Salvo! O cliente já vê o cadastro de fidelidade no QR." : "Salvo! O programa está desligado.");
  };

  if (loading) return <p>Carregando...</p>;
  const mudou = ativa !== salvo.ativa || normalizarLink(google) !== salvo.google;

  return (
    <div className="card">
      <h2>Programa de fidelidade</h2>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
        Ligado, o cliente se cadastra pelo QR da comanda (nome, CPF, telefone, e-mail e aceite da LGPD) e
        ganha <strong>10% de desconto nos produtos</strong> da primeira compra. O desconto vale uma vez por CPF
        e nunca incide sobre o 10% da casa.
      </p>
      {erro && <div className="error-box">{erro}</div>}
      {ok && <div className="info-box">{ok}</div>}
      <form onSubmit={salvar}>
        <label className="troca">
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          <span className="troca-trilho" aria-hidden="true" />
          <span className="troca-texto">
            <strong>{ativa ? "Fidelidade ligada" : "Fidelidade desligada"}</strong>
            <small>{ativa ? "O cliente vê o convite no QR da comanda." : "Nada de fidelidade aparece para o cliente."}</small>
          </span>
        </label>
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="fid-google">Link para avaliar no Google (opcional)</label>
          <input
            id="fid-google"
            type="url"
            value={google}
            onChange={(e) => setGoogle(e.target.value)}
            placeholder="https://g.page/r/seu-restaurante/review"
          />
          <small style={{ color: "var(--color-text-muted)" }}>
            Aparece como convite depois do cadastro. O desconto <strong>não depende</strong> da avaliação e o
            sistema não confere se o cliente avaliou.
          </small>
        </div>
        <button className="btn-primary" type="submit" disabled={saving || !mudou} style={{ width: "auto", padding: "10px 24px" }}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Visitas pendentes
function Pendentes() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("fidelidade_pendentes");
    if (error) setErro(error.message);
    else setLista(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = async (id, aprovar) => {
    setBusy(true);
    setErro("");
    const { error } = await supabase.rpc("fidelidade_decidir", { p_visita_id: id, p_aprovar: aprovar });
    setBusy(false);
    if (error) {
      setErro(error.message);
      return;
    }
    await carregar();
  };

  return (
    <div className="card">
      <h2>Visitas pendentes {lista.length > 0 && `(${lista.length})`}</h2>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
        Visitas lançadas pelo garçom esperam sua aprovação para contar.
      </p>
      {erro && <div className="error-box">{erro}</div>}
      {loading ? (
        <p>Carregando...</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>Nenhuma visita pendente.</p>
      ) : (
        <>
          <ul className="fid-lista">
            {lista.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>{v.cliente}</strong>
                  <span>
                    CPF {v.cpf} · {dataCurta(v.dia)} · lançada por {v.garcom || "garçom"}
                  </span>
                </div>
                <span style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    className="btn-primary btn-accent"
                    style={{ width: "auto", padding: "6px 12px" }}
                    disabled={busy}
                    onClick={() => decidir(v.id, true)}
                  >
                    Aprovar
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ width: "auto", padding: "6px 12px" }}
                    disabled={busy}
                    onClick={() => decidir(v.id, false)}
                  >
                    Recusar
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {lista.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <ConfirmButton confirmLabel="Aprovar todas?" onConfirm={() => decidir(null, true)} disabled={busy}>
                Aprovar todas
              </ConfirmButton>
              <ConfirmButton confirmLabel="Recusar todas?" onConfirm={() => decidir(null, false)} disabled={busy}>
                Recusar todas
              </ConfirmButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Prêmios
function Premios({ restaurantId }) {
  const [premios, setPremios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visitas, setVisitas] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("fidelidade_premios")
      .select("id, visitas, descricao, ativo")
      .order("visitas");
    if (error) setErro(error.message);
    else setPremios(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionar = async (e) => {
    e.preventDefault();
    setErro("");
    const n = parseInt(visitas, 10);
    if (!n || n < 1 || !descricao.trim()) {
      setErro("Informe o número de visitas (1 ou mais) e o prêmio.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("fidelidade_premios")
      .insert({ restaurant_id: restaurantId, visitas: n, descricao: descricao.trim() });
    setSaving(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setVisitas("");
    setDescricao("");
    await carregar();
  };

  const alternar = async (p) => {
    const { error } = await supabase.from("fidelidade_premios").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) setErro(error.message);
    else await carregar();
  };

  return (
    <div className="card">
      <h2>Prêmios</h2>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
        Defina quantas visitas o cliente precisa para cada prêmio. Cada prêmio pode ser resgatado uma vez por
        cliente. Prêmios antigos só são desativados, para manter o histórico.
      </p>
      {erro && <div className="error-box">{erro}</div>}
      <form className="inline-form" onSubmit={adicionar}>
        <div className="field" style={{ maxWidth: 120 }}>
          <label>Visitas</label>
          <input type="number" min="1" value={visitas} onChange={(e) => setVisitas(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Prêmio</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Sobremesa grátis" />
        </div>
        <button className="btn-primary" type="submit" disabled={saving} style={{ width: "auto", padding: "10px 18px" }}>
          Adicionar
        </button>
      </form>
      {loading ? (
        <p>Carregando...</p>
      ) : premios.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>Nenhum prêmio cadastrado ainda.</p>
      ) : (
        <table className="fid-tabela">
          <thead>
            <tr>
              <th>Visitas</th>
              <th>Prêmio</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {premios.map((p) => (
              <tr key={p.id} style={{ opacity: p.ativo ? 1 : 0.55 }}>
                <td>{p.visitas}</td>
                <td>{p.descricao}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn-secondary" style={{ width: "auto", padding: "4px 10px" }} onClick={() => alternar(p)}>
                    {p.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Clientes
function Clientes() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const abrir = async (id) => {
    setErro("");
    setMsg("");
    const { data, error } = await supabase.rpc("fidelidade_detalhe", { p_cliente_id: id });
    if (error || !data) {
      setErro("Não foi possível abrir o cliente.");
      return;
    }
    setDetalhe(data);
  };

  const buscar = async (e) => {
    e.preventDefault();
    setErro("");
    setMsg("");
    setDetalhe(null);
    setBuscando(true);
    const { data, error } = await supabase.rpc("fidelidade_buscar", { p_termo: termo });
    setBuscando(false);
    if (error) setErro(error.message);
    else setResultados(data || []);
  };

  const lancarVisita = async () => {
    setBusy(true);
    setErro("");
    setMsg("");
    const { data, error } = await supabase.rpc("fidelidade_lancar_visita", {
      p_cliente_id: detalhe.id,
      p_origem: "gestao",
      p_garcom_nome: null,
    });
    setBusy(false);
    if (error || !data?.ok) {
      setErro(ERROS[data?.erro] || "Não foi possível lançar a visita.");
      return;
    }
    setMsg("Visita lançada e aprovada.");
    await abrir(detalhe.id);
  };

  const resgatar = async (premio) => {
    setBusy(true);
    setErro("");
    setMsg("");
    const { data, error } = await supabase.rpc("fidelidade_resgatar", {
      p_cliente_id: detalhe.id,
      p_premio_id: premio.id,
    });
    setBusy(false);
    if (error || !data?.ok) {
      setErro(ERROS[data?.erro] || "Não foi possível registrar o resgate.");
      return;
    }
    setMsg(`Resgate registrado: ${premio.descricao}.`);
    await abrir(detalhe.id);
  };

  return (
    <div className="card">
      <h2>Clientes</h2>
      <form className="inline-form" onSubmit={buscar}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Buscar por CPF, nome, telefone ou e-mail</label>
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Mínimo de 3 letras ou números" />
        </div>
        <button className="btn-primary" type="submit" disabled={buscando || termo.trim().length < 3} style={{ width: "auto", padding: "10px 18px" }}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {erro && <div className="error-box">{erro}</div>}
      {msg && <div className="info-box">{msg}</div>}

      {!detalhe && resultados && resultados.length === 0 && (
        <p style={{ color: "var(--color-text-muted)" }}>Nenhum cliente encontrado.</p>
      )}
      {!detalhe && resultados && resultados.length > 0 && (
        <ul className="fid-lista">
          {resultados.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.nome}</strong>
                <span>
                  CPF {c.cpf_mascara} · {c.visitas} visita{c.visitas === 1 ? "" : "s"}
                </span>
              </div>
              <button className="btn-secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => abrir(c.id)}>
                Abrir
              </button>
            </li>
          ))}
        </ul>
      )}

      {detalhe && (
        <div className="fid-detalhe">
          <button className="btn-secondary" style={{ width: "auto", padding: "4px 10px", marginBottom: 12 }} onClick={() => setDetalhe(null)}>
            &larr; Voltar à lista
          </button>
          <h3 style={{ margin: "0 0 8px" }}>{detalhe.nome}</h3>
          <dl>
            <dt>CPF</dt>
            <dd>{detalhe.cpf}</dd>
            <dt>Telefone</dt>
            <dd>{detalhe.telefone || "—"}</dd>
            <dt>E-mail</dt>
            <dd>{detalhe.email || "—"}</dd>
            <dt>Cadastro</dt>
            <dd>{dataHora(detalhe.cadastrado_em)}</dd>
            <dt>Aceite LGPD</dt>
            <dd>
              {dataHora(detalhe.lgpd_aceite_at)} ({detalhe.lgpd_versao})
            </dd>
            <dt>Desconto de 10%</dt>
            <dd>{detalhe.desconto_usado_em ? `usado em ${dataHora(detalhe.desconto_usado_em)}` : "ainda não usado"}</dd>
            <dt>Visitas</dt>
            <dd>{detalhe.visitas}</dd>
            <dt>Código do cliente</dt>
            <dd style={{ fontSize: "0.75rem", fontWeight: 400 }}>{detalhe.id}</dd>
          </dl>

          <button className="btn-primary btn-accent" disabled={busy} onClick={lancarVisita} style={{ width: "auto", padding: "8px 18px", marginBottom: 16 }}>
            Lançar visita (1 por dia)
          </button>

          <h4>Prêmios</h4>
          {detalhe.premios.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>Nenhum prêmio cadastrado.</p>
          ) : (
            <ul className="fid-lista">
              {detalhe.premios.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.descricao}</strong>
                    <span>
                      {p.visitas} visitas ·{" "}
                      {p.resgatado_em
                        ? `resgatado em ${dataHora(p.resgatado_em)}`
                        : p.alcancado
                          ? "disponível para resgate"
                          : `faltam ${p.visitas - detalhe.visitas}`}
                    </span>
                  </div>
                  {p.alcancado && !p.resgatado_em && (
                    <ConfirmButton confirmLabel="Registrar resgate?" onConfirm={() => resgatar(p)} disabled={busy}>
                      Resgatar
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h4>Histórico de visitas</h4>
          {detalhe.historico.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>Sem visitas.</p>
          ) : (
            <table className="fid-tabela">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Situação</th>
                  <th>Origem</th>
                  <th>Garçom</th>
                  <th>Decidida por</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.historico.map((h, i) => (
                  <tr key={i}>
                    <td>{dataCurta(h.dia)}</td>
                    <td>
                      <span className={`fid-selo ${h.status}`}>{h.status}</span>
                    </td>
                    <td>{ORIGEM[h.origem] || h.origem}</td>
                    <td>{h.garcom || "—"}</td>
                    <td>{h.decidida_por ? `${h.decidida_por} · ${dataHora(h.decidida_at)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginTop: 14 }}>
            Pedido de exclusão dos dados (LGPD)? Avise o suporte informando o código do cliente acima — a
            anonimização é feita só sob pedido e com aprovação, nunca automática.
          </p>
        </div>
      )}
    </div>
  );
}

function FidelidadeContent() {
  const { restaurant } = useAuth();
  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a Gestão</Link>
      </p>
      <Configuracao restaurantId={restaurant.id} />
      <Pendentes />
      <Premios restaurantId={restaurant.id} />
      <Clientes />
    </div>
  );
}

export default function FidelidadeAdmin() {
  return (
    <AdminPinGate>
      <FidelidadeContent />
    </AdminPinGate>
  );
}
