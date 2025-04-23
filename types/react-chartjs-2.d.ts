declare module 'react-chartjs-2' {
  import { ChartData, ChartOptions } from 'chart.js';
  import * as React from 'react';

  interface ChartProps {
    data: ChartData;
    options?: ChartOptions;
    height?: number;
    width?: number;
  }

  export class Bar extends React.Component<ChartProps> {}
  export class Pie extends React.Component<ChartProps> {}
}
