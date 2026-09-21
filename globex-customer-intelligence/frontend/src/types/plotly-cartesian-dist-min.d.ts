// The cartesian distribution bundle exposes the same API as the full "plotly.js" package
// (it adds heatmap/box/histogram traces on top of the basic bundle's scatter/bar/pie).
declare module 'plotly.js-cartesian-dist-min' {
  import * as Plotly from 'plotly.js';
  export = Plotly;
}
