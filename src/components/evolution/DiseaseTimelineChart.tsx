import { useRef, useEffect, useMemo } from "react";
import * as echarts from "echarts";
import type { ConditionSpan, ActiveConditionPoint } from "@/lib/evolutionMetrics";
import type { ConditionTrajectory } from "@/types/evolutionInsights";

interface Props {
  conditionSpans: ConditionSpan[];
  activeConditionTimeline: ActiveConditionPoint[];
  conditionTrajectory: ConditionTrajectory[];
  dateRange: [number, number] | null;
}

const PALETTE = [
  "#0d9488", "#d97706", "#6366f1", "#e11d48", "#10b981",
  "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#84cc16",
];

export default function DiseaseTimelineChart({
  conditionSpans,
  activeConditionTimeline,
  conditionTrajectory,
  dateRange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTimeline = useMemo(() => {
    if (!dateRange) return activeConditionTimeline;
    return activeConditionTimeline.filter(
      (p) => p.timestamp >= dateRange[0] && p.timestamp <= dateRange[1]
    );
  }, [activeConditionTimeline, dateRange]);

  // Unique conditions for Gantt-like bars
  const uniqueConditions = useMemo(() => {
    const seen = new Set<string>();
    return conditionSpans.filter((c) => {
      if (seen.has(c.condition)) return false;
      seen.add(c.condition);
      return true;
    });
  }, [conditionSpans]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

    const categories = uniqueConditions.map((c) => c.condition.slice(0, 30));

    // Gantt bars for each condition
    const ganttData = conditionSpans.map((c, i) => {
      const catIdx = categories.indexOf(c.condition.slice(0, 30));
      const startTs = c.start ? new Date(c.start).getTime() : 0;
      const endTs = c.end ? new Date(c.end).getTime() : Date.now();
      return {
        value: [catIdx, startTs, endTs, c.condition],
        itemStyle: {
          color: PALETTE[catIdx % PALETTE.length],
          opacity: c.isActive ? 0.9 : 0.5,
          borderRadius: 3,
        },
      };
    });

    const renderItem: echarts.CustomSeriesRenderItem = (params, api) => {
      const catIdx = api.value!(0) as number;
      const start = api.coord!([api.value!(1), catIdx]);
      const end = api.coord!([api.value!(2), catIdx]);
      const height = (api.size!([0, 1]) as number[])[1] * 0.6;

      return {
        type: "rect" as const,
        shape: {
          x: start[0],
          y: start[1] - height / 2,
          width: Math.max(end[0] - start[0], 4),
          height,
          r: 3,
        },
        style: api.style!(),
      };
    };

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 600,
      grid: { left: 160, right: 20, top: 20, bottom: 40 },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        formatter: (params: any) => {
          const v = params.value;
          const start = new Date(v[1]).toLocaleDateString();
          const end = v[2] > Date.now() - 86400000 ? "Active" : new Date(v[2]).toLocaleDateString();
          return `<b>${v[3]}</b><br/>${start} → ${end}`;
        },
      },
      xAxis: {
        type: "time",
        axisLabel: { color: "#94a3b8", fontSize: 10 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          width: 140,
          overflow: "truncate",
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "custom",
          renderItem,
          encode: { x: [1, 2], y: 0 },
          data: ganttData,
        },
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [conditionSpans, uniqueConditions, dateRange]);

  if (conditionSpans.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground text-sm">
        No condition data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border bg-card"
      style={{ height: Math.max(200, uniqueConditions.length * 36 + 80) }}
    />
  );
}
