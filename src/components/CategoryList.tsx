import { useEffect, useState } from "react";
import axios from "axios";
import api from "../api/api";
import type { Category } from "../types/category";
import CategoryForm from "./CategoryForm";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function loadCategories() {
    api.get<Category[]>("/categories").then(res => setCategories(res.data));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function handleCreate() {
    setSelectedCategory(null);
    setIsEditing(true);
  }

  function handleEdit(category: Category) {
    setSelectedCategory(category);
    setIsEditing(true);
  }

  function handleCloseForm() {
    setSelectedCategory(null);
    setIsEditing(false);
  }

  async function handleSaved() {
    loadCategories();
    // Categorias afetam o filtro/seleção na tela de produtos e no pedido —
    // avisa quem estiver escutando, mesmo padrão do estoque baixo.
    window.dispatchEvent(new CustomEvent("categories:changed"));
    setSuccessMsg(selectedCategory ? "Categoria atualizada com sucesso!" : "Categoria cadastrada com sucesso!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
      window.dispatchEvent(new CustomEvent("categories:changed"));
      setSuccessMsg("Categoria excluída com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Erro ao excluir categoria", err);
      const msg = axios.isAxiosError(err) && err.response?.status === 400
        ? (err.response?.data ?? "Não é possível excluir uma categoria que já possui produtos.")
        : "Falha ao excluir categoria";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }

  return (
    <div className="clients-container">
      <div className="page-header">
        <h2 className="clients-title">Categorias</h2>
        <button className="btn-primary btn-primary-lg" onClick={handleCreate}>
          + Nova Categoria
        </button>
      </div>

      {errorMsg && (
        <div className="alert-error" onClick={() => setErrorMsg(null)}>
          {errorMsg}
        </div>
      )}

      <ul className="clients-list">
        {successMsg && (
          <div className="alert alert-success toast">
            {successMsg}
          </div>
        )}
        {categories.map(category => (
          <li key={category.id} className="client-card">
            <div className="client-header">
              <div className="client-info">
                <span className="client-name">{category.nome}</span>
                {category.descricao && (
                  <span className="client-sub">{category.descricao}</span>
                )}
              </div>

              <div className="client-buttons">
                <button
                  className="btn-outline"
                  title="Editar categoria"
                  onClick={() => handleEdit(category)}
                >
                  Editar
                </button>

                <button
                  className="btn-danger"
                  title="Excluir categoria"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {isEditing && (
        <CategoryForm
          category={selectedCategory}
          onSaved={handleSaved}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
