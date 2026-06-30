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
