import { useEffect, useState } from "react";
import api from "../api/api";
import type {
  Order
} from "../types/order";
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

  // gera um payload Pix usando dados hardcoded do beneficiário
  // e valor passado como parâmetro. O formato abaixo segue a estrutura
  // básica do EMV® QR Code do Banco Central (adaptado manualmente).
  // Em um cenário real você poderia usar uma biblioteca especializada
  // para montar o payload corretamente, mas aqui deixamos as partes
  // sensíveis como variáveis para facilitar o entendimento.
  const exportToPDF = async () => {
    if (!order) return;

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginBottom = 10; // margem de segurança no rodapé

    // helper: verifica se há espaço suficiente, caso contrário adiciona nova página
    const ensureSpace = (currentY: number, neededHeight: number): number => {
      if (currentY + neededHeight > pageH - marginBottom) {
        doc.addPage();
        return 14; // reset Y no topo da nova página
      }
      return currentY;
    };

    // ── Cabeçalho ──────────────────────────────────────────────
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageW, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO Nº ${order.id}`, 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const utcDate = new Date(order.criadoEm);
    utcDate.setHours(utcDate.getHours() - 3);
    const dataFormatada = utcDate.toLocaleString('pt-BR');
    doc.text(`Emitido em: ${dataFormatada}`, pageW - 14, 14, { align: 'right' });

    // ── Dados do cliente ────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 14, 32);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 34, pageW - 14, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Cliente:', 14, 41);
    doc.setFont('helvetica', 'bold');
    doc.text(order.nomeCliente, 35, 41);

    doc.setFont('helvetica', 'normal');
    doc.text('Endereço:', 14, 48);
    doc.setFont('helvetica', 'bold');
    const endereco = `${order.rua}, ${order.numero} - ${order.bairro}, ${order.cidade} - ${order.estado}, CEP: ${order.cep}`;
    doc.text(endereco, 35, 48);

    // ── Tabela de produtos ──────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('ITENS DO PEDIDO', 14, 58);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 60, pageW - 14, 60);

    const tableData = order.items.map((item, index) => [
      index + 1,
      item.nomeProduto,
      item.quantidade,
      item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['Nº', 'Produto', 'Qtd', 'Preço Unit.', 'Total']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY || 63;

    // ── Valor total ─────────────────────────────────────────────
    finalY = ensureSpace(finalY, 24);
    doc.setFillColor(30, 30, 30);
    doc.rect(pageW - 80, finalY + 4, 66, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `TOTAL: R$ ${order.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageW - 47,
      finalY + 11,
      { align: 'center' }
    );
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      '* Não inclui frete.',
      pageW - 14,
      finalY + 18,
      { align: 'right' }
    );
    finalY += 24;

    try {


      doc.addPage();           // sem espaço mesmo com QR reduzido → nova página
      finalY = 14;

      doc.save(`pedido_${order.id}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p><b>Cliente:</b> {order.nomeCliente}</p>
        <p><b>Cep:</b> {order.cep}</p>
        <p><b>Rua:</b> {order.rua}</p>
        <p><b>Bairro:</b> {order.bairro}</p>
        <p><b>Cidade:</b> {order.cidade}</p>
        <p><b>Estado:</b> {order.estado}</p>
        <p><b>Número:</b> {order.numero}</p>
        <p><b>Complemento:</b> {order.complemento}</p>
      </div>

      <hr style={{ height: "0.3px", color: "#8080800d" }} />

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

      <div className="actions" style={{ marginTop: 10 }}>
        <button onClick={exportToCSV} className="btn secondary">
          Exportar CSV
        </button>

        <button
          onClick={() => {
            exportToPDF();
          }}
          className="btn primary"
        >
          Exportar PDF
        </button>

        {/* botão de pix removido, conteúdo agora só no PDF */}
      </div>
    </>
  );
}