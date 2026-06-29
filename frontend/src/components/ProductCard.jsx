import React, { useState } from 'react'
import { Star, FileText, ExternalLink, Gauge, ImageOff } from 'lucide-react'

// Colores de marca
const BRAND = {
  falabella:    { bg: '#F2FAF0', text: '#5a9a2a', border: '#d4edca' },
  mercadolibre: { bg: '#FFF9E6', text: '#a07c00', border: '#f0e099' },
}

function Estrellas({ valor }) {
  const llenas = Math.round(valor)
  return (
    <span style={s.estrellas} aria-label={`${valor} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < llenas ? '#f59e0b' : 'none'}
          stroke={i < llenas ? '#f59e0b' : '#ddd'}
        />
      ))}
    </span>
  )
}

// Imagen con fallback en cascada: prueba cada URL candidata
// (combinaciones de prefijo falabellaPE/tottusPE y sufijo _1/_01)
// hasta que una cargue; si todas fallan, muestra un placeholder.
function ImagenProducto({ producto }) {
  const [intento, setIntento] = useState(0)

  const candidatos = producto.imagenes || [producto.imagen, producto.imagen_fallback].filter(Boolean)
  const src = candidatos[intento]

  if (!src || intento >= candidatos.length) {
    return (
      <div style={s.imagenPlaceholder}>
        <ImageOff size={28} style={{ color: '#ccc' }} />
      </div>
    )
  }

  return (
    <div style={s.imagenWrapper}>
      <img
        src={src}
        alt={producto.nombre}
        style={s.imagen}
        onError={() => setIntento(i => i + 1)}
      />
    </div>
  )
}

export default function ProductCard({ producto, fuente }) {
  const brand = BRAND[fuente]
  const label = fuente === 'falabella' ? 'Falabella' : 'MercadoLibre'

  return (
    <div style={s.card}>
      {/* Imagen del producto */}
      <ImagenProducto producto={producto} />

      <div style={s.body}>
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

        {/* Precio (solo Falabella por ahora) */}
        {producto.precio && (
          <span style={s.precio}>{producto.precio}</span>
        )}

        {/* Rating calculado */}
        {producto.rating && (
          <div style={s.ratingRow}>
            <Estrellas valor={producto.rating} />
            <span style={s.ratingText}>{producto.rating} · {producto.resenas} reseñas</span>
          </div>
        )}

        {/* Num reseñas del CSV de precios (cuando no hay rating calculado) */}
        {!producto.rating && producto.num_resenas && (
          <span style={s.ratingTextRow}>
            <FileText size={12} style={{ color: '#999' }} />
            {producto.num_resenas} reseñas
          </span>
        )}

        {/* Distancia semántica como indicador de relevancia */}
        {producto.distancia !== undefined && (
          <div style={s.relevancia}>
            <div style={{ ...s.relevanciaBarra, width: `${Math.max(10, 100 - producto.distancia * 30)}%` }} />
            <span style={s.relevanciaLabel}>
              <Gauge size={11} style={{ color: '#bbb' }} />
              Relevancia semántica
            </span>
          </div>
        )}

        {/* Link */}
        {producto.url && producto.url !== '#' && (
          <a href={producto.url} target="_blank" rel="noreferrer" style={s.link}>
            Ver producto
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

const s = {
  card: {
    background: '#FAFAF8',
    border: '1px solid #EBEBEA',
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.15s, transform 0.15s',
  },
  imagenWrapper: {
    width: '100%',
    height: 280,
    background: '#fff',
    borderBottom: '1px solid #EBEBEA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagen: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    padding: 14,
    boxSizing: 'border-box',
  },
  imagenPlaceholder: {
    width: '100%',
    height: 280,
    background: '#F2F2F0',
    borderBottom: '1px solid #EBEBEA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    padding: '14px 16px 16px',
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
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.45,
    color: '#1a1a1a',
  },
  precio: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  estrellas: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  ratingText: {
    fontSize: 11,
    color: '#888',
  },
  ratingTextRow: {
    fontSize: 11,
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  relevancia: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    fontSize: 12,
    color: '#2563eb',
    textDecoration: 'none',
    marginTop: 4,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
}