import { useEffect, useRef, useState } from "react";
import axios from "axios";
import MoneyInput from "../components/MoneyInput";
import api from "../api/api";
import type { Product, UploadImageResponse } from "../types/products";
import type { Category } from "../types/category";
import { normalizeName } from "../utils/normalizeName";

interface ProductFormProps {
  product?: Product | null;
  existingProducts: Product[];
  categories: Category[];
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

export default function ProductForm({
  product,
  existingProducts,
  categories,
  onSaved,
  onClose,
}: ProductFormProps) {
  const isEdit = Boolean(product?.id);

  const [nome, setName] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [precoVarejo, setPrecoVarejo] = useState<number>(0);
  // 0 aqui significa "sem atacado configurado" (não faz sentido um preço de
  // atacado igual a zero de verdade).
  const [precoAtacado, setPrecoAtacado] = useState<number>(0);
  const [quantidadeMinimaAtacado, setQuantidadeMinimaAtacado] = useState<number>(0);
  const [quantidade, setQuantity] = useState<number>(0);
  // 0 aqui significa "alerta de estoque baixo desativado" pra esse produto.
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(0);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemPublicId, setImagemPublicId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setCategoriaId(product.categoriaId);
      setPrecoVarejo(product.precoVarejo);
      setPrecoAtacado(product.precoAtacado ?? 0);
      setQuantidadeMinimaAtacado(product.quantidadeMinimaAtacado ?? 0);
      setQuantity(product.quantidade);
      setEstoqueMinimo(product.estoqueMinimo ?? 0);
      setImagemUrl(product.imagemUrl ?? null);
      setImagemPublicId(product.imagemPublicId ?? null);
    } else {
      setName("");
      setCategoriaId(undefined);
      setPrecoVarejo(0);
      setPrecoAtacado(0);
      setQuantidadeMinimaAtacado(0);
      setQuantity(0)
      setEstoqueMinimo(0);
      setImagemUrl(null);
      setImagemPublicId(null);
    }
  }, [product]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "A imagem deve ter no máximo 5 MB.", type: "error" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingImage(true);
      const res = await api.post<UploadImageResponse>("/products/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImagemUrl(res.data.imagemUrl);
      setImagemPublicId(res.data.imagemPublicId);
    } catch (error) {
      console.error("Erro ao enviar imagem", error);
      const errMsg = axios.isAxiosError(error) && typeof error.response?.data === "string"
        ? error.response.data
        : "Erro ao enviar imagem.";
      setMessage({ text: errMsg, type: "error" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage() {
    setImagemUrl(null);
    setImagemPublicId(null);
  }

  function handleCloseRequest() {
    setClosing(true);
    setShow(false);
    setTimeout(onClose, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoriaId) {
      setMessage({ text: "Selecione uma categoria.", type: "error" });
      return;
    }

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

    // Nome duplicado (ignorando maiúsculas/minúsculas e espaçamento) não é
    // permitido — mesma regra aplicada no backend.
    const nomeNormalizado = normalizeName(nome);
    const duplicado = existingProducts.some(
      (p) => p.id !== product?.id && normalizeName(p.nome) === nomeNormalizado
    );
    if (duplicado) {
      setMessage({ text: `Já existe um produto chamado "${nome.trim()}".`, type: "error" });
      return;
    }

    if (uploadingImage) {
      setMessage({ text: "Aguarde o envio da imagem terminar.", type: "error" });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nome,
        categoriaId,
        precoVarejo,
        precoAtacado: precoAtacado > 0 ? precoAtacado : null,
        quantidadeMinimaAtacado: quantidadeMinimaAtacado > 0 ? quantidadeMinimaAtacado : null,
        quantidade,
        estoqueMinimo: estoqueMinimo > 0 ? estoqueMinimo : null,
        imagemUrl,
        imagemPublicId
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
      const errMsg = axios.isAxiosError(error) && typeof error.response?.data === "string"
        ? error.response.data
        : "Erro ao salvar produto";
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
            <label>Categoria</label>
            <select
              value={categoriaId ?? ""}
              onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
              required
              className="input"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantidade</label>
            <input
              type="number"
              // 0 vira campo vazio com placeholder (some ao clicar) em vez
              // de mostrar um "0" fixo que parece digitado.
              value={quantidade === 0 ? "" : quantidade}
              placeholder="0"
              onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
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
              value={quantidadeMinimaAtacado === 0 ? "" : quantidadeMinimaAtacado}
              onChange={(e) => setQuantidadeMinimaAtacado(e.target.value === "" ? 0 : Number(e.target.value))}
              className="input"
              placeholder="Ex: 10"
            />
          </div>

          <div className="form-group">
            <label>Foto do produto (opcional)</label>
            {imagemUrl ? (
              <div className="product-image-preview">
                <img src={imagemUrl} alt="Prévia do produto" />
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                >
                  Remover imagem
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelected}
                disabled={uploadingImage}
                ref={fileInputRef}
                className="input"
              />
            )}
            {uploadingImage && <p className="client-sub">Enviando imagem...</p>}
          </div>

          <div className="form-group">
            <label>Alerta de estoque baixo (opcional)</label>
            <input
              type="number"
              min={0}
              value={estoqueMinimo === 0 ? "" : estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value === "" ? 0 : Number(e.target.value))}
              className="input"
              placeholder="Ex: 10"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCloseRequest} className="button-secondary">
              Cancelar
            </button>

            <button type="submit" disabled={loading || uploadingImage} className="button">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}