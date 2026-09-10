import { useEffect, useState } from "react";
import api from "../api/api";
import type {
  Order
} from "../types/order";
import { formatCurrency } from "../utils/formatCurrency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../assets/logo.png";

// Paleta da marca (mesmas cores de src/index.css), em RGB para uso no jsPDF.
const PDF_COLORS = {
  surface: [23, 21, 27] as [number, number, number],       // --color-surface
  gold: [212, 175, 55] as [number, number, number],        // --color-gold
  goldDark: [156, 122, 30] as [number, number, number],    // --color-gold-dark
  goldLight: [243, 217, 139] as [number, number, number],  // --color-gold-light
  goldTint: [250, 243, 224] as [number, number, number],   // fundo leve com tom de ouro
  text: [241, 233, 210] as [number, number, number],       // --color-text
  textDark: [23, 21, 18] as [number, number, number],      // texto sobre fundo dourado
  textMuted: [120, 108, 78] as [number, number, number],   // --color-text-muted (ajustado p/ fundo branco)
};

// Converte a logo importada (URL do bundle) em data URL, formato aceito
// pelo jsPDF via doc.addImage.
async function imageUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface Props {
  orderId: number | null;
  refreshTrigger?: number;
  // Usado quando o componente é exibido dentro do detalhe do cliente: os
  // dados do cliente já aparecem ali, então some com a repetição e mostra
  // só uma linha de endereço de entrega.
  compact?: boolean;
}

export default function OrderDetails({ orderId, refreshTrigger = 0, compact = false }: Props) {
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
    doc.setFillColor(...PDF_COLORS.surface);
    doc.rect(0, 0, pageW, 22, 'F');

    // Logo à esquerda do cabeçalho (se falhar ao carregar, segue sem ela)
    let tituloX = 14;
    try {
      const logoBase64 = await imageUrlToBase64(logoUrl);
      doc.addImage(logoBase64, 'PNG', 12, 3, 16, 16);
      tituloX = 32;
    } catch (err) {
      console.error('Não foi possível carregar a logo no PDF:', err);
    }

    doc.setTextColor(...PDF_COLORS.text);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO Nº ${order.id}`, tituloX, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.goldLight);
    // order.criadoEm vem em UTC do backend (com "Z"); fixamos o fuso de
    // Brasília explicitamente em vez de confiar no fuso do navegador, e sem
    // subtrair horas manualmente (isso já causou o bug de ficar 3h atrasado).
    const dataFormatada = new Date(order.criadoEm).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    doc.text(`Emitido em: ${dataFormatada}`, pageW - 14, 14, { align: 'right' });

    // ── Dados do cliente ────────────────────────────────────────
    doc.setTextColor(...PDF_COLORS.goldDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 14, 32);
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.line(14, 34, pageW - 14, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
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
    doc.setTextColor(...PDF_COLORS.goldDark);
    doc.text('ITENS DO PEDIDO', 14, 58);
    doc.setDrawColor(...PDF_COLORS.gold);
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
      headStyles: { fillColor: PDF_COLORS.gold, textColor: PDF_COLORS.textDark, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: PDF_COLORS.goldTint },
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
    doc.setFillColor(...PDF_COLORS.gold);
    doc.rect(pageW - 80, finalY + 4, 66, 10, 'F');
    doc.setTextColor(...PDF_COLORS.textDark);
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
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text(
      '* Não inclui frete.',
      pageW - 14,
      finalY + 18,
      { align: 'right' }
    );

    doc.save(`pedido_${order.id}.pdf`);
  };

  const enderecoEntrega = [order.rua, order.numero, order.bairro, order.cep]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {compact ? (
        <p><b>Endereço de entrega:</b> {enderecoEntrega || "-"}</p>
      ) : (
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
      )}

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