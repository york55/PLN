import React from 'react'

// Colores de marca
const BRAND = {
  falabella:    { bg: '#F2FAF0', text: '#5a9a2a', border: '#d4edca' },
  mercadolibre: { bg: '#FFF9E6', text: '#a07c00', border: '#f0e099' },
}

function Estrellas({ valor }) {
  const llenas = Math.round(valor)
  return (
    <span style={{ color: '#f59e0b', letterSpacing: 1 }} aria-label={`${valor} de 5`}>
      {'★'.repeat(llenas)}
      <span style={{ color: '#ddd' }}>{'★'.repeat(5 - llenas)}</span>
    </span>
  )
}

export default function ProductCard({ producto, fuente }) {
  const brand = BRAND[fuente]
  const label = fuente === 'falabella' ? 'Falabella' : 'MercadoLibre'

  return (
    <div style={s.card}>
      {/* Badge tienda */}
      <span style={{ ...s.badge, background: brand.bg, color: brand.text, border: `1px solid ${brand.border}` }}>
        {label}
      </span>

      {/* Marca del producto */}
      {producto.marca && (
        <span style={s.marca}>{producto.marca}</span>
      )}

      {/* Nombre */}
      <span style={s.nombre}>{producto.nombre}</span>

      {/* Rating */}
      {producto.rating && (
        <div style={s.ratingRow}>
          <Estrellas valor={producto.rating} />
          <span style={s.ratingText}>{producto.rating} · {producto.resenas} reseñas</span>
        </div>
      )}

      {/* Distancia semántica como indicador de relevancia */}
      {producto.distancia !== undefined && (
        <div style={s.relevancia}>
          <div style={{ ...s.relevanciaBarra, width: `${Math.max(10, 100 - producto.distancia * 30)}%` }} />
          <span style={s.relevanciaLabel}>Relevancia semántica</span>
        </div>
      )}

      {/* Link */}
      {producto.url && producto.url !== '#' && (
        <a href={producto.url} target="_blank" rel="noreferrer" style={s.link}>
          Ver producto ↗
        </a>
      )}
    </div>
  )
}

const s = {
  card: {
    background: '#FAFAF8',
    border: '1px solid #EBEBEA',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'box-shadow 0.15s',
  },
  badge: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 5,
    width: 'fit-content',
    fontWeight: 600,
    letterSpacing: '0.03em',
  },
  marca: {
    fontSize: 10,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontWeight: 500,
  },
  nombre: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.45,
    color: '#1a1a1a',
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  ratingText: {
    fontSize: 11,
    color: '#888',
  },
  relevancia: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    marginTop: 2,
  },
  relevanciaBarra: {
    height: 3,
    background: 'linear-gradient(90deg, #86efac, #22c55e)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  relevanciaLabel: {
    fontSize: 10,
    color: '#bbb',
  },
  link: {
    fontSize: 11,
    color: '#2563eb',
    textDecoration: 'none',
    marginTop: 2,
    fontWeight: 500,
  },
}