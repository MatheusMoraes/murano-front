import { useState } from "react";
import type { Category } from "../types/category";
import type { Product } from "../types/products";
import { generateCatalogPdf } from "../utils/catalogPdf";

interface CatalogModalProps {
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

export default function CatalogModal({ categories, products, onClose }: CatalogModalProps) {
  // Por padrão já vem tudo marcado — o usuário desmarca só o que não quer.
  const [selectedIds, setSelectedIds] = useState<number[]>(categories.map((c) => c.id));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = selectedIds.length === categories.length;

  function toggleCategory(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : categories.map((c) => c.id));
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) {
      setError("Selecione ao menos uma categoria.");
      return;
    }

    const selectedCategories = categories.filter((c) => selectedIds.includes(c.id));
    const hasProducts = selectedCategories.some((c) =>
      products.some((p) => p.categoriaId === c.id)
    );
    if (!hasProducts) {
      setError("Nenhuma das categorias selecionadas tem produtos.");
      return;
    }

    setError(null);
    setGenerating(true);
    try {
      await generateCatalogPdf(selectedCategories, products);
      onClose();
    } catch (err) {
      console.error("Erro ao gerar catálogo", err);
      setError("Erro ao gerar o catálogo. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="product-form-modal visible">
      <div className="product-form-overlay" onClick={generating ? undefined : onClose}></div>
      <div className="product-form-box">
        <h2>Gerar Catálogo</h2>
        <p className="client-sub" style={{ marginBottom: 16 }}>
          Selecione as categorias que vão entrar no catálogo em PDF (com fotos e preços de cada produto).
        </p>

        {error && (
          <div className="alert alert-error" onClick={() => setError(null)}>
            {error}
          </div>
        )}

        {categories.length === 0 ? (
          <p className="client-sub">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <>
            <button
              type="button"
              className="button-secondary"
              style={{ marginBottom: 12 }}
              onClick={toggleAll}
              disabled={generating}
            >
              {allSelected ? "Desmarcar todas" : "Selecionar todas"}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {categories.map((category) => {
                const count = products.filter((p) => p.categoriaId === category.id).length;
                return (
                  <label key={category.id} className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      disabled={generating}
                    />
                    <span className="checkbox-box" aria-hidden="true" />
                    <span className="checkbox-text">
                      {category.nome}{" "}
                      <span className="client-sub">
                        ({count} {count === 1 ? "produto" : "produtos"})
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="button-secondary" disabled={generating}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="button"
            disabled={generating || categories.length === 0}
          >
            {generating ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
