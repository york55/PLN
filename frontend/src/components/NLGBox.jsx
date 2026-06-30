import React from 'react'
import { ThumbsUp, AlertTriangle, Star, CheckCircle2, Layers } from 'lucide-react'

const BRAND = {
  falabella:    { accent: '#6abf3a', bg: '#F4FBF0', border: '#d0e8c4', logo: '/fotos/Falabella.png' },
  mercadolibre: { accent: '#3d42a8', bg: '#F0F1FF', border: '#c8caef', logo: '/fotos/MercadoLibre.png' },
}

const SENT_COLOR = {
  POS: { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' },
  NEG: { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' },
  NEU: { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
}

function Aspectos({ aspectos, accent }) {
  if (!aspectos || aspectos.length === 0) return null
  const maxMenciones = Math.max(...aspectos.map(a => a.menciones), 1)

  return (
    <div style={s.aspectosBox}>
      <div style={s.aspectosHeader}>
        <Layers size={12} style={{ color: '#aaa' }} />
        <span style={s.aspectosTitle}>Aspectos mencionados</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {aspectos.map((a, i) => {
          const colors = SENT_COLOR[a.sentimiento] || SENT_COLOR.NEU
          return (
            <div key={i} style={s.aspectoFila}>
              <span style={{ ...s.aspectoNombre }}>{a.aspecto}</span>
              <div style={s.barraContainer}>
                <div
                  style={{
                    ...s.barra,
                    width: `${(a.score / 5) * 100}%`,
                    background: colors.dot,
                  }}
                />
              </div>
              <span style={{ ...s.aspectoChip, background: colors.bg, color: colors.text }}>
                {a.sentimiento}
              </span>
              <span style={s.aspectoScore}>{Number(a.score).toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NLGBox({ nlg, fuente }) {
  if (!nlg || nlg.error) return null
  const brand = BRAND[fuente]

  return (
    <div style={{ ...s.box, borderColor: brand.border, background: brand.bg }}>

      <div style={s.header}>
        <img src={brand.logo} alt={fuente} style={s.logo} />
        <span style={s.nombre}>{nlg.nombre}</span>
      </div>

      <div style={s.fila}>
        <ThumbsUp size={14} style={{ color: brand.accent, flexShrink: 0, marginTop: 1 }} />
        <span style={s.texto}>{nlg.resumen_positivo}</span>
      </div>

      {nlg.resumen_negativo && (
        <div style={s.fila}>
          <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <span style={s.texto}>{nlg.resumen_negativo}</span>
        </div>
      )}

      <Aspectos aspectos={nlg.aspectos} accent={brand.accent} />

      <p style={s.conclusion}>{nlg.conclusion}</p>

      <div style={s.chips}>
        <span style={{ ...s.chip, borderColor: brand.accent, color: brand.accent }}>
          <Star size={11} fill={brand.accent} stroke={brand.accent} />
          {Number(nlg.puntuacion).toFixed(1)} / 5
        </span>
        {nlg.recomendado && (
          <span style={{ ...s.chip, background: brand.accent, color: '#fff', borderColor: brand.accent }}>
            <CheckCircle2 size={11} />
            Recomendado
          </span>
        )}
      </div>
    </div>
  )
}

const s = {
  box: {
    border: '1px solid',
    borderRadius: 14,
    padding: '1.1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  logo: {
    height: 20,
    objectFit: 'contain',
    flexShrink: 0,
  },
  nombre: {
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
    lineHeight: 1.3,
  },
  fila: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  texto: {
    fontSize: 13,
    color: '#444',
    lineHeight: 1.5,
  },
  conclusion: {
    fontSize: 12,
    color: '#666',
    lineHeight: 1.55,
    margin: 0,
    borderTop: '1px solid rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  chips: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },

  aspectosBox: {
    background: 'rgba(0,0,0,0.025)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  aspectosHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  aspectosTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  aspectoFila: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  aspectoNombre: {
    fontSize: 11,
    color: '#555',
    width: 80,
    flexShrink: 0,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  barraContainer: {
    flex: 1,
    height: 6,
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  aspectoChip: {
    fontSize: 9,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
    flexShrink: 0,
    letterSpacing: '0.04em',
  },
  aspectoScore: {
    fontSize: 10,
    color: '#aaa',
    width: 22,
    flexShrink: 0,
    textAlign: 'right',
  },
}
