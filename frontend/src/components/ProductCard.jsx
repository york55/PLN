import React from 'react'

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e5e3',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  badge: (fuente) => ({
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
    width: 'fit-content',
    background: fuente === 'falabella' ? '#eff6ff' : '#fffbeb',
    color:      fuente === 'falabella' ? '#1d4ed8' : '#b45309',
    fontWeight: 500,
  }),
  marca:  { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' },
  nombre: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  rating: { fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 },
  link:   { fontSize: 11, color: '#2563eb', marginTop: 'auto', textDecoration: 'none' },
}

function Estrellas({ valor }) {
  return (
    <span aria-label={`${valor} de 5 estrellas`}>
      {'★'.repeat(Math.round(valor))}{'☆'.repeat(5 - Math.round(valor))}
    </span>
  )
}

export default function ProductCard({ producto, fuente }) {
  const label = fuente === 'falabella' ? 'Falabella' : 'MercadoLibre'

  return (
    <div style={styles.card}>
      <span style={styles.badge(fuente)}>{label}</span>
      {producto.marca && <span style={styles.marca}>{producto.marca}</span>}
      <span style={styles.nombre}>{producto.nombre}</span>
      {producto.rating && (
        <div style={styles.rating}>
          <Estrellas valor={producto.rating} />
          <span>{producto.rating} · {producto.resenas} reseñas</span>
        </div>
      )}
      {producto.url && producto.url !== '#' && (
        <a href={producto.url} target="_blank" rel="noreferrer" style={styles.link}>
          Ver producto ↗
        </a>
      )}
    </div>
  )
}
