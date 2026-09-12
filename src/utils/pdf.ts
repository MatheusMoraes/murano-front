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

// Carrega uma foto de produto (URL externa da Cloudinary) já recortada em
// quadrado (recorte central, tipo object-fit:cover) e como JPEG — o
// catálogo sempre desenha a foto num quadrado, e o jsPDF não tem "cover":
// se mandássemos a imagem inteira (as fotos são 720x1280, retrato), ele
// simplesmente estica pra caber no quadrado, distorcendo e perdendo
// nitidez. Recortando pro quadrado aqui, com o lado do recorte batendo
// com o lado menor da imagem original (720px), sai exatamente na
// resolução nativa — nem estica, nem faz upscale à toa.
export function loadImageAsJpegDataUrl(url: string, size = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Não faz upscale além do que a imagem original tem.
      const outSize = Math.min(size, img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponível"));
        return;
      }
      // JPEG não tem canal alfa — pinta fundo branco antes de desenhar por
      // segurança, caso a imagem original tenha transparência.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outSize, outSize);

      const cropSize = Math.min(img.width, img.height);
      const srcX = (img.width - cropSize) / 2;
      const srcY = (img.height - cropSize) / 2;
      ctx.drawImage(img, srcX, srcY, cropSize, cropSize, 0, 0, outSize, outSize);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}
