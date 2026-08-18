import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAdminGate } from "../../context/AdminGateContext";

export default function AdminPinGate({ children }) {
  const { restaurant } = useAuth();
  const { unlocked, busy, unlock, setupPin } = useAdminGate();

  if (unlocked) {
    return children;
  }

  const hasPinConfigured = Boolean(restaurant?.admin_pin_hash);

  return hasPinConfigured ? <UnlockForm busy={busy} onUnlock={unlock} /> : <SetupForm busy={busy} onSetup={setupPin} />;
}

function UnlockForm({ busy, onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { error: unlockError } = await onUnlock(pin);
    if (unlockError) {
      setError(unlockError);
      setPin("");
    }
  };

  return (
    <div className="centered-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-mark">TP</div>
          <h1>Área de administração</h1>
          <p>Digite a senha extra de administração para continuar</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pin">Senha de administração</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button className="btn-primary btn-accent" type="submit" disabled={busy}>
            {busy ? "Verificando..." : "Desbloquear"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SetupForm({ busy, onSetup }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { error: setupError } = await onSetup(pin, confirmPin);
    if (setupError) {
      setError(setupError);
    }
  };

  return (
    <div className="centered-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-mark">TP</div>
          <h1>Crie a senha de administração</h1>
          <p>Essa é a primeira vez aqui — defina uma segunda senha para proteger esta área</p>
        </div>

        {error && <div className="error-box">{error}</div>}
        <div className="info-box">
          Essa senha é diferente da senha de login. Guarde-a em um lugar seguro — ela vai ser
          pedida toda vez que alguém entrar na área de administração.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pin">Nova senha de administração</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPin">Confirme a senha</label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary btn-accent" type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Criar senha e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
