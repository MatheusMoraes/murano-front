import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import CategoriesPage from "./pages/CategoriesPage";
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

// Quantos produtos estão com estoque baixo agora. Atualiza: ao carregar, a
// cada 60s (rede de segurança) e imediatamente quando qualquer tela dispara
// "products:changed" (ex: ProductsPage depois de salvar/excluir um
// produto) — sem isso, criar/editar um produto em outra aba do app só
// refletiria aqui no próximo polling.
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
    window.addEventListener("products:changed", load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("products:changed", load);
    };
  }, []);

  return count;
}

function AuthenticatedApp() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const lowStockCount = useLowStockCount();
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Fecha o alerta ao clicar fora dele.
  useEffect(() => {
    if (!showLowStockAlert) return;

    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowLowStockAlert(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLowStockAlert]);

  function goToLowStockProducts() {
    setShowLowStockAlert(false);
    navigate("/products");
  }

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
            Dashboard
          </Link>
          <Link to="/orders" style={{ marginRight: 15 }}>
            Pedidos
          </Link>
          <Link to="/clients" style={{ marginRight: 15 }}>
            Clientes
          </Link>
          <Link to="/products" style={{ marginRight: 15 }}>
            Produtos
          </Link>
          <Link to="/categories" style={{ marginRight: 15 }}>
            Categorias
          </Link>

          {/* O ícone fica sempre visível, tenha ou não alerta no momento —
              só o badge e o conteúdo do painel mudam conforme lowStockCount. */}
          <div className="low-stock-bell-wrapper" ref={bellRef}>
            <button
              type="button"
              className="low-stock-bell"
              onClick={() => setShowLowStockAlert((prev) => !prev)}
              aria-label={
                lowStockCount > 0
                  ? `${lowStockCount} produto(s) com estoque baixo. Clique para ver.`
                  : "Nenhum produto com estoque baixo no momento."
              }
              aria-expanded={showLowStockAlert}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {lowStockCount > 0 && (
                <span className="low-stock-bell__badge">{lowStockCount}</span>
              )}
            </button>

            {showLowStockAlert && (
              <div className={`low-stock-dropdown ${lowStockCount === 0 ? "low-stock-dropdown--ok" : ""}`}>
                {lowStockCount > 0 ? (
                  <button
                    type="button"
                    className="low-stock-dropdown__message"
                    onClick={goToLowStockProducts}
                  >
                    Você tem itens com o estoque baixo. Clique para saber mais.
                  </button>
                ) : (
                  <p className="low-stock-dropdown__message low-stock-dropdown__message--ok">
                    Nenhum produto com estoque baixo no momento.
                  </p>
                )}
              </div>
            )}
          </div>

          <button className="btn-outline" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><CategoriesPage /></PrivateRoute>} />
        {/* Qualquer rota desconhecida cai em "/", que já é protegida pelo
            PrivateRoute — se não estiver logado, redireciona pro /login em
            vez de mostrar o cabeçalho com uma área de conteúdo em branco. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
