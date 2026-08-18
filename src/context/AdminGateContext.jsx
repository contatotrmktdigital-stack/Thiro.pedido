import { createContext, useContext, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

// Controla o desbloqueio da área de administração (segunda senha).
// De propósito, o desbloqueio SÓ existe em memória: se a página for
// recarregada ou o usuário sair, precisa digitar a senha de novo.
const AdminGateContext = createContext(null);

export function AdminGateProvider({ children }) {
  const { restaurant, refreshProfile } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlock = async (pin) => {
    if (!restaurant?.id) return { error: "Restaurante não identificado." };
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_admin_pin", {
      p_restaurant_id: restaurant.id,
      p_pin: pin,
    });
    setBusy(false);
    if (error) return { error: error.message };
    if (!data) return { error: "Senha de administração incorreta." };
    setUnlocked(true);
    return { error: null };
  };

  const setupPin = async (pin, confirmPin) => {
    if (!restaurant?.id) return { error: "Restaurante não identificado." };
    if (pin.length < 4) return { error: "A senha precisa ter pelo menos 4 caracteres." };
    if (pin !== confirmPin) return { error: "As senhas não coincidem." };

    setBusy(true);
    const { error } = await supabase.rpc("set_admin_pin", {
      p_restaurant_id: restaurant.id,
      p_pin: pin,
    });
    setBusy(false);
    if (error) return { error: error.message };

    await refreshProfile();
    setUnlocked(true);
    return { error: null };
  };

  const lock = () => setUnlocked(false);

  return (
    <AdminGateContext.Provider value={{ unlocked, busy, unlock, setupPin, lock }}>
      {children}
    </AdminGateContext.Provider>
  );
}

export function useAdminGate() {
  const ctx = useContext(AdminGateContext);
  if (!ctx) {
    throw new Error("useAdminGate precisa ser usado dentro de um <AdminGateProvider>");
  }
  return ctx;
}
