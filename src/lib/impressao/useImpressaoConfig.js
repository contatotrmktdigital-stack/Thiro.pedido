import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { CONFIG_PADRAO } from "./perfis";

// Configuração de impressão do restaurante (com o padrão enquanto nada foi salvo).
// Guarda em memória pra não consultar o banco a cada comanda aberta.
const cache = new Map();

export function useImpressaoConfig() {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id;
  const [dados, setDados] = useState(() => (restaurantId ? cache.get(restaurantId) : null) || null);
  const [carregando, setCarregando] = useState(!dados);

  const recarregar = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("impressao_config")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    // sem linha (ou tabela ainda não criada): vale o padrão
    const config = { ...CONFIG_PADRAO, ...(error ? {} : data || {}) };
    const resultado = { config, salvo: Boolean(!error && data) };
    cache.set(restaurantId, resultado);
    setDados(resultado);
    setCarregando(false);
  }, [restaurantId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    config: dados?.config || CONFIG_PADRAO,
    salvo: Boolean(dados?.salvo),
    carregando,
    recarregar,
  };
}
