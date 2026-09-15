// Barra horizontal de um único tom (dourado da marca) — usada em todos os
// rankings do dashboard (clientes, produtos, categorias, produtos mais
// caros vendidos...). `valor` já formatado como texto pra exibir ao lado
// da barra (contagem de pedidos, quantidade vendida, preço...).
export default function RankingBar({
  label,
  valor,
  fracao,
}: {
  label: string;
  valor: string;
  fracao: number;
}) {
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
