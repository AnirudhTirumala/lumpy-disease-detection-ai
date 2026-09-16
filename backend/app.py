from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename
import os
import uuid
import logging
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WORK_DIR = Path(
    os.environ.get(
        "WORK_DIR",
        str(Path(tempfile.gettempdir()) / "lumpy-ai")
    )
)
UPLOAD_FOLDER = WORK_DIR / "uploads"
RESULT_FOLDER = WORK_DIR / "results"
MODEL_PATH = Path(
    os.environ.get(
        "MODEL_PATH",
        str(BASE_DIR / "models" / "best.pt")
    )
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024  # 4 MB
app.config["JSON_SORT_KEYS"] = False

# -------------------------------
# CORS
# Restrict to your actual frontend origin(s).
# Set FRONTEND_ORIGIN in Render environment variables.
# -------------------------------
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGIN",
        "http://localhost:3000"
    ).split(",")
    if origin.strip()
]

CORS(app, origins=ALLOWED_ORIGINS)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lumpyai")

# -------------------------------
# Folders
# -------------------------------
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
RESULT_FOLDER.mkdir(parents=True, exist_ok=True)


def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# -------------------------------
# Load YOLO model once per worker
# -------------------------------
if not MODEL_PATH.is_file():
    raise FileNotFoundError(
        f"YOLO model not found at {MODEL_PATH}"
    )

logger.info("Loading YOLO model from %s", MODEL_PATH)

model = YOLO(str(MODEL_PATH))

logger.info("YOLO model loaded")


# -------------------------------
# Home Route
# -------------------------------
@app.route("/")
def home():
    return jsonify({
        "message": "Lumpy Skin Detection API Running"
    })


# -------------------------------
# Health Route
# -------------------------------
@app.get("/health")
def health():
    """Lightweight readiness endpoint for Render health checks."""
    return jsonify({
        "status": "ok",
        "model": MODEL_PATH.name
    })


# -------------------------------
# File Size Error
# -------------------------------
@app.errorhandler(RequestEntityTooLarge)
def file_too_large(_error):
    return jsonify({
        "error": "Image must be 4MB or smaller."
    }), 413


# -------------------------------
# Prediction Route
# -------------------------------
@app.route("/predict", methods=["POST"])
def predict():

    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "error": "Empty filename"
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": "Unsupported file type. Use JPG, PNG, or WEBP."
        }), 400

    # Secure the original filename.
    safe_name = secure_filename(file.filename)

    filename = f"{uuid.uuid4()}_{safe_name}"

    image_path = UPLOAD_FOLDER / filename

    try:
        # -------------------------------
        # Save uploaded image
        # -------------------------------
        file.save(str(image_path))

        logger.info(
            "Image saved: %s",
            image_path
        )

        # -------------------------------
        # YOLO inference
        #
        # imgsz=320 reduces CPU workload
        # on Render's free instance.
        #
        # device="cpu" explicitly uses CPU.
        # -------------------------------
        logger.info(
            "Starting YOLO inference: imgsz=320, device=cpu"
        )

        results = model.predict(
            source=str(image_path),
            conf=0.25,
            imgsz=320,
            device="cpu",
            save=False,
            verbose=False,
        )

        logger.info("YOLO inference completed")

        # -------------------------------
        # Process predictions
        # -------------------------------
        predictions = []

        for result in results:

            boxes = result.boxes

            if boxes is None:
                continue

            for box in boxes:

                cls = int(box.cls[0])
                conf = float(box.conf[0])

                label = str(model.names[cls])

                predictions.append({
                    "label": label,
                    "confidence": round(conf, 2)
                })

        # -------------------------------
        # No detection
        # -------------------------------
        if len(predictions) == 0:
            predictions.append({
                "label": "healthy",
                "confidence": 1.0
            })

        logger.info(
            "Prediction completed: %s",
            predictions
        )

        return jsonify({
            "prediction": predictions
        })

    except Exception:
        # Never expose internal stack traces
        # or server file paths to the client.
        logger.exception("Prediction failed")

        return jsonify({
            "error": "Prediction failed. Please try again."
        }), 500

    finally:
        # -------------------------------
        # Delete temporary uploaded image
        # -------------------------------
        try:

            if image_path.exists():
                image_path.unlink()

                logger.info(
                    "Temporary image removed: %s",
                    image_path
                )

        except OSError:

            logger.warning(
                "Could not remove temp file: %s",
                image_path
            )


# -------------------------------
# Run Server
# -------------------------------
if __name__ == "__main__":

    debug_mode = (
        os.environ
        .get("FLASK_DEBUG", "false")
        .lower()
        == "true"
    )

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=debug_mode
    )