import { useState, useEffect } from 'react'
import api from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, LineChart, Line, ReferenceLine } from 'recharts'
import { AlertTriangle, Zap, AlertCircle } from 'lucide-react'
import Card from '../components/Card'
import SeverityBadge from '../components/SeverityBadge'
import { getDatasetState, subscribeDatasetStore } from '../store/datasetStore'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono"
      style={{ background: '#0a0f1e', border: '1px solid rgba(99,102,241,0.4)', color: '#e2e8f0' }}>
      <div style={{ color: '#6366f1' }}>{label}</div>
      <div>{payload[0].value}{payload[0].unit || ''}</div>
    </div>
  )
}

function ConfusionMatrix({ cm }) {
  if (!cm?.matrix || cm.matrix.length !== 2) return null
  const [[tn, fp], [fn, tp]] = cm.matrix
  const total = tn + fp + fn + tp
  const cells = [
    { label: 'True Negative',  value: tn, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'False Positive', value: fp, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
    { label: 'False Negative', value: fn, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'True Positive',  value: tp, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  ]
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {cells.map(c => (
          <div key={c.label} className="p-3 rounded-lg text-center"
            style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-xl font-bold font-space" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>{c.label}</div>
            <div className="text-xs font-mono" style={{ color: '#334155' }}>{((c.value / total) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Precision', value: cm.precision },
          { label: 'Recall',    value: cm.recall },
          { label: 'F1 Score',  value: cm.f1_score },
        ].map(m => (
          <div key={m.label} className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="text-sm font-bold font-space" style={{ color: '#a5b4fc' }}>{m.value?.toFixed(3)}</div>
            <div className="text-xs font-mono" style={{ color: '#475569' }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ColSelect({ label, value, onChange, columns, highlight }) {
  return (
    <div>
      <label className="text-xs font-mono uppercase tracking-widest block mb-1.5" style={{ color: '#475569' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none transition-all appearance-none cursor-pointer"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: `1px solid ${highlight ? 'rgba(245,158,11,0.5)' : 'rgba(99,102,241,0.2)'}`,
          boxShadow: highlight ? '0 0 8px rgba(245,158,11,0.15)' : 'none',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
        onBlur={e => e.target.style.borderColor = highlight ? 'rgba(245,158,11,0.5)' : 'rgba(99,102,241,0.2)'}>
        <option value="" style={{ background: '#0f172a' }}>— select column —</option>
        {columns.map(col => (
          <option key={col} value={col} style={{ background: '#0f172a' }}>{col}</option>
        ))}
      </select>
    </div>
  )
}

function LabelSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-mono uppercase tracking-widest block mb-1.5" style={{ color: '#475569' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none transition-all appearance-none cursor-pointer"
        style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}
        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}>
        {options.map(o => (
          <option key={o} value={o} style={{ background: '#0f172a' }}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export default function BiasDetection() {
  const [columns,   setColumns]   = useState([])
  const [posLabels, setPosLabels] = useState(['1', '0'])
  const [target,    setTarget]    = useState('')
  const [sensitive, setSensitive] = useState('')
  const [posLabel,  setPosLabel]  = useState('1')
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [noDataset, setNoDataset] = useState(false)

  function loadFromStore(s) {
    const res = s.uploadResult
    if (!res) { setNoDataset(true); return }
    setNoDataset(false)
    setColumns(res.columns || [])

    // Auto-select target: last column or one with binary values
    const cols = res.columns || []
    const autoTarget = cols[cols.length - 1] || ''
    setTarget(prev => prev && cols.includes(prev) ? prev : autoTarget)

    // Auto-select sensitive: first detected sensitive attr
    const sens = res.detected_sensitive?.[0] || cols[0] || ''
    setSensitive(prev => prev && cols.includes(prev) ? prev : sens)

    // Build positive label options from target column stats
    if (autoTarget && res.stats?.[autoTarget]) {
      const vals = Object.keys(res.stats[autoTarget]).map(String)
      setPosLabels(vals.length ? vals : ['1', '0'])
      setPosLabel(vals[0] || '1')
    }
  }

  useEffect(() => {
    loadFromStore(getDatasetState())
    return subscribeDatasetStore(loadFromStore)
  }, [])

  // When target changes, update positive label options
  useEffect(() => {
    const res = getDatasetState().uploadResult
    if (!res || !target) return
    const stats = res.stats?.[target]
    if (stats && typeof stats === 'object') {
      const vals = Object.keys(stats).map(String)
      if (vals.length) {
        setPosLabels(vals)
        setPosLabel(vals[0])
      }
    }
  }, [target])

  async function run() {
    if (!target || !sensitive) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/api/bias/detect', {
        target_column: target, sensitive_column: sensitive, positive_label: posLabel,
      })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Detection failed.')
    } finally {
      setLoading(false)
    }
  }

  const approvalData = result ? Object.entries(result.approval_rates).map(([group, rate]) => ({ group, rate })) : []
  const featureData  = result?.feature_importance?.map(f => ({ feature: f.feature, value: +(f.importance * 100).toFixed(2) })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#f59e0b' }}>Module 02</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">Bias Detection Engine</h1>
          <p className="text-slate-500 text-sm mt-1">Measure fairness metrics across demographic groups</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
          <Zap size={12} /> FAIRNESS ENGINE
        </div>
      </div>

      {/* No dataset warning */}
      {noDataset && (
        <div className="flex items-center gap-3 p-4 rounded-xl font-mono text-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
          <AlertCircle size={18} />
          <span>No dataset loaded — go to <strong>Data Analyzer</strong> and upload a CSV first.</span>
        </div>
      )}

      <Card>
        {columns.length > 0 ? (
          <>
            {/* Dataset info pill */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              <span className="text-xs font-mono" style={{ color: '#10b981' }}>
                Dataset loaded — {columns.length} columns available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColSelect
                label="Target Column (what to predict)"
                value={target}
                onChange={setTarget}
                columns={columns}
                highlight={false}
              />
              <ColSelect
                label="Sensitive Attribute (fairness check)"
                value={sensitive}
                onChange={setSensitive}
                columns={columns}
                highlight={true}
              />
              <LabelSelect
                label="Positive Label (approved / yes)"
                value={posLabel}
                onChange={setPosLabel}
                options={posLabels}
              />
            </div>

            {/* Selected summary */}
            {target && sensitive && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                  target: <strong>{target}</strong>
                </span>
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                  sensitive: <strong>{sensitive}</strong>
                </span>
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                  positive label: <strong>{posLabel}</strong>
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm font-mono text-center py-4" style={{ color: '#475569' }}>
            Upload a dataset in Data Analyzer to populate column options<span className="blink">_</span>
          </div>
        )}

        <button onClick={run} disabled={loading || !target || !sensitive}
          className="mt-4 btn-primary px-6 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Zap size={14} />
          {loading ? <><span>ANALYZING</span><span className="blink">_</span></> : 'RUN BIAS DETECTION'}
        </button>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {result && (
        <>
          {/* Primary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Model Accuracy',       value: `${result.accuracy}%`,                color: '#06b6d4' },
              { label: 'Disparate Impact',     value: result.disparate_impact,              color: result.disparate_impact < 0.8 ? '#f43f5e' : '#10b981' },
              { label: 'Demographic Parity Δ', value: `${result.demographic_parity_diff}%`, color: result.demographic_parity_diff > 15 ? '#f43f5e' : '#10b981' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#475569' }}>{label}</div>
                <div className="text-2xl font-bold font-space" style={{ color, textShadow: `0 0 15px ${color}60` }}>{value}</div>
              </Card>
            ))}
            <Card>
              <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Bias Severity</div>
              <div className="mt-1"><SeverityBadge level={result.severity} /></div>
            </Card>
          </div>

          {/* Extended fairness metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Equal Opportunity Δ', value: result.equal_opportunity_diff,                       color: result.equal_opportunity_diff > 0.1 ? '#f59e0b' : '#10b981' },
              { label: 'Equalized Odds Δ',    value: result.equalized_odds_diff,                          color: result.equalized_odds_diff > 0.2 ? '#f43f5e' : '#10b981' },
              { label: 'ROC AUC',             value: result.roc_curve?.auc ?? '—',                        color: '#8b5cf6' },
              { label: 'F1 Score',            value: result.confusion_matrix?.f1_score?.toFixed(3) ?? '—', color: '#06b6d4' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#475569' }}>{label}</div>
                <div className="text-2xl font-bold font-space" style={{ color, textShadow: `0 0 15px ${color}60` }}>{value}</div>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="text-sm font-semibold text-white font-space mb-4">
                Approval Rate by <span style={{ color: '#fbbf24' }}>{sensitive}</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={approvalData}>
                  <XAxis dataKey="group" stroke="#334155" tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rate" radius={[4,4,0,0]}>
                    {approvalData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#6366f1' : '#f43f5e'}
                        style={{ filter: `drop-shadow(0 0 6px ${i === 0 ? '#6366f1' : '#f43f5e'})` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-white font-space mb-4">Feature Influence on Decision</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={featureData} layout="vertical">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} unit="%" />
                  <YAxis dataKey="feature" type="category" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0,4,4,0]} fill="url(#barGrad)">
                    <LabelList dataKey="value" position="right"
                      style={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      formatter={v => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Confusion Matrix + ROC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.confusion_matrix && (
              <Card>
                <div className="text-sm font-semibold text-white font-space mb-4">Confusion Matrix</div>
                <ConfusionMatrix cm={result.confusion_matrix} />
              </Card>
            )}
            {result.roc_curve && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-white font-space">ROC Curve</div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                    AUC = {result.roc_curve.auc}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={result.roc_curve.fpr.map((fpr, i) => ({ fpr, tpr: result.roc_curve.tpr[i] }))}>
                    <XAxis dataKey="fpr" stroke="#334155" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }} />
                    <YAxis stroke="#334155" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }} />
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="rounded px-2 py-1 text-xs font-mono" style={{ background: '#0a0f1e', border: '1px solid rgba(139,92,246,0.4)', color: '#e2e8f0' }}>
                        FPR: {payload[0]?.payload?.fpr?.toFixed(3)} · TPR: {payload[0]?.payload?.tpr?.toFixed(3)}
                      </div>
                    ) : null} />
                    <Line type="monotone" dataKey="tpr" stroke="#8b5cf6" strokeWidth={2} dot={false}
                      style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.6))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
