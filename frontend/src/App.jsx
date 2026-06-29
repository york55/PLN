import React, { useState } from 'react'
import { useProductSearch } from './useProductSearch'
import ProductCard from './components/ProductCard'
import NLGBox from './components/NLGBox'

const s = {
  titulo:     { fontSize: 22, fontWeight: 500, marginBottom: '1.5rem' },
  searchRow:  { display: 'flex', gap: 8, marginBottom: '1.5rem' },
  input:      { flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #d4d4d0', borderRadius: 8, outline: 'none' },
  btn:        { padding: '8px 20px', fontSize: 14, border: '1px solid #d4d4d0', borderRadius: 8, background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  label:      { fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.25rem 0 10px' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 },
  nlgSection: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 },
  spinner:    { textAlign: 'center', color: '#888', padding: '2rem 0', fontSize: 14 },
  error:      { textAlign: 'center', color: '#dc2626', padding: '2rem 0', fontSize: 14 },
}

export default function App() {
  const [query, setQuery]       = useState('')
  const { resultados, cargando, error, buscar } = useProductSearch()

  function handleBuscar() { buscar(query) }
  function handleKey(e)   { if (e.key === 'Enter') handleBuscar() }

  return (
    <div>
      <h1 style={s.titulo}>Buscador de productos</h1>

      <div style={s.searchRow}>
        <input
          style={s.input}
          type="text"
          placeholder="Ej: audífonos bluetooth, televisor 55 pulgadas..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        <button style={s.btn} onClick={handleBuscar} disabled={cargando}>
          {cargando ? 'Buscando...' : '🔍 Buscar'}
        </button>
      </div>

      {cargando && <p style={s.spinner}>Buscando y generando resumen con IA...</p>}
      {error    && <p style={s.error}>Error: {error}</p>}

      {resultados && (
        <>
          <p style={s.label}>🏪 Falabella</p>
          <div style={s.grid}>
            {resultados.falabella.map((p, i) => (
              <ProductCard key={i} producto={p} fuente="falabella" />
            ))}
          </div>

          <p style={s.label}>🛒 MercadoLibre</p>
          <div style={s.grid}>
            {resultados.mercadolibre.map((p, i) => (
              <ProductCard key={i} producto={p} fuente="mercadolibre" />
            ))}
          </div>

          <p style={s.label}>✨ Resumen generado por IA</p>
          <div style={s.nlgSection}>
            <NLGBox nlg={resultados.nlg_fal} fuente="falabella"    />
            <NLGBox nlg={resultados.nlg_ml}  fuente="mercadolibre" />
          </div>
        </>
      )}
    </div>
  )
}
