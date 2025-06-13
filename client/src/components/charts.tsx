import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  RadialLinearScale,
  TimeScale,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale
);

interface ChartProps {
  data: any;
  options?: any;
  className?: string;
}

// Neumorphic chart options with dark theme support
const neumorphicOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
          family: "'Inter', sans-serif",
        },
        color: 'hsl(var(--foreground))',
      },
    },
    tooltip: {
      backgroundColor: 'hsl(var(--background))',
      titleColor: 'hsl(var(--foreground))',
      bodyColor: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
      cornerRadius: 12,
      displayColors: true,
      usePointStyle: true,
      padding: 12,
      titleFont: {
        size: 13,
        weight: '600',
      },
      bodyFont: {
        size: 12,
      },
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: 'hsl(var(--border))',
        lineWidth: 1,
      },
      ticks: {
        color: 'hsl(var(--muted-foreground))',
        font: {
          size: 11,
        },
      },
      border: {
        color: 'hsl(var(--border))',
      },
    },
    y: {
      grid: {
        display: true,
        color: 'hsl(var(--border))',
        lineWidth: 1,
      },
      ticks: {
        color: 'hsl(var(--muted-foreground))',
        font: {
          size: 11,
        },
      },
      border: {
        color: 'hsl(var(--border))',
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 3,
    },
    point: {
      radius: 6,
      hoverRadius: 8,
      borderWidth: 2,
      backgroundColor: 'hsl(var(--background))',
    },
    bar: {
      borderRadius: 8,
      borderSkipped: false,
    },
    arc: {
      borderWidth: 2,
      hoverBorderWidth: 3,
    },
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const,
  },
};

export function LineChart({ data, options = {}, className }: ChartProps) {
  const mergedOptions = {
    ...neumorphicOptions,
    ...options,
    plugins: {
      ...neumorphicOptions.plugins,
      ...options.plugins,
    },
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
}

export function BarChart({ data, options = {}, className }: ChartProps) {
  const mergedOptions = {
    ...neumorphicOptions,
    ...options,
    plugins: {
      ...neumorphicOptions.plugins,
      ...options.plugins,
    },
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
}

export function PieChart({ data, options = {}, className }: ChartProps) {
  const pieOptions = {
    ...neumorphicOptions,
    ...options,
    scales: undefined,
    plugins: {
      ...neumorphicOptions.plugins,
      legend: {
        ...neumorphicOptions.plugins.legend,
        position: 'bottom' as const,
      },
      ...options.plugins,
    },
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <Pie data={data} options={pieOptions} />
    </div>
  );
}

export function DoughnutChart({ data, options = {}, className }: ChartProps) {
  const doughnutOptions = {
    ...neumorphicOptions,
    ...options,
    scales: undefined,
    plugins: {
      ...neumorphicOptions.plugins,
      legend: {
        ...neumorphicOptions.plugins.legend,
        position: 'bottom' as const,
      },
      ...options.plugins,
    },
    cutout: '60%',
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <Doughnut data={data} options={doughnutOptions} />
    </div>
  );
}

// Advanced chart types
export function RadarChart({ data, options = {}, className }: ChartProps) {
  const radarOptions = {
    ...neumorphicOptions,
    ...options,
    scales: {
      r: {
        grid: {
          color: 'hsl(var(--border))',
        },
        pointLabels: {
          color: 'hsl(var(--foreground))',
          font: {
            size: 11,
          },
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      ...neumorphicOptions.plugins,
      ...options.plugins,
    },
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <Radar data={data} options={radarOptions} />
    </div>
  );
}

export function PolarAreaChart({ data, options = {}, className }: ChartProps) {
  const polarOptions = {
    ...neumorphicOptions,
    ...options,
    scales: {
      r: {
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      ...neumorphicOptions.plugins,
      legend: {
        ...neumorphicOptions.plugins.legend,
        position: 'bottom' as const,
      },
      ...options.plugins,
    },
  };

  return (
    <div className={`chart-container ${className || ''}`}>
      <PolarArea data={data} options={polarOptions} />
    </div>
  );
}

// Color palettes
export const chartColors = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted))',
  
  palette: [
    'hsl(262 80% 65%)',
    'hsl(342 75% 55%)',
    'hsl(157 55% 50%)',
    'hsl(43 74% 66%)',
    'hsl(27 87% 67%)',
  ],
  
  gradients: {
    primary: ['hsl(262 80% 65%)', 'hsl(262 80% 55%)'],
    secondary: ['hsl(342 75% 55%)', 'hsl(342 75% 45%)'],
    success: ['hsl(157 55% 50%)', 'hsl(157 55% 40%)'],
  },
};

// Real-time data generation utilities
export const generateRealTimeData = (points: number = 20) => {
  const labels = [];
  const data = [];
  const now = new Date();
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
    labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    data.push(Math.floor(Math.random() * 100) + 50);
  }
  
  return { labels, data };
};

export const generatePlatformData = () => {
  return {
    labels: ['Google Ads', 'Meta Ads', 'LinkedIn', 'TikTok', 'Twitter'],
    datasets: [
      {
        label: 'Conversões',
        data: [350, 280, 150, 120, 80],
        backgroundColor: chartColors.palette,
        borderColor: chartColors.palette,
        borderWidth: 2,
      },
    ],
  };
};

export const generateTimeSeriesData = (days: number = 30) => {
  const labels = [];
  const impressions = [];
  const clicks = [];
  const conversions = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }));
    
    impressions.push(Math.floor(Math.random() * 50000) + 20000);
    clicks.push(Math.floor(Math.random() * 2000) + 500);
    conversions.push(Math.floor(Math.random() * 100) + 20);
  }
  
  return {
    labels,
    datasets: [
      {
        label: 'Impressões',
        data: impressions,
        borderColor: chartColors.palette[0],
        backgroundColor: chartColors.palette[0] + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cliques',
        data: clicks,
        borderColor: chartColors.palette[1],
        backgroundColor: chartColors.palette[1] + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Conversões',
        data: conversions,
        borderColor: chartColors.palette[2],
        backgroundColor: chartColors.palette[2] + '20',
        fill: true,
        tension: 0.4,
      },
    ],
  };
};