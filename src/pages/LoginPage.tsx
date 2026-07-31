import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from ?? "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, senha });
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Email ou senha inválidos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__hero">
          <img className="login-card__logo" src={logo} alt="Mistério de Murano" />
          <p>
            Acesse sua conta para gerenciar pedidos, produtos e muito mais na
            plataforma.
          </p>
        </div>

        <div className="login-card__form">
          <form onSubmit={handleSubmit}>
            <h2>LOGIN</h2>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="login-field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="email"
                type="email"
                placeholder="Email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="senha"
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" defaultChecked />
                Lembrar
              </label>
              <a className="login-forgot" href="#">
                Esqueceu a senha?
              </a>
            </div>

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "ENTRANDO..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
