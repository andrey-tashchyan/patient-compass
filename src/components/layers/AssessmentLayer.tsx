import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientAssessments, RiskScore } from "@/data/mockPatients";

const riskLevelBadge = (level: RiskScore['level']) => {
  switch (level) {
    case 'critical': return 'clinical-badge-critical';
    case 'high': return 'clinical-badge-warning';
    case 'moderate': return 'clinical-badge-info';
    case 'low': return 'clinical-badge-normal';
  }
};

const riskBarColor = (level: RiskScore['level']) => {
  switch (level) {
    case 'critical': return 'bg-clinical-critical';
    case 'high': return 'bg-clinical-warning';
    case 'moderate': return 'bg-clinical-info';
    case 'low': return 'bg-clinical-normal';
  }
};

const trendIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-clinical-normal" />;
  if (trend === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-clinical-critical" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const AssessmentLayer = ({ assessments }: { assessments: PatientAssessments }) => {
  const highRisks = assessments.riskScores.filter(r => r.level === 'high' || r.level === 'critical').length;

  return (
    <CollapsibleLayer
      title="Assessment Layer"
      icon={<BarChart3 className="h-4 w-4" />}
      defaultOpen={false}
      badge={highRisks > 0 ? <span className="clinical-badge-warning">{highRisks} Elevated Risks</span> : undefined}
    >
      <div className="space-y-5">
        {/* Risk Scores */}
        <div>
          <div className="clinical-label mb-3">Risk Stratification</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assessments.riskScores.map((r, i) => (
              <div key={i} className="data-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-data-value">{r.name}</span>
                  <span className={riskLevelBadge(r.level)}>{r.level}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-lg font-bold text-data-value">{r.score}</span>
                  <span className="text-xs text-muted-foreground">/ {r.maxScore}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${riskBarColor(r.level)} rounded-full`} style={{ width: `${(r.score / r.maxScore) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{r.interpretation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Functional Scores */}
        <div>
          <div className="clinical-label mb-3">Functional Assessments</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assessments.functionalScores.map((f, i) => (
              <div key={i} className="data-card flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-data-value">{f.name}</span>
                  <span className="font-mono text-sm font-bold text-primary ml-2">{f.score}</span>
                </div>
                <div className="flex items-center gap-2">
                  {trendIcon(f.trend)}
                  <span className="text-xs text-muted-foreground">{f.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Psychosocial & Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="clinical-label mb-3">Psychosocial Context</div>
            <div className="space-y-2">
              {assessments.psychosocial.map((p, i) => (
                <div key={i} className="data-card">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.domain}</span>
                  <p className="text-sm text-data-value mt-0.5">{p.assessment}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="clinical-label mb-3">Goals of Care</div>
            <div className="space-y-2">
              {assessments.goalsOfCare.map((g, i) => (
                <div key={i} className="data-card flex items-center justify-between">
                  <span className="text-sm text-data-value">{g.goal}</span>
                  <span className={g.priority === 'high' ? 'clinical-badge-warning' : g.priority === 'medium' ? 'clinical-badge-info' : 'clinical-badge-muted'}>{g.priority}</span>
                </div>
              ))}
            </div>
            <div className="clinical-label mb-3 mt-4">Preferences</div>
            <div className="space-y-1.5">
              {assessments.preferences.map((p, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-medium text-data-value shrink-0">{p.category}:</span>
                  <span className="text-muted-foreground">{p.preference}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default AssessmentLayer;
