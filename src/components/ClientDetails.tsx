import { Fragment, useEffect, useState } from "react";
import api from "../api/api";
import type { ClientWithOrders } from "../types/client";
import { formatCurrency } from "../utils/formatCurrency";
import OrderDetails from "./OrderDetails";

interface Props {
  clientId: number | null;
  refreshTrigger?: number;
}

export default function ClientDetails({ clientId, refreshTrigger = 0 }: Props) {
  const [client, setClient] = useState<ClientWithOrders | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!clientId) return;

    api
      .get<ClientWithOrders>(`/clients/${clientId}/details`)
      .then((res) => setClient(res.data))
      .catch((err) => {
        console.error("Erro ao buscar cliente:", err);
        setClient(null);
      });
  }, [clientId, refreshTrigger]);

  if (!client) {
    return <p>Selecione um cliente...</p>;
  }

  const enderecoCompleto = [client.rua, client.numero].filter(Boolean).join(", ")
    + (client.bairro ? ` - ${client.bairro}` : "")
    + (client.cidade ? `, ${client.cidade}` : "")
    + (client.estado ? ` - ${client.estado}` : "")
    + (client.cep ? `, CEP: ${client.cep}` : "");

  return (
    <>
      <div className="client-details">
        <p><b>Telefone:</b> {client.telefone || "-"}</p>
        <p><b>Email:</b> {client.email || "-"}</p>
        <p><b>Endereço:</b> {enderecoCompleto || "-"}</p>
        {client.complemento && <p><b>Complemento:</b> {client.complemento}</p>}
      </div>

      <hr style={{ height: "0.3px", color: "#8080800d" }} />

      <h4 style={{ margin: "12px 0" }}>Pedidos</h4>

      {client.orders.length === 0 ? (
        <p>Este cliente ainda não fez nenhum pedido.</p>
      ) : (
        <table className="table client-orders-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Itens</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {client.orders.map((order) => {
              const isOpen = expandedOrderId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr
                    className="client-order-row"
                    onClick={() =>
                      setExpandedOrderId(prev => prev === order.id ? null : order.id)
                    }
                  >
                    <td>#{order.id}</td>
                    <td>{new Date(order.criadoEm).toLocaleDateString()}</td>
                    <td>{order.items.length}</td>
                    <td>{formatCurrency(order.valorTotal)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={4} style={{ cursor: "default" }}>
                        <div className="order-details-wrapper opening">
                          <OrderDetails orderId={order.id} compact />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
