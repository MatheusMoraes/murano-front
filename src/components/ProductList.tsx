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
          {product.imagemUrl ? (
            <img
              className="product-card-image"
              src={product.imagemUrl}
              alt={product.nome}
            />
          ) : (
            <div className="product-card-image product-card-image--placeholder">
              <span>Sem foto</span>
            </div>
          )}

          <div className="product-card-body">
            <p className="product-card-category">{product.categoriaNome}</p>
            <h3 className="product-card-name">{product.nome}</h3>

            <div className="product-card-prices">
              <p className="product-card-price product-card-price--varejo">
                <span className="price-tag">Varejo</span> {formatCurrency(product.precoVarejo)}
              </p>
              {product.precoAtacado != null && product.quantidadeMinimaAtacado != null && (
                <p className="product-card-price product-card-price--atacado">
                  <span className="price-tag">Atacado</span> {formatCurrency(product.precoAtacado)}
                  <span className="price-hint"> (≥{product.quantidadeMinimaAtacado} un.)</span>
                </p>
              )}
            </div>

            <div className="product-info">
              <p>Estoque: {product.quantidade}</p>
            </div>

            {product.estoqueBaixo && (
              <p className="low-stock-message">
                ⚠ {product.quantidade === 1 ? "1 unidade restante" : `${product.quantidade} unidades restantes`}
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