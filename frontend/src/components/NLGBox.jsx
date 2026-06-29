import React from 'react'

const s = {
  box: {
    background: '#fafaf9',
    border: '1px solid #e5e5e3',
    borderRadius: 12,
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: (fuente) => ({
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
    background: fuente === 'falabella' ? '#eff6ff' : '#fffbeb',
    color:      fuente === 'falabella' ? '#1d4ed8' : '#b45309',
    fontWeight: 500,
  }),
  nombreProd: { fontSize: 13, fontWeight: 500 },
  fila:  { display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.5 },
  icono: { flexShrink: 0, fontSize: 16, marginTop: 1 },
  conclusion: {
    fontSize: 13,
    color: '#666',
    lineHeight: 1.5,
    borderTop: '1px solid #e5e5e3',
    paddingTop: 10,
  },
  chips: { display: 'flex', gap: 8 },
  chip: {
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid #e5e5e3',
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
}

export default function NLGBox({ nlg, fuente }) {
  if (!nlg || nlg.error) return null
  const label = fuente === 'falabella' ? 'Falabella' : 'MercadoLibre'

  return (
    <div style={s.box}>
      <div style={s.header}>
        <span style={s.badge(fuente)}>{label}</span>
        <span style={s.nombreProd}>{nlg.nombre}</span>
      </div>

      <div style={s.fila}>
        <span style={{ ...s.icono, color: '#16a34a' }}>👍</span>
        <span>{nlg.resumen_positivo}</span>
      </div>

      {nlg.resumen_negativo && (
        <div style={s.fila}>
          <span style={{ ...s.icono, color: '#d97706' }}>⚠️</span>
          <span>{nlg.resumen_negativo}</span>
        </div>
      )}

      <div style={s.conclusion}>{nlg.conclusion}</div>

      <div style={s.chips}>
        <span style={s.chip}>⭐ {Number(nlg.puntuacion).toFixed(1)}/5</span>
        {nlg.recomendado && <span style={s.chip}>✓ Recomendado</span>}
      </div>
    </div>
  )
}
