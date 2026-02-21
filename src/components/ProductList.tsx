import api from "../api/api";
import type { Product } from "../types/products";

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDeleted: () => void;
}

export default function ProductList({ products, onEdit, onDeleted }: Props) {
  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      onDeleted();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto");
    }
  }

  return (
    <div className="product-grid">
      {products.map(product => (
        <div key={product.id} className="product-card">
          <div className="product-card-header">
            <h3>{product.nome}</h3>
          </div>

          <div className="product-card-body">
            <div className="product-info">
              <p><strong>Estoque:</strong> {product.quantidade}</p>
              <p><strong>Preço:</strong> R$ {product.preco.toFixed(2)}</p>
            </div>
          </div>

          <div className="product-card-footer">
            <button
              className="btn-outline"
              onClick={() => onEdit(product)}
            >
              Editar
            </button>
            <button
              className="btn-danger"
              onClick={() => handleDelete(product.id)}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}