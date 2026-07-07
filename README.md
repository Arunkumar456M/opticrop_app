# OptiCrop — Field Reader (frontend + backend)

A small Flask app that serves the trained model from `opticrop_pipeline`
(`artifacts/best_crop_model.pkl`, `scaler.pkl`, `label_encoder.pkl`) behind a
new frontend.

## Run it

```bash
cd opticrop_app
pip install -r requirements.txt
python3 app.py
```

Open **http://127.0.0.1:5000**.

## What's inside

```
opticrop_app/
├── app.py                 # Flask backend — loads the model, exposes /api/predict
├── requirements.txt
├── artifacts/              # copied from the pipeline: model, scaler, label encoder
├── templates/index.html    # page structure
└── static/
    ├── style.css           # design system (soil / field palette)
    └── script.js           # sliders, live soil-core visual, API calls
```

## How it works

1. The left panel ("Field reading") has a slider for each of the seven model
   inputs — N, P, K, temperature, humidity, pH, rainfall — bounded to the
   realistic ranges seen in training. Moving the N/P/K sliders updates a live
   "soil core" visual showing their relative proportions.
2. **Analyze sample** sends the seven values to `POST /api/predict`.
3. The backend scales the input with the saved `scaler.pkl`, runs it through
   the saved Random Forest, and inverse-transforms the prediction with
   `label_encoder.pkl` — this is the exact `recommend_crop()` logic from
   `04_model_building.py`, just wrapped in a web API.
4. The right panel shows the top crop with its confidence, plus the next few
   closest alternatives ranked by the model's predicted probabilities.

## Notes

- This is the Flask dev server — fine for local use, not for production.
- The model is the same one trained on the synthetic dataset described in the
  pipeline's own README (≈83% test accuracy). Swap in a real dataset and
  re-run the pipeline to get a stronger model; this frontend needs no changes.
