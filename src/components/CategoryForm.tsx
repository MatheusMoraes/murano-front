import { useEffect, useState } from "react";
import axios from "axios";
import api from "../api/api";
import type { Category } from "../types/category";

interface CategoryFormProps {
  category?: Category | null;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

export default function CategoryForm({
  category,
  onSaved,
  onClose,
}: CategoryFormProps) {
  const isEdit = Boolean(category?.id);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<
    { text: string; type: "success" | "error" } | null
  >(null);

  const [show, setShow] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    if (category) {
      setNome(category.nome ?? "");
      setDescricao(category.descricao ?? "");
    } else {
      setNome("");
      setDescricao("");
    }
  }, [category]);

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
        Nome: nome,
        Descricao: descricao || null,
      };

      if (isEdit) {
        await api.put(`/categories/${category?.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      const successMsg = isEdit
        ? "Categoria atualizada com sucesso!"
        : "Categoria cadastrada com sucesso!";
      setMessage({ text: successMsg, type: "success" });
      setTimeout(async () => {
        await onSaved();
        handleCloseRequest();
      }, 1200);
    } catch (error) {
      console.error("Erro ao salvar categoria", error);
      const errMsg = axios.isAxiosError(error) && typeof error.response?.data === "string"
        ? error.response.data
        : "Erro ao salvar categoria";
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
        <h2>{isEdit ? "Editar Categoria" : "Nova Categoria"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="input"
              rows={3}
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
