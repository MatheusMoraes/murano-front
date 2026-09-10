import { useEffect, useState } from "react";
import api from "../api/api";
import type { Client } from "../types/client";

interface ClientFormProps {
  client?: Client | null;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

export default function ClientForm({
  client,
  onSaved,
  onClose,
}: ClientFormProps) {
  const isEdit = Boolean(client?.id);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
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
    if (client) {
      setNome(client.nome ?? "");
      setTelefone(client.telefone ?? "");
      setEmail(client.email ?? "");
      setCep(client.cep ?? "");
      setRua(client.rua ?? "");
      setBairro(client.bairro ?? "");
      setCidade(client.cidade ?? "");
      setEstado(client.estado ?? "");
      setNumero(client.numero ?? "");
      setComplemento(client.complemento ?? "");
    } else {
      setNome("");
      setTelefone("");
      setEmail("");
      setCep("");
      setRua("");
      setBairro("");
      setCidade("");
      setEstado("");
      setNumero("");
      setComplemento("");
    }
  }, [client]);

  function handleCloseRequest() {
    setClosing(true);
    setShow(false);
    setTimeout(onClose, 300);
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

    if (isCepValid(formatted)) {
      try {
        const formattedCep = formatted.replace("-", "");
        const res = await fetch(`https://viacep.com.br/ws/${formattedCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setRua(data.logradouro);
          setBairro(data.bairro);
          setCidade(data.localidade);
          setEstado(data.uf);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        Nome: nome,
        Telefone: telefone || null,
        Email: email || null,
        Cep: cep || null,
        Rua: rua || null,
        Bairro: bairro || null,
        Cidade: cidade || null,
        Estado: estado || null,
        Numero: numero || null,
        Complemento: complemento || null,
      };

      if (isEdit) {
        await api.put(`/clients/${client?.id}`, payload);
      } else {
        await api.post("/clients", payload);
      }

      const successMsg = isEdit
        ? "Cliente atualizado com sucesso!"
        : "Cliente cadastrado com sucesso!";
      setMessage({ text: successMsg, type: "success" });
      setTimeout(async () => {
        await onSaved();
        handleCloseRequest();
      }, 1200);
    } catch (error) {
      console.error("Erro ao salvar cliente", error);
      setMessage({ text: "Erro ao salvar cliente", type: "error" });
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
        <h2>{isEdit ? "Editar Cliente" : "Novo Cliente"}</h2>

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
            <label>Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>CEP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{5}-\d{3}"
              maxLength={9}
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Rua</label>
            <input type="text" value={rua} readOnly className="input" />
          </div>

          <div className="form-group">
            <label>Bairro</label>
            <input type="text" value={bairro} readOnly className="input" />
          </div>

          <div className="form-group">
            <label>Cidade</label>
            <input type="text" value={cidade} readOnly className="input" />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <input type="text" value={estado} readOnly className="input" />
          </div>

          <div className="form-group">
            <label>Número</label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Complemento</label>
            <input
              type="text"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="input"
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
