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

// Top 5 produtos de maior preço de varejo dentre os que já venderam pelo
// menos uma unidade — diferente de TopProduto (ordenado por quantidade),
// mostra se os itens premium do catálogo também estão girando.
export interface TopProdutoCaro {
  produtoId: number;
  nome: string;
  precoVarejo: number;
  quantidadeVendida: number;
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
  produtosMaisCarosVendidos: TopProdutoCaro[];
}

// Chaves aceitas pelo filtro do card "Receita por período" — espelha
// Services/DashboardService.cs (Periodos) no backend.
export type RevenuePeriodKey = "30d" | "60d" | "90d" | "trimestre" | "semestre" | "ano";

export interface RevenuePoint {
  data: string; // ISO date
  receita: number;
}

export interface RevenueByPeriod {
  periodo: RevenuePeriodKey;
  dataInicio: string;
  dataFim: string;
  granularidade: "dia" | "semana" | "mes";
  receitaTotal: number;
  totalPedidos: number;
  ticketMedio: number;
  receitaPeriodoAnterior: number;
  variacaoPercentual: number | null;
  pontos: RevenuePoint[];
}
