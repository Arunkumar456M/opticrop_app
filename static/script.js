(function () {
  "use strict";

  const FEATURES = [
    { key: "N", label: "Nitrogen (N)", unit: "kg/ha", min: 0, max: 140, step: 1, def: 60, accent: "var(--leaf)", core: true },
    { key: "P", label: "Phosphorus (P)", unit: "kg/ha", min: 5, max: 145, step: 1, def: 55, accent: "var(--wheat)", core: true },
    { key: "K", label: "Potassium (K)", unit: "kg/ha", min: 5, max: 205, step: 1, def: 45, accent: "var(--rust)", core: true },
    { key: "temperature", label: "Temperature", unit: "°C", min: 8, max: 44, step: 0.1, def: 25, accent: "var(--sky)" },
    { key: "humidity", label: "Humidity", unit: "%", min: 10, max: 100, step: 0.1, def: 70, accent: "var(--sky)" },
    { key: "ph", label: "Soil pH", unit: "", min: 3.5, max: 9.5, step: 0.1, def: 6.5, accent: "var(--sky)" },
    { key: "rainfall", label: "Rainfall", unit: "mm", min: 20, max: 300, step: 1, def: 100, accent: "var(--sky)" },
  ];

  const state = {};
  const slidersEl = document.getElementById("sliders");
  const coreEl = document.getElementById("core");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resultBody = document.getElementById("resultBody");
  const resultSub = document.getElementById("resultSub");

  function fmt(v, step) {
    return step < 1 ? Number(v).toFixed(1) : Math.round(v);
  }

  function buildSliders() {
    FEATURES.forEach((f) => {
      state[f.key] = f.def;

      const row = document.createElement("div");
      row.className = "slider-row";

      const top = document.createElement("div");
      top.className = "slider-top";
      top.innerHTML = `
        <span class="slider-label">${f.label}<span class="unit">${f.unit ? " " + f.unit : ""}</span></span>
        <span class="slider-value" id="val-${f.key}" style="color:${f.accent}">${fmt(f.def, f.step)}</span>
      `;

      const input = document.createElement("input");
      input.type = "range";
      input.min = f.min;
      input.max = f.max;
      input.step = f.step;
      input.value = f.def;
      input.style.setProperty("--accent", f.accent);
      input.setAttribute("aria-label", f.label);

      input.addEventListener("input", () => {
        state[f.key] = parseFloat(input.value);
        document.getElementById(`val-${f.key}`).textContent = fmt(input.value, f.step);
        if (f.core) updateCore();
      });

      row.appendChild(top);
      row.appendChild(input);
      slidersEl.appendChild(row);
    });
    updateCore();
  }

  function updateCore() {
    const layers = coreEl.querySelectorAll(".core-layer");
    const npk = FEATURES.filter((f) => f.core);
    const fracs = npk.map((f) => {
      const norm = (state[f.key] - f.min) / (f.max - f.min);
      return Math.max(norm, 0.06);
    });
    const total = fracs.reduce((a, b) => a + b, 0);
    layers.forEach((layer, i) => {
      layer.style.flexBasis = ((fracs[i] / total) * 100).toFixed(1) + "%";
    });
  }

  function renderLoading() {
    resultBody.classList.remove("filled");
    resultBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph">⏳</div>
        <p>Analyzing sample…</p>
      </div>
    `;
    resultSub.textContent = "Scoring 22 crops";
  }

  function renderError(msg) {
    resultBody.classList.remove("filled");
    resultBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph">⚠️</div>
        <p class="result-error">${msg}</p>
      </div>
    `;
    resultSub.textContent = "Could not analyze";
  }

  function renderResult(data) {
    resultSub.textContent = "Best match for this sample";
    resultBody.classList.add("filled");

    const altRows = data.alternatives
      .map((a, i) => `
        <div class="almanac-row">
          <span class="almanac-rank">${i + 2}</span>
          <span class="almanac-emoji">${a.emoji}</span>
          <span class="almanac-name">${a.crop}</span>
          <span class="almanac-bar-track"><span class="almanac-bar-fill" style="width:${a.confidence}%"></span></span>
          <span class="almanac-pct">${a.confidence}%</span>
        </div>
      `)
      .join("");

    resultBody.innerHTML = `
      <div class="result-hero">
        <div class="result-emoji">${data.emoji}</div>
        <div>
          <p class="result-name">${data.crop}</p>
          <p class="result-confidence">${data.confidence}% model confidence</p>
        </div>
      </div>
      <div class="almanac-label">Next-best alternatives</div>
      <div class="almanac">${altRows}</div>
    `;
  }

  async function analyze() {
    analyzeBtn.disabled = true;
    renderLoading();
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      renderResult(data);
    } catch (err) {
      renderError(err.message || "Could not reach the model. Is app.py running?");
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  analyzeBtn.addEventListener("click", analyze);
  buildSliders();
})();
