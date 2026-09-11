import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { Product } from "../types/products";
import type { Client } from "../types/client";
import type { EnderecoInput } from "../types/order";
import { getUnitPrice, isAtacado } from "../utils/pricing";
import { formatCurrency } from "../utils/formatCurrency";
import SearchableSelect from "./SearchableSelect";
import "./AddProductModal.css";

interface OrderItemLocal {
  produtoId: number;
  quantidade: number;
}

interface CustomerFormData {
  ClientId: number;
  UsarEnderecoDiferente: boolean;
  Cep: string;
  Rua: string;
  Bairro: string;
  Cidade: string;
  Estado: string;
  Numero: string;
  Complemento: string;
}

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  clients: Client[];
  orderItems: OrderItemLocal[];
  setOrderItems: Dispatch<SetStateAction<OrderItemLocal[]>>;
  onSubmitOrder: (orderData: {
    ClientId: number;
    EnderecoEntrega?: EnderecoInput;
    Items: OrderItemLocal[];
  }) => Promise<void>;
  onSuccess?: () => void;
  editMode?: boolean;
  customerData?: CustomerFormData | null;
}

export default function AddProductModal({
  open,
  onClose,
  products,
  clients,
  orderItems,
  setOrderItems,
  onSubmitOrder,
  onSuccess,
  editMode = false,
  customerData,
}: AddProductModalProps) {
  const [step, setStep] = useState(1); // controla o passo atual
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [quantity, setQuantity] = useState<number>(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  // cliente selecionado e endereço de entrega
  const [clientId, setClientId] = useState<number | undefined>();
  const [usarEnderecoDiferente, setUsarEnderecoDiferente] = useState(false);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");

  const selectedClient = clients.find(c => c.id === clientId);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      setStep(1); // sempre começa no passo 1
      setLocalError(null);
      setMessage(null);
      setSubmitting(false);

      if (customerData) {
        setClientId(customerData.ClientId);
        setUsarEnderecoDiferente(customerData.UsarEnderecoDiferente ?? false);
        setCep(customerData.Cep ?? "");
        setStreet(customerData.Rua ?? "");
        setNeighborhood(customerData.Bairro ?? "");
        setCity(customerData.Cidade ?? "");
        setState(customerData.Estado ?? "");
        setNumber(customerData.Numero ?? "");
        setComplement(customerData.Complemento ?? "");
      } else {
        setClientId(undefined);
        setUsarEnderecoDiferente(false);
        setCep("");
        setStreet("");
        setNeighborhood("");
        setCity("");
        setState("");
        setNumber("");
        setComplement("");
      }
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, customerData, visible]);

  function handleCloseRequest() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  async function handleSubmitOrder() {
  if (orderItems.length === 0 || !clientId) return;
  try {
    setSubmitting(true);
    await onSubmitOrder({
      ClientId: clientId,
      EnderecoEntrega: usarEnderecoDiferente
        ? {
            Cep: cep,
            Rua: street,
            Bairro: neighborhood,
            Cidade: city,
            Estado: state,
            Numero: number,
            Complemento: complement,
          }
        : undefined,
      Items: orderItems,
    });
    setMessage({ text: "Pedido criado com sucesso!", type: "success" });
    if (onSuccess) onSuccess();
    setTimeout(() => {
      handleCloseRequest();
    }, 1200);
  } catch (err) {
    console.error("Erro ao submeter pedido", err);
    setMessage({ text: "Erro ao criar pedido", type: "error" });
  } finally {
    setSubmitting(false);
  }
}

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) {
      return digits.replace(/(\d{5})(\d{1,3})/, "$1-$2");
    }
    return digits;
  }

  function isCepValid(value: string) {
    return /^\d{5}-\d{3}$/.test(value);
  }

  async function handleCepChange(value: string) {
    const formatted = formatCep(value);
    setCep(formatted);
    setLocalError(null);

    if (isCepValid(formatted)) {
      try {
        const formattedCep = formatted.replace("-", "");
        const res = await fetch(`https://viacep.com.br/ws/${formattedCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro);
          setNeighborhood(data.bairro);
          setCity(data.localidade);
          setState(data.uf);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  }

  if (!visible) return null;

  function handleAddItem() {
    if (!selectedProductId || quantity < 1) return;
    const product = products.find(p => p.id === selectedProductId);
    if (product && product.quantidade < quantity) {
      setLocalError(`Estoque insuficiente para ${product.nome}`);
      setTimeout(() => setLocalError(null), 4000);
      return;
    }
    const existingIndex = orderItems.findIndex(item => item.produtoId === selectedProductId);
    if (existingIndex >= 0) {
      setOrderItems(prev => {
        const updated = [...prev];
        updated[existingIndex].quantidade += quantity;
        return updated;
      });
    } else {
      setOrderItems(prev => [
        ...prev,
        { produtoId: selectedProductId, quantidade: quantity }
      ]);
    }
    setSelectedProductId(undefined);
    setQuantity(1);
  }

  function handleUpdateQuantity(idx: number, newQuantity: number) {
    if (newQuantity < 1) {
      handleRemoveItem(idx);
      return;
    }
    setOrderItems(prev => {
      const updated = [...prev];
      updated[idx].quantidade = newQuantity;
      return updated;
    });
  }

  function handleRemoveItem(idx: number) {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  }

  const overlayClass = `modal-overlay ${visible && !closing ? "show" : "hide"}`;
  const contentClass = `modal-content ${visible && !closing ? "show" : "hide"}`;

  return (
    <div className={overlayClass} onClick={handleCloseRequest}>
      <div className={contentClass} onClick={e => e.stopPropagation()}>
        <h3>{editMode ? "Editar Pedido" : "Novo Pedido"}</h3>
        <div className="stepper">
          <div className={`step ${step === 1 ? "active" : ""}`}>1</div>
          <div className={`line ${step === 2 ? "active" : ""}`}></div>
          <div className={`step ${step === 2 ? "active" : ""}`}>2</div>
        </div>
        <div className="step-label">
          {step === 1 ? "Dados do Cliente" : "Produtos do Pedido"}
        </div>
        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
            {message.text}
          </div>
        )}
        {localError && (
          <div className="alert-error" onClick={() => setLocalError(null)}>
            {localError}
          </div>
        )}

        {/* Step 1 - Dados do cliente */}
        {step === 1 && (
          <div className="modal-form">
            <SearchableSelect
              items={clients}
              value={clientId}
              onChange={setClientId}
              getId={(c) => c.id}
              getLabel={(c) => c.nome}
              getSubLabel={(c) => c.telefone ?? undefined}
              placeholder="Buscar cliente pelo nome..."
            />

            {selectedClient && (
              <p className="client-sub" style={{ width: "100%", margin: "4px 0" }}>
                Endereço cadastrado: {selectedClient.rua
                  ? `${selectedClient.rua}, ${selectedClient.numero ?? "s/n"} - ${selectedClient.bairro ?? ""}, ${selectedClient.cidade ?? ""} - ${selectedClient.estado ?? ""}`
                  : "cliente sem endereço cadastrado"}
              </p>
            )}

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={usarEnderecoDiferente}
                onChange={e => setUsarEnderecoDiferente(e.target.checked)}
              />
              <span className="checkbox-box" aria-hidden="true" />
              <span className="checkbox-text">
                Usar um endereço diferente do cadastro do cliente para este pedido
              </span>
            </label>

            {usarEnderecoDiferente && (
              <>
                <input
                  type="text"
                  placeholder="CEP"
                  inputMode="numeric"
                  pattern="\d{5}-\d{3}"
                  maxLength={9}
                  value={cep}
                  onChange={e => handleCepChange(e.target.value)}
                />
                <input type="text" placeholder="Rua" value={street} readOnly />
                <input type="text" placeholder="Bairro" value={neighborhood} readOnly />
                <input type="text" placeholder="Cidade" value={city} readOnly />
                <input type="text" placeholder="Estado" value={state} readOnly />
                <input
                  type="text"
                  placeholder="Número"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={complement}
                  onChange={e => setComplement(e.target.value)}
                />
              </>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="button"
                onClick={() => {
                  if (!clientId) {
                    setLocalError("Selecione um cliente.");
                    return;
                  }
                  if (usarEnderecoDiferente && !isCepValid(cep)) {
                    setLocalError("CEP inválido. Use o formato 99999-999.");
                    return;
                  }
                  if (!usarEnderecoDiferente && !selectedClient?.rua) {
                    setLocalError("Este cliente não tem endereço cadastrado. Marque a opção acima para informar um endereço.");
                    return;
                  }
                  setStep(2);
                }}
              >
                Próximo
              </button>
              <button className="button button-secondary" onClick={handleCloseRequest}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Step 2 - Produtos */}
        {step === 2 && (
          <>
            <div className="modal-form">
              <SearchableSelect
                items={products}
                value={selectedProductId}
                onChange={setSelectedProductId}
                getId={(p) => p.id}
                getLabel={(p) => p.nome}
                getSubLabel={(p) => p.precoAtacado != null
                  ? `Varejo: ${formatCurrency(p.precoVarejo)} · Atacado: ${formatCurrency(p.precoAtacado)}`
                  : `Varejo: ${formatCurrency(p.precoVarejo)}`}
                placeholder="Buscar produto pelo nome..."
              />
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
              <button className="button" onClick={handleAddItem}>Adicionar</button>
            </div>

            {selectedProductId && (() => {
              const selectedProduct = products.find(p => p.id === selectedProductId);
              if (!selectedProduct) return null;
              const temAtacado = selectedProduct.precoAtacado != null && selectedProduct.quantidadeMinimaAtacado != null;
              return (
                <p className="client-sub" style={{ width: "100%", margin: "4px 0" }}>
                  Varejo: {formatCurrency(selectedProduct.precoVarejo)}
                  {temAtacado &&
                    ` · Atacado a partir de ${selectedProduct.quantidadeMinimaAtacado} un.: ${formatCurrency(selectedProduct.precoAtacado as number)}`}
                  {" — "}
                  Preço para {quantity} un.: {formatCurrency(getUnitPrice(selectedProduct, quantity))}
                  {isAtacado(selectedProduct, quantity) && " (atacado)"}
                </p>
              );
            })()}

            <ul>
              {orderItems.map((item, idx) => {
                const product = products.find(p => p.id === item.produtoId);
                return (
                <li key={idx} className="order-item">
                  <div className="order-item-info">
                    <span className="product-name">{product?.nome}</span>
                    {product && (
                      <span className="client-sub">
                        {formatCurrency(getUnitPrice(product, item.quantidade))} / un.
                        {isAtacado(product, item.quantidade) && " (atacado)"}
                        {" · Total: "}
                        {formatCurrency(getUnitPrice(product, item.quantidade) * item.quantidade)}
                      </span>
                    )}
                  </div>
                  <div className="order-item-controls">
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(idx, item.quantidade - 1)}>−</button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => handleUpdateQuantity(idx, Number(e.target.value))}
                      className="qty-input"
                    />
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(idx, item.quantidade + 1)}>+</button>
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remover produto"
                  >
                    ✕
                  </button>
                </li>
                );
              })}
            </ul>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="button"
                onClick={handleSubmitOrder}
                disabled={orderItems.length === 0 || submitting}
              >
                {submitting ? "Enviando..." : "Confirmar Pedido"}
              </button>
              <button
                className="button button-secondary"
                onClick={() => setStep(1)}
              >
                Voltar
              </button>
              <button
                className="button button-secondary"
                onClick={handleCloseRequest}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
