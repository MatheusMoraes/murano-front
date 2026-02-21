import { Routes, Route, Link } from "react-router-dom";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";

export default function App() {
  return (
    <div className="app-layout">
      <header className="header">
        <h1>Sistema</h1>

        <nav className="nav">
          <Link to="/" style={{marginRight: 15}}>Pedidos</Link>
          <Link to="/products">Produtos</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </div>
  );
}