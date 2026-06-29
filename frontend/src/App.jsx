import React, { useState } from 'react'
import { useProductSearch } from './useProductSearch'
import ProductCard from './components/ProductCard'
import NLGBox from './components/NLGBox'

// Importa tus logos así en tu proyecto:
// import LogoFalabella from './assets/fotos/Falabella.png'
// import LogoML       from './assets/fotos/MercadoLibre.png'

export default function App() {
  const [query, setQuery] = useState('')
  const { resultados, cargando, error, buscar } = useProductSearch()

  function handleBuscar() { buscar(query) }
  function handleKey(e)   { if (e.key === 'Enter') handleBuscar() }

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logoRow}>
            {/* Reemplaza los src con tus imports reales */}
            <img src="/fotos/Falabella.png"    alt="Falabella"    style={s.logoFal} />
            <span style={s.logoDivider}>vs</span>
            <img src="/fotos/MercadoLibre.png" alt="MercadoLibre" style={s.logoML}  />
          </div>
          <p style={s.subtitle}>Compara productos con búsqueda semántica e inteligencia artificial</p>
        </div>
      </header>

      {/* ── SEARCH ── */}
      <main style={s.main}>
        <div style={s.searchCard}>
          <div style={s.searchRow}>
            <div style={s.inputWrapper}>
              <span style={s.searchIcon}>🔍</span>
              <input
                style={s.input}
                type="text"
                placeholder="¿Qué producto estás buscando?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
            <button style={s.btn(cargando)} onClick={handleBuscar} disabled={cargando}>
              {cargando ? 'Buscando...' : 'Comparar'}
            </button>
          </div>
          <p style={s.hint}>Ej: audífonos bluetooth, televisor 55 pulgadas, cafetera automática</p>
        </div>

        {/* ── ESTADOS ── */}
        {cargando && (
          <div style={s.stateBox}>
            <div style={s.spinner} />
            <p style={s.stateText}>Analizando reseñas y generando resumen con IA…</p>
          </div>
        )}
        {error && (
          <div style={{ ...s.stateBox, borderColor: '#fca5a5' }}>
            <p style={{ ...s.stateText, color: '#dc2626' }}>⚠️ {error}</p>
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {resultados && !cargando && (
          <>
            {/* Columnas lado a lado */}
            <div style={s.columns}>
              {/* Falabella */}
              <div style={s.column}>
                <div style={s.colHeader}>
                  <img src="/fotos/Falabella.png" alt="Falabella" style={s.colLogo} />
                  <span style={s.colCount}>{resultados.falabella.length} resultados</span>
                </div>
                <div style={s.cardList}>
                  {resultados.falabella.map((p, i) => (
                    <ProductCard key={i} producto={p} fuente="falabella" />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={s.colDivider} />

              {/* MercadoLibre */}
              <div style={s.column}>
                <div style={s.colHeader}>
                  <img src="/fotos/MercadoLibre.png" alt="MercadoLibre" style={s.colLogo} />
                  <span style={s.colCount}>{resultados.mercadolibre.length} resultados</span>
                </div>
                <div style={s.cardList}>
                  {resultados.mercadolibre.map((p, i) => (
                    <ProductCard key={i} producto={p} fuente="mercadolibre" />
                  ))}
                </div>
              </div>
            </div>

            {/* ── RESUMEN IA ── */}
            <div style={s.nlgSection}>
              <div style={s.nlgHeader}>
                <span style={s.nlgIcon}>✨</span>
                <span style={s.nlgTitle}>Resumen generado por IA</span>
                <div style={s.nlgLine} />
              </div>
              <div style={s.nlgGrid}>
                <NLGBox nlg={resultados.nlg_fal} fuente="falabella"    />
                <NLGBox nlg={resultados.nlg_ml}  fuente="mercadolibre" />
              </div>
            </div>
          </>
        )}
      </main>

      <footer style={s.footer}>
        Búsqueda semántica con FAISS · Resúmenes con LLaMA 3.3 · Datos de Falabella y MercadoLibre Perú
      </footer>
    </div>
  )
}

/* ── ESTILOS ── */
const s = {
  page: {
    minHeight: '100vh',
    background: '#F7F7F5',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1a1a1a',
  },

  // Header
  header: {
    background: '#fff',
    borderBottom: '1px solid #E8E8E6',
    padding: '1.5rem 2rem',
  },
  headerInner: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  logoFal: {
    height: 36,
    objectFit: 'contain',
  },
  logoDivider: {
    fontSize: 13,
    fontWeight: 600,
    color: '#aaa',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  logoML: {
    height: 48,
    objectFit: 'contain',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    margin: 0,
    textAlign: 'center',
  },

  // Search
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  searchCard: {
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 16,
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  searchRow: {
    display: 'flex',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    fontSize: 15,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    fontSize: 14,
    border: '1px solid #E8E8E6',
    borderRadius: 10,
    outline: 'none',
    background: '#FAFAF8',
    color: '#1a1a1a',
    boxSizing: 'border-box',
  },
  btn: (disabled) => ({
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    background: disabled ? '#ccc' : '#1a1a1a',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  }),
  hint: {
    fontSize: 12,
    color: '#aaa',
    margin: 0,
  },

  // Estado
  stateBox: {
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 12,
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #E8E8E6',
    borderTop: '3px solid #1a1a1a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  stateText: {
    fontSize: 14,
    color: '#888',
    margin: 0,
  },

  // Columnas
  columns: {
    display: 'flex',
    gap: 0,
    alignItems: 'flex-start',
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  column: {
    flex: 1,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottom: '1px solid #F0F0EE',
  },
  colLogo: {
    height: 24,
    objectFit: 'contain',
  },
  colCount: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: 500,
  },
  colDivider: {
    width: 1,
    alignSelf: 'stretch',
    background: '#E8E8E6',
    flexShrink: 0,
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  // NLG
  nlgSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  nlgHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  nlgIcon: { fontSize: 16 },
  nlgTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    whiteSpace: 'nowrap',
  },
  nlgLine: {
    flex: 1,
    height: 1,
    background: '#E8E8E6',
  },
  nlgGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#bbb',
    padding: '2rem',
    borderTop: '1px solid #E8E8E6',
  },
}