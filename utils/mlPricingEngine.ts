export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; 
  return distance;
}

export interface PricingFactors {
  distanceKm: number;
  timeOfDayHour: number; // 0-23
  weather: 'Clear' | 'Rain' | 'Storm' | 'Fog';
  demandLevel: 'Low' | 'Normal' | 'High' | 'Surge';
}

export async function predictRidePrice(factors: PricingFactors): Promise<{ price: number, explanation: string, basePrice: number }> {
  try {
    const response = await fetch('http://192.168.1.19:5000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(factors),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          price: data.price,
          explanation: data.explanation + " (Powered by Real ML Model)",
          basePrice: data.basePrice
        };
      }
    }
  } catch (error) {
    console.warn("Python ML API failed, falling back to local heuristic", error);
  }

  // --- Fallback logic if Python ML Server is not running ---
  const BASE_FARE = 50;
  const PER_KM_RATE = 15;
  const PER_MINUTE_RATE = 2; // Assuming ~3 mins per km in city traffic
  
  // Calculate raw mathematical base price
  const basePrice = BASE_FARE + (factors.distanceKm * PER_KM_RATE) + (factors.distanceKm * 3 * PER_MINUTE_RATE);
  let predictedPrice = basePrice;
  
  let explanation = `Base rate for ${factors.distanceKm.toFixed(1)}km. `;

  // 1. Time of Day Feature (Rush Hour Surge)
  if ((factors.timeOfDayHour >= 8 && factors.timeOfDayHour <= 10) || (factors.timeOfDayHour >= 17 && factors.timeOfDayHour <= 20)) {
    predictedPrice *= 1.4; // 40% surge during peak office hours
    explanation += 'Peak Rush Hour (+40%). ';
  } else if (factors.timeOfDayHour >= 23 || factors.timeOfDayHour <= 4) {
    predictedPrice *= 1.25; // 25% late night premium
    explanation += 'Late Night Premium (+25%). ';
  }

  // 2. Weather Condition Feature
  switch (factors.weather) {
    case 'Rain':
      predictedPrice *= 1.3;
      explanation += 'Rain Multiplier (+30%). ';
      break;
    case 'Storm':
      predictedPrice *= 1.8;
      explanation += 'Severe Storm Risk (+80%). ';
      break;
    case 'Fog':
      predictedPrice *= 1.2;
      explanation += 'Low Visibility Fog (+20%). ';
      break;
    case 'Clear':
    default:
      break;
  }

  // 3. Real-Time Zone Demand Feature
  switch (factors.demandLevel) {
    case 'Low':
      predictedPrice *= 0.85; 
      explanation += 'Low Demand Area (-15%). ';
      break;
    case 'High':
      predictedPrice *= 1.2;
      explanation += 'High Demand Area (+20%). ';
      break;
    case 'Surge':
      predictedPrice *= 1.6;
      explanation += 'Extreme Driver Shortage Surge (+60%). ';
      break;
    case 'Normal':
    default:
      break;
  }

  // 4. ML "Black Box" Noise (simulating hidden variables/fluctuations like micro-traffic)
  const noise = (Math.random() * 0.08) - 0.04; // +/- 4%
  predictedPrice = predictedPrice * (1 + noise);

  return {
    price: Math.max(50, Math.round(predictedPrice)), // Absolute floor of Rs 50
    basePrice: Math.round(basePrice),
    explanation: explanation.trim() + " (Local Fallback)"
  };
}
