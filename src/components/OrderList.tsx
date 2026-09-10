import { useEffect, useState } from "react";
import api from "../api/api";
import type { EnderecoInput, Order } from "../types/order";
import OrderDetails from "./OrderDetails";
import AddProductModal from "./AddProductModal";
import type { Product } from "../types/products";
import type { Client } from "../types/client";

interface OrderItemLocal {
  produtoId: number;
  quantidade: number;
}

interface CustomerFormData {
  ClientId: number;
  UsarEnderecoDiferente: boolean;
  Cep: string;
  Rua: string;
  Bairro: string;
  Cidade: string;
  Estado: string;
  Numero: string;
  Complemento: string;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [closingIds, setClosingIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemLocal[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [customerData, setCustomerData] = useState<CustomerFormData | null>(null);

  useEffect(() => {
    api.get<Order[]>("/orders").then(res => setOrders(res.data));
    api.get<Product[]>("/products").then(res => setProducts(res.data));
    api.get<Client[]>("/clients").then(res => setClients(res.data));
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
    setCustomerData(null);
    setShowAddProductModal(true);
  }

  function handleOrderCreated() {
    api.get<Order[]>("/orders").then(res => setOrders(res.data));
    api.get<Product[]>("/products").then(res => setProducts(res.data));
    setIsCreating(false);
    setShowAddProductModal(false);
    setOrderItems([]);
    setCustomerData(null);
    setEditingOrderId(null);
    // Trigger refresh de OrderDetails para atualizar dados em tempo real
    setRefreshTrigger(prev => prev + 1);
    setSuccessMsg("Pedido salvo com sucesso!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

 async function handleSubmitOrder(orderData: {
  ClientId: number;
  EnderecoEntrega?: EnderecoInput;
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
      // O endereço já vem resolvido no pedido; tratamos como "endereço
      // diferente" pré-preenchido para não perder o que foi salvo. O
      // usuário pode desmarcar o checkbox para voltar a usar o endereço
      // cadastrado do cliente.
      setCustomerData({
        ClientId: resp.data.clientId,
        UsarEnderecoDiferente: true,
        Cep: resp.data.cep ?? "",
        Rua: resp.data.rua ?? "",
        Bairro: resp.data.bairro ?? "",
        Cidade: resp.data.cidade ?? "",
        Estado: resp.data.estado ?? "",
        Numero: resp.data.numero ?? "",
        Complemento: resp.data.complemento ?? "",
      });
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
            setCustomerData(null);
          }}
          products={products}
          clients={clients}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          onSubmitOrder={handleSubmitOrder}
          onSuccess={handleOrderCreated}
          editMode={Boolean(editingOrderId)}
          customerData={customerData}
        />
      )}
    </div>
  );
}