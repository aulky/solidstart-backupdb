import { onMount, createEffect, onCleanup } from "solid-js";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title as ChartTitle,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

interface BackupChartProps {
  data: Array<{ date: string; success_count: number; fail_count: number }>;
}

function formatChartLabel(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  }
  return dateStr;
}

export default function BackupChart(props: BackupChartProps) {
  let canvasRef!: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  const renderChart = () => {
    if (!canvasRef) return;
    if (chartInstance) chartInstance.destroy();

    const labels = props.data.map((d) => formatChartLabel(d.date));
    const successData = props.data.map((d) => Number(d.success_count || 0));
    const failData = props.data.map((d) => Number(d.fail_count || 0));

    chartInstance = new Chart(canvasRef, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Success",
            data: successData,
            borderColor: "#16A34A",
            backgroundColor: "rgba(22, 163, 74, 0.08)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: "Failed",
            data: failData,
            borderColor: "#DC2626",
            backgroundColor: "rgba(220, 38, 38, 0.08)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: "DM Sans", size: 12 },
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            padding: 12,
            cornerRadius: 12,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "Fira Code", size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { family: "DM Sans", size: 11 } },
            grid: { color: "rgba(0,0,0,0.04)" },
          },
        },
      },
    });
  };

  onMount(() => {
    renderChart();
  });

  createEffect(() => {
    if (props.data) {
      renderChart();
    }
  });

  onCleanup(() => {
    if (chartInstance) chartInstance.destroy();
  });

  return (
    <div class="h-64 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
