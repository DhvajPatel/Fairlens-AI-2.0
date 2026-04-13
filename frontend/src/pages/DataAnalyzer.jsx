import { useState, useRef, useEffect } from 'react'
import api from '../api'
import { Upload, Database, AlertCircle, Cpu, CheckCircle, Layers, ChevronRight, Box } from 'lucide-react'
import Card from '../components/Card'
import { getDatasetState, setDatasetState, subscribeDatasetStore } from '../store/datasetStore'

const SAMPLE_META = {
  adult_income:       { color: '#06b6d4', icon: '💼', tag: 'Gender · Race Bias' },
  loan_approval:      { color: '#10b981', icon: '🏦', tag: 'Gender Bias' },
  compas_recidivism:  { color: '#f59e0b', icon: '⚖️', tag: 'Racial Bias' },
}

// Hardcoded — no API needed, always visible
const MODEL_CARDS = [
  {
    id:    'fair_loan_model',
    icon:  '✅',
    title: 'Fair Loan Model',
    desc:  'Gender removed from training — balanced classes',
    tag:   'Unbiased · DI ~0.9+',
    color: '#10b981',
    hint:  'Use with Loan Approval dataset',
  },
  {
    id:    'biased_loan_model',
    icon:  '⚠️',
    title: 'Biased Loan Model',
    desc:  'Gender heavily weighted in decisions',
    tag:   'Biased · DI ~0.5',
    color: '#f59e0b',
    hint:  'Use with Loan Approval dataset',
  },
]

export default function DataAnalyzer() {
  const [result,    setResult]    = useState(getDatasetState().uploadResult)
  const [fileName,  setFileName]  = useState(getDatasetState().fileName)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [dragging,  setDragging]  = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [samples,   setSamples]   = useState([])
  const [loadingId, setLoadingId] = useState(null)
  const inputRef = useRef()

  // Model upload state
  const [modelResult,    setModelResult]    = useState(null)
  const [modelLoading,   setModelLoading]   = useState(false)
  const [modelError,     setModelError]     = useState(null)
  const [modelDragging,  setModelDragging]  = useState(false)
  const [loadingModelId, setLoadingModelId] = useState(null)
  const modelInputRef = useRef()

  useEffect(() => {
    return subscribeDatasetStore(s => {
      setResult(s.uploadResult)
      setFileName(s.fileName)
    })
  }, [])

  useEffect(() => {
    api.get('/api/analyze/samples').then(r => setSamples(r.data)).catch(() => {})
  }, [])

  async function handleFile(file) {
    if (!file) return
    setLoading(true); setError(null); setProgress(0)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/api/analyze/upload', form, {
        onUploadProgress: e => setProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      })
      setResult(data)
      setFileName(file.name)
      setDatasetState({ uploadResult: data, fileName: file.name })
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false); setProgress(0)
    }
  }

  async function loadSample(id) {
    setLoadingId(id); setError(null)
    try {
      const { data } = await api.post(`/api/analyze/load-sample/${id}`)
      setResult(data)
      setFileName(data.filename)
      setDatasetState({ uploadResult: data, fileName: data.filename })
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load sample')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleModelFile(file) {
    if (!file) return
    setModelLoading(true); setModelError(null); setModelResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/api/analyze/upload-model', form)
      setModelResult(data)
    } catch (e) {
      setModelError(e.response?.data?.detail || 'Model upload failed')
    } finally {
      setModelLoading(false)
    }
  }

  async function loadSampleModel(id) {
    setLoadingModelId(id); setModelError(null); setModelResult(null)
    try {
      const { data } = await api.post(`/api/analyze/load-sample-model/${id}`)
      setModelResult(data)
    } catch (e) {
      setModelError(e.response?.data?.detail || 'Failed to load sample model')
    } finally {
      setLoadingModelId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#06b6d4' }}>Module 01</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #06b6d4, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space tracking-tight">Smart Data Analyzer</h1>
          <p className="text-slate-500 text-sm mt-1">Upload your dataset or try a sample to detect sensitive attributes and data imbalances</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}>
          <Cpu size={12} /> CSV PARSER
        </div>
      </div>

      {/* Sample datasets */}
      {samples.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={13} style={{ color: '#475569' }} />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#475569' }}>Quick Start — Sample Datasets</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {samples.map(s => {
              const meta = SAMPLE_META[s.id] || { color: '#6366f1', icon: '📊', tag: '' }
              const isLoading = loadingId === s.id
              const isLoaded  = fileName === `${s.id}.csv` || (result && fileName?.includes(s.id))
              return (
                <button key={s.id} onClick={() => loadSample(s.id)} disabled={isLoading}
                  className="text-left p-4 rounded-xl transition-all group"
                  style={{
                    background: isLoaded ? `${meta.color}12` : 'rgba(15,23,42,0.6)',
                    border: `1px solid ${isLoaded ? meta.color + '50' : 'rgba(99,102,241,0.15)'}`,
                  }}
                  onMouseEnter={e => { if (!isLoaded) { e.currentTarget.style.borderColor = meta.color + '40'; e.currentTarget.style.background = `${meta.color}08` }}}
                  onMouseLeave={e => { if (!isLoaded) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)' }}}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-white capitalize">{s.id.replace(/_/g, ' ')}</span>
                        {isLoaded && <CheckCircle size={11} style={{ color: meta.color }} />}
                      </div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>{s.description.split('—')[1]?.trim()}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                          {meta.tag}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={13} style={{ color: '#334155' }} className="mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  {isLoading && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-mono" style={{ color: meta.color }}>
                      <div className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: meta.color, borderTopColor: 'transparent' }} />
                      Loading...
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current.click()}
        className="relative rounded-xl p-10 text-center cursor-pointer transition-all overflow-hidden"
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : result ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)'}`,
          background: dragging ? 'rgba(99,102,241,0.08)' : result ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.5)',
          boxShadow: dragging ? '0 0 30px rgba(99,102,241,0.2)' : result ? '0 0 20px rgba(16,185,129,0.1)' : 'none',
        }}>
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 rounded-tl" style={{ borderColor: result ? '#10b981' : '#6366f1' }} />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 rounded-tr" style={{ borderColor: result ? '#10b981' : '#6366f1' }} />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 rounded-bl" style={{ borderColor: result ? '#10b981' : '#6366f1' }} />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 rounded-br" style={{ borderColor: result ? '#10b981' : '#6366f1' }} />

        {result ? (
          <>
            <CheckCircle className="mx-auto mb-2 float-anim" size={36} style={{ color: '#10b981' }} />
            <p className="text-white font-medium font-space">{fileName}</p>
            <p className="text-sm mt-1 font-mono" style={{ color: '#10b981' }}>
              {result.rows.toLocaleString()} rows · {result.columns.length} columns — Click to replace
            </p>
          </>
        ) : (
          <>
            <div className="float-anim inline-block mb-3">
              <Upload size={36} style={{ color: dragging ? '#6366f1' : '#475569' }} />
            </div>
            <p className="text-white font-medium font-space">Drop CSV file here or click to browse</p>
            <p className="text-slate-600 text-sm mt-1 font-mono">[ .csv format supported ]</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Upload progress */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm font-mono" style={{ color: '#6366f1' }}>
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
            <span>ANALYZING DATASET<span className="blink">_</span></span>
            <span className="ml-auto">{progress}%</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #06b6d4)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Model Upload Section ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Box size={13} style={{ color: '#8b5cf6' }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#475569' }}>
            Quick Start — Sample Models (Biased vs Unbiased)
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.3), transparent)' }} />
        </div>

        {/* Hardcoded model cards — always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {MODEL_CARDS.map(m => {
            const isLoading = loadingModelId === m.id
            const isLoaded  = modelResult?.filename === `${m.id}.pkl`
            return (
              <button key={m.id} onClick={() => loadSampleModel(m.id)} disabled={isLoading}
                className="text-left p-4 rounded-xl transition-all group"
                style={{
                  background: isLoaded ? `${m.color}12` : 'rgba(15,23,42,0.6)',
                  border: `1px solid ${isLoaded ? m.color + '50' : 'rgba(139,92,246,0.15)'}`,
                }}
                onMouseEnter={e => { if (!isLoaded) { e.currentTarget.style.borderColor = m.color + '40'; e.currentTarget.style.background = `${m.color}08` }}}
                onMouseLeave={e => { if (!isLoaded) { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)' }}}>
                <div className="flex items-start gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-white">{m.title}</span>
                      {isLoaded && <CheckCircle size={11} style={{ color: m.color }} />}
                    </div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>{m.desc}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>
                        {m.tag}
                      </span>
                      <span className="text-xs font-mono" style={{ color: '#334155' }}>{m.hint}</span>
                    </div>
                  </div>
                  <ChevronRight size={13} style={{ color: '#334155' }} className="mt-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </div>
                {isLoading && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono" style={{ color: m.color }}>
                    <div className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: m.color, borderTopColor: 'transparent' }} />
                    Loading model...
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-xs font-mono mb-3" style={{ color: '#334155' }}>
          ◈ Or upload your own <span style={{ color: '#8b5cf6' }}>.pkl / .joblib</span> model below
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setModelDragging(true) }}
          onDragLeave={() => setModelDragging(false)}
          onDrop={e => { e.preventDefault(); setModelDragging(false); handleModelFile(e.dataTransfer.files[0]) }}
          onClick={() => modelInputRef.current.click()}
          className="relative rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${modelDragging ? '#8b5cf6' : modelResult ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.25)'}`,
            background: modelDragging ? 'rgba(139,92,246,0.08)' : modelResult ? 'rgba(139,92,246,0.05)' : 'rgba(15,23,42,0.4)',
          }}>
          {modelResult ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle size={20} style={{ color: '#8b5cf6' }} />
              <div className="text-left">
                <p className="text-white font-medium text-sm font-space">{modelResult.filename}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: '#8b5cf6' }}>
                  {modelResult.model_type} · {modelResult.n_features ? `${modelResult.n_features} features` : 'features auto-detected'} · Click to replace
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Box size={24} style={{ color: modelDragging ? '#8b5cf6' : '#475569' }} />
              <div className="text-left">
                <p className="text-white text-sm font-medium font-space">Drop your trained model here</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>
                  sklearn .pkl / .joblib — bias will be measured on your model instead of training a new one
                </p>
              </div>
            </div>
          )}
          <input ref={modelInputRef} type="file" accept=".pkl,.joblib,.pickle" className="hidden"
            onChange={e => handleModelFile(e.target.files[0])} />
        </div>

        {modelLoading && (
          <div className="flex items-center gap-2 mt-2 text-xs font-mono" style={{ color: '#8b5cf6' }}>
            <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
            Loading model...
          </div>
        )}
        {modelError && (
          <div className="flex items-center gap-2 rounded-lg p-3 text-sm font-mono mt-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <AlertCircle size={14} /> {modelError}
          </div>
        )}
        {modelResult && (
          <div className="mt-2 p-3 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
            ✓ {modelResult.message}
          </div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Rows',         value: result.rows.toLocaleString(), color: '#06b6d4' },
            { label: 'Columns',            value: result.columns.length,        color: '#8b5cf6' },
            { label: 'Sensitive Detected', value: result.detected_sensitive.length, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: '#475569' }}>{label}</div>
              <div className="text-3xl font-bold font-space" style={{ color, textShadow: `0 0 20px ${color}60` }}>{value}</div>
            </Card>
          ))}

          {result.detected_sensitive.length > 0 && (
            <Card className="md:col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                <span className="font-semibold text-white text-sm font-space">Detected Sensitive Attributes</span>
                <div className="ml-auto text-xs font-mono" style={{ color: '#475569' }}>AUTO-DETECTED</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.detected_sensitive.map(col => (
                  <span key={col} className="px-3 py-1 rounded-full text-sm font-mono font-medium"
                    style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24', boxShadow: '0 0 10px rgba(245,158,11,0.2)' }}>
                    ⚠ {col}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card className="md:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <Database size={14} style={{ color: '#6366f1' }} />
              <span className="font-semibold text-white text-sm font-space">Column Intelligence</span>
              <div className="ml-auto text-xs font-mono" style={{ color: '#334155' }}>{result.columns.length} FIELDS</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-mono uppercase tracking-wider" style={{ color: '#334155', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                    <th className="text-left py-2 pr-4">Column</th>
                    <th className="text-left py-2 pr-4">Missing</th>
                    <th className="text-left py-2">Sample Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {result.columns.map(col => (
                    <tr key={col} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-2 pr-4 font-medium font-mono text-xs" style={{
                        color: result.detected_sensitive.includes(col) ? '#fbbf24' : '#e2e8f0'
                      }}>
                        {result.detected_sensitive.includes(col) ? '⚠ ' : ''}{col}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs" style={{ color: result.missing_values[col] > 0 ? '#f87171' : '#475569' }}>
                        {result.missing_values[col] || 0}
                      </td>
                      <td className="py-2 text-xs font-mono truncate max-w-xs" style={{ color: '#475569' }}>
                        {typeof result.stats[col] === 'object'
                          ? Object.entries(result.stats[col]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(' · ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
