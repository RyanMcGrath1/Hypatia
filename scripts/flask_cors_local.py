# Paste into your Flask app so Expo Web (e.g. http://localhost:8081) can call your API.
# Browsers block cross-origin fetches unless the API sends Access-Control-Allow-Origin.
#
# Usage after `app = Flask(__name__)`:
#
#     from scripts.flask_cors_local import register_local_expo_cors
#     register_local_expo_cors(app)
#
# Or copy the function body into your own module and import `request` from flask.
#
# Alternative: pip install flask-cors
#     from flask_cors import CORS
#     CORS(app, origins=["http://localhost:8081", "http://127.0.0.1:8081"])

from flask import Flask, request


def register_local_expo_cors(app: Flask) -> None:
    """Allow Expo dev servers to call this API from the browser."""

    allowed_origins = frozenset(
        {
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
            "http://localhost:8082",
            "http://127.0.0.1:8082",
        }
    )

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Accept, Content-Type"
        return response
