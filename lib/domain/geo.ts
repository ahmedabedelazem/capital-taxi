export type GeoPoint = { lat: number; lng: number };

const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

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

/**
 * Encodes a coordinate as a geohash for future indexed proximity queries.
 * Precision 9 is approximately meter-level; callers should still apply
 * an exact distance check after retrieving geohash range candidates.
 */
export function encodeGeohash(point: GeoPoint, precision = 9): string {
  if (!isValidPoint(point)) throw new RangeError("invalid_geographic_point");
  if (!Number.isInteger(precision) || precision < 1 || precision > 12) {
    throw new RangeError("invalid_geohash_precision");
  }

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let evenBit = true;
  let bit = 0;
  let character = 0;
  let hash = "";

  while (hash.length < precision) {
    if (evenBit) {
      const midpoint = (lngMin + lngMax) / 2;
      if (point.lng >= midpoint) {
        character = (character << 1) | 1;
        lngMin = midpoint;
      } else {
        character <<= 1;
        lngMax = midpoint;
      }
    } else {
      const midpoint = (latMin + latMax) / 2;
      if (point.lat >= midpoint) {
        character = (character << 1) | 1;
        latMin = midpoint;
      } else {
        character <<= 1;
        latMax = midpoint;
      }
    }
    evenBit = !evenBit;
    bit += 1;
    if (bit === 5) {
      hash += GEOHASH_ALPHABET[character];
      bit = 0;
      character = 0;
    }
  }

  return hash;
}
