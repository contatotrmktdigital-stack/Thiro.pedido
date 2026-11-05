import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import { PERFIS, aplicarPerfil, perfilPorId } from "../../lib/impressao/perfis";
import { useImpressaoConfig } from "../../lib/impressao/useImpressaoConfig";
import { montarTeste } from "../../lib/impressao/cupom";
import { blocosParaHtml, imprimirCupom } from "../../lib/impressao/imprimir";

const CAMPOS_SALVAR = [
  "modelo",
  "largura_papel_mm",
  "area_impressao_mm",
  "colunas",
  "tamanho_letra",
  "codepage",
  "metodo",
  "cabecalho",
  "rodape",
  "imprimir_conta",
  "conta_ao_fechar",
  "vias_conta",
  "imprimir_cozinha",
  "imprimir_bar",
  "vias_pedido",
];

function Interruptor({ marcado, onChange, titulo, descricao, desabilitado }) {
  return (
    <label className="troca" style={{ opacity: desabilitado ? 0.55 : 1, marginBottom: 10 }}>
      <input type="checkbox" checked={marcado} disabled={desabilitado} onChange={(e) => onChange(e.target.checked)} />
      <span className="troca-trilho" aria-hidden="true" />
      <span className="troca-texto">
        <strong>{titulo}</strong>
        {descricao && <small>{descricao}</small>}
      </span>
    </label>
  );
}

function ImpressaoContent() {
  const { restaurant } = useAuth();
  const { config: salvaConfig, carregando, recarregar } = useImpressaoConfig();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!carregando && !form) setForm({ ...salvaConfig });
  }, [carregando, salvaConfig, form]);

  const previa = useMemo(() => {
    if (!form) return "";
    return blocosParaHtml(montarTeste({ restaurante: restaurant, config: form }), form, 1);
  }, [form, restaurant]);

  if (!form) return <p>Carregando...</p>;

  const mudar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const numero = (campo) => (e) => mudar(campo, e.target.value === "" ? "" : Number(e.target.value));
  const personalizada = form.modelo === "personalizada";
  const perfil = perfilPorId(form.modelo);

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    setOk("");
    const carga = { restaurant_id: restaurant.id, updated_at: new Date().toISOString() };
    for (const c of CAMPOS_SALVAR) carga[c] = form[c];
    carga.cabecalho = (form.cabecalho || "").trim() || null;
    carga.rodape = (form.rodape || "").trim() || null;
    setSaving(true);
    const { error } = await supabase.from("impressao_config").upsert(carga, { onConflict: "restaurant_id" });
    setSaving(false);
    if (error) {
      setErro(
        error.message?.includes("impressao_config")
          ? "A tabela de impressão ainda não foi criada no banco. Rode o SQL 042 e tente de novo."
          : error.message
      );
      return;
    }
    await recarregar();
    setOk("Salvo! A impressão já usa essas configurações.");
  };

  const imprimirTeste = () => imprimirCupom(montarTeste({ restaurante: restaurant, config: form }), form, 1);

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a Gestão</Link>
      </p>
      {erro && <div className="error-box">{erro}</div>}
      {ok && <div className="info-box">{ok}</div>}

      <form onSubmit={salvar}>
        <div className="card">
          <h2>Impressora térmica</h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
            Escolha o modelo da sua impressora. O tamanho do papel e a quantidade de letras por linha já vêm certos.
            Se o seu modelo não estiver na lista, use "Personalizada".
          </p>
          <div className="field">
            <label htmlFor="imp-modelo">Modelo</label>
            <select id="imp-modelo" value={form.modelo} onChange={(e) => setForm((f) => aplicarPerfil(f, e.target.value))}>
              {PERFIS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-form">
            <div className="field">
              <label>Largura do papel (mm)</label>
              <input type="number" min="30" max="120" value={form.largura_papel_mm} onChange={numero("largura_papel_mm")} disabled={!personalizada} />
            </div>
            <div className="field">
              <label>Área impressa (mm)</label>
              <input type="number" min="30" max="120" value={form.area_impressao_mm} onChange={numero("area_impressao_mm")} disabled={!personalizada} />
            </div>
            <div className="field">
              <label>Letras por linha</label>
              <input type="number" min="16" max="80" value={form.colunas} onChange={numero("colunas")} disabled={!personalizada} />
            </div>
            <div className="field">
              <label>Tamanho da letra (%)</label>
              <input type="number" min="70" max="200" step="5" value={form.tamanho_letra} onChange={numero("tamanho_letra")} />
            </div>
          </div>
          {!personalizada && (
            <small style={{ color: "var(--color-text-muted)" }}>
              {perfil.nome}: papel de {perfil.larguraPapelMm} mm, {perfil.areaImpressaoMm} mm de área impressa e {perfil.colunas} letras por
              linha. Para mudar esses números, escolha "Personalizada".
            </small>
          )}
        </div>

        <div className="card">
          <h2>O que imprimir</h2>
          <Interruptor
            marcado={form.imprimir_conta}
            onChange={(v) => mudar("imprimir_conta", v)}
            titulo="Conta do cliente"
            descricao='Mostra o botão "Imprimir conta" na comanda e na notinha.'
          />
          <Interruptor
            marcado={form.conta_ao_fechar}
            onChange={(v) => mudar("conta_ao_fechar", v)}
            desabilitado={!form.imprimir_conta}
            titulo="Imprimir a conta sozinha ao fechar a comanda"
            descricao="Assim que o pagamento é confirmado, a conta sai na impressora."
          />
          <Interruptor
            marcado={form.imprimir_cozinha}
            onChange={(v) => mudar("imprimir_cozinha", v)}
            desabilitado
            titulo="Pedido para a cozinha (em breve)"
            descricao="Sai sozinho quando o garçom envia o pedido. Chega na próxima etapa."
          />
          <Interruptor
            marcado={form.imprimir_bar}
            onChange={(v) => mudar("imprimir_bar", v)}
            desabilitado
            titulo="Pedido para o bar (em breve)"
            descricao="Itens de bebida em uma impressora do bar. Chega na próxima etapa."
          />
          <div className="inline-form" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Vias da conta</label>
              <input type="number" min="1" max="5" value={form.vias_conta} onChange={numero("vias_conta")} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Textos do cupom</h2>
          <div className="field">
            <label htmlFor="imp-cab">Cabeçalho (abaixo do nome do restaurante)</label>
            <textarea id="imp-cab" rows="3" value={form.cabecalho || ""} onChange={(e) => mudar("cabecalho", e.target.value)} placeholder={"Ex.:\nRua das Flores, 123 - Centro\nCNPJ 00.000.000/0001-00"} />
          </div>
          <div className="field">
            <label htmlFor="imp-rod">Rodapé</label>
            <textarea id="imp-rod" rows="2" value={form.rodape || ""} onChange={(e) => mudar("rodape", e.target.value)} placeholder="Ex.: Obrigado pela preferência!" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button className="btn-primary" type="submit" disabled={saving} style={{ width: "auto", padding: "10px 24px" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" className="btn-secondary" onClick={imprimirTeste} style={{ width: "auto", padding: "10px 24px" }}>
            🖨 Imprimir teste
          </button>
        </div>
      </form>

      <div className="card">
        <h2>Prévia do cupom</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Assim o cupom de teste sai no papel de {form.largura_papel_mm} mm. A régua de números confere as letras por linha, e a linha dos
          acentos confere o "ç" e o "ã".
        </p>
        <div className="imp-previa">
          <iframe title="Prévia do cupom" srcDoc={previa} style={{ width: `${Math.round(form.largura_papel_mm * 3.78)}px` }} />
        </div>
      </div>
    </div>
  );
}

export default function ImpressaoAdmin() {
  return (
    <AdminPinGate>
      <ImpressaoContent />
    </AdminPinGate>
  );
}
