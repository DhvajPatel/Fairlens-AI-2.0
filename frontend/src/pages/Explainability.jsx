import { useState, useEffect } from 'react'
import api from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Brain, AlertCircle } from 'lucide-react'
import Card from '../components/Card'
import { getDatasetState } from '../store/datasetStore'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono"
      style={{ background: '#0a0f1e', border: '1px solid rgba(99,102,241,0.4)', color: '#e2e8f0' }}>
      <div style={{ color: v >= 0 ? '#10b981' : '#f43f5e' }}>
        {v >= 0 ? '+' : ''}{v.toFixed(4)}
      </div>
      <div style={{ color: '#475569' }}>SHAP contribution</div>
    </div>
  )
}

export default function Explainability() {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const hasDataset = !!getDatasetState().uploadResult

  async function run() {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/api/explain/shap')
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Run bias detection first.')
    } finally {
      setLoading(false)
    }
  }

  const singleData = result?.single_explanation?.map(d => ({ feature: d.feature, value: d.contribution })) || []
  const globalData = result?.global_importance?.map(d => ({ feature: d.feature, value: +(d.shap_value * 100).toFixed(3) })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#8b5cf6' }}>Module 03</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #8b5cf6, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">Explainable AI (XAI)</h1>
          <p className="text-slate-500 text-sm mt-1">Understand why each decision was made using SHAP values</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>
          <Brain size={12} /> SHAP ENGINE
        </div>
      </div>

      <button onClick={run} disabled={loading}
        className="btn-primary px-6 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50">
        <Brain size={14} />
        {loading ? <><span>COMPUTING SHAP</span><span className="blink">_</span></> : 'GENERATE EXPLANATIONS'}
      </button>

      {!hasDataset && (
        <div className="flex items-center gap-3 p-4 rounded-xl font-mono text-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
          <AlertCircle size={18} />
          <span>Upload a dataset and run <strong>Bias Detection</strong> first.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-semibold text-white font-space mb-1">Decision Breakdown — Single Prediction</div>
            <div className="text-xs font-mono mb-4" style={{ color: '#475569' }}>
              BASE VALUE: <span style={{ color: '#6366f1' }}>{result.base_value}</span>
              &nbsp;·&nbsp; <span style={{ color: '#10b981' }}>GREEN = approval</span>
              &nbsp;·&nbsp; <span style={{ color: '#f43f5e' }}>RED = rejection</span>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={singleData} layout="vertical">
                <XAxis type="number" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} />
                <YAxis dataKey="feature" type="category" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {singleData.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? '#10b981' : '#f43f5e'}
                      style={{ filter: `drop-shadow(0 0 5px ${d.value >= 0 ? '#10b981' : '#f43f5e'})` }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Human-readable */}
            <div className="mt-4 space-y-2 pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
              {singleData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono">
                  <span style={{ color: '#94a3b8' }}>{d.feature}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.abs(d.value) * 500, 100)}%`,
                          background: d.value >= 0 ? '#10b981' : '#f43f5e',
                          boxShadow: `0 0 6px ${d.value >= 0 ? '#10b981' : '#f43f5e'}`,
                          marginLeft: d.value < 0 ? 'auto' : 0,
                        }} />
                    </div>
                    <span className="w-14 text-right" style={{ color: d.value >= 0 ? '#10b981' : '#f43f5e' }}>
                      {d.value >= 0 ? '+' : ''}{(d.value * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-white font-space mb-4">Global Feature Importance (SHAP)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={globalData} layout="vertical">
                <XAxis type="number" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} />
                <YAxis dataKey="feature" type="category" stroke="#334155" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0,4,4,0]} style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.6))' }}>
                  {globalData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${250 + i * 8}, 70%, ${65 - i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}
