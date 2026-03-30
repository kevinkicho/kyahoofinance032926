export const TRAINING_DATA = [
  // risk(1-100), rate(bps), inflation(%), ppi(%), gini(1-100), tech_out, energy_out, ...
  { id: '2019',    risk: 85, rate: 175, inflation: 2.3, ppi: 1.5,  gini: 48.0, y: { Technology: 1.35, Financials: 1.25, Energy: 1.05, Healthcare: 1.20, Consumer: 1.25, Industrials: 1.30 } },
  { id: 'mar2020', risk: 10, rate: 0,   inflation: 1.5, ppi: -1.0, gini: 48.2, y: { Technology: 0.65, Financials: 0.55, Energy: 0.45, Healthcare: 1.10, Consumer: 0.70, Industrials: 0.60 } },
  { id: 'dec2021', risk: 95, rate: 25,  inflation: 7.0, ppi: 9.8,  gini: 49.5, y: { Technology: 1.80, Financials: 1.40, Energy: 0.95, Healthcare: 1.15, Consumer: 1.35, Industrials: 1.20 } },
  { id: 'dec2022', risk: 30, rate: 450, inflation: 6.5, ppi: 6.2,  gini: 49.0, y: { Technology: 0.62, Financials: 1.08, Energy: 1.55, Healthcare: 0.95, Consumer: 0.82, Industrials: 1.10 } },
  { id: 'dec2023', risk: 75, rate: 525, inflation: 3.1, ppi: 1.0,  gini: 48.5, y: { Technology: 1.55, Financials: 1.15, Energy: 0.92, Healthcare: 1.05, Consumer: 1.10, Industrials: 1.20 } },
  { id: '2025',    risk: 50, rate: 0,   inflation: 2.0, ppi: 2.0,  gini: 48.0, y: { Technology: 1.00, Financials: 1.00, Energy: 1.00, Healthcare: 1.00, Consumer: 1.00, Industrials: 1.00 } }
];

// Normalize (Min-Max) scaling so Gradient Descent doesn't explode because values live in wildly different orders of magnitude
export const normalizeFeatures = (data) => {
  const maxRisk = 100, minRisk = 0;
  const maxRate = 600, minRate = 0;
  const maxInf = 10,   minInf = 0;
  const maxPpi = 15,   minPpi = -5;
  const maxGini = 65,  minGini = 35;

  return data.map(d => [
    1, // Bias (Intercept) term
    (d.risk - minRisk) / (maxRisk - minRisk),
    (d.rate - minRate) / (maxRate - minRate),
    (d.inflation - minInf) / (maxInf - minInf),
    (d.ppi - minPpi) / (maxPpi - minPpi),
    (d.gini - minGini) / (maxGini - minGini)
  ]);
};

// Multivariate Linear Regression via Gradient Descent (Transparent White-Box Math)
// Upgraded to handle 5 independent variables (6 coefficients total)
export const trainSectorModel = (X, Y_targets, epochs = 30000, lr = 0.5) => {
  let weights = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]; // Initial guess [bias, w_risk, w_rate, w_inf, w_ppi, w_gini]
  const m = X.length;
  const n = weights.length;

  for (let e = 0; e < epochs; e++) {
    let gradients = [0, 0, 0, 0, 0, 0];
    let totalError = 0;

    for (let i = 0; i < m; i++) {
      let prediction = 0;
      for (let j = 0; j < n; j++) prediction += weights[j] * X[i][j];
      
      let error = prediction - Y_targets[i];
      totalError += Math.abs(error);
      
      for (let j = 0; j < n; j++) {
        gradients[j] += (2/m) * error * X[i][j];
      }
    }

    for (let j = 0; j < n; j++) {
      weights[j] -= lr * gradients[j];
    }
  }

  return weights;
};

// Orchestrator: Trains a model for EVERY sector and formats the weights
export const buildGlobalMacroEngine = () => {
  const X_norm = normalizeFeatures(TRAINING_DATA);
  const sectors = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer', 'Industrials'];
  const models = {};

  sectors.forEach(sector => {
    const y = TRAINING_DATA.map(d => d.y[sector]);
    const w = trainSectorModel(X_norm, y);
    models[sector] = {
      bias: w[0],
      w_risk: w[1],
      w_rate: w[2],
      w_inf: w[3],
      w_ppi: w[4],
      w_gini: w[5]
    };
  });

  return models;
};

// Live Prediction (Uses learned Weights × User Sliders)
export const predictMacroImpact = (models, risk, rate, inflation, ppi, gini) => {
  // Important: User inputs must be normalized with the SAME min/max used in training
  const n_risk = (risk - 0) / 100;
  const n_rate = (rate - 0) / 600;
  const n_inf  = (inflation - 0) / 10;
  const n_ppi  = (ppi - -5) / 20;   // range length: 15 - (-5) = 20
  const n_gini = (gini - 35) / 30;  // range length: 65 - 35 = 30

  const predictions = {};
  for (let sector in models) {
    const mod = models[sector];
    const val = mod.bias + (mod.w_risk * n_risk) + (mod.w_rate * n_rate) + (mod.w_inf * n_inf) + (mod.w_ppi * n_ppi) + (mod.w_gini * n_gini);
    predictions[sector] = Math.max(0.1, val); // Floor at 0.1 multiplier
  }
  return predictions;
};
