import React, { useState } from 'react'
import { Search, Loader2, AlertCircle, Sparkles, Hash } from 'lucide-react'
import { useProductSearch } from './useProductSearch'
import ProductCard from './components/ProductCard'
import NLGBox from './components/NLGBox'

export default function App() {
  const [query, setQuery] = useState('')
  const [k, setK] = useState(3)
  const { resultados, cargando, error, buscar } = useProductSearch()

  const [resumenFal, setResumenFal] = useState(null)
  const [resumenML, setResumenML] = useState(null)

  const [seleccionFal, setSeleccionFal] = useState(null)
  const [seleccionML, setSeleccionML] = useState(null)

  async function cargarResumen(producto, fuente) {
    try {
      const body =
        fuente === "falabella"
          ? {
            tienda: "falabella",
            product_id: producto.product_id,
          }
          : {
            tienda: "mercadolibre",
            idproducto: producto.idproducto,
          }

      const res = await fetch("http://localhost:8000/resumen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) return

      const data = await res.json()

      if (fuente === "falabella") {
        setResumenFal(data)
      } else {
        setResumenML(data)
      }
    } catch (err) {
      console.error(err)
    }
  }


  function handleBuscar() { buscar(query, k) }
  function handleKey(e) { if (e.key === 'Enter') handleBuscar() }

  return (
    <div style={s.page}>

      {/* ── SIDEBAR ── */}
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.logoRow}>
            <img src="/fotos/Falabella.png" alt="Falabella" style={s.logoFal} />
            <span style={s.logoDivider}>vs</span>
            <img src="/fotos/MercadoLibre.png" alt="MercadoLibre" style={s.logoML} />
          </div>
          <p style={s.subtitle}>Compara productos con búsqueda semántica e inteligencia artificial</p>
        </div>

        <div style={s.searchForm}>
          <label style={s.label}>Producto a buscar</label>
          <div style={s.inputWrapper}>
            <Search size={16} style={s.searchIcon} />
            <input
              style={s.input}
              type="text"
              placeholder="Ej: audífonos bluetooth"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <label style={s.label}>Resultados por tienda</label>
          <div style={s.inputWrapper}>
            <Hash size={16} style={s.searchIcon} />
            <input
              style={s.input}
              type="number"
              min={1}
              max={10}
              value={k}
              onChange={e => setK(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              onKeyDown={handleKey}
            />
          </div>

          <button style={s.btn(cargando)} onClick={handleBuscar} disabled={cargando}>
            {cargando ? <Loader2 size={16} style={s.spinIcon} /> : <Search size={16} />}
            {cargando ? 'Buscando...' : 'Comparar'}
          </button>

          <p style={s.hint}>Se mostrarán {k} resultado{k !== 1 ? 's' : ''} de cada tienda.</p>
        </div>

        <footer style={s.footer}>
          Búsqueda semántica con FAISS<br />
          Resúmenes con LLaMA 3.3<br />
          Datos de Falabella y MercadoLibre Perú
        </footer>
      </aside>

      {/* ── CONTENIDO ── */}
      <main style={s.main}>

        {!resultados && !cargando && !error && (
          <div style={s.empty}>
            <Search size={32} style={{ color: '#ccc' }} />
            <p style={s.emptyText}>Ingresa un producto en la barra lateral para empezar a comparar.</p>
          </div>
        )}

        {cargando && (
          <div style={s.stateBox}>
            <Loader2 size={28} style={s.spinIcon} />
            <p style={s.stateText}>Analizando reseñas y generando resumen con IA…</p>
          </div>
        )}

        {error && (
          <div style={{ ...s.stateBox, borderColor: '#fca5a5' }}>
            <AlertCircle size={22} style={{ color: '#dc2626' }} />
            <p style={{ ...s.stateText, color: '#dc2626' }}>{error}</p>
          </div>
        )}

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
                    <ProductCard
                      key={i}
                      producto={p}
                      fuente="falabella"
                      seleccionado={seleccionFal === p.product_id}
                      onClick={() => {
                        setSeleccionFal(p.product_id)
                        cargarResumen(p, "falabella")
                      }}
                    />
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
                    <ProductCard
                      key={i}
                      producto={p}
                      fuente="mercadolibre"
                      seleccionado={seleccionML === p.idproducto}
                      onClick={() => {
                        setSeleccionML(p.idproducto)
                        cargarResumen(p, "mercadolibre")
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── RESUMEN IA ── */}
            <div style={s.nlgSection}>
              <div style={s.nlgHeader}>
                <Sparkles size={15} style={{ color: '#888' }} />
                <span style={s.nlgTitle}>Resumen generado por IA</span>
                <div style={s.nlgLine} />
              </div>
              <div style={s.nlgGrid}>
                <NLGBox nlg={resumenFal} fuente="falabella" />
                <NLGBox nlg={resumenML} fuente="mercadolibre" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* ── ESTILOS ── */
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#F7F7F5',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1a1a1a',
  },

  // Sidebar
  sidebar: {
    width: 320,
    flexShrink: 0,
    background: '#fff',
    borderRight: '1px solid #E8E8E6',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    overflowY: 'auto',
    zIndex: 10,
  },
  sidebarHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  logoFal: {
    height: 60,
    objectFit: 'contain',
  },
  logoDivider: {
    fontSize: 11,
    fontWeight: 600,
    color: '#aaa',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  logoML: {
    height: 78,
    objectFit: 'contain',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#888',
    margin: 0,
    lineHeight: 1.5,
  },

  // Search form
  searchForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 6,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    color: '#aaa',
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
    marginTop: 10,
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    background: disabled ? '#ccc' : '#1a1a1a',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.15s',
  }),
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },
  hint: {
    fontSize: 11.5,
    color: '#aaa',
    margin: '4px 0 0',
    lineHeight: 1.4,
  },

  footer: {
    marginTop: 'auto',
    fontSize: 10.5,
    color: '#bbb',
    lineHeight: 1.7,
    paddingTop: '1.5rem',
    borderTop: '1px solid #E8E8E6',
  },

  // Main content
  main: {
    flex: 1,
    minWidth: 0,
    marginLeft: 320,
    padding: '2.5rem 3rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: 1500,
  },

  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    minHeight: '60vh',
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    maxWidth: 280,
    textAlign: 'center',
    margin: 0,
  },

  // Estado
  stateBox: {
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 12,
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
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
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid #F0F0EE',
  },
  colLogo: {
    height: 36,
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
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
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
    gap: 14,
  },
}