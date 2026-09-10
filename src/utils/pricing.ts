import type { Product } from "../types/products";

// Mesma regra usada no backend (OrderService.ResolvePrecoUnitario): se o
// produto tem atacado configurado e a quantidade atinge o mínimo, vale o
// preço de atacado; caso contrário, vale o varejo.
export function isAtacado(product: Product, quantidade: number): boolean {
  return (
    product.precoAtacado != null &&
    product.quantidadeMinimaAtacado != null &&
    quantidade >= product.quantidadeMinimaAtacado
  );
}

export function getUnitPrice(product: Product, quantidade: number): number {
  return isAtacado(product, quantidade)
    ? product.precoAtacado as number
    : product.precoVarejo;
}
