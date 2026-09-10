import { useEffect, useState } from "react";
import axios from "axios";
import api from "../api/api";
import type { Client } from "../types/client";
import ClientDetails from "./ClientDetails";
import ClientForm from "./ClientForm";

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [closingIds, setClosingIds] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function loadClients() {
    api.get<Client[]>("/clients").then(res => setClients(res.data));
  }

  useEffect(() => {
    loadClients();
  }, []);

  function toggleClient(id: number) {
    if (expandedIds.includes(id)) {
      setClosingIds(prev => [...prev, id]);
      setTimeout(() => {
        setExpandedIds(prev => prev.filter(item => item !== id));
        setClosingIds(prev => prev.filter(item => item !== id));
      }, 250);
    } else {
      setExpandedIds(prev => [...prev, id]);
    }
  }

  function handleCreate() {
    setSelectedClient(null);
    setIsEditing(true);
  }

  function handleEdit(client: Client) {
    setSelectedClient(client);
    setIsEditing(true);
  }

  function handleCloseForm() {
    setSelectedClient(null);
    setIsEditing(false);
  }

  async function handleSaved() {
    loadClients();
    setRefreshTrigger(prev => prev + 1);
    setSuccessMsg(selectedClient ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleDeleteClient(id: number) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      loadClients();
      setSuccessMsg("Cliente excluído com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Erro ao excluir cliente", err);
      const msg = axios.isAxiosError(err) && err.response?.status === 400
        ? (err.response?.data ?? "Não é possível excluir um cliente que já possui pedidos.")
        : "Falha ao excluir cliente";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }

  return (
    <div className="clients-container">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 className="clients-title">Clientes</h2>
        <button className="btn-primary" style={{ width: "300px", height: "48px" }} onClick={handleCreate}>
          + Novo Cliente
        </button>
      </div>

      {errorMsg && (
        <div
          className="alert-error"
          style={{
            background: "#ffdddd",
            color: "#a00",
            padding: "12px",
            borderRadius: "6px",
            margin: "16px 0",
            cursor: "pointer",
            position: "relative",
            zIndex: 1000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
          onClick={() => setErrorMsg(null)}
        >
          {errorMsg}
        </div>
      )}

      <ul className="clients-list">
        {successMsg && (
          <div className="alert alert-success toast">
            {successMsg}
          </div>
        )}
        {clients.map(client => {
          const isOpen = expandedIds.includes(client.id);
          const isClosing = closingIds.includes(client.id);
          const enderecoResumo = [client.cidade, client.estado].filter(Boolean).join(" - ");

          return (
            <li
              key={client.id}
              className={`client-card ${isOpen ? "open" : ""}`}
            >
              <div className="client-header">
                <div className="client-info">
                  <span className="client-name">
                    {client.nome}
                  </span>
                  <span className="client-sub">
                    {client.telefone || "sem telefone"}
                    {enderecoResumo ? ` · ${enderecoResumo}` : ""}
                  </span>
                </div>

                <div className="client-buttons">
                  <button
                    className="btn-toggle"
                    onClick={() => toggleClient(client.id)}
                  >
                    {isOpen ? "Fechar" : "Detalhe"}
                  </button>

                  <button
                    className="btn-outline"
                    title="Editar cliente"
                    onClick={() => handleEdit(client)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn-danger"
                    title="Excluir cliente"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {(isOpen || isClosing) && (
                <div className={`order-details-wrapper ${isClosing ? "closing" : "opening"}`}>
                  <ClientDetails clientId={client.id} refreshTrigger={refreshTrigger} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isEditing && (
        <ClientForm
          client={selectedClient}
          onSaved={handleSaved}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
