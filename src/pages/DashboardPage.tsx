import { useEffect, useState } from "react";
import api from "../api/api";
import type { Dashboard } from "../types/dashboard";
import { formatCurrency } from "../utils/formatCurrency";

// Barra horizontal de um único tom (dourado da marca) — usada tanto pro
// ranking de clientes quanto de produtos. `valor` já formatado como texto
// pra exibir ao lado da barra (contagem de pedidos, quantidade vendida...).
function RankingBar({ label, valor, fracao }: { label: string; valor: string; fracao: number }) {
  return (
    <li className="ranking-bar-row">
      <span className="ranking-bar-label" title={label}>{label}</span>
      <div className="ranking-bar-track">
        <div className="ranking-bar-fill" style={{ width: `${Math.max(fracao * 100, 4)}%` }} />
      </div>
      <span className="ranking-bar-value">{valor}</span>
    </li>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dashboard>("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Erro ao carregar dashboard:", err);
        setError("Não foi possível carregar o dashboard.");
      });
  }, []);

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="alert-error" style={{ margin: "16px 0" }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-loading">Carregando dashboard...</p>
      </div>
    );
  }

  const maxPedidosCliente = Math.max(1, ...data.topClientes.map((c) => c.totalPedidos));
  const maxQuantidadeProduto = Math.max(1, ...data.topProdutos.map((p) => p.quantidadeVendida));
  const maxReceitaCategoria = Math.max(1, ...data.receitaPorCategoria.map((c) => c.receitaTotal));

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2 className="dashboard-title">Dashboard</h2>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-label">Total de pedidos</span>
          <span className="stat-tile-value">{data.totalPedidos}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Receita total</span>
          <span className="stat-tile-value">{formatCurrency(data.receitaTotal)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Ticket médio</span>
          <span className="stat-tile-value">{formatCurrency(data.ticketMedio)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Clientes cadastrados</span>
          <span className="stat-tile-value">{data.totalClientes}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Produtos cadastrados</span>
          <span className="stat-tile-value">{data.totalProdutos}</span>
        </div>
        <div className={`stat-tile ${data.produtosComEstoqueBaixo > 0 ? "stat-tile--warning" : ""}`}>
          <span className="stat-tile-label">Estoque baixo</span>
          <span className="stat-tile-value">{data.produtosComEstoqueBaixo}</span>
        </div>
      </div>

      <div className="dashboard-rankings">
        <section className="ranking-card">
          <h3 className="ranking-title">Clientes com mais pedidos</h3>
          {data.topClientes.length === 0 ? (
            <p className="ranking-empty">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="ranking-bar-list">
              {data.topClientes.map((c) => (
                <RankingBar
                  key={c.clientId}
                  label={c.nome}
                  valor={`${c.totalPedidos} pedido(s) · ${formatCurrency(c.valorTotal)}`}
                  fracao={c.totalPedidos / maxPedidosCliente}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="ranking-card">
          <h3 className="ranking-title">Produtos mais vendidos</h3>
          {data.topProdutos.length === 0 ? (
            <p className="ranking-empty">Nenhum item vendido ainda.</p>
          ) : (
            <ul className="ranking-bar-list">
              {data.topProdutos.map((p) => (
                <RankingBar
                  key={p.produtoId ?? p.nome}
                  label={p.nome}
                  valor={`${p.quantidadeVendida} un. · ${formatCurrency(p.receitaGerada)}`}
                  fracao={p.quantidadeVendida / maxQuantidadeProduto}
                />
              ))}
            </ul>
          )}
        </section>

        {data.receitaPorCategoria.length > 0 && (
          <section className="ranking-card">
            <h3 className="ranking-title">Receita por categoria</h3>
            <ul className="ranking-bar-list">
              {data.receitaPorCategoria.map((c) => (
                <RankingBar
                  key={c.categoriaNome}
                  label={c.categoriaNome}
                  valor={formatCurrency(c.receitaTotal)}
                  fracao={c.receitaTotal / maxReceitaCategoria}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
