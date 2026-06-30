# PLN
Repositorio para la TA de PLN

## Backend

Instalar requirements del back:
```
pip install -r requirements.txt
```

Antes de correr el backend, debes agregar lo siguiente:

1. Coloca el archivo `backend/reseñas_hibrido_con_texto.csv` (este archivo no se puede subir a GitHub, así que debe agregarse manualmente).
2. Crea el archivo `backend/.env` con tu API key de Groq:

```
GROQ_API_KEY="tu_api_key_aqui"
```

Si por algun motivo sale un error de playwright hacer lo siguiente:

```
python -m playwright install
```

Correr backend:
```
python -m uvicorn main:app --reload --port 8000
```

## Frontend

Levantar front:
```
npm install
```

Correr front:
```
npm run dev
```

USUARIOS EQUIVALENTES A INTEGRANTES DEL EQUIPO
```
Kiridas: U20222159
york55: U20222232
Alfredo123255: U20220825
homew0rk79: U20222928
Sheshe0529: U20220666
```
