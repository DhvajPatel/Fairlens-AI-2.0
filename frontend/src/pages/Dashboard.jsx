import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Activity, Database, Brain, Zap, ArrowRight, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import { getDatasetState, subscribeDatasetStore } from '../store/datasetStore'

const STEPS = [
  { id: 'analyze', num: '01', label: 'Upload Dataset',     icon: Database,       color: '#06b6d4', desc: 'Load your CSV and detect sensitive attributes' },
  { id: 'bias',    num: '02', label: 'Detect Bias',        icon: AlertTriangle,  color: '#f59e0b', desc: 'Measure fairness metrics across demographic groups' },
  { id: 'explain', num: '03', label: 'Explain AI',         icon: Brain,          color: '#8b5cf6', desc: 'Understand decisions with SHAP values' },
  { id: 'fix',     num: '04', label: 'Correct Bias',       icon: Zap,            color: '#10b981', desc: 'Apply reweighing, SMOTE, or feature removal' },
  { id: 'report',  num: '05', label: 'Compliance Report',  icon: Shield,         color: '#6366f1', desc: 'Generate PDF aligned with EU AI Act & GDPR' },
  { id: 'monitor', num: '06', label: 'Live Monitor',       icon: Activity,       color: '#f43f5e', desc: 'Track bias drift in real-time' },
]

const REGULATIONS = [
  { name: 'EU AI Act',            icon: '🇪🇺', color: '#6366f1' },
  { name: 'GDPR Article 22',      icon: '🔒', color: '#06b6d4' },
  { name: 'Google Responsible AI',icon: '🌐', color: '#8b5cf6' },
  { name: 'IBM AIF360',           icon: '⚖️', color: '#10b981' },
]

export default function Dashboard({ onNavigate }) {
  const [ds, setDs] = useState(getDatasetState())

  useEffect(() => {
    return subscribeDatasetStore(s => setDs({ ...s }))
  }, [])

  const hasDataset = !!ds.uploadResult
  const uploadResult = ds.uploadResult

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden p-8"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.08) 50%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono tracking-widest uppercase px-2 py-1 rounded"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              AI GOVERNANCE PLATFORM
            </span>
            <span className="text-xs font-mono" style={{ color: '#334155' }}>v2.0</span>
          </div>
          <h1 className="text-4xl font-bold text-white font-space tracking-tight mb-2">
            Fair<span style={{ color: '#6366f1' }}>Lens</span> AI
          </h1>
          <p className="text-slate-400 text-base max-w-xl leading-relaxed">
            Detect, explain, and correct bias in machine learning models. Built for compliance with
            <span style={{ color: '#a5b4fc' }}> EU AI Act</span>,
            <span style={{ color: '#06b6d4' }}> GDPR</span>, and
            <span style={{ color: '#8b5cf6' }}> Google Responsible AI</span> standards.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => onNavigate('analyze')}
              className="btn-primary px-5 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2">
              {hasDataset ? <><CheckCircle size={14} /> Dataset Loaded</> : <><Database size={14} /> Get Started</>}
            </button>
            <button onClick={() => onNavigate('bias')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={14} /> Detect Bias
            </button>
          </div>
        </div>
      </div>

      {/* Live dataset status */}
      {hasDataset && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Rows',               value: uploadResult.rows.toLocaleString(),          color: '#06b6d4' },
            { label: 'Columns',            value: uploadResult.columns.length,                 color: '#8b5cf6' },
            { label: 'Sensitive Attrs',    value: uploadResult.detected_sensitive.length,      color: '#f59e0b' },
            { label: 'Missing Values',     value: Object.values(uploadResult.missing_values).reduce((a,b) => a + b, 0), color: '#f43f5e' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <div className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: '#475569' }}>{label}</div>
              <div className="text-2xl font-bold font-space" style={{ color, textShadow: `0 0 15px ${color}50` }}>{value}</div>
              <div className="text-xs font-mono mt-1" style={{ color: '#334155' }}>
                {ds.fileName || 'dataset.csv'}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Workflow steps */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#475569' }}>Workflow</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.3), transparent)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <button key={step.id} onClick={() => onNavigate(step.id)}
                className="text-left p-4 rounded-xl transition-all group relative overflow-hidden"
                style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid rgba(99,102,241,0.12)` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = step.color + '50'; e.currentTarget.style.background = `${step.color}08` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: step.color }}>{step.num}</span>
                      <span className="text-sm font-semibold text-white font-space">{step.label}</span>
                    </div>
                    <p className="text-xs font-mono mt-1 leading-relaxed" style={{ color: '#475569' }}>{step.desc}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: '#334155' }} className="flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Regulations + Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold text-white font-space">Regulatory Coverage</span>
          </div>
          <div className="space-y-2">
            {REGULATIONS.map(r => (
              <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ background: `${r.color}0d`, border: `1px solid ${r.color}25` }}>
                <span className="text-base">{r.icon}</span>
                <span className="text-sm font-mono text-white">{r.name}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: r.color }} />
                  <span className="text-xs font-mono" style={{ color: r.color }}>COVERED</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <span className="text-sm font-semibold text-white font-space">Platform Capabilities</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Fairness Metrics',    value: '5+',  desc: 'DI, DP, EO, EOdds, Predictive Parity', color: '#06b6d4' },
              { label: 'Correction Methods',  value: '3',   desc: 'Reweighing · SMOTE · Feature Removal',  color: '#10b981' },
              { label: 'Explainability',      value: 'SHAP',desc: 'Global + local feature attribution',    color: '#8b5cf6' },
              { label: 'AI Explanation',      value: 'Gemini', desc: 'Natural language bias analysis',     color: '#f59e0b' },
            ].map(({ label, value, desc, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 text-center font-bold font-space text-sm" style={{ color }}>{value}</div>
                <div>
                  <div className="text-xs font-semibold text-white">{label}</div>
                  <div className="text-xs font-mono" style={{ color: '#334155' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
