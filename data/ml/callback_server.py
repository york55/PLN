from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        code = query_params.get("code", [None])[0]

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        if code:
            print("\n==============================")
            print("CODE RECIBIDO:")
            print(code)
            print("==============================\n")

            self.wfile.write(f"""
            <html>
                <body>
                    <h2>Autorización recibida correctamente</h2>
                    <p>Tu código es:</p>
                    <code>{code}</code>
                    <p>Copia este código para generar el access token.</p>
                </body>
            </html>
            """.encode())
        else:
            self.wfile.write("""
            <html>
                <body>
                    <h2>Servidor activo</h2>
                    <p>No se recibió ningún code todavía.</p>
                </body>
            </html>
            """.encode())

if __name__ == "__main__":
    server = HTTPServer(("localhost", 8000), CallbackHandler)
    print("Servidor escuchando en http://localhost:8000/callback")
    server.serve_forever()