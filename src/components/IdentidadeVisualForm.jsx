import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_COR_PRIMARIA } from "../lib/theme";
import ConfirmButton from "./ConfirmButton";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

async function uploadImagem(restaurantId, tipo, file) {
  const path = `${restaurantId}/${tipo}`;
  const { error: uploadError } = await supabase.storage
    .from("restaurant-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("restaurant-assets").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function removerImagem(restaurantId, tipo) {
  const path = `${restaurantId}/${tipo}`;
  await supabase.storage.from("restaurant-assets").remove([path]);
}

export default function IdentidadeVisualForm({ restaurant, onSaved }) {
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(restaurant.logo_url || "");
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(restaurant.background_url || "");
  const [corPrimaria, setCorPrimaria] = useState(restaurant.cor_primaria || DEFAULT_COR_PRIMARIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFileChange = (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem (PNG, JPG, etc).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("A imagem precisa ter até 3 MB.");
      return;
    }
    setError("");
    const previewUrl = URL.createObjectURL(file);
    if (kind === "logo") {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setBgFile(file);
      setBgPreview(previewUrl);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const updates = { cor_primaria: corPrimaria };

      if (logoFile) {
        updates.logo_url = await uploadImagem(restaurant.id, "logo", logoFile);
      }
      if (bgFile) {
        updates.background_url = await uploadImagem(restaurant.id, "background", bgFile);
      }

      const { error: updateError } = await supabase
        .from("restaurants")
        .update(updates)
        .eq("id", restaurant.id);

      if (updateError) throw updateError;

      setSuccessMsg("Identidade visual salva!");
      setLogoFile(null);
      setBgFile(null);
      onSaved?.(updates);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (kind) => {
    setError("");
    setSuccessMsg("");
    try {
      await removerImagem(restaurant.id, kind);
      const field = kind === "logo" ? "logo_url" : "background_url";
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ [field]: null })
        .eq("id", restaurant.id);
      if (updateError) throw updateError;

      if (kind === "logo") {
        setLogoFile(null);
        setLogoPreview("");
      } else {
        setBgFile(null);
        setBgPreview("");
      }
      setSuccessMsg("Removido.");
      onSaved?.({ [field]: null });
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleResetCor = () => setCorPrimaria(DEFAULT_COR_PRIMARIA);

  return (
    <form onSubmit={handleSave}>
      {error && <div className="error-box">{error}</div>}
      {successMsg && <div className="info-box">{successMsg}</div>}

      <div className="field">
        <label>Logo do restaurante</label>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: -4 }}>
          Aparece no lugar do ícone padrão no cabeçalho e na aba do navegador. Ideal: imagem
          quadrada.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: logoPreview ? `url(${logoPreview}) center/cover` : "var(--color-bg)",
              border: "1px solid var(--color-border)",
              flexShrink: 0,
            }}
          />
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} />
          {(logoPreview || restaurant.logo_url) && (
            <ConfirmButton onConfirm={() => handleRemove("logo")}>Remover</ConfirmButton>
          )}
        </div>
      </div>

      <div className="field">
        <label>Cor principal</label>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: -4 }}>
          Usada no cabeçalho, botões e destaques do app.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="color"
            value={corPrimaria}
            onChange={(e) => setCorPrimaria(e.target.value)}
            style={{ width: 48, height: 40, padding: 2, border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}
          />
          <input
            value={corPrimaria}
            onChange={(e) => setCorPrimaria(e.target.value)}
            style={{ maxWidth: 140 }}
          />
          <button type="button" className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={handleResetCor}>
            Cor padrão
          </button>
        </div>
      </div>

      <div className="field">
        <label>Imagem de fundo</label>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: -4 }}>
          Aparece de fundo nas telas do restaurante (foto do estabelecimento, textura da marca).
        </p>
        {bgPreview && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              height: 100,
              borderRadius: "var(--radius)",
              background: `url(${bgPreview}) center/cover`,
              border: "1px solid var(--color-border)",
              marginBottom: 10,
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "background")} />
          {(bgPreview || restaurant.background_url) && (
            <ConfirmButton onConfirm={() => handleRemove("background")}>Remover</ConfirmButton>
          )}
        </div>
      </div>

      <button className="btn-primary" type="submit" disabled={saving} style={{ width: "auto", padding: "10px 20px" }}>
        {saving ? "Salvando..." : "Salvar identidade visual"}
      </button>
    </form>
  );
}
