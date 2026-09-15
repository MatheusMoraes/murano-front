import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import type { RevenueByPeriod, RevenuePeriodKey, TopProdutoCaro } from "../types/dashboard";
import { formatCurrency } from "../utils/formatCurrency";
import RankingBar from "./RankingBar";

const PERIODOS: { key: RevenuePeriodKey; label: string }[] = [
  { key: "30d", label: "30 dias" },
  { key: "60d", label: "60 dias" },
  { key: "90d", label: "90 dias" },
  { key: "trimestre", label: "Trimestre" },
  { key: "semestre", label: "Semestre" },
  { key: "ano", label: "Último ano" },
];

// Dimensões do viewBox — o SVG escala via CSS (width: 100%; height: auto),
// preservando a proporção do viewBox (sem preserveAspectRatio="none": isso
// esticava texto e círculos de forma desigual sempre que a caixa não tinha
// exatamente essa proporção — números e marcadores saíam deformados).
const W = 480;
const H = 100;
const PAD_LEFT = 36;
const PAD_RIGHT = 6;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

// Arredonda o máximo do eixo Y pra um número "redondo" (1/2/5 × 10^n) em
// vez do valor bruto — assim as gridlines mostram 0 / 1.000 / 2.000 em
// vez de 0 / 743 / 1.486.
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

// O backend serializa "Data" como DateTime (ISO completo, ex:
// "2026-09-12T00:00:00Z"), não como uma data pura — pegamos só a parte
// "YYYY-MM-DD" e montamos a data à meia-noite local, em vez de deixar o
// browser interpretar o "Z" como UTC e potencialmente exibir o dia
// anterior/seguinte dependendo do fuso (mesmo cuidado já tomado em
// OrderDetails.tsx pro PDF do pedido).
function parseDataBucket(iso: string): Date {
  const dataPart = iso.split("T")[0];
  return new Date(dataPart + "T00:00:00");
}

function formatDataLabel(iso: string, granularidade: RevenueByPeriod["granularidade"]): string {
  const d = parseDataBucket(iso);
  if (granularidade === "mes") {
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDataCompleta(iso: string, granularidade: RevenueByPeriod["granularidade"]): string {
  const d = parseDataBucket(iso);
  if (granularidade === "mes") {
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  if (granularidade === "semana") {
    return `Semana de ${d.toLocaleDateString("pt-BR")}`;
  }
  return d.toLocaleDateString("pt-BR");
}

interface Props {
  produtosMaisCaros: TopProdutoCaro[];
}

export default function RevenueByPeriodCard({ produtosMaisCaros }: Props) {
  const [period, setPeriod] = useState<RevenuePeriodKey>("30d");
  const [data, setData] = useState<RevenueByPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    api
      .get<RevenueByPeriod>("/dashboard/revenue", { params: { period } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setHoverIndex(null);
      })
      .catch((err) => {
        console.error("Erro ao carregar receita por período:", err);
        if (!cancelled) setError("Não foi possível carregar a receita do período.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const pontos = useMemo(() => data?.pontos ?? [], [data]);
  const n = pontos.length;

  const max = useMemo(() => niceMax(Math.max(...pontos.map((p) => p.receita), 0)), [pontos]);

  const coords = useMemo(
    () =>
      pontos.map((p, i) => {
        const x = n <= 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (n - 1)) * PLOT_W;
        const y = PAD_TOP + PLOT_H - (max === 0 ? 0 : (p.receita / max) * PLOT_H);
        return { x, y, ponto: p };
      }),
    [pontos, n, max]
  );

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD_TOP + PLOT_H).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(PAD_TOP + PLOT_H).toFixed(1)} Z`
      : "";

  // Poucos pontos: mostra todos no eixo X. Muitos: só uma amostra (início,
  // fim e alguns no meio) pra não sobrepor os rótulos.
  const tickIndexes = useMemo(() => {
    if (n === 0) return [];
    if (n <= 7) return coords.map((_, i) => i);
    const count = 5;
    const step = (n - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => Math.round(i * step));
  }, [n, coords]);

  function moveHoverFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const xInSvg = (clientX - rect.left) * scaleX;
    const t = (xInSvg - PAD_LEFT) / PLOT_W;
    const idx = Math.round(t * (n - 1));
    setHoverIndex(Math.min(Math.max(idx, 0), n - 1));
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (n === 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setHoverIndex((prev) => Math.min((prev ?? -1) + 1, n - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHoverIndex((prev) => Math.max((prev ?? 1) - 1, 0));
    } else if (e.key === "Escape") {
      setHoverIndex(null);
    }
  }

  const hovered = hoverIndex != null ? coords[hoverIndex] : null;
  const gridValues = [0, max / 2, max];

  const maxPrecoCaro = Math.max(1, ...produtosMaisCaros.map((p) => p.precoVarejo));
  const variacao = data?.variacaoPercentual ?? null;

  return (
    <div className="revenue-cards-row">
      <section className="ranking-card revenue-card">
        <div className="revenue-card-header">
          <h3 className="ranking-title">Receita por período</h3>
          <button
            type="button"
            className="btn-outline revenue-table-toggle"
            onClick={() => setShowTable((prev) => !prev)}
          >
            {showTable ? "Ver gráfico" : "Ver como tabela"}
          </button>
        </div>

        <div className="revenue-period-filters" role="group" aria-label="Filtrar período da receita">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`revenue-period-pill ${period === p.key ? "active" : ""}`}
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <p className="ranking-empty">{error}</p>}

        {!error && n === 0 && !loading && (
          <p className="ranking-empty">Nenhum pedido nesse período ainda.</p>
        )}

        {!error && n > 0 && (
          showTable ? (
            <div className="table-responsive">
              <table className="table revenue-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {pontos.map((p) => (
                    <tr key={p.data}>
                      <td>{formatDataCompleta(p.data, data!.granularidade)}</td>
                      <td>{formatCurrency(p.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`revenue-chart-wrap ${loading ? "loading" : ""}`}>
              <svg
                ref={svgRef}
                className="revenue-chart-svg"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`Gráfico de receita por período, total ${formatCurrency(data?.receitaTotal ?? 0)}`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onPointerMove={(e) => moveHoverFromClientX(e.clientX)}
                onPointerLeave={() => setHoverIndex(null)}
              >
                {/* Gridlines recessivas + rótulos do eixo Y */}
                {gridValues.map((v, i) => {
                  const y = PAD_TOP + PLOT_H - (max === 0 ? 0 : (v / max) * PLOT_H);
                  return (
                    <g key={i}>
                      <line
                        x1={PAD_LEFT}
                        x2={W - PAD_RIGHT}
                        y1={y}
                        y2={y}
                        className="revenue-gridline"
                      />
                      <text x={PAD_LEFT - 8} y={y} className="revenue-axis-label" textAnchor="end" dominantBaseline="middle">
                        {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Rótulos do eixo X */}
                {tickIndexes.map((idx) => (
                  <text
                    key={idx}
                    x={coords[idx].x}
                    y={H - 3}
                    className="revenue-axis-label"
                    textAnchor="middle"
                  >
                    {formatDataLabel(pontos[idx].data, data!.granularidade)}
                  </text>
                ))}

                <path d={areaPath} className="revenue-area" />
                <path d={linePath} className="revenue-line" />

                {/* Marcador no último ponto — mesmo padrão do resto do app
                    (valor no fim da linha). */}
                {coords.length > 0 && (
                  <circle
                    cx={coords[coords.length - 1].x}
                    cy={coords[coords.length - 1].y}
                    r={3.5}
                    className="revenue-end-dot"
                  />
                )}

                {/* Crosshair + ponto em hover/foco */}
                {hovered && (
                  <>
                    <line
                      x1={hovered.x}
                      x2={hovered.x}
                      y1={PAD_TOP}
                      y2={PAD_TOP + PLOT_H}
                      className="revenue-crosshair"
                    />
                    <circle cx={hovered.x} cy={hovered.y} r={3.5} className="revenue-hover-dot" />
                  </>
                )}
              </svg>

              {hovered && (
                <div
                  className="revenue-tooltip"
                  style={{
                    left: `${(hovered.x / W) * 100}%`,
                    top: `${(hovered.y / H) * 100}%`,
                  }}
                >
                  <strong>{formatCurrency(hovered.ponto.receita)}</strong>
                  <span>{formatDataCompleta(hovered.ponto.data, data!.granularidade)}</span>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* Card separado: os 5 produtos de maior preço dentre os que já
          venderam pelo menos uma unidade — mostra se os itens premium do
          catálogo também estão girando, não só os baratos (isso é
          diferente do ranking "Produtos mais vendidos" mais abaixo, que
          ordena por quantidade). Sempre all-time, não segue o filtro de
          período do gráfico ao lado. */}
      <section className="ranking-card">
        <h3 className="ranking-title">Produtos mais caros vendidos</h3>
        {produtosMaisCaros.length === 0 ? (
          <p className="ranking-empty">Nenhum produto vendido ainda.</p>
        ) : (
          <ul className="ranking-bar-list">
            {produtosMaisCaros.map((p) => (
              <RankingBar
                key={p.produtoId}
                label={p.nome}
                valor={`${formatCurrency(p.precoVarejo)} · ${p.quantidadeVendida} un.`}
                fracao={p.precoVarejo / maxPrecoCaro}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Terceiro card: métricas complementares do mesmo período/filtro do
          gráfico — volume de pedidos, ticket médio e a comparação com o
          período equivalente anterior (contexto que a linha de tendência
          sozinha não transmite: subiu 12%, mas é 1 pedido a mais ou dez?). */}
      {!error && data && n > 0 && (
        <section className="ranking-card">
          <h3 className="ranking-title">Resumo do período</h3>
          <div className="revenue-metrics-grid">
            <div className="revenue-side-stat">
              <span className="revenue-side-stat-label">Receita do período</span>
              <span className="revenue-side-stat-value">{formatCurrency(data.receitaTotal)}</span>
              {variacao != null && (
                <span className={`revenue-delta ${variacao >= 0 ? "up" : "down"}`}>
                  {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}% vs. anterior
                </span>
              )}
            </div>
            <div className="revenue-side-stat">
              <span className="revenue-side-stat-label">Pedidos no período</span>
              <span className="revenue-side-stat-value">{data.totalPedidos}</span>
            </div>
            <div className="revenue-side-stat">
              <span className="revenue-side-stat-label">Ticket médio</span>
              <span className="revenue-side-stat-value">{formatCurrency(data.ticketMedio)}</span>
            </div>
            <div className="revenue-side-stat">
              <span className="revenue-side-stat-label">Período anterior</span>
              <span className="revenue-side-stat-value">{formatCurrency(data.receitaPeriodoAnterior)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
