import { useEffect, useState } from "react";
import api, { calculateShipping } from "../api/api";
import type {
  Order,
  ShippingOption,
  MelhorEnvioShippingCalculatorRequest,
} from "../types/order";
import { formatCurrency } from "../utils/formatCurrency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode"; // used to generate pix QR codes
import ShippingOptionsList from "./ShippingOptionsList";

interface Props {
  orderId: number | null;
  refreshTrigger?: number;
}

export default function OrderDetails({ orderId, refreshTrigger = 0 }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  // não precisamos guardar preview any more; qr e payload estarão apenas no PDF

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
  function gerarPayloadPix(valor: number) {
    const beneficiarioNome = "Empresa Exemplo LTDA"; // hardcoded
    const beneficiarioCidade = "SÃO PAULO"; // hardcoded
    const chavePix = "meuchave@dominio.com"; // hardcoded

    // valor em centavos
    const valorStr = valor.toFixed(2).replace('.', '');

    // Exemplo de payload simplificado com campos obrigatórios e
    // o valor dinâmico inserido. Não cobre todos os casos do padrão.
    return [
      "000201", // payload format indicator
      "26360014BR.GOV.BCB.PIX", // identificação do Pix
      `0114${chavePix}`, // chave pix
      "52040000", // merchant category code
      "5303986", // moeda (986 = BRL)
      `540${valorStr}`, // valor
      "5802BR", // país
      `590${beneficiarioNome.length}${beneficiarioNome}`,
      `600${beneficiarioCidade.length}${beneficiarioCidade}`,
      "62070503***", // campo adicional genérico (ex: identificação)
      "6304" // CRC placeholder, será substituído se calculado
    ].join('');
  }

  // utility that calls the MelhorEnvio API via the backend.
  // The backend handles authentication and API integration with MelhorEnvio.
  async function handleCalculateShipping(
    params: MelhorEnvioShippingCalculatorRequest
  ): Promise<ShippingOption[]> {
    try {
      const options = await calculateShipping(params);
      return options;
    } catch (err) {
      console.error("Erro ao calcular frete:", err);
      throw err;
    }
  }

  const exportToPDF = async () => {
  if (!order) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let freightRows: any[] = [];
  try {
    const params: MelhorEnvioShippingCalculatorRequest = {
      from: { postal_code: '03573010' },
      to: { postal_code: order.cep },
      products: order.items.map((item) => ({
        id: item.produtoId.toString(),
        width: 10,
        height: 10,
        length: 10,
        weight: 0.5,
        insurance_value: item.total,
        quantity: item.quantidade,
      })),
      options: { receipt: false, own_hand: false },
      services: '',
    };

    const options = await handleCalculateShipping(params);
    setShippingOptions(options);
    freightRows = options.map((o) => [
      `${o.company.name} - ${o.name}`,
      formatCurrency(Number(o.price)),
      `${o.delivery_time} dia${o.delivery_time > 1 ? 's' : ''}`,
    ]);
  } catch (err) {
    console.error('erro calculando frete:', err);
  }

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
  // ── Tabela de frete ─────────────────────────────────────────
  if (freightRows.length) {
    const freteEstimado = freightRows.length * 10 + 30;
    finalY = ensureSpace(finalY, freteEstimado);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OPÇÕES DE FRETE', 14, finalY + 6);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 8, pageW - 14, finalY + 8);

    autoTable(doc, {
      startY: finalY + 11,
      head: [['Modalidade', 'Preço', 'Prazo']],
      body: freightRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
      },
      tableWidth: 100,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable.finalY || finalY + 11;
  }

  // ── QR Code Pix ─────────────────────────────────────────────
  const payload = gerarPayloadPix(order.valorTotal);

  try {
    const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'H' });

    // Calcula quantas linhas o payload vai ocupar ao lado do QR
    const qrX = 14;
    const textX = qrX + 48 + 6; // considera QR máximo de 48mm
    const maxWidth = pageW - textX - 14;
    const charsPerLine = Math.floor(maxWidth / 2.1);
    const payloadLines = Math.ceil(payload.length / charsPerLine);
    const pixTextHeight = 10 + payloadLines * 5; // label + linhas do payload

    // Espaço necessário: título (14) + maior entre QR e texto do payload
    const qrMaxSize = 48;
    const pixTotalHeight = 14 + Math.max(qrMaxSize, pixTextHeight);
    const spaceLeft = pageH - marginBottom - (finalY + 14);

    // Decide o tamanho do QR: reduz se couber com QR menor, nova página se não couber nem reduzindo
    let qrSize: number;
    if (spaceLeft >= pixTotalHeight) {
      qrSize = qrMaxSize; // espaço suficiente, usa tamanho cheio
    } else if (spaceLeft >= 14 + Math.max(28, pixTextHeight)) {
      qrSize = 28; // reduz o QR para 28mm e tenta encaixar
    } else {
      doc.addPage();           // sem espaço mesmo com QR reduzido → nova página
      finalY = 14;
      qrSize = qrMaxSize;
    }

    const qrY = finalY + 12;

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PAGAMENTO VIA PIX', 14, finalY + 8);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 10, pageW - 14, finalY + 10);

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    const textXFinal = qrX + qrSize + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Escaneie o QR Code ou copie o código abaixo:', textXFinal, qrY + 5);

    let currentY = qrY + 11;
    let remaining = payload;
    const maxWidthFinal = pageW - textXFinal - 14;
    while (remaining.length > 0) {
      const chars = Math.floor(maxWidthFinal / 2.1);
      const slice = remaining.substring(0, chars);
      remaining = remaining.substring(chars);
      doc.text(slice, textXFinal, currentY);
      currentY += 5;
    }

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

      {/* mostra as opções de frete retornadas pela API */}
      <div style={{ marginTop: 12 }}>
        <h4>Opções de frete</h4>
        <button
          className="btn secondary"
          style={{ marginBottom: 6 }}
          onClick={async () => {
            try {
              const params: MelhorEnvioShippingCalculatorRequest = {
                from: { postal_code: '04545000' },
                to: { postal_code: '02012060' },
                products: order.items.map((item) => ({
                  id: item.produtoId.toString(),
                  width: 10,
                  height: 10,
                  length: 10,
                  weight: 0.5,
                  insurance_value: item.total,
                  quantity: item.quantidade,
                })),
                options: {
                  receipt: false,
                  own_hand: false,
                },
                services: '',
              };
              const opts = await calculateShipping(params);
              setShippingOptions(opts);
            } catch (error) {
              console.error('erro no cálculo manual do frete', error);
            }
          }}
        >
          Calcular frete
        </button>
        <ShippingOptionsList options={shippingOptions} />
      </div>

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