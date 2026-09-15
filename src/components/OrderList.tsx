import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import type { EnderecoInput, Order } from "../types/order";
import OrderDetails from "./OrderDetails";
import AddProductModal from "./AddProductModal";
import type { Product } from "../types/products";
import type { Client } from "../types/client";
import { normalizeName } from "../utils/normalizeName";
import { formatCurrency } from "../utils/formatCurrency";

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

// Compara o endereço salvo no pedido com o endereço cadastrado do cliente
// hoje — usado pra decidir se o checkbox "usar endereço diferente" deve
// vir marcado ao abrir um pedido pra edição. Sem cliente encontrado (ex:
// lista de clientes ainda não carregou), assume diferente por segurança:
// melhor mostrar os campos preenchidos à toa do que perder um endereço
// que na verdade era customizado.
function enderecoIgualAoCliente(order: Order, client: Client | undefined): boolean {
  if (!client) return false;
  const norm = (v?: string | null) => (v ?? "").trim();
  return (
    norm(order.cep) === norm(client.cep) &&
    norm(order.rua) === norm(client.rua) &&
    norm(order.bairro) === norm(client.bairro) &&
    norm(order.cidade) === norm(client.cidade) &&
    norm(order.estado) === norm(client.estado) &&
    norm(order.numero) === norm(client.numero) &&
    norm(order.complemento) === norm(client.complemento)
  );
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
  const [searchTerm, setSearchTerm] = useState("");

  function loadOrders() {
    api.get<Order[]>("/orders").then(res => setOrders(res.data));
  }

  function loadProducts() {
    api.get<Product[]>("/products").then(res => setProducts(res.data));
  }

  function loadClients() {
    api.get<Client[]>("/clients").then(res => setClients(res.data));
  }

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadClients();

    // Produto/cliente pode ser editado nas telas de Produtos/Clientes
    // enquanto esta tela continua montada (SPA, sem reload) — sem isso, o
    // modal de novo/editar pedido ficaria oferecendo preço/estoque/endereço
    // desatualizados até a próxima navegação até aqui.
    window.addEventListener("products:changed", loadProducts);
    window.addEventListener("clients:changed", loadClients);
    return () => {
      window.removeEventListener("products:changed", loadProducts);
      window.removeEventListener("clients:changed", loadClients);
    };
  }, []);

  // Filtra pelo nome do cliente ou pelo número do pedido ("#12" ou "12"
  // batem no pedido 12) — cobre tanto quem lembra do cliente quanto quem
  // já tem o número do pedido em mãos.
  const filteredOrders = useMemo(() => {
    const termo = normalizeName(searchTerm);
    if (!termo) return orders;
    const termoSemHash = termo.replace(/^#/, "");
    return orders.filter(order =>
      normalizeName(order.nomeCliente).includes(termo) ||
      String(order.id) === termoSemHash
    );
  }, [orders, searchTerm]);

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
    loadOrders();
    loadProducts();
    // Criar/editar pedido decrementa o estoque dos produtos — avisa o sino
    // de estoque baixo no header pra ele recalcular na hora.
    window.dispatchEvent(new CustomEvent("products:changed"));
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
      const items = resp.data.items || [];
      // Item cujo produto já foi excluído não tem mais como ser reenviado
      // (não existe produtoId válido pra apontar) — fica de fora da edição.
      // O nome/valor dele continuam preservados na visualização do pedido,
      // só não pode mais ser reincluído ao salvar uma edição.
      const editableItems = items.filter(
        (item): item is typeof item & { produtoId: number } => item.produtoId != null
      );
      if (editableItems.length < items.length) {
        setErrorMsg(
          "Este pedido tinha item(ns) de produto(s) já excluído(s) — eles não puderam ser incluídos na edição."
        );
        setTimeout(() => setErrorMsg(null), 6000);
      }
      setOrderItems(editableItems);
      // O endereço do pedido vem sempre resolvido (seja o do cadastro do
      // cliente, seja um informado à parte) — o checkbox só deve começar
      // marcado se o endereço salvo no pedido for de fato diferente do
      // endereço cadastrado do cliente hoje. Busca o cliente direto da API
      // em vez de confiar na lista `clients` já carregada no state: ela é
      // populada em paralelo no mount desta tela, e clicar em "Editar" logo
      // após abrir a página pode acontecer antes dela terminar de chegar —
      // nesse caso `clients` estaria vazia e a comparação sempre marcaria
      // "diferente" por engano.
      let usarEnderecoDiferente = true;
      try {
        const clientResp = await api.get<Client>(`/clients/${resp.data.clientId}`);
        usarEnderecoDiferente = !enderecoIgualAoCliente(resp.data, clientResp.data);
      } catch (err) {
        console.error("Erro ao buscar cliente para comparar endereço do pedido", err);
      }
      setCustomerData({
        ClientId: resp.data.clientId,
        UsarEnderecoDiferente: usarEnderecoDiferente,
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
      loadOrders();
      loadProducts();
      // Excluir pedido repõe o estoque — mesmo aviso pro header.
      window.dispatchEvent(new CustomEvent("products:changed"));
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
      <div className="page-header">
        <h2 className="orders-title">Pedidos</h2>
        <button className="btn-primary btn-primary-lg" onClick={handleCreate}>
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

      <div className="orders-filters">
        <input
          type="text"
          className="input"
          placeholder="Buscar por cliente ou número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ul className="orders-list">
        {successMsg && (
          <div className="alert alert-success toast">
            {successMsg}
          </div>
        )}
        {filteredOrders.length === 0 && (
          <li className="orders-empty">Nenhum pedido encontrado.</li>
        )}
        {filteredOrders.map(order => {
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
                    Pedido #{order.id} — {order.nomeCliente}
                  </span>
                  <span className="order-date">
                    {new Date(order.criadoEm).toLocaleDateString()} · {formatCurrency(order.valorTotal)}
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