import React, { useEffect, useState } from 'react'
import { BarChart2, Star, ShoppingBag, MessageSquare, TrendingUp, Tag } from 'lucide-react'

// ── Paleta de marca ───────────────────────────────────────────────
const FAL = { main: '#6abf3a', light: '#F4FBF0', border: '#d0e8c4', dark: '#4a8a22' }
const ML  = { main: '#3d42a8', light: '#F0F1FF', border: '#c8caef', dark: '#2a2e7a' }

// ── Micro-componentes de gráfico ──────────────────────────────────

/** Barras horizontales simples */
function BarrasH({ data, color, max: maxOverride }) {
  const entries = Object.entries(data)
  const max = maxOverride ?? Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([label, val]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#888', width: 70, textAlign: 'right', flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: 10, background: '#F0F0EE', borderRadius: 5, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(val / max) * 100}%`,
                background: color,
                borderRadius: 5,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: '#aaa', width: 42, textAlign: 'left', flexShrink: 0 }}>
            {val.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Barras verticales para distribución de ratings (1-5 estrellas) */
function RatingBars({ ml, falabella }) {
  const stars = ['1', '2', '3', '4', '5']
  const maxVal = Math.max(...stars.flatMap(s => [ml[s] ?? 0, falabella[s] ?? 0]), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, paddingBottom: 24, position: 'relative' }}>
      {stars.map(star => {
        const vML  = ml[star]  ?? 0
        const vFal = falabella[star] ?? 0
        return (
          <div key={star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
              {/* ML */}
              <div style={{ flex: 1, height: `${(vML / maxVal) * 100}%`, background: ML.main, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`ML: ${vML.toLocaleString()}`} />
              {/* Falabella */}
              <div style={{ flex: 1, height: `${(vFal / maxVal) * 100}%`, background: FAL.main, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`Falabella: ${vFal.toLocaleString()}`} />
            </div>
            <span style={{ position: 'absolute', bottom: 4, fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 1, transform: `translateX(${(parseInt(star) - 3) * 42}px)` }}>
              {'★'.repeat(parseInt(star))}
            </span>
          </div>
        )
      })}
      {/* Leyenda */}
      <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 10, color: ML.main, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: ML.main, display: 'inline-block' }} />
          ML
        </span>
        <span style={{ fontSize: 10, color: FAL.dark, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: FAL.main, display: 'inline-block' }} />
          Falabella
        </span>
      </div>
    </div>
  )
}

/** Tarjeta de stat número grande */
function StatNum({ label, valML, valFal, prefix = '', suffix = '' }) {
  return (
    <div style={s.statNum}>
      <span style={s.statLabel}>{label}</span>
      <div style={s.statRow}>
        <span style={{ ...s.statVal, color: ML.dark }}>{prefix}{typeof valML === 'number' ? valML.toLocaleString() : valML}{suffix}</span>
        <span style={s.statSep}>/</span>
        <span style={{ ...s.statVal, color: FAL.dark }}>{prefix}{typeof valFal === 'number' ? valFal.toLocaleString() : valFal}{suffix}</span>
      </div>
      <div style={s.statSources}>
        <span style={{ color: ML.main }}>ML</span>
        <span style={{ color: '#ddd' }}>·</span>
        <span style={{ color: FAL.dark }}>Falabella</span>
      </div>
    </div>
  )
}

/** Gráfico horizontal para categorías con gradiente de rating */
function CatBars({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.rating_promedio), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map(({ categoria, rating_promedio, total_resenas }) => (
        <div key={categoria} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555', width: 120, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {categoria}
          </span>
          <div style={{ flex: 1, height: 10, background: '#F0F0EE', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(rating_promedio / 5) * 100}%`,
              background: `linear-gradient(90deg, #f59e0b, #22c55e)`,
              borderRadius: 5,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: 11, color: '#888', width: 28, flexShrink: 0 }}>
            {rating_promedio.toFixed(1)}
          </span>
          <span style={{ fontSize: 10, color: '#bbb', width: 50, flexShrink: 0 }}>
            {(total_resenas / 1000).toFixed(0)}k reseñas
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function StatsPanel() {
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setCargando(false) })
      .catch(e => { setError(e.message); setCargando(false) })
  }, [])

  if (cargando) return (
    <div style={s.loading}>
      <BarChart2 size={28} style={{ color: '#ccc', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <span style={s.loadingText}>Calculando métricas del dataset…</span>
    </div>
  )

  if (error) return (
    <div style={s.loading}>
      <span style={{ color: '#dc2626', fontSize: 13 }}>Error cargando stats: {error}</span>
    </div>
  )

  const { resumen, dist_ratings, top_marcas, rating_por_categoria, dist_precios } = stats

  return (
    <div style={s.panel}>

      {/* ── Fila 1: números clave ── */}
      <section style={s.section}>
        <SectionTitle icon={<ShoppingBag size={13} />} label="Resumen del dataset" />
        <div style={s.numGrid}>
          <StatNum label="Productos indexados"    valML={resumen.ml.total_productos}   valFal={resumen.falabella.total_productos} />
          <StatNum label="Reseñas totales"        valML={resumen.ml.total_resenas}      valFal={resumen.falabella.total_resenas} />
          <StatNum label="Rating promedio"        valML={resumen.ml.rating_promedio}    valFal={resumen.falabella.rating_promedio} suffix="/5" />
          <StatNum label="Precio promedio (S/)"   valML={Math.round(resumen.ml.precio_promedio)} valFal={Math.round(resumen.falabella.precio_promedio)} prefix="S/ " />
          <StatNum label="Marcas únicas"          valML={resumen.ml.total_marcas}       valFal={resumen.falabella.total_marcas} />
          <StatNum label="Categorías (ML)"        valML={resumen.ml.total_categorias}   valFal="—" />
        </div>
      </section>

      <Divider />

      {/* ── Fila 2: distribución de ratings ── */}
      <section style={s.section}>
        <SectionTitle icon={<Star size={13} />} label="Distribución de ratings" />
        <RatingBars ml={dist_ratings.ml} falabella={dist_ratings.falabella} />
      </section>

      <Divider />

      {/* ── Fila 3: dos columnas — top marcas ML + Falabella ── */}
      <section style={s.section}>
        <SectionTitle icon={<Tag size={13} />} label="Top 10 marcas por productos" />
        <div style={s.dualCol}>
          <div>
            <span style={{ ...s.subLabel, color: ML.main }}>MercadoLibre</span>
            <BarrasH data={top_marcas.ml} color={ML.main} />
          </div>
          <div style={s.colDiv} />
          <div>
            <span style={{ ...s.subLabel, color: FAL.dark }}>Falabella</span>
            <BarrasH data={top_marcas.falabella} color={FAL.main} />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Fila 4: rating por categoría (solo ML) ── */}
      <section style={s.section}>
        <SectionTitle icon={<TrendingUp size={13} />} label="Rating promedio por categoría — MercadoLibre" />
        <CatBars data={rating_por_categoria} />
      </section>

      <Divider />

      {/* ── Fila 5: distribución de precios ── */}
      <section style={s.section}>
        <SectionTitle icon={<BarChart2 size={13} />} label="Distribución de precios (S/)" />
        <div style={s.dualCol}>
          <div>
            <span style={{ ...s.subLabel, color: ML.main }}>MercadoLibre</span>
            <BarrasH data={dist_precios.ml} color={ML.main} />
          </div>
          <div style={s.colDiv} />
          <div>
            <span style={{ ...s.subLabel, color: FAL.dark }}>Falabella</span>
            <BarrasH data={dist_precios.falabella} color={FAL.main} />
          </div>
        </div>
      </section>

    </div>
  )
}

// ── Helpers de layout ─────────────────────────────────────────────
function SectionTitle({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <span style={{ color: '#aaa' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}
function Divider() {
  return <div style={{ height: 1, background: '#EEEEEC', margin: '0 -1.5rem' }} />
}

// ── Estilos ───────────────────────────────────────────────────────
const s = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  section: {
    padding: '1.5rem',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '3rem',
    background: '#fff',
    border: '1px solid #E8E8E6',
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#aaa',
  },
  numGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12,
  },
  statNum: {
    background: '#FAFAF8',
    border: '1px solid #EEEEEC',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  statVal: {
    fontSize: 17,
    fontWeight: 700,
  },
  statSep: {
    fontSize: 13,
    color: '#ddd',
  },
  statSources: {
    display: 'flex',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  dualCol: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: 16,
    alignItems: 'start',
  },
  colDiv: {
    width: 1,
    alignSelf: 'stretch',
    background: '#EEEEEC',
  },
  subLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: 10,
  },
}
