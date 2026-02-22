import { useRef, useEffect, useMemo } from "react";
import * as echarts from "echarts";
import type { ConditionSpan } from "@/lib/evolutionMetrics";

interface Props {
  conditionSpans: ConditionSpan[];
  dateRange: [number, number] | null;
}

const PALETTE = [
  "#0d9488", "#d97706", "#6366f1", "#e11d48", "#10b981",
  "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#84cc16",
  "#ec4899", "#14b8a6", "#a855f7", "#f97316",
];

/**
 * For each condition, build a step-line:
 * - At the condition's start date the value steps UP (to the condition's lane)
 * - At the condition's end date (or now if still active) the value steps DOWN (to 0)
 *
 * All conditions are stacked so the total height shows the "sickness burden" over time.
 */
export default function DiseaseTimelineChart({
  conditionSpans,
  dateRange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Deduplicate by condition name, merge spans
  const uniqueConditions = useMemo(() => {
    const map = new Map<string, ConditionSpan[]>();
    for (const span of conditionSpans) {
      const key = span.condition;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(span);
    }
    return Array.from(map.entries()); // [conditionName, spans[]]
  }, [conditionSpans]);

  // Build a global timeline of dates covering all condition events
  const globalTimeRange = useMemo(() => {
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const span of conditionSpans) {
      if (span.start) {
        const ts = new Date(span.start).getTime();
        if (ts < minTs) minTs = ts;
        if (ts > maxTs) maxTs = ts;
      }
      if (span.end) {
        const ts = new Date(span.end).getTime();
        if (ts > maxTs) maxTs = ts;
      }
    }
    if (!Number.isFinite(minTs)) return null;
    maxTs = Math.max(maxTs, Date.now());
    return [minTs, maxTs] as [number, number];
  }, [conditionSpans]);

  useEffect(() => {
    if (!containerRef.current || uniqueConditions.length === 0) return;

    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

    // For each condition, build step data points
    const series: echarts.SeriesOption[] = uniqueConditions.map(([name, spans], idx) => {
      // Collect all transition events for this condition
      const events: { ts: number; delta: number }[] = [];
      for (const span of spans) {
        const startTs = span.start ? new Date(span.start).getTime() : null;
        const endTs = span.end ? new Date(span.end).getTime() : null;
        if (startTs) events.push({ ts: startTs, delta: 1 });
        if (endTs) events.push({ ts: endTs, delta: -1 });
      }
      events.sort((a, b) => a.ts - b.ts);

      // Build cumulative step data
      const data: [number, number][] = [];
      let level = 0;

      // Start at 0 before everything
      if (events.length > 0 && globalTimeRange) {
        const firstTs = Math.min(events[0].ts, globalTimeRange[0]);
        data.push([firstTs, 0]);
      }

      for (const ev of events) {
        // Add point at previous level just before this timestamp (for crisp step)
        data.push([ev.ts, level]);
        level = Math.max(0, level + ev.delta);
        data.push([ev.ts, level]);
      }

      // Extend to present if still active
      if (level > 0) {
        data.push([Date.now(), level]);
      } else if (globalTimeRange) {
        data.push([globalTimeRange[1], 0]);
      }

      const color = PALETTE[idx % PALETTE.length];
      return {
        name: name.length > 35 ? name.slice(0, 32) + "…" : name,
        type: "line" as const,
        stack: "conditions",
        areaStyle: {
          opacity: 0.35,
          color,
        },
        lineStyle: {
          width: 1.5,
          color,
        },
        itemStyle: { color },
        symbol: "none",
        step: "end" as const,
        data,
        emphasis: {
          focus: "series" as const,
          areaStyle: { opacity: 0.6 },
          lineStyle: { width: 2.5 },
        },
      };
    });

    // Also build the total burden line
    const allEvents: { ts: number; delta: number }[] = [];
    for (const [, spans] of uniqueConditions) {
      for (const span of spans) {
        const startTs = span.start ? new Date(span.start).getTime() : null;
        const endTs = span.end ? new Date(span.end).getTime() : null;
        if (startTs) allEvents.push({ ts: startTs, delta: 1 });
        if (endTs) allEvents.push({ ts: endTs, delta: -1 });
      }
    }
    allEvents.sort((a, b) => a.ts - b.ts);

    const totalData: [number, number][] = [];
    let totalLevel = 0;
    if (allEvents.length > 0 && globalTimeRange) {
      totalData.push([globalTimeRange[0], 0]);
    }
    for (const ev of allEvents) {
      totalData.push([ev.ts, totalLevel]);
      totalLevel = Math.max(0, totalLevel + ev.delta);
      totalData.push([ev.ts, totalLevel]);
    }
    if (totalLevel > 0) totalData.push([Date.now(), totalLevel]);
    else if (globalTimeRange) totalData.push([globalTimeRange[1], 0]);

    series.push({
      name: "Total Burden",
      type: "line" as const,
      data: totalData,
      step: "end" as const,
      symbol: "none",
      lineStyle: {
        width: 2.5,
        color: "#94a3b8",
        type: "dashed" as const,
      },
      itemStyle: { color: "#94a3b8" },
      z: 10,
    });

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",
      grid: { left: 50, right: 20, top: 40, bottom: 60 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
        axisPointer: {
          type: "cross",
          lineStyle: { color: "rgba(148,163,184,0.3)" },
        },
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: { color: "#94a3b8", fontSize: 10 },
        pageTextStyle: { color: "#94a3b8" },
        pageIconColor: "#94a3b8",
        pageIconInactiveColor: "#475569",
        itemWidth: 14,
        itemHeight: 10,
      },
      xAxis: {
        type: "time",
        axisLabel: { color: "#94a3b8", fontSize: 10 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        ...(dateRange ? { min: dateRange[0], max: dateRange[1] } : {}),
      },
      yAxis: {
        type: "value",
        name: "Active Conditions",
        nameTextStyle: { color: "#94a3b8", fontSize: 10 },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          formatter: (v: number) => String(Math.round(v)),
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        minInterval: 1,
      },
      series,
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [uniqueConditions, globalTimeRange, dateRange]);

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
      style={{ height: 340 }}
    />
  );
}
