/**
 * Custom echarts bundle — tree-shaken to only the chart types and components
 * actually used in this project. Cuts ~500 kB+ from the vendor-echarts chunk.
 *
 * If you add a new chart type or feature (e.g. radar, dataZoom), import it here.
 */
import * as echarts from 'echarts/core';

// Chart types
import { LineChart } from 'echarts/charts';
import { BarChart } from 'echarts/charts';
import { PieChart } from 'echarts/charts';
import { ScatterChart } from 'echarts/charts';
import { HeatmapChart } from 'echarts/charts';
import { TreemapChart } from 'echarts/charts';
import { GaugeChart } from 'echarts/charts';

// Components
import { GridComponent } from 'echarts/components';
import { TooltipComponent } from 'echarts/components';
import { LegendComponent } from 'echarts/components';
import { VisualMapComponent } from 'echarts/components';
import { VisualMapContinuousComponent } from 'echarts/components';
import { MarkLineComponent } from 'echarts/components';
import { MarkPointComponent } from 'echarts/components';

// Renderer
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  VisualMapContinuousComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

export default echarts;
