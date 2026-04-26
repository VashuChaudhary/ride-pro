import * as Location from 'expo-location';

export interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
}

// Top curated Delhi locations for instant results and demo reliability
const TOP_DELHI_SPOTS: SearchResult[] = [
  { name: 'India Gate, New Delhi', latitude: 28.6129, longitude: 77.2295 },
  { name: 'Connaught Place, Central Delhi', latitude: 28.6315, longitude: 77.2167 },
  { name: 'IGI Airport (T3), Delhi', latitude: 28.5562, longitude: 77.1000 },
  { name: 'Red Fort, Old Delhi', latitude: 28.6562, longitude: 77.2410 },
  { name: 'Lotus Temple, Kalkaji', latitude: 28.5535, longitude: 77.2588 },
  { name: 'Qutub Minar, Mehrauli', latitude: 28.5244, longitude: 77.1855 },
  { name: 'Hauz Khas Village', latitude: 28.5521, longitude: 77.1948 },
  { name: 'Akshardham Temple', latitude: 28.6127, longitude: 77.2773 },
  { name: 'Chandni Chowk, Market', latitude: 28.6506, longitude: 77.2307 },
  { name: 'Saket Select Citywalk', latitude: 28.5289, longitude: 77.2183 },
  { name: 'Dilli Haat, INA', latitude: 28.5733, longitude: 77.2085 },
  { name: 'Lajpat Nagar Market', latitude: 28.5677, longitude: 77.2432 },
  { name: 'Rajouri Garden', latitude: 28.6415, longitude: 77.1209 },
  { name: 'Dwarka Sector 21', latitude: 28.5523, longitude: 77.0583 },
  { name: 'Rohini Sector 10', latitude: 28.7154, longitude: 77.1137 },
];

// Using Photon API (by Komoot) which is much better for fuzzy search and local addresses
export const searchAddress = async (query: string): Promise<SearchResult[]> => {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 2) return [];

  // 1. Local hardcoded matches for instant results
  const localMatches = TOP_DELHI_SPOTS.filter(spot => 
    spot.name.toLowerCase().includes(normalizedQuery)
  );

  try {
    // 2. Fetch from Photon API - centered on Delhi for better relevance
    // lat=28.61, lon=77.23 is central Delhi
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&lat=28.61&lon=77.23&limit=15`;
    
    const response = await fetch(url);
    if (!response.ok) return localMatches;

    const data = await response.json();
    if (!data.features) return localMatches;
    
    const apiResults = data.features.map((feature: any) => {
      const p = feature.properties;
      const coords = feature.geometry.coordinates; // Photon returns [lon, lat]
      
      const mainName = p.name || p.street || "";
      const district = p.district || p.city || p.state || "";
      const area = p.housenumber ? p.housenumber + " " : "";
      
      return {
        name: `${area}${mainName}${district ? ', ' + district : ''}`,
        latitude: coords[1],
        longitude: coords[0],
      };
    }).filter((res: any) => res.name.length > 2);

    // Merge results, removing duplicates by name
    const allResults = [...localMatches, ...apiResults];
    const uniqueResults = allResults.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    
    return uniqueResults;
  } catch (error) {
    console.error("Photon search error:", error);
    return localMatches;
  }
};

export const getAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (results && results.length > 0) {
      const { name, street, district, city } = results[0];
      const main = name || street || "";
      const area = district || city || "";
      return `${main}${main && area ? ', ' : ''}${area}`.trim();
    }
    return "Delhi Area";
  } catch (error) {
    return "Current Location";
  }
};

export const getRoadRoute = async (start: {lat: number, lon: number}, end: {lat: number, lon: number}) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map((coord: any) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
};
