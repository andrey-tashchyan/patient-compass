import { useRef, useEffect, useMemo } from "react";
import * as echarts from "echarts";
import type { VitalDataPoint, RollingAverage, BpStage, BP_STAGE_COLORS } from "@/lib/evolutionMetrics";
import type { ChartAnnotation, RiskWindow } from "@/types/evolutionInsights";
import type { TreatmentMarker, AdmissionMarker } from "@/lib/evolutionMetrics";

interface Props {
  vitals: VitalDataPoint[];
  rollingAverages: RollingAverage[];
  annotations: ChartAnnotation[];
  riskWindows: RiskWindow[];
  treatmentMarkers: TreatmentMarker[];
  admissionMarkers: AdmissionMarker[];
  visibleMetrics: Set<string>;
  dateRange: [number, number] | null;
  onAnnotationClick?: (annotation: ChartAnnotation) => void;
}

const TEAL = "#0d9488";
const TEAL_LIGHT = "#5eead4";
const AMBER = "#d97706";
const SLATE_BLUE = "#6366f1";
const ROSE = "#e11d48";
const EMERALD = "#10b981";

export default function MetricTrendChart({
  vitals,
  rollingAverages,
  annotations,
  riskWindows,
  treatmentMarkers,
  admissionMarkers,
  visibleMetrics,
  dateRange,
  onAnnotationClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const filtered = useMemo(() => {
    if (!dateRange) return vitals;
    return vitals.filter((v) => v.timestamp >= dateRange[0] && v.timestamp <= dateRange[1]);
  }, [vitals, dateRange]);

  const filteredRA = useMemo(() => {
    if (!dateRange) return rollingAverages;
    return rollingAverages.filter((r) => r.timestamp >= dateRange[0] && r.timestamp <= dateRange[1]);
  }, [rollingAverages, dateRange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    const dates = filtered.map((v) => v.date.slice(0, 10));
    const series: echarts.SeriesOption[] = [];
    const yAxisConfigs: echarts.YAXisComponentOption[] = [];

    // BP axis
    yAxisConfigs.push({
      type: "value",
      name: "mmHg",
      position: "left",
      axisLabel: { color: "#94a3b8", fontSize: 10 },
      nameTextStyle: { color: "#94a3b8", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)" } },
    });

    if (visibleMetrics.has("sbp")) {
      series.push({
        name: "SBP",
        type: "line",
        yAxisIndex: 0,
        data: filtered.map((v) => [v.date.slice(0, 10), v.sbp ?? null]),
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: TEAL, width: 2 },
        itemStyle: { color: TEAL },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(13,148,136,0.18)" },
            { offset: 1, color: "rgba(13,148,136,0.02)" },
          ]),
        },
      });
    }

    if (visibleMetrics.has("dbp")) {
      series.push({
        name: "DBP",
        type: "line",
        yAxisIndex: 0,
        data: filtered.map((v) => [v.date.slice(0, 10), v.dbp ?? null]),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: TEAL_LIGHT, width: 2 },
        itemStyle: { color: TEAL_LIGHT },
      });
    }

    if (visibleMetrics.has("map")) {
      series.push({
        name: "MAP",
        type: "line",
        yAxisIndex: 0,
        data: filtered.map((v) => [v.date.slice(0, 10), v.map ?? null]),
        smooth: true,
        symbol: "diamond",
        symbolSize: 4,
        lineStyle: { color: AMBER, width: 1.5, type: "dashed" },
        itemStyle: { color: AMBER },
      });
    }

    if (visibleMetrics.has("sbp_30d")) {
      series.push({
        name: "SBP 30d Avg",
        type: "line",
        yAxisIndex: 0,
        data: filteredRA.map((r) => [r.date.slice(0, 10), r.sbp_30d ?? null]),
        smooth: true,
        symbol: "none",
        lineStyle: { color: SLATE_BLUE, width: 1.5, type: "dotted" },
      });
    }

    // HR on secondary axis
    if (visibleMetrics.has("hr")) {
      yAxisConfigs.push({
        type: "value",
        name: "bpm",
        position: "right",
        axisLabel: { color: "#94a3b8", fontSize: 10 },
        nameTextStyle: { color: "#94a3b8", fontSize: 10 },
        splitLine: { show: false },
      });
      series.push({
        name: "Heart Rate",
        type: "line",
        yAxisIndex: 1,
        data: filtered.map((v) => [v.date.slice(0, 10), v.hr ?? null]),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: ROSE, width: 1.5 },
        itemStyle: { color: ROSE },
      });
    }

    // Annotation markers
    if (annotations.length > 0 && visibleMetrics.has("annotations")) {
      const markData = annotations
        .filter((a) => a.metric === "bp" || a.metric === "shock_index")
        .slice(0, 15)
        .map((a) => ({
          coord: [a.time.slice(0, 10), null],
          name: a.title,
          value: a.title,
          itemStyle: {
            color: a.confidence >= 0.9 ? ROSE : AMBER,
          },
        }));

      if (series.length > 0) {
        (series[0] as any).markPoint = {
          data: markData,
          symbol: "pin",
          symbolSize: 30,
          label: { show: false },
          tooltip: {
            formatter: (params: any) => params.name,
          },
        };
      }
    }

    // Treatment markers as mark lines
    const treatmentLines = treatmentMarkers
      .filter((t) => {
        if (!dateRange) return true;
        return t.timestamp >= dateRange[0] && t.timestamp <= dateRange[1];
      })
      .slice(0, 10)
      .map((t) => ({
        xAxis: t.date.slice(0, 10),
        label: { formatter: "💊", fontSize: 12, position: "end" as const },
        lineStyle: { color: EMERALD, type: "dashed" as const, width: 1 },
      }));

    if (treatmentLines.length > 0 && series.length > 0) {
      (series[0] as any).markLine = {
        data: treatmentLines,
        symbol: "none",
        silent: true,
      };
    }

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",
      grid: {
        left: 55,
        right: visibleMetrics.has("hr") ? 55 : 20,
        top: 40,
        bottom: 50,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(148,163,184,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 12, fontFamily: "Inter" },
        axisPointer: { type: "cross", lineStyle: { color: "rgba(148,163,184,0.3)" } },
      },
      legend: {
        show: true,
        bottom: 0,
        textStyle: { color: "#94a3b8", fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "#94a3b8", fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
      },
      yAxis: yAxisConfigs.length > 0 ? yAxisConfigs : [{ type: "value" }],
      series,
    };

    chart.setOption(option);

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [filtered, filteredRA, annotations, treatmentMarkers, visibleMetrics, dateRange]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border bg-card"
      style={{ height: 380 }}
    />
  );
}
