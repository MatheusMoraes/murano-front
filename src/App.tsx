import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import api from "./api/api";
import type { Product } from "./types/products";
import logo from "./assets/logo.png";

const PING_INTERVAL_MS = 10_000;
const LOW_STOCK_POLL_MS = 60_000;

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

// Quantos produtos estão com estoque baixo agora, atualizado a cada 60s (e
// ao carregar). Vive fora do componente pra não ficar refazendo o fetch
// toda vez que o header re-renderiza por outro motivo.
function useLowStockCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function load() {
      api
        .get<Product[]>("/products")
        .then((res) => {
          if (cancelled) return;
          setCount(res.data.filter((p) => p.estoqueBaixo).length);
        })
        .catch(() => {
          // Silencioso: ainda sem login, ou backend indisponível — não é
          // motivo pra quebrar o cabeçalho.
        });
    }

    load();
    const interval = setInterval(load, LOW_STOCK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}

function AuthenticatedApp() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const lowStockCount = useLowStockCount();

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

          {lowStockCount > 0 && (
            <button
              type="button"
              className="low-stock-bell"
              onClick={() => navigate("/products")}
              title="Você tem itens com o estoque baixo. Clique para saber mais."
              aria-label={`${lowStockCount} produto(s) com estoque baixo. Clique para ver.`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="low-stock-bell__badge">{lowStockCount}</span>
            </button>
          )}

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
