import { useEffect, useState } from "react";
import api from "../api/api";
import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";
import type { Product } from "../types/products";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

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

        <ProductList
          products={products}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
        />
      </div>

      {(isCreating || selectedProduct) && (
        <ProductForm
          product={selectedProduct}
          existingProducts={products}
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