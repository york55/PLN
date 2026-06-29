import React from 'react'

const BRAND = {
  falabella:    { accent: '#6abf3a', bg: '#F4FBF0', border: '#d0e8c4', logo: '/fotos/Falabella.png' },
  mercadolibre: { accent: '#3d42a8', bg: '#F0F1FF', border: '#c8caef', logo: '/fotos/MercadoLibre.png' },
}

export default function NLGBox({ nlg, fuente }) {
  if (!nlg || nlg.error) return null
  const brand = BRAND[fuente]

  return (
    <div style={{ ...s.box, borderColor: brand.border, background: brand.bg }}>

      {/* Header con logo */}
      <div style={s.header}>
        <img src={brand.logo} alt={fuente} style={s.logo} />
        <span style={s.nombre}>{nlg.nombre}</span>
      </div>

      {/* Puntos positivos */}
      <div style={s.fila}>
        <span style={s.iconoPos}>👍</span>
        <span style={s.texto}>{nlg.resumen_positivo}</span>
      </div>

      {/* Puntos negativos */}
      {nlg.resumen_negativo && (
        <div style={s.fila}>
          <span style={s.iconoNeg}>⚠️</span>
          <span style={s.texto}>{nlg.resumen_negativo}</span>
        </div>
      )}

      {/* Conclusión */}
      <p style={s.conclusion}>{nlg.conclusion}</p>

      {/* Chips */}
      <div style={s.chips}>
        <span style={{ ...s.chip, borderColor: brand.accent, color: brand.accent }}>
          ⭐ {Number(nlg.puntuacion).toFixed(1)} / 5
        </span>
        {nlg.recomendado && (
          <span style={{ ...s.chip, background: brand.accent, color: '#fff', borderColor: brand.accent }}>
            ✓ Recomendado
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
  iconoPos: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  iconoNeg: { fontSize: 14, flexShrink: 0, marginTop: 1 },
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
}