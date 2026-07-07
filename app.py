"""
OptiCrop backend — Epic 5.
Loads the artifacts produced by 04_model_building.py (scaler, RandomForest
model, label encoder) and serves crop recommendations over a small JSON API.

Run:
    pip install -r requirements.txt
    python3 app.py
Then open http://127.0.0.1:5000
"""
import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS = os.path.join(BASE_DIR, "artifacts")

app = Flask(__name__)

scaler = joblib.load(os.path.join(ARTIFACTS, "scaler.pkl"))
model = joblib.load(os.path.join(ARTIFACTS, "best_crop_model.pkl"))
label_encoder = joblib.load(os.path.join(ARTIFACTS, "label_encoder.pkl"))

FEATURE_NAMES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Realistic input bounds, pulled from the training data, used to validate
# incoming requests and to drive the frontend sliders.
FEATURE_BOUNDS = {
    "N": (0, 140),
    "P": (5, 145),
    "K": (5, 205),
    "temperature": (8, 44),
    "humidity": (10, 100),
    "ph": (3.5, 9.5),
    "rainfall": (20, 300),
}

CROP_EMOJI = {
    "apple": "🍎", "banana": "🍌", "blackgram": "🫘", "chickpea": "🧆",
    "coconut": "🥥", "coffee": "☕", "cotton": "🧶", "grapes": "🍇",
    "jute": "🌾", "kidneybeans": "🫘", "lentil": "🟠", "maize": "🌽",
    "mango": "🥭", "mothbeans": "🫘", "mungbean": "🟢", "muskmelon": "🍈",
    "orange": "🍊", "papaya": "🫓", "pigeonpeas": "🌱", "pomegranate": "🍑",
    "rice": "🌾", "watermelon": "🍉",
}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/meta")
def meta():
    """Bounds + defaults so the frontend can build its instrument panel."""
    return jsonify({
        "features": FEATURE_NAMES,
        "bounds": FEATURE_BOUNDS,
        "crops": sorted(label_encoder.classes_.tolist()),
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True) or {}

    try:
        values = [float(data[f]) for f in FEATURE_NAMES]
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Missing or invalid reading. Expected N, P, K, "
                                  "temperature, humidity, ph, rainfall."}), 400

    x = pd.DataFrame([values], columns=FEATURE_NAMES)
    x_scaled = scaler.transform(x)

    pred_encoded = model.predict(x_scaled)[0]
    crop = label_encoder.inverse_transform([pred_encoded])[0]

    proba = model.predict_proba(x_scaled)[0]
    order = np.argsort(proba)[::-1]

    top = []
    for idx in order[:5]:
        name = label_encoder.inverse_transform([idx])[0]
        top.append({
            "crop": name,
            "confidence": round(float(proba[idx]) * 100, 1),
            "emoji": CROP_EMOJI.get(name, "🌱"),
        })

    return jsonify({
        "crop": crop,
        "emoji": CROP_EMOJI.get(crop, "🌱"),
        "confidence": round(float(proba[order[0]]) * 100, 1),
        "alternatives": top[1:4],
        "top": top,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
