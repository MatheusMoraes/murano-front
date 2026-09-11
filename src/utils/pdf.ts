// Paleta da marca (mesmas cores de src/index.css), em RGB para uso no jsPDF.
// Compartilhado entre o PDF de pedido (OrderDetails) e o catálogo de
// produtos (catalogPdf).
export const PDF_COLORS = {
  surface: [23, 21, 27] as [number, number, number],       // --color-surface
  gold: [212, 175, 55] as [number, number, number],        // --color-gold
  goldDark: [156, 122, 30] as [number, number, number],    // --color-gold-dark
  goldLight: [243, 217, 139] as [number, number, number],  // --color-gold-light
  goldTint: [250, 243, 224] as [number, number, number],   // fundo leve com tom de ouro
  text: [241, 233, 210] as [number, number, number],       // --color-text
  textDark: [23, 21, 18] as [number, number, number],      // texto sobre fundo dourado
  textMuted: [120, 108, 78] as [number, number, number],   // --color-text-muted (ajustado p/ fundo branco)
};

// Converte uma imagem (URL do bundle, ex: a logo) em data URL preservando o
// formato original — importante pra logo, que é PNG com transparência.
export async function imageUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Carrega uma foto de produto (URL externa da Cloudinary) sempre como JPEG
// já redimensionada — evita ter que detectar na mão se o original é
// PNG/WEBP/GIF (o jsPDF lida melhor com JPEG) e mantém o PDF leve mesmo com
// muitas fotos no catálogo.
export function loadImageAsJpegDataUrl(url: string, maxSize = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponível"));
        return;
      }
      // JPEG não tem canal alfa — pinta fundo branco antes de desenhar por
      // segurança, caso a imagem original tenha transparência.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}
