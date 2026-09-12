export interface TopCliente {
  clientId: number;
  nome: string;
  totalPedidos: number;
  valorTotal: number;
}

export interface TopProduto {
  produtoId: number | null;
  nome: string;
  quantidadeVendida: number;
  receitaGerada: number;
}

export interface ReceitaPorCategoria {
  categoriaNome: string;
  receitaTotal: number;
}

export interface Dashboard {
  totalPedidos: number;
  receitaTotal: number;
  ticketMedio: number;
  totalClientes: number;
  totalProdutos: number;
  produtosComEstoqueBaixo: number;
  topClientes: TopCliente[];
  topProdutos: TopProduto[];
  receitaPorCategoria: ReceitaPorCategoria[];
}
