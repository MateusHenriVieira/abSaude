export interface MapCoordinates {
  lat: number;
  lng: number;
}

export function formatGoogleMapsUrl(coordinates: MapCoordinates): string {
  return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
}

export function getGoogleMapsEmbedUrl(coordinates: MapCoordinates): string {
  return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${coordinates.lat},${coordinates.lng}`;
}
