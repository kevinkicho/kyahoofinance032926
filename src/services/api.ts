const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export async function fetchStocks() {
  const response = await fetch(`${BASE_URL}/fetchStocks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stocks: ${response.statusText}`);
  }
  return response.json();
}
