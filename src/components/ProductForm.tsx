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
  const [precoVarejo, setPrecoVarejo] = useState<number>(0);
  // 0 aqui significa "sem atacado configurado" (não faz sentido um preço de
  // atacado igual a zero de verdade).
  const [precoAtacado, setPrecoAtacado] = useState<number>(0);
  const [quantidadeMinimaAtacado, setQuantidadeMinimaAtacado] = useState<number>(0);
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
      setPrecoVarejo(product.precoVarejo);
      setPrecoAtacado(product.precoAtacado ?? 0);
      setQuantidadeMinimaAtacado(product.quantidadeMinimaAtacado ?? 0);
      setQuantity(product.quantidade);
    } else {
      setName("");
      setPrecoVarejo(0);
      setPrecoAtacado(0);
      setQuantidadeMinimaAtacado(0);
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

    if (precoAtacado > 0 && quantidadeMinimaAtacado <= 0) {
      setMessage({ text: "Informe a quantidade mínima para o preço de atacado.", type: "error" });
      return;
    }
    if (quantidadeMinimaAtacado > 0 && precoAtacado <= 0) {
      setMessage({ text: "Informe o preço de atacado.", type: "error" });
      return;
    }
    if (precoAtacado > 0 && precoAtacado > precoVarejo) {
      setMessage({ text: "O preço de atacado não pode ser maior que o de varejo.", type: "error" });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nome,
        precoVarejo,
        precoAtacado: precoAtacado > 0 ? precoAtacado : null,
        quantidadeMinimaAtacado: quantidadeMinimaAtacado > 0 ? quantidadeMinimaAtacado : null,
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
            <label>Preço Varejo</label>
            <MoneyInput value={precoVarejo} onChange={setPrecoVarejo} />
          </div>

          <div className="form-group">
            <label>Preço Atacado (opcional)</label>
            <MoneyInput value={precoAtacado} onChange={setPrecoAtacado} />
          </div>

          <div className="form-group">
            <label>Quantidade mínima para atacado</label>
            <input
              type="number"
              min={0}
              value={quantidadeMinimaAtacado}
              onChange={(e) => setQuantidadeMinimaAtacado(Number(e.target.value))}
              className="input"
              placeholder="Ex: 10"
            />
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