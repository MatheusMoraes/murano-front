import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { Product } from "../types/products";
import "./AddProductModal.css";

interface OrderItemLocal {
  produtoId: number;
  quantidade: number;
}

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  orderItems: OrderItemLocal[];
  setOrderItems: Dispatch<SetStateAction<OrderItemLocal[]>>;
  onSubmitOrder: () => Promise<void>;
  onSuccess?: () => void; // called when order is submitted successfully
  editMode?: boolean;
}

export default function AddProductModal({
  open,
  onClose,
  products,
  orderItems,
  setOrderItems,
  onSubmitOrder,
  onSuccess,
  editMode = false,
}: AddProductModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [quantity, setQuantity] = useState<number>(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [message, setMessage] = useState<{text: string; type: "success" | "error"} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // animation state
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  // when parent toggles open, adjust local visibility
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      // after animation ends unmount
      const t = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleCloseRequest() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  async function handleSubmitOrder() {
    if (orderItems.length === 0) return;
    try {
      setSubmitting(true);
      await onSubmitOrder();
      setMessage({ text: "Pedido criado com sucesso!", type: "success" });
      if (onSuccess) onSuccess();
      // close after showing message
      setTimeout(() => {
        handleCloseRequest();
      }, 1200);
    } catch (err) {
      console.error("Erro ao submeter pedido", err);
      setMessage({ text: "Erro ao criar pedido", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  function handleAddItem() {
    if (!selectedProductId || quantity < 1) return;
    const product = products.find(p => p.id === selectedProductId);
    if (product && product.quantidade < quantity) {
      setLocalError(`Estoque insuficiente para ${product.nome}`);
      setTimeout(() => setLocalError(null), 4000);
      return;
    }
    setOrderItems(prev => [
      ...prev,
      { produtoId: selectedProductId, quantidade: quantity }
    ]);
    setSelectedProductId(undefined);
    setQuantity(1);
  }

  function handleRemoveItem(idx: number) {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  }

  const overlayClass = `modal-overlay ${visible && !closing ? "show" : "hide"}`;
  const contentClass = `modal-content ${visible && !closing ? "show" : "hide"}`;

  return (
    <div className={overlayClass} onClick={handleCloseRequest}>
      <div className={contentClass} onClick={e => e.stopPropagation()}>
        <h3>{editMode ? "Editar Pedido" : "Adicionar Produtos ao Pedido"}</h3>
        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
            {message.text}
          </div>
        )}
        {localError && (
          <div className="alert-error" onClick={() => setLocalError(null)}>
            {localError}
          </div>
        )}
        <div className="modal-form">
          <select
            value={selectedProductId ?? ""}
            onChange={e => setSelectedProductId(Number(e.target.value))}
          >
            <option value="">Selecione um produto</option>
            {products.map(prod => (
              <option key={prod.id} value={prod.id}>
                {prod.nome}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />
          <button className="button" onClick={handleAddItem}>Adicionar</button>
        </div>
        <ul>
          {orderItems.map((item, idx) => (
            <li key={idx}>
              {products.find(p => p.id === item.produtoId)?.nome} - Quantidade: {item.quantidade}
              <button className="button-secondary" onClick={() => handleRemoveItem(idx)}>Remover</button>
            </li>
          ))}
        </ul>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="button" onClick={handleSubmitOrder} disabled={orderItems.length === 0 || submitting}>
            {submitting ? "Enviando..." : "Confirmar Pedido"}
          </button>
          <button className="button button-secondary" onClick={handleCloseRequest}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}