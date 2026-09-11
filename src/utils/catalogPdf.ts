import jsPDF from "jspdf";
import type { Category } from "../types/category";
import type { Product } from "../types/products";
import { formatCurrency } from "./formatCurrency";
import { PDF_COLORS, imageUrlToBase64, loadImageAsJpegDataUrl } from "./pdf";
import logoUrl from "../assets/logo.png";

const COLUMNS = 3;
const MARGIN = 14;
const CARD_GAP = 8;
const ROW_GAP = 10;
const CARD_TEXT_HEIGHT = 22; // espaço reservado pro nome + preços abaixo da foto

// Catálogo em PDF, agrupado por categoria (com a descrição de cada uma),
// com foto + preços de cada produto. Pensado pra ser mandado direto pro
// cliente, então segue a mesma paleta de marca usada no resto do app.
export async function generateCatalogPdf(categories: Category[], allProducts: Product[]) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const cardW = (contentW - (COLUMNS - 1) * CARD_GAP) / COLUMNS;
  const imgSize = cardW;
  const cardH = imgSize + CARD_TEXT_HEIGHT;

  let logoBase64: string | null = null;
  try {
    logoBase64 = await imageUrlToBase64(logoUrl);
  } catch (err) {
    console.error("Não foi possível carregar a logo no catálogo:", err);
  }

  const groups = categories
    .map((categoria) => ({
      categoria,
      produtos: allProducts.filter((p) => p.categoriaId === categoria.id),
    }))
    .filter((g) => g.produtos.length > 0);

  // Pré-carrega todas as fotos em paralelo antes de montar o layout — bem
  // mais rápido do que buscar uma de cada vez durante a paginação.
  const imageCache = new Map<number, string | null>();
  await Promise.all(
    groups.flatMap((g) =>
      g.produtos.map(async (p) => {
        if (!p.imagemUrl) {
          imageCache.set(p.id, null);
          return;
        }
        try {
          imageCache.set(p.id, await loadImageAsJpegDataUrl(p.imagemUrl));
        } catch (err) {
          console.error(`Falha ao carregar imagem do produto "${p.nome}":`, err);
          imageCache.set(p.id, null);
        }
      })
    )
  );

  function drawHeader() {
    doc.setFillColor(...PDF_COLORS.surface);
    doc.rect(0, 0, pageW, 22, "F");

    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", MARGIN - 2, 3, 16, 16);
    }

    doc.setTextColor(...PDF_COLORS.text);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Mistério de Murano", logoBase64 ? MARGIN + 20 : MARGIN, 13);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.goldLight);
    doc.text(
      `Catálogo gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      pageW - MARGIN,
      13,
      { align: "right" }
    );
  }

  drawHeader();
  let y = 34;

  doc.setTextColor(...PDF_COLORS.goldDark);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Catálogo de Produtos", pageW / 2, y, { align: "center" });
  y += 16;

  function ensureSpace(neededHeight: number) {
    if (y + neededHeight > pageH - MARGIN) {
      doc.addPage();
      drawHeader();
      y = 34;
    }
  }

  const TOP_Y = 34;

  groups.forEach(({ categoria, produtos }, index) => {
    // Cada categoria começa numa página nova — nunca divide página com a
    // anterior, mesmo que ela não tenha preenchido as 6 fotos da última
    // leva. A primeira categoria aproveita a página já aberta (com o
    // título "Catálogo de Produtos"); as próximas sempre pulam página,
    // a menos que a anterior já tenha terminado bem no topo de uma nova.
    if (index > 0 && y !== TOP_Y) {
      doc.addPage();
      drawHeader();
      y = TOP_Y;
    }

    // Barra do título da categoria.
    doc.setFillColor(...PDF_COLORS.gold);
    doc.rect(MARGIN, y, contentW, 9, "F");
    doc.setTextColor(...PDF_COLORS.textDark);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(categoria.nome.toUpperCase(), MARGIN + 4, y + 6.2);
    y += 9 + 5;

    if (categoria.descricao) {
      doc.setTextColor(...PDF_COLORS.textMuted);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(categoria.descricao, contentW);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.3 + 5;
    }

    let col = 0;

    for (const produto of produtos) {
      if (col === 0) {
        ensureSpace(cardH + ROW_GAP);
      }

      const x = MARGIN + col * (cardW + CARD_GAP);
      const imageData = imageCache.get(produto.id);

      if (imageData) {
        doc.addImage(imageData, "JPEG", x, y, imgSize, imgSize, undefined, "FAST");
      } else {
        doc.setFillColor(...PDF_COLORS.goldTint);
        doc.rect(x, y, imgSize, imgSize, "F");
        doc.setTextColor(...PDF_COLORS.textMuted);
        doc.setFontSize(8);
        doc.text("Sem foto", x + imgSize / 2, y + imgSize / 2, {
          align: "center",
          baseline: "middle",
        });
      }
      doc.setDrawColor(...PDF_COLORS.gold);
      doc.setLineWidth(0.3);
      doc.rect(x, y, imgSize, imgSize);

      doc.setTextColor(40, 38, 34);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(produto.nome, imgSize).slice(0, 2);
      doc.text(nameLines, x, y + imgSize + 4.5);

      let priceY = y + imgSize + 4.5 + nameLines.length * 4;
      doc.setTextColor(...PDF_COLORS.goldDark);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Varejo: ${formatCurrency(produto.precoVarejo)}`, x, priceY);

      if (produto.precoAtacado != null) {
        priceY += 4;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...PDF_COLORS.textMuted);
        const atacadoText = produto.quantidadeMinimaAtacado != null
          ? `Atacado: ${formatCurrency(produto.precoAtacado)} a partir de ${produto.quantidadeMinimaAtacado} unidades`
          : `Atacado: ${formatCurrency(produto.precoAtacado)}`;
        doc.text(atacadoText, x, priceY);
      }

      col++;
      if (col === COLUMNS) {
        col = 0;
        y += cardH + ROW_GAP;
      }
    }

    if (col !== 0) {
      y += cardH + ROW_GAP;
    }
    y += 6;
  });

  doc.save(`catalogo-murano-${new Date().toISOString().slice(0, 10)}.pdf`);
}
