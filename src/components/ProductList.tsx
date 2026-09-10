import api from "../api/api";
import type { Product } from "../types/products";
import { formatCurrency } from "../utils/formatCurrency";

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
        <div
          key={product.id}
          className={`product-card ${product.estoqueBaixo ? "product-card--low-stock" : ""}`}
        >
          <div className="product-card-header">
            <h3>{product.nome}</h3>
          </div>

          <div className="product-card-body">
            <div className="product-info">
              <p><strong>Estoque:</strong> {product.quantidade}</p>
              <p><strong>Preço Varejo:</strong> {formatCurrency(product.precoVarejo)}</p>
              {product.precoAtacado != null && product.quantidadeMinimaAtacado != null && (
                <p>
                  <strong>Preço Atacado:</strong> {formatCurrency(product.precoAtacado)}
                  {" "}(a partir de {product.quantidadeMinimaAtacado} un.)
                </p>
              )}
            </div>
            {product.estoqueBaixo && (
              <p className="low-stock-message">
                ⚠ {product.quantidade} {product.quantidade === 1 ? "unidade restante" : "unidades restantes"}
              </p>
            )}
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