import { useEffect, useState } from "react";
import MoneyInput from "../components/MoneyInput";
import api from "../api/api";
import type { Product } from "../types/products";

interface ProductFormProps {
  product?: Product | null;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

export default function ProductForm({
  product,
  onSaved,
  onClose,
}: ProductFormProps) {
  const isEdit = Boolean(product?.id);

  const [nome, setName] = useState("");
  const [preco, setPrice] = useState<number>(0);
  const [quantidade, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<
    { text: string; type: "success" | "error" } | null
  >(null);

  // animation state triggered on mount/close
  const [show, setShow] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // ensure state is ready when component mounts
    setShow(true);
  }, []);

  useEffect(() => {
    if (product) {
      setName(product.nome);
      setPrice(product.preco);
      setQuantity(product.quantidade);
    } else {
      setName("");
      setPrice(0);
      setQuantity(0)
    }
  }, [product]);

  function handleCloseRequest() {
    setClosing(true);
    setShow(false);
    setTimeout(onClose, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        nome,
        preco,
        quantidade
      };

      if (isEdit) {
        await api.put(`/products/${product?.id}`, payload);
      } else {
        await api.post("/products", payload);
      }

      const successMsg = isEdit
        ? "Produto atualizado com sucesso!"
        : "Produto cadastrado com sucesso!";
      setMessage({ text: successMsg, type: "success" });
      // wait briefly so user sees message, then notify parent and close with animation
      setTimeout(async () => {
        await onSaved();
        handleCloseRequest();
      }, 1200);
    } catch (error) {
      console.error("Erro ao salvar produto", error);
      const errMsg = "Erro ao salvar produto";
      setMessage({ text: errMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const containerClass = `product-form-modal ${show && !closing ? "visible" : "hidden"}`;

  return (
    <div className={containerClass}>
      <div className="product-form-overlay" onClick={handleCloseRequest}></div>
      <div className="product-form-box">
        {message && (
          <div
            className={`alert ${
              message.type === "success" ? "alert-success" : "alert-error"
            }`}
          >
            {message.text}
          </div>
        )}
        <h2>{isEdit ? "Editar Produto" : "Novo Produto"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Quantidade</label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Preço</label>
            <MoneyInput value={preco} onChange={setPrice} />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCloseRequest} className="button-secondary">
              Cancelar
            </button>

            <button type="submit" disabled={loading} className="button">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}