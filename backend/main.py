import pandas as pd
import faiss
import json
from sentence_transformers import SentenceTransformer
from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

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
df_ml      = pd.read_csv("reviews_version_final.csv",     encoding="utf-8-sig")
df_fal     = pd.read_csv("reseñas_hibrido_con_texto.csv", encoding="utf-8-sig")
df_fal["reseña"] = df_fal["reseña"].fillna("")

# ── CSV de precios Falabella (cruce por URL) ──────────────────────
df_precios_fal  = pd.read_csv("productos_falabella.csv", encoding="utf-8-sig")
precios_fal_idx = df_precios_fal.set_index("url")

api_key = os.getenv("GROQ_API_KEY")
cliente_groq = Groq(api_key=api_key)
print("✅ Todo listo")


# ── Funciones ─────────────────────────────────────────────────────

def buscar_en_ml(query: str, k: int = 5):
    q_vec = modelo.encode([query]).astype("float32")
    dist, idx = index_ml.search(q_vec, k)
    resultados = []
    for d, i in zip(dist[0], idx[0]):
        fila = textos_ml.iloc[i]
        resultados.append({
            "idproducto": str(fila["idproducto"]),
            "nombre":     str(fila["nombre"]),
            "url":        str(fila["url"]),
            "distancia":  round(float(d), 3),
        })
    return resultados


def extraer_id_falabella(url: str) -> str:
    """Extrae el ID de producto desde la URL de Falabella.
    Ej: .../product/18245973/lavaseca.../18245973 -> '18245973'
    """
    return url.rstrip("/").split("/")[-1]


def construir_urls_imagen_falabella(url: str) -> dict:
    """El prefijo (falabellaPE vs tottusPE) y el sufijo del ID (_1 vs _01)
    varían entre productos, así que se generan las 4 combinaciones para
    que el frontend haga fallback en cascada."""
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

        # Cruce con CSV de precios si la URL coincide
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
    positivas   = grupo[grupo[col_rating] >= 4][col_resena].tolist()
    negativas   = grupo[grupo[col_rating] <= 2][col_resena].tolist()
    return {
        "total":             int(total),
        "rating_promedio":   round(float(rating_prom), 2),
        "pct_positivas":     round(len(positivas) / total * 100, 1),
        "pct_negativas":     round(len(negativas) / total * 100, 1),
        "positivas_muestra": sorted(positivas, key=len, reverse=True)[:4],
        "negativas_muestra": sorted(negativas, key=len, reverse=True)[:3],
    }


def generar_resumen(nombre_producto: str, analisis: dict) -> dict:
    if not analisis:
        return {"error": "Sin reseñas"}

    prompt = f"""Eres un asistente de comparación de productos para un e-commerce peruano.
Analiza las siguientes reseñas reales de clientes y genera un resumen estructurado.

PRODUCTO: {nombre_producto}
- Total reseñas         : {analisis['total']}
- Rating promedio       : {analisis['rating_promedio']}/5
- % opiniones positivas : {analisis['pct_positivas']}%
- % opiniones negativas : {analisis['pct_negativas']}%

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


@app.get("/health")
def health():
    return {"status": "ok"}


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

    top_ml  = ml_res[0]
    top_fal = fal_res[0]

    an_ml  = analizar_resenas(df_ml,  "idproducto", top_ml["idproducto"],  "resena",  "rating")
    an_fal = analizar_resenas(df_fal, "product_id", top_fal["product_id"], "reseña",  "rating")

    return {
        "falabella":    fal_res,
        "mercadolibre": ml_res,
        "nlg_fal": {
            "nombre": top_fal["nombre"],
            **generar_resumen(top_fal["nombre"], an_fal),
        },
        "nlg_ml": {
            "nombre": top_ml["nombre"],
            **generar_resumen(top_ml["nombre"], an_ml),
        },
    }