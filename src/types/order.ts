export interface Product {
  id: number;
  nomeProduto: string;
  preco: number;
}

export interface OrderItem {
  produtoId: number;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

export interface Order {
  id: number;
  criadoEm: string;
  valorTotal: number;
  items: OrderItem[];
}