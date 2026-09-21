import type { Config, Data, Layout } from 'plotly.js';
import Plotly from 'plotly.js-cartesian-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

// createPlotlyComponent keeps the bundle small: only the cartesian partial bundle is shipped
// (the basic bundle has no heatmap trace, which the cohort chart needs).
const Plot = createPlotlyComponent(Plotly);

export const CHART_COLORS = {
  accent: '#1D4ED8',
  navy: '#0F1F3D',
  muted: '#94A3B8',
  grid: '#E5E7EB',
  text: '#0F1F3D',
  secondary: '#5B6473',
  accentSoft: '#EFF4FF',
  surface: '#FFFFFF',
} as const;

export const CHART_FONT =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type Props = {
  /** Accessible name of the chart. */
  title: string;
  /** Short description of what the chart shows, for assistive technology. */
  description?: string;
  data: Data[];
  layout?: Partial<Layout>;
  height?: number;
  className?: string;
};

const BASE_CONFIG: Partial<Config> = {
  displaylogo: false,
  displayModeBar: false,
  responsive: true,
};

function axisDefaults(): Partial<Layout['xaxis']> {
  return {
    gridcolor: CHART_COLORS.grid,
    zeroline: false,
    linecolor: CHART_COLORS.grid,
    tickfont: { color: CHART_COLORS.secondary, size: 11 },
    automargin: true,
    fixedrange: true,
  };
}

/** Plotly wrapper applying the app's consistent, calm chart styling. */
export function Chart({ title, description, data, layout, height = 320, className = '' }: Props) {
  const { xaxis, yaxis, margin, ...rest } = layout ?? {};
  const merged: Partial<Layout> = {
    autosize: true,
    height,
    paper_bgcolor: CHART_COLORS.surface,
    plot_bgcolor: CHART_COLORS.surface,
    font: { family: CHART_FONT, size: 12, color: CHART_COLORS.text },
    margin: { l: 56, r: 16, t: 16, b: 48, ...margin },
    hoverlabel: {
      bgcolor: CHART_COLORS.navy,
      bordercolor: CHART_COLORS.navy,
      font: { family: CHART_FONT, size: 12, color: '#FFFFFF' },
    },
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.02,
      xanchor: 'left',
      yanchor: 'bottom',
      font: { color: CHART_COLORS.secondary, size: 12 },
    },
    xaxis: { ...axisDefaults(), ...xaxis },
    yaxis: { ...axisDefaults(), ...yaxis },
    ...rest,
  };

  return (
    <figure className={`w-full ${className}`}>
      <Plot data={data} layout={merged} config={BASE_CONFIG} useResizeHandler style={{ width: '100%', height }} />
      <figcaption className="sr-only">
        {title}
        {description ? `. ${description}` : ''}
      </figcaption>
    </figure>
  );
}
