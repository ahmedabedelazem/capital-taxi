export type GeoPoint = { lat: number; lng: number };

export function isValidPoint(value: unknown): value is GeoPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return typeof point.lat === "number" && Number.isFinite(point.lat) &&
    point.lat >= -90 && point.lat <= 90 &&
    typeof point.lng === "number" && Number.isFinite(point.lng) &&
    point.lng >= -180 && point.lng <= 180;
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const rawH = sinLat ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * sinLng ** 2;
  const h = Math.min(1, Math.max(0, rawH));
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
