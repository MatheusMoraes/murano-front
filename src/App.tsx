import { useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import api from "./api/api";
import logo from "./assets/logo.png";

const PING_INTERVAL_MS = 10_000;

export default function App() {
  // Pinga o backend periodicamente só para manter a conexão com o banco
  // (Neon) ativa e evitar o cold start do compute autosuspendido. Roda
  // mesmo na tela de login, já que não depende de estar autenticado.
  useEffect(() => {
    const ping = () => {
      api.get("/ping").catch((err) => {
        console.error("Falha ao pingar o backend:", err);
      });
    };

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<AuthenticatedApp />} />
    </Routes>
  );
}

function AuthenticatedApp() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Erro ao encerrar sessão", err);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-layout">
      <header className="header">
        <div className="header-brand">
          <img src={logo} alt="Mistério de Murano" />
          <h1>Mistério de Murano</h1>
        </div>

        <nav className="nav">
          <Link to="/" style={{ marginRight: 15 }}>
            Pedidos
          </Link>
          <Link to="/clients" style={{ marginRight: 15 }}>
            Clientes
          </Link>
          <Link to="/products" style={{ marginRight: 15 }}>
            Produtos
          </Link>
          <button className="btn-outline" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        {/* Qualquer rota desconhecida cai em "/", que já é protegida pelo
            PrivateRoute — se não estiver logado, redireciona pro /login em
            vez de mostrar o cabeçalho com uma área de conteúdo em branco. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
