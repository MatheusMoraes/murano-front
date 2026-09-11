export interface Product {
  id: number;
  nome: string;
  categoriaId: number;
  categoriaNome: string;
  quantidade: number;
  precoVarejo: number;
  // Preço e quantidade mínima para venda no atacado. Quando algum dos dois
  // não está configurado, o produto só tem preço de varejo.
  precoAtacado?: number | null;
  quantidadeMinimaAtacado?: number | null;
  // Limite pra alerta de estoque baixo (opcional, por produto) e o
  // resultado já calculado pelo backend (quantidade <= estoqueMinimo).
  estoqueMinimo?: number | null;
  estoqueBaixo: boolean;
  imagemUrl?: string | null;
  // Reenviado sem alteração em updates que não mexem na imagem — se sumir
  // do payload, o backend entende que a imagem foi removida.
  imagemPublicId?: string | null;
  criadoEm: string;
}

export interface UploadImageResponse {
  imagemUrl: string;
  imagemPublicId: string;
}
