import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Activity, Database, Brain, Zap, ArrowRight, TrendingUp, Play, Briefcase, HeartPulse, Landmark } from 'lucide-react'
import api from '../api'
import Card from '../components/Card'
import { getDatasetState, setDatasetState, subscribeDatasetStore } from '../store/datasetStore'

const STEPS = [
  { id: 'analyze', num: '01', label: 'Upload Dataset',    icon: Database,      color: '#06b6d4', desc: 'Load your CSV and detect sensitive attributes' },
  { id: 'bias',    num: '02', label: 'Detect Bias',       icon: AlertTriangle, color: '#f59e0b', desc: 'Measure fairness metrics across demographic groups' },
  { id: 'explain', num: '03', label: 'Explain AI',        icon: Brain,         color: '#8b5cf6', desc: 'Understand decisions with SHAP values' },
  { id: 'fix',     num: '04', label: 'Correct Bias',      icon: Zap,           color: '#10b981', desc: 'Apply reweighing, SMOTE, or feature removal' },
  { id: 'report',  num: '05', label: 'Compliance Report', icon: Shield,        color: '#6366f1', desc: 'Generate PDF aligned with EU AI Act & GDPR' },
  { id: 'monitor', num: '06', label: 'Live Monitor',      icon: Activity,      color: '#f43f5e', desc: 'Track bias drift in real-time' },
]

const REGULATIONS = [
  { name: 'EU AI Act',             icon: '🇪🇺', color: '#6366f1' },
  { name: 'GDPR Article 22',       icon: '🔒', color: '#06b6d4' },
  { name: 'Google Responsible AI', icon: '🌐', color: '#8b5cf6' },
  { name: 'IBM AIF360',            icon: '⚖️', color: '#10b981' },
]

// Real-world impact data — directly maps to problem statement
const REAL_WORLD = [
  {
    icon: Briefcase,
    title: 'Hiring & Employment',
    color: '#6366f1',
    stat: '39%',
    desc: 'of AI hiring tools show gender or racial bias in candidate ranking',
    example: 'Resume screening models trained on historical data reject qualified candidates from minority groups',
  },
  {
    icon: Landmark,
    title: 'Loan & Credit',
    color: '#06b6d4',
    stat: '2.4×',
    desc: 'higher loan rejection rate for minority applicants in biased models',
    example: 'Credit scoring algorithms amplify historical lending discrimination against protected groups',
  },
  {
    icon: HeartPulse,
    title: 'Healthcare',
    color: '#f43f5e',
    stat: '56%',
    desc: 'of medical AI tools perform worse for darker skin tones',
    example: 'Diagnostic models trained on non-diverse data misdiagnose patients from underrepresented groups',
  },
]

export default function Dashboard({ onNavigate }) {
  const [ds,           setDs]           = useState(getDatasetState())
  const [demoLoading,  setDemoLoading]  = useState(false)
  const [demoMsg,      setDemoMsg]      = useState('')

  useEffect(() => {
    return subscribeDatasetStore(s => setDs({ ...s }))
  }, [])

  const hasDataset   = !!ds.uploadResult
  const uploadResult = ds.uploadResult

  // Quick Demo — loads COMPAS sample and navigates to bias detection
  async function runQuickDemo() {
    setDemoLoading(true)
    setDemoMsg('Loading COMPAS recidivism dataset...')
    try {
      const { data } = await api.post('/api/analyze/load-sample/compas_recidivism')
      setDatasetState({ uploadResult: data, fileName: data.filename })
      setDemoMsg('Dataset loaded! Taking you to Bias Detection...')
      setTimeout(() => {
        setDemoLoading(false)
        setDemoMsg('')
        onNavigate('bias')
      }, 1000)
    } catch {
      setDemoMsg('Could not load demo — make sure backend is running.')
      setDemoLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            Detect, explain, and correct bias in machine learning models — before they impact real people.
            Built for compliance with
            <span style={{ color: '#a5b4fc' }}> EU AI Act</span>,
            <span style={{ color: '#06b6d4' }}> GDPR</span>, and
            <span style={{ color: '#8b5cf6' }}> Google Responsible AI</span> standards.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => onNavigate('analyze')}
              className="btn-primary px-5 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2">
              {hasDataset ? <><CheckCircle size={14} /> Dataset Loaded</> : <><Database size={14} /> Upload Dataset</>}
            </button>

            {/* Quick Demo button */}
            <button onClick={runQuickDemo} disabled={demoLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-60"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 15px rgba(16,185,129,0.1)' }}>
              {demoLoading
                ? <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: '#10b981', borderTopColor: 'transparent' }} /> Loading Demo...</>
                : <><Play size={13} /> Quick Demo</>}
            </button>
          </div>

          {demoMsg && (
            <div className="mt-3 text-xs font-mono" style={{ color: '#10b981' }}>
              ◈ {demoMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Real World Impact ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={13} style={{ color: '#f43f5e' }} />
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#475569' }}>Why This Matters — Real World Impact</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.3), transparent)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REAL_WORLD.map(({ icon: Icon, title, color, stat, desc, example }) => (
            <div key={title} className="p-4 rounded-xl relative overflow-hidden"
              style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-sm font-semibold text-white font-space">{title}</span>
              </div>
              <div className="text-3xl font-bold font-space mb-1" style={{ color, textShadow: `0 0 20px ${color}50` }}>
                {stat}
              </div>
              <p className="text-xs font-mono mb-2" style={{ color: '#94a3b8' }}>{desc}</p>
              <p className="text-xs font-mono leading-relaxed p-2 rounded"
                style={{ color: '#475569', background: 'rgba(0,0,0,0.2)', borderLeft: `2px solid ${color}40` }}>
                {example}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs font-mono"
          style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#94a3b8' }}>
          <AlertTriangle size={12} style={{ color: '#f43f5e', flexShrink: 0 }} />
          FairLens AI helps organizations catch and fix these biases <strong style={{ color: '#f87171' }}>before deployment</strong> — not after real people are harmed.
        </div>
      </div>

      {/* ── Live dataset status ───────────────────────────────────────────── */}
      {hasDataset && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Rows',            value: uploadResult.rows.toLocaleString(),                                          color: '#06b6d4' },
            { label: 'Columns',         value: uploadResult.columns.length,                                                 color: '#8b5cf6' },
            { label: 'Sensitive Attrs', value: uploadResult.detected_sensitive.length,                                      color: '#f59e0b' },
            { label: 'Missing Values',  value: Object.values(uploadResult.missing_values).reduce((a, b) => a + b, 0),       color: '#f43f5e' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <div className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: '#475569' }}>{label}</div>
              <div className="text-2xl font-bold font-space" style={{ color, textShadow: `0 0 15px ${color}50` }}>{value}</div>
              <div className="text-xs font-mono mt-1" style={{ color: '#334155' }}>{ds.fileName || 'dataset.csv'}</div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Workflow steps ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#475569' }}>Workflow</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.3), transparent)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <button key={step.id} onClick={() => onNavigate(step.id)}
                className="text-left p-4 rounded-xl transition-all group"
                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.12)' }}
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

      {/* ── Regulations + Capabilities ───────────────────────────────────── */}
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
              { label: 'Fairness Metrics',   value: '5+',    desc: 'DI, DP, EO, EOdds, Predictive Parity', color: '#06b6d4' },
              { label: 'Correction Methods', value: '3',     desc: 'Reweighing · SMOTE · Feature Removal',  color: '#10b981' },
              { label: 'Explainability',     value: 'SHAP',  desc: 'Global + local feature attribution',    color: '#8b5cf6' },
              { label: 'AI Explanation',     value: 'Gemini',desc: 'Natural language bias analysis',        color: '#f59e0b' },
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
