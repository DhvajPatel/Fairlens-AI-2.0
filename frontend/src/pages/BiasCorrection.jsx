import { useState, useEffect } from 'react'
import api from '../api'
import { Wrench, AlertCircle, TrendingUp, CheckCircle, RefreshCw, Download, FileDown } from 'lucide-react'
import Card from '../components/Card'
import { getDatasetState, subscribeDatasetStore } from '../store/datasetStore'

const METHODS = [
  { id: 'reweigh',          label: 'Reweighing',           desc: 'Assign sample weights to balance class distribution',  color: '#6366f1' },
  { id: 'oversample',       label: 'Oversampling (SMOTE)', desc: 'Synthetically generate minority class samples',        color: '#06b6d4' },
  { id: 'remove_sensitive', label: 'Remove Sensitive',     desc: 'Exclude sensitive attribute from model training',      color: '#8b5cf6' },
]

function MetricRow({ label, before, after, unit = '', higherBetter = true }) {
  const improved = higherBetter ? after > before : after < before
  const delta    = after - before
  const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(1)
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
      <span className="text-sm font-mono" style={{ color: '#94a3b8' }}>{label}</span>
      <div className="flex items-center gap-4 text-sm font-mono">
        <span style={{ color: '#475569' }}>{before}{unit}</span>
        <span style={{ color: '#334155' }}>──▶</span>
        <span className="font-semibold" style={{ color: improved ? '#10b981' : '#f43f5e', textShadow: `0 0 10px ${improved ? '#10b98160' : '#f43f5e60'}` }}>
          {after}{unit}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{ background: improved ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: improved ? '#10b981' : '#f43f5e' }}>
          {deltaStr}
        </span>
      </div>
    </div>
  )
}

function DownloadCard({ rowsChanged }) {
  const [downloading, setDownloading] = useState(false)
  const [done,        setDone]        = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const res = await api.get('/api/fix/download', { responseType: 'blob' })
      const cd  = res.headers['content-disposition'] || ''
      const match = cd.match(/filename=(.+)/)
      const filename = match ? match[1] : 'fairlens_corrected.csv'
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
          <FileDown size={18} style={{ color: '#06b6d4' }} />
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold font-space text-sm">Download Corrected Dataset</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>
            CSV with original labels, corrected labels &amp; bias_corrected flag
            {rowsChanged !== undefined && (
              <span className="ml-2 px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                {rowsChanged} rows changed
              </span>
            )}
          </div>
        </div>
        <button onClick={download} disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: done ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.15)',
            border:     done ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(6,182,212,0.4)',
            color:      done ? '#10b981' : '#06b6d4',
            boxShadow:  done ? '0 0 12px rgba(16,185,129,0.2)' : '0 0 12px rgba(6,182,212,0.2)',
          }}>
          {downloading
            ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</>
            : done
              ? <><CheckCircle size={13} /> Downloaded</>
              : <><Download size={13} /> Export CSV</>}
        </button>
      </div>

      {/* Column legend */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { col: `{target}_original`,  desc: 'Original model prediction', color: '#475569' },
          { col: `{target}_corrected`, desc: 'Fair corrected prediction',  color: '#06b6d4' },
          { col: 'bias_corrected',     desc: '1 = decision was changed',   color: '#f59e0b' },
        ].map(({ col, desc, color }) => (
          <div key={col} className="p-2 rounded-lg"
            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <div className="text-xs font-mono font-medium" style={{ color }}>{col}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#334155' }}>{desc}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function BiasCorrection() {
  const [method,     setMethod]     = useState('reweigh')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [modelReady, setModelReady] = useState(false)
  const [checking,   setChecking]   = useState(false)
  const hasDataset = !!getDatasetState().uploadResult

  // Check backend model status
  async function checkStatus() {
    setChecking(true)
    try {
      const { data } = await api.get('/api/fix/status')
      setModelReady(data.model_ready)
      if (data.model_ready) setError(null)
    } catch (_) {
      setModelReady(false)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkStatus()
    // Re-check when dataset changes
    return subscribeDatasetStore(() => checkStatus())
  }, [])

  async function run() {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/api/fix/correct', { method })
      setResult(data)
      setModelReady(true)
    } catch (e) {
      const detail = e.response?.data?.detail || ''
      if (detail === 'NO_MODEL' || detail === 'NO_DATASET') {
        setModelReady(false)
        setError('Run Bias Detection first — the model is not loaded.')
      } else if (detail) {
        setError(`Server error: ${detail}`)
      } else {
        setError('Correction failed — check the backend console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#10b981' }}>Module 04</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #10b981, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">Bias Correction Engine</h1>
          <p className="text-slate-500 text-sm mt-1">Apply fairness techniques and compare before/after metrics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
          <Wrench size={12} /> CORRECTION ENGINE
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl font-mono text-xs"
        style={modelReady
          ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
          : { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
        {modelReady
          ? <><CheckCircle size={14} /> Model ready — bias detection completed</>
          : <><AlertCircle size={14} /> Go to <strong className="mx-1">Bias Detection</strong> and run it first, then come back here</>}
        <button onClick={checkStatus} disabled={checking}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
          title="Refresh status">
          <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
          {checking ? 'checking...' : 'refresh'}
        </button>
      </div>

      <Card>
        <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#475569' }}>Select Correction Method</div>
        <div className="space-y-2">
          {METHODS.map(m => (
            <label key={m.id} className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
              style={{
                border:     `1px solid ${method === m.id ? m.color + '60' : 'rgba(99,102,241,0.15)'}`,
                background: method === m.id ? `${m.color}12` : 'transparent',
                boxShadow:  method === m.id ? `0 0 15px ${m.color}20` : 'none',
              }}>
              <input type="radio" name="method" value={m.id} checked={method === m.id}
                onChange={() => setMethod(m.id)} className="mt-0.5" style={{ accentColor: m.color }} />
              <div>
                <div className="text-white text-sm font-medium font-space">{m.label}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>{m.desc}</div>
              </div>
              {method === m.id && (
                <div className="ml-auto text-xs font-mono px-2 py-0.5 rounded self-start"
                  style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}>
                  SELECTED
                </div>
              )}
            </label>
          ))}
        </div>

        <button onClick={run} disabled={loading || !modelReady}
          className="mt-4 btn-primary px-6 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Wrench size={14} />
          {loading
            ? <><span>APPLYING CORRECTION</span><span className="blink">_</span></>
            : 'APPLY BIAS CORRECTION'}
        </button>
      </Card>

      {error && (
        <div className="rounded-lg p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} /> {error}
          </div>
          {error.includes('Bias Detection') && (
            <div className="text-xs mt-1" style={{ color: '#f43f5e' }}>
              → Go to <strong>Bias Detection</strong> tab, run it, then come back here.
            </div>
          )}
        </div>
      )}

      {result && (
        <Card glow>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: '#10b981' }} />
            <span className="font-semibold text-white font-space">Before vs After Comparison</span>
            <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded capitalize"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              {result.method}
            </span>
          </div>

          <MetricRow label="Accuracy"              before={result.before.accuracy}               after={result.after.accuracy}               unit="%" />
          <MetricRow label="Disparate Impact"      before={result.before.disparate_impact}       after={result.after.disparate_impact} />
          <MetricRow label="Demographic Parity Δ"  before={result.before.demographic_parity_diff} after={result.after.demographic_parity_diff} unit="%" higherBetter={false} />
          <MetricRow label="Fairness Score"        before={result.before.fairness_score}         after={result.after.fairness_score}         unit="%" />

          <div className="mt-4 p-3 rounded-lg text-sm font-mono flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}>
            ✓ Fairness improved: <strong>{result.before.fairness_score}%</strong> → <strong style={{ color: '#10b981' }}>{result.after.fairness_score}%</strong>
          </div>
        </Card>
      )}

      {/* Download corrected dataset */}
      {result && <DownloadCard rowsChanged={result.rows_changed} />}
    </div>
  )
}
