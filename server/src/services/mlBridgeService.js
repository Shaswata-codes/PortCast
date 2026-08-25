// =====================================================
// PortCast — ML Python Microservice Bridge
// Connects Express.js API to FastAPI ML microservice with fallback
// =====================================================

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export async function fetchMLRadar() {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/ml/radar`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('ML Radar Bridge error:', err.message);
  }
  return null;
}

export async function fetchMLForecast(routeId, baseRate, distanceNM, commodity) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/ml/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: routeId,
        base_rate: Number(baseRate) || 18.0,
        distance_nm: Number(distanceNM) || 4500.0,
        commodity: commodity || 'Thermal Coal'
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('ML Forecast Bridge error:', err.message);
  }
  return null;
}

export async function fetchMLOptimize(destinationPort, distanceNM, cargoMT, predictedRate, bunkerPrice) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/ml/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination_port: destinationPort,
        distance_nm: Number(distanceNM) || 4500.0,
        cargo_mt: Number(cargoMT) || 60000.0,
        predicted_rate: Number(predictedRate) || 18.0,
        bunker_price: Number(bunkerPrice) || 620.0
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('ML Optimize Bridge error:', err.message);
  }
  return null;
}
