import { useEffect, useState } from "react";
import api from "../api/api";
import type { Order } from "../types/order";
import { formatCurrency } from "../utils/formatCurrency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  orderId: number | null;
  refreshTrigger?: number;
}

export default function OrderDetails({ orderId, refreshTrigger = 0 }: Props) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;

    api
      .get<Order>(`/orders/${orderId}`)
      .then((res) => setOrder(res.data))
      .catch((err) => {
        console.error("Erro ao buscar pedido:", err);
        setOrder(null);
      });
  }, [orderId, refreshTrigger]);

  if (!order) {
    return <p>Selecione um pedido...</p>;
  }

  const exportToCSV = () => {
    let csv =
      "Numero Item,Nome,Quantidade,Preco Unitario,Preco Total\n";

    order.items.forEach((item, index) => {
      csv += `${index + 1},${item.nomeProduto},${item.quantidade},${item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido_${order.id}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!order) return;

    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(16);
    doc.text(`Pedido Número: ${order.id}`, 14, 20);

    doc.setFontSize(12);
    doc.text(
      `Data Pedido: ${data.toLocaleString()}`,
      14,
      28
    );

    // Montar dados da tabela
    const tableData = order.items.map((item, index) => [
      index + 1,
      item.nomeProduto,
      item.quantidade,
      item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Nº Item",
          "Nome",
          "Quantidade",
          "Preço Unitário",
          "Preço Total",
        ],
      ],
      body: tableData,
    });

    // Valor total abaixo da tabela
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY || 35;

    doc.setFontSize(14);
    doc.text(
      `Valor Total = ${order.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      14,
      finalY + 10
    );

    doc.save(`pedido_${order.id}.pdf`);
  };

  const data = new Date(order.criadoEm);
  data.setHours(data.getHours() - 3);
   return (
    <div className="card" style={{marginTop: 10}}>
      <div className="page-header">
        <h2>Pedido #{order.id}</h2>
        <div>
          {formatCurrency(order.valorTotal)}
        </div>
      </div>

      <p style={{ color: "#6b7280", marginTop: 5 }}>
        {data.toLocaleString()}
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Preço Unit.</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.nomeProduto}</td>
              <td>{item.quantidade}</td>
              <td>{formatCurrency(item.precoUnitario)}</td>
              <td>{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

       <div className="actions" style={{marginTop: 10}}>
          <button onClick={exportToCSV} className="btn secondary">
            Exportar CSV
          </button>

          <button onClick={exportToPDF} className="btn primary">
            Exportar PDF
          </button>
        </div>
    </div>
  );
}