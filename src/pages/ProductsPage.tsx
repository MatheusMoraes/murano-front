import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";
import CatalogModal from "../components/CatalogModal";
import type { Product } from "../types/products";
import type { Category } from "../types/category";
import { normalizeName } from "../utils/normalizeName";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'delete';
  } | null>(null);


  async function loadProducts() {
    try {
      const response = await api.get<Product[]>("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  }

  function loadCategories() {
    api.get<Category[]>("/categories").then(res => setCategories(res.data));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
    loadCategories();

    // Uma categoria pode ser criada/editada/excluída na tela de Categorias
    // enquanto essa página está aberta em outra aba/rota — recarrega a
    // lista pra manter o filtro e o formulário coerentes.
    window.addEventListener("categories:changed", loadCategories);
    return () => window.removeEventListener("categories:changed", loadCategories);
  }, []);

  const filteredProducts = useMemo(() => {
    const termo = normalizeName(searchTerm);
    return products.filter(p => {
      const matchesSearch = !termo || normalizeName(p.nome).includes(termo);
      const matchesCategory = categoryFilter === "" || p.categoriaId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  function handleCreate() {
    setSelectedProduct(null);
    setIsCreating(true);
  }

  function handleEdit(product: Product) {
    setSelectedProduct(product);
    setIsCreating(true);
  }

  function handleClose() {
    setSelectedProduct(null);
    setIsCreating(false);
  }

  async function handleSaved() {
    await loadProducts(); // atualiza lista
    // Avisa o sino de estoque baixo no header (que não sabe, por conta
    // própria, que um produto mudou) pra ele recalcular na hora em vez de
    // esperar o próximo polling.
    window.dispatchEvent(new CustomEvent("products:changed"));
    setMessage({
      text: selectedProduct
        ? "Produto atualizado com sucesso!"
        : "Produto cadastrado com sucesso!",
      type: "success",
    });
    handleClose();
    // auto-dismiss after 3s
    setTimeout(() => setMessage(null), 3000);
  }

  function handleDeleted() {
    setMessage({
      text: "Produto excluído com sucesso!",
      type: "delete",
    });
    loadProducts();
    window.dispatchEvent(new CustomEvent("products:changed"));
    // auto-dismiss after 3s
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="products-page">
      <div className="products-container">
        <div className="page-header">
          <h2 className="products-title">Produtos</h2>
          <button className="btn-primary btn-primary-lg" onClick={handleCreate}>
            + Novo Produto
          </button>
        </div>

        <div className="products-filters">
        
          <input
            type="text"
            className="input"
            placeholder="Buscar produto pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowCatalogModal(true)}
          >
            📄 Gerar Catálogo
          </button>
        </div>

        <ProductList
          products={filteredProducts}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
        />
      </div>

      {showCatalogModal && (
        <CatalogModal
          categories={categories}
          products={products}
          onClose={() => setShowCatalogModal(false)}
        />
      )}

      {(isCreating || selectedProduct) && (
        <ProductForm
          product={selectedProduct}
          existingProducts={products}
          categories={categories}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      )}

      {message && (
        <div
          className={`toast alert ${
            message.type === "success" ? "alert-success" : "alert-delete"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
