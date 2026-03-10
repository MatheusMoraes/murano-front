import { useEffect, useState } from "react";
import api from "../api/api";
import type { Order } from "../types/order";
import OrderDetails from "./OrderDetails";
import AddProductModal from "./AddProductModal";
import type { Product } from "../types/products";

interface OrderItemLocal {
  produtoId: number;
  quantidade: number;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [closingIds, setClosingIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemLocal[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    api.get<Order[]>("/orders").then(res => setOrders(res.data));
    api.get<Product[]>("/products").then(res => setProducts(res.data));
  }, []);

  function toggleOrder(id: number) {
    if (expandedIds.includes(id)) {
      setClosingIds(prev => [...prev, id]);
      setTimeout(() => {
        setExpandedIds(prev => prev.filter(item => item !== id));
        setClosingIds(prev => prev.filter(item => item !== id));
      }, 250);
    } else {
      setExpandedIds(prev => [...prev, id]);
    }
  }

  function handleCreate() {
    setEditingOrderId(null);
    setIsCreating(true);
    setOrderItems([]);
    setShowAddProductModal(true);
  }

  function handleOrderCreated() {
    api.get<Order[]>("/orders").then(res => setOrders(res.data));
    api.get<Product[]>("/products").then(res => setProducts(res.data));
    setIsCreating(false);
    setShowAddProductModal(false);
    setOrderItems([]);
    setEditingOrderId(null);
    // Trigger refresh de OrderDetails para atualizar dados em tempo real
    setRefreshTrigger(prev => prev + 1);
    setSuccessMsg("Pedido salvo com sucesso!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

 async function handleSubmitOrder(orderData: {
  NomeCliente: string;
  Cep: string;
  Rua: string;
  Bairro: string;
  Cidade: string;
  Estado: string;
  Numero: string;
  Complemento: string;
  Items: OrderItemLocal[];
}) {
  try {
    let response;
    if (editingOrderId) {
      response = await api.put(`/orders/${editingOrderId}`, orderData);
      await api.get<Order>(`/orders/${editingOrderId}`);
    } else {
      response = await api.post("/orders", orderData);
    }
    setErrorMsg(null);
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data) {
      throw err;
    } else {
      throw err;
    }
  }
}

  async function handleEditOrder(id: number) {
    try {
      const resp = await api.get<Order>(`/orders/${id}`);
      setOrderItems(resp.data.items || []);
      setEditingOrderId(id);
      setIsCreating(true);
      setShowAddProductModal(true);
    } catch (err) {
      console.error("Erro ao carregar pedido para edição", err);
    }
  }

  async function handleDeleteOrder(id: number) {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
      await api.delete(`/orders/${id}`);
      api.get<Order[]>("/orders").then(res => setOrders(res.data));
      api.get<Product[]>("/products").then(res => setProducts(res.data));
      setSuccessMsg("Pedido excluído com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Erro ao excluir pedido", err);
      setErrorMsg("Falha ao excluir pedido");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }

  return (
    <div className="orders-container">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 className="orders-title">Pedidos</h2>
        <button className="btn-primary" style={{ width: "300px", height: "48px" }} onClick={handleCreate}>
          + Novo Pedido
        </button>
      </div>

      {errorMsg && (
        <div
          className="alert-error"
          style={{
            background: "#ffdddd",
            color: "#a00",
            padding: "12px",
            borderRadius: "6px",
            margin: "16px 0",
            cursor: "pointer",
            position: "relative",
            zIndex: 1000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
          onClick={() => setErrorMsg(null)}
        >
          {errorMsg}
        </div>
      )}

      <ul className="orders-list">
        {successMsg && (
          <div className="alert alert-success toast">
            {successMsg}
          </div>
        )}
        {orders.map(order => {
          const isOpen = expandedIds.includes(order.id);
          const isClosing = closingIds.includes(order.id);

          return (
            <li
              key={order.id}
              className={`order-card ${isOpen ? "open" : ""}`}
            >
              <div className="order-header">
                <div className="order-info">
                  <span className="order-id">
                    Pedido #{order.id}
                  </span>
                  <span className="order-date">
                    {new Date(order.criadoEm).toLocaleDateString()}
                  </span>
                </div>

                <div className="order-buttons">
                  <button
                    className="btn-toggle"
                    onClick={() => toggleOrder(order.id)}
                  >
                    {isOpen ? "Fechar" : "Visualizar"}
                  </button>

                  <button
                    className="btn-outline"
                    title="Editar pedido"
                    onClick={() => handleEditOrder(order.id)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn-danger"
                    title="Excluir pedido"
                    onClick={() => handleDeleteOrder(order.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {(isOpen || isClosing) && (
                <div className={`order-details-wrapper ${isClosing ? "closing" : "opening"}`}>
                  <OrderDetails orderId={order.id} refreshTrigger={refreshTrigger} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isCreating && (
        <AddProductModal
          open={showAddProductModal}
          onClose={() => {
            setShowAddProductModal(false);
            setIsCreating(false);
            setOrderItems([]);
          }}
          products={products}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          onSubmitOrder={handleSubmitOrder}
          onSuccess={handleOrderCreated}
          editMode={Boolean(editingOrderId)}
        />
      )}
    </div>
  );
}