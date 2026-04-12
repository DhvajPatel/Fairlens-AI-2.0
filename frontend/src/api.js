import axios from 'axios'

// Production (Vercel) → points to HuggingFace backend
// Development → Vite proxy handles /api → localhost:8000
const baseURL = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL })

export default api
