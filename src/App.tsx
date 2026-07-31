import { Routes, Route, Link } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import logo from "./assets/logo.png";

export default function App() {
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
          <Link to="/products" style={{ marginRight: 15 }}>
            Produtos
          </Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </div>
  );
}