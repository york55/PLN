import { useState } from 'react'

const API = 'http://localhost:8000'

export function useProductSearch() {
  const [resultados, setResultados] = useState(null)
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState(null)

  async function buscar(query, k = 3) {
    if (!query.trim()) return
    setCargando(true)
    setError(null)
    setResultados(null)

    try {
      const res  = await fetch(`${API}/nlg`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, k }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setResultados(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return { resultados, cargando, error, buscar }
}