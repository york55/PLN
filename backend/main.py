import pandas as pd
import faiss
import json
import re
from sentence_transformers import SentenceTransformer
from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from playwright.sync_api import sync_playwright
from pysentimiento import create_analyzer

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Cargar todo al iniciar ────────────────────────────────────────
print("Cargando modelo y datos...")
modelo     = SentenceTransformer("all-MiniLM-L6-v2")
index_ml   = faiss.read_index("index_mercadolibre.faiss")
index_fal  = faiss.read_index("index_falabella.faiss")
textos_ml  = pd.read_csv("textos_ml.csv")
textos_fal = pd.read_csv("textos_falabella.csv")
df_ml      = pd.read_csv("dataset_final.csv",     encoding="utf-8-sig")
df_fal     = pd.read_csv("reseñas_hibrido_con_texto.csv", encoding="utf-8-sig")
df_fal["reseña"] = df_fal["reseña"].fillna("")

print(df_fal.columns.tolist())

# ── CSV de precios Falabella (cruce por URL) ──────────────────────
df_precios_fal  = pd.read_csv("productos_falabella.csv", encoding="utf-8-sig")
precios_fal_idx = df_precios_fal.set_index("url")

# ── CSV de precios MercadoLibre (cruce por idproducto) ───────────
df_precios_ml  = pd.read_csv("productos_ml.csv", encoding="utf-8-sig")
precios_ml_idx = df_precios_ml.set_index("idproducto")

api_key = os.getenv("GROQ_API_KEY")
cliente_groq = Groq(api_key=api_key)

# ── Clasificador de sentimiento (BETO en español) ─────────────────
print("Cargando clasificador de sentimiento...")
analizador_sentimiento = create_analyzer(task="sentiment", lang="es")
print("✅ Clasificador listo")

# ── Pre-cálculo de stats ──────────────────────────────────────────
def _precio_fal_a_float(precio_str):
    """Convierte 'S/ 1,749' -> 1749.0"""
    try:
        return float(re.sub(r"[^\d.]", "", str(precio_str).replace(",", "")))
    except:
        return None

df_precios_fal["precio_num"] = df_precios_fal["precio"].apply(_precio_fal_a_float)

_stats_cache = None

def _calcular_stats():
    global _stats_cache
    if _stats_cache:
        return _stats_cache

    # Distribución de ratings
    dist_ratings_ml = (
        df_ml["rating"]
        .value_counts()
        .reindex([1, 2, 3, 4, 5], fill_value=0)
        .sort_index()
        .to_dict()
    )
    dist_ratings_ml = {str(k): int(v) for k, v in dist_ratings_ml.items()}

    dist_ratings_fal = (
        df_fal["rating"]
        .value_counts()
        .reindex([1, 2, 3, 4, 5], fill_value=0)
        .sort_index()
        .to_dict()
    )
    dist_ratings_fal = {str(k): int(v) for k, v in dist_ratings_fal.items()}

    # Top marcas por número de productos
    top_marcas_ml = (
        df_precios_ml["marca"]
        .dropna()
        .value_counts()
        .head(10)
        .to_dict()
    )
    top_marcas_ml = {str(k): int(v) for k, v in top_marcas_ml.items()}

    top_marcas_fal = (
        df_precios_fal["marca"]
        .dropna()
        .value_counts()
        .head(10)
        .to_dict()
    )
    top_marcas_fal = {str(k): int(v) for k, v in top_marcas_fal.items()}

    # Rating promedio por categoría (solo ML tiene categoría)
    rating_por_cat = (
        df_ml.groupby("categoria")["rating"]
        .agg(promedio="mean", total="count")
        .query("total >= 50")
        .sort_values("promedio", ascending=False)
        .head(12)
        .reset_index()
    )
    rating_por_categoria = [
        {
            "categoria": row["categoria"],
            "rating_promedio": round(float(row["promedio"]), 2),
            "total_resenas": int(row["total"]),
        }
        for _, row in rating_por_cat.iterrows()
    ]

    # Distribución de precios ML (en soles)
    precios_ml_soles = df_precios_ml[df_precios_ml["moneda"] == "PEN"]["precio"].dropna()
    bins   = [0, 100, 300, 500, 1000, 2000, 5000, float("inf")]
    labels = ["<100", "100-300", "300-500", "500-1k", "1k-2k", "2k-5k", "5k+"]
    dist_precios_ml = {}
    for i, label in enumerate(labels):
        lo, hi = bins[i], bins[i + 1]
        dist_precios_ml[label] = int(((precios_ml_soles >= lo) & (precios_ml_soles < hi)).sum())

    # Distribución de precios Falabella
    precios_fal = df_precios_fal["precio_num"].dropna()
    dist_precios_fal = {}
    for i, label in enumerate(labels):
        lo, hi = bins[i], bins[i + 1]
        dist_precios_fal[label] = int(((precios_fal >= lo) & (precios_fal < hi)).sum())

    # Resumen general
    resumen = {
        "ml": {
            "total_productos":   int(len(df_precios_ml)),
            "total_resenas":     int(len(df_ml)),
            "rating_promedio":   round(float(df_ml["rating"].mean()), 2),
            "precio_promedio":   round(float(precios_ml_soles.mean()), 2),
            "total_marcas":      int(df_precios_ml["marca"].nunique()),
            "total_categorias":  int(df_precios_ml["categoria"].nunique()),
        },
        "falabella": {
            "total_productos":   int(len(df_precios_fal)),
            "total_resenas":     int(len(df_fal)),
            "rating_promedio":   round(float(df_fal["rating"].mean()), 2),
            "precio_promedio":   round(float(precios_fal.mean()), 2),
            "total_marcas":      int(df_precios_fal["marca"].nunique()),
        },
    }

    _stats_cache = {
        "resumen":              resumen,
        "dist_ratings":         {"ml": dist_ratings_ml, "falabella": dist_ratings_fal},
        "top_marcas":           {"ml": top_marcas_ml,   "falabella": top_marcas_fal},
        "rating_por_categoria": rating_por_categoria,
        "dist_precios":         {"ml": dist_precios_ml, "falabella": dist_precios_fal},
    }
    return _stats_cache

print("✅ Todo listo")


# ── Funciones ─────────────────────────────────────────────────────

def obtener_imagen_ml(url):
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            meta = page.locator('meta[property="og:image"]').first
            imagen = meta.get_attribute("content")
            browser.close()
            return imagen
    except Exception as e:
        print(e)
        return None

def buscar_en_ml(query: str, k: int = 5):
    q_vec = modelo.encode([query]).astype("float32")
    dist, idx = index_ml.search(q_vec, k)
    resultados = []
    for d, i in zip(dist[0], idx[0]):
        fila = textos_ml.iloc[i]
        id_producto = str(fila["idproducto"])

        resultado = {
            "idproducto": id_producto,
            "nombre":     str(fila["nombre"]),
            "url":        str(fila["url"]),
            "distancia":  round(float(d), 3),
        }

        if id_producto in precios_ml_idx.index:
            extra = precios_ml_idx.loc[id_producto]
            moneda  = str(extra["moneda"]) if pd.notna(extra["moneda"]) else "PEN"
            precio  = extra["precio"]
            resultado["precio"]      = f"{moneda} {precio}"
            resultado["moneda"]      = moneda
            resultado["marca"]       = str(extra["marca"]) if pd.notna(extra["marca"]) else None
            resultado["num_resenas"] = len(df_ml[df_ml["idproducto"] == id_producto])

            # resultado["imagen"] = obtener_imagen_ml(resultado["url"])

        resultados.append(resultado)
    return resultados


def extraer_id_falabella(url: str) -> str:
    return url.rstrip("/").split("/")[-1]


def construir_urls_imagen_falabella(url: str) -> dict:
    id_producto = extraer_id_falabella(url)
    prefijos = ["falabellaPE", "tottusPE"]
    sufijos  = ["_1", "_01"]
    urls = [
        f"https://media.falabella.com/{prefijo}/{id_producto}{sufijo}/w=1200,h=1200,fit=pad"
        for prefijo in prefijos
        for sufijo in sufijos
    ]
    return {"imagenes": urls}


def buscar_en_falabella(query: str, k: int = 5):
    q_vec = modelo.encode([query]).astype("float32")
    dist, idx = index_fal.search(q_vec, k)
    resultados = []
    for d, i in zip(dist[0], idx[0]):
        fila = textos_fal.iloc[i]
        url  = str(fila["url"])

        resultado = {
            "product_id": int(fila["product_id"]),
            "nombre":     str(fila["nombre"]),
            "marca":      str(fila["marca"]),
            "url":        url,
            "distancia":  round(float(d), 3),
            **construir_urls_imagen_falabella(url),
        }

        if url in precios_fal_idx.index:
            extra = precios_fal_idx.loc[url]
            resultado["precio"]      = str(extra["precio"])
            resultado["num_resenas"] = int(extra["num_resenas"])

        resultados.append(resultado)
    return resultados


def analizar_resenas(df, col_id, id_valor, col_resena, col_rating):
    grupo = df[df[col_id] == id_valor].copy()
    if grupo.empty:
        return None
    grupo[col_resena] = grupo[col_resena].fillna("")
    rating_prom = grupo[col_rating].mean()
    total       = len(grupo)

    textos_con_contenido = grupo[grupo[col_resena].str.len() > 15][col_resena].tolist()

    if textos_con_contenido:
        muestra = textos_con_contenido[:40]
        try:
            preds = analizador_sentimiento.predict(muestra)
            if not isinstance(preds, list):
                preds = [preds]
            positivas = [t for t, p in zip(muestra, preds) if p.output == "POS"]
            negativas = [t for t, p in zip(muestra, preds) if p.output == "NEG"]
        except Exception:
            positivas = grupo[grupo[col_rating] >= 4][col_resena].tolist()
            negativas = grupo[grupo[col_rating] <= 2][col_resena].tolist()
    else:
        positivas = grupo[grupo[col_rating] >= 4][col_resena].tolist()
        negativas = grupo[grupo[col_rating] <= 2][col_resena].tolist()

    total_clasificadas = max(len(positivas) + len(negativas), 1)
    return {
        "total":             int(total),
        "rating_promedio":   round(float(rating_prom), 2),
        "pct_positivas":     round(len(positivas) / total_clasificadas * 100, 1),
        "pct_negativas":     round(len(negativas) / total_clasificadas * 100, 1),
        "positivas_muestra": sorted(positivas, key=len, reverse=True)[:4],
        "negativas_muestra": sorted(negativas, key=len, reverse=True)[:3],
    }


def extraer_aspectos(textos: list) -> list:
    validos = [str(t).strip() for t in textos if t and len(str(t).strip()) > 10]
    if not validos:
        return []

    muestra = validos[:20]
    resenas_str = "\n".join(f"- {t}" for t in muestra)

    prompt = f"""Analizá estas reseñas de un producto electrónico de e-commerce peruano.
Identificá los aspectos específicos que los usuarios mencionan (solo los que realmente aparecen en el texto).

RESEÑAS:
{resenas_str}

Respondé EXACTAMENTE en este formato JSON (sin texto extra, sin markdown):
[
  {{"aspecto": "nombre del aspecto", "sentimiento": "POS", "score": 4.2, "menciones": 3}},
  {{"aspecto": "otro aspecto", "sentimiento": "NEG", "score": 2.1, "menciones": 2}}
]

Reglas:
- Solo incluir aspectos que aparezcan explícitamente en las reseñas
- sentimiento: "POS", "NEG" o "NEU"
- score: del 1.0 al 5.0 según las menciones
- menciones: cuántas reseñas lo nombran
- máximo 6 aspectos, ordenados de mayor a menor menciones
- si no hay aspectos claros devolvé []"""

    try:
        resp = cliente_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=350,
        )
        texto = resp.choices[0].message.content.strip()
        if texto.startswith("```json"):
            texto = texto.split("```json")[1].split("```")[0].strip()
        elif texto.startswith("```"):
            texto = texto.split("```")[1].strip()
        resultado = json.loads(texto)
        return resultado if isinstance(resultado, list) else []
    except Exception:
        return []


def generar_resumen(nombre_producto: str, analisis: dict, aspectos: list = None) -> dict:
    if not analisis:
        return {"error": "Sin reseñas"}

    aspectos_str = ""
    if aspectos:
        aspectos_str = "\n\nASPECTOS DETECTADOS POR LOS USUARIOS:\n" + "\n".join(
            f"- {a['aspecto'].upper()}: {a['sentimiento']} (score {a['score']}/5, {a['menciones']} menciones)"
            for a in aspectos
        )

    prompt = f"""Eres un asistente de comparación de productos para un e-commerce peruano.
Analiza las siguientes reseñas reales de clientes y genera un resumen estructurado.

PRODUCTO: {nombre_producto}
- Total reseñas         : {analisis['total']}
- Rating promedio       : {analisis['rating_promedio']}/5
- % opiniones positivas : {analisis['pct_positivas']}%
- % opiniones negativas : {analisis['pct_negativas']}%{aspectos_str}

RESEÑAS POSITIVAS (muestra):
{chr(10).join(f'- {r}' for r in analisis['positivas_muestra'])}

RESEÑAS NEGATIVAS (muestra):
{chr(10).join(f'- {r}' for r in analisis['negativas_muestra']) if analisis.get('negativas_muestra') else '- (sin reseñas negativas en la muestra)'}

Responde EXACTAMENTE en este formato JSON (sin texto extra, sin markdown):
{{
  "resumen_positivo": "1 oración sobre lo que más destacan positivamente",
  "resumen_negativo": "1 oración sobre las quejas más frecuentes, o null si no hay",
  "conclusion": "1-2 oraciones de conclusión objetiva para ayudar al comprador",
  "puntuacion": {analisis['rating_promedio']},
  "recomendado": true
}}"""

    try:
        resp  = cliente_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        texto = resp.choices[0].message.content.strip()
        if texto.startswith("```json"):
            texto = texto.split("```json")[1].split("```")[0].strip()
        elif texto.startswith("```"):
            texto = texto.split("```")[1].strip()
        return json.loads(texto)
    except Exception as e:
        return {"error": str(e)}


# ── Endpoints ─────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    k: int = 3

class ResumenRequest(BaseModel):
    tienda: str
    idproducto: str | None = None
    product_id: int | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats")
def stats():
    return _calcular_stats()


@app.post("/buscar")
def buscar(req: QueryRequest):
    return {
        "falabella":    buscar_en_falabella(req.query, req.k),
        "mercadolibre": buscar_en_ml(req.query, req.k),
    }


@app.post("/nlg")
def nlg(req: QueryRequest):
    ml_res  = buscar_en_ml(req.query, k=req.k)
    fal_res = buscar_en_falabella(req.query, k=req.k)

    if not ml_res or not fal_res:
        raise HTTPException(status_code=404, detail="Sin resultados")

    return {
        "falabella":    fal_res,
        "mercadolibre": ml_res,
    }


@app.post("/resumen")
def resumen(req: ResumenRequest):

    if req.tienda == "mercadolibre":
        grupo = df_ml[df_ml["idproducto"] == req.idproducto]
        if grupo.empty:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        nombre   = grupo["nombre"].iloc[0]
        textos   = grupo["resena"].fillna("").tolist()
        an       = analizar_resenas(df_ml, "idproducto", req.idproducto, "resena", "rating")
        aspectos = extraer_aspectos(textos)
        return {
            "nombre":   nombre,
            "aspectos": aspectos,
            **generar_resumen(nombre, an, aspectos),
        }

    elif req.tienda == "falabella":
        grupo = df_fal[df_fal["product_id"] == req.product_id]
        if grupo.empty:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        nombre   = grupo["producto"].iloc[0]
        textos   = grupo["reseña"].fillna("").tolist()
        an       = analizar_resenas(df_fal, "product_id", req.product_id, "reseña", "rating")
        aspectos = extraer_aspectos(textos)
        return {
            "nombre":   nombre,
            "aspectos": aspectos,
            **generar_resumen(nombre, an, aspectos),
        }

    raise HTTPException(status_code=400, detail="Tienda inválida")