import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import { formatarChavePix } from "../../lib/pix";

const TIPOS_CHAVE = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

function PagamentoPixContent() {
  const { restaurant, refreshProfile } = useAuth();
  const [tipoChave, setTipoChave] = useState(restaurant?.tipo_chave_pix || "cpf");
  const [chavePix, setChavePix] = useState(restaurant?.chave_pix || "");
  const [cidade, setCidade] = useState(restaurant?.pix_cidade || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!chavePix.trim() || !cidade.trim()) {
      setError("Preencha a chave Pix e a cidade.");
      return;
    }

    const chaveFormatada = formatarChavePix(tipoChave, chavePix);

    setSaving(true);
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ chave_pix: chaveFormatada, tipo_chave_pix: tipoChave, pix_cidade: cidade.trim() })
      .eq("id", restaurant.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setChavePix(chaveFormatada);
    setSuccessMsg(`Salvo! Chave gravada como "${chaveFormatada}". Já pode gerar o QR code Pix na hora de fechar as comandas.`);
    await refreshProfile();
  };

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      <div className="card">
        <h2>Pagamento Pix</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Configure aqui a chave Pix do restaurante. Na hora de fechar uma comanda escolhendo
          "Pix" como forma de pagamento, o garçom vai poder mostrar um QR code já com o valor
          certo pro cliente escanear — sem precisar de maquininha nem de nenhum outro app. Isso
          não avisa automaticamente quando o cliente paga; o garçom confere visualmente, como já
          é feito hoje.
        </p>

        {error && <div className="error-box">{error}</div>}
        {successMsg && <div className="info-box">{successMsg}</div>}

        <form onSubmit={handleSave}>
          <div className="field">
            <label>Tipo de chave</label>
            <select value={tipoChave} onChange={(e) => setTipoChave(e.target.value)}>
              {TIPOS_CHAVE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Chave Pix</label>
            <input
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder={
                tipoChave === "telefone"
                  ? "Ex: 67999014777 (sem +55, eu completo)"
                  : tipoChave === "cpf"
                    ? "Só números"
                    : tipoChave === "cnpj"
                      ? "Só números"
                      : "Digite a chave"
              }
              required
            />
          </div>
          <div className="field">
            <label>Cidade (exigida pelo padrão do Pix)</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: Sao Paulo"
              required
            />
          </div>
          <button
            className="btn-primary"
            type="submit"
            disabled={saving}
            style={{ width: "auto", padding: "10px 20px" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PagamentoPixAdmin() {
  return (
    <AdminPinGate>
      <PagamentoPixContent />
    </AdminPinGate>
  );
}
