import { useState, type FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { changePassword } from "../api/auth";
import { getIniciais } from "../utils/getIniciais";

export default function ProfilePage() {
  const { user } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!user) return null;

  const iniciais = getIniciais(user.nome);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (novaSenha.length < 8) {
      setMessage({ text: "A nova senha deve ter pelo menos 8 caracteres.", type: "error" });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMessage({ text: "As senhas novas não coincidem.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      await changePassword({ senhaAtual, novaSenha });
      setMessage({ text: "Senha alterada com sucesso!", type: "success" });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error) {
      const errMsg = axios.isAxiosError(error) && typeof error.response?.data === "string"
        ? error.response.data
        : "Erro ao alterar a senha.";
      setMessage({ text: errMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h2 className="profile-title">Meu perfil</h2>
      </div>

      <div className="profile-card">
        <div className="profile-summary">
          <div className="profile-avatar profile-avatar--lg">{iniciais || "?"}</div>
          <div>
            <p className="profile-name">{user.nome}</p>
            <p className="profile-email">{user.email}</p>
            <span className={`profile-badge ${user.isAdmin ? "profile-badge--admin" : ""}`}>
              {user.isAdmin ? "Administrador" : "Usuário"}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3 className="ranking-title">Trocar senha</h3>

        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Senha atual</label>
            <input
              type="password"
              className="input"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label>Nova senha</label>
            <input
              type="password"
              className="input"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              className="input"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="button" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
