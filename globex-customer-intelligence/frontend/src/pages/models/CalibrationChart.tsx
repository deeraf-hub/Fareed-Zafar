import type { Data, Layout } from 'plotly.js';
import type { CalibrationBin } from '../../api/types';
import { Chart, CHART_COLORS } from '../../components/Chart';
import { DataTable, type Column } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const BIN_COLUMNS: Column<CalibrationBin>[] = [
  { id: 'bin', header: 'Predicted bin', nowrap: true, render: (row) => `${formatNumber(row.bin_lower, 2)} – ${formatNumber(row.bin_upper, 2)}` },
  { id: 'mean_predicted', header: 'Mean predicted', align: 'right', render: (row) => formatPercent(row.mean_predicted) },
  { id: 'observed_rate', header: 'Observed rate', align: 'right', render: (row) => formatPercent(row.observed_rate) },
  { id: 'count', header: 'Customers', align: 'right', render: (row) => formatNumber(row.count) },
];

function buildData(bins: CalibrationBin[]): Data[] {
  const counts = bins.map((bin) => bin.count);
  const maxCount = Math.max(1, ...counts);
  return [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Perfect calibration',
      x: [0, 1],
      y: [0, 1],
      line: { color: CHART_COLORS.muted, width: 1, dash: 'dash' },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Model (marker size = customers in bin)',
      x: bins.map((bin) => bin.mean_predicted),
      y: bins.map((bin) => bin.observed_rate),
      line: { color: CHART_COLORS.accent, width: 2 },
      marker: {
        color: CHART_COLORS.accent,
        size: counts,
        sizemode: 'area',
        sizeref: (2 * maxCount) / 28 ** 2,
        sizemin: 6,
        line: { color: CHART_COLORS.surface, width: 1 },
      },
      customdata: bins.map((bin) => [bin.bin_lower, bin.bin_upper, bin.count]),
      hovertemplate:
        'Bin %{customdata[0]:.2f} – %{customdata[1]:.2f}<br>Mean predicted: %{x:.1%}<br>Observed rate: %{y:.1%}<br>Customers: %{customdata[2]:,}<extra></extra>',
    },
  ];
}

const LAYOUT: Partial<Layout> = {
  xaxis: { title: { text: 'Mean predicted probability' }, tickformat: '.0%', range: [0, 1] },
  yaxis: { title: { text: 'Observed repeat-purchase rate' }, tickformat: '.0%', range: [0, 1] },
  margin: { t: 36, l: 64, b: 56 },
};

export function CalibrationChart({ bins }: { bins: CalibrationBin[] | null }) {
  if (!bins || bins.length === 0) {
    return <EmptyState compact title="No calibration data recorded for this run." />;
  }
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Chart
        title="Calibration curve"
        description="Mean predicted probability against observed repeat-purchase rate per bin, with the diagonal showing perfect calibration."
        data={buildData(bins)}
        layout={LAYOUT}
        height={340}
      />
      <DataTable columns={BIN_COLUMNS} rows={bins} rowKey={(row) => `${row.bin_lower}-${row.bin_upper}`} dense caption="Calibration bins" />
    </div>
  );
}
