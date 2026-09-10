import { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import api from "./api/api";
import logo from "./assets/logo.png";

const PING_INTERVAL_MS = 10_000;

export default function App() {
  // Pinga o backend periodicamente só para manter a conexão com o banco
  // (Neon) ativa e evitar o cold start do compute autosuspendido.
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
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </div>
  );
}