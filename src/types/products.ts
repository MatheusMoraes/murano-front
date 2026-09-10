export interface Product {
  id: number;
  nome: string;
  quantidade: number;
  precoVarejo: number;
  // Preço e quantidade mínima para venda no atacado. Quando algum dos dois
  // não está configurado, o produto só tem preço de varejo.
  precoAtacado?: number | null;
  quantidadeMinimaAtacado?: number | null;
  criadoEm: string;
}
