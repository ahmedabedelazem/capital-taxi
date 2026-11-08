export type GeoPoint = { lat: number; lng: number };

const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";
const EARTH_RADIUS_KM = 6371.0088;
const MAX_QUERY_PREFIXES = 24;

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
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Encodes a coordinate as a geohash. Use a consistent precision for writes
 * and range queries; callers must still apply an exact distance check.
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

function geohashGrid(precision: number) {
  const totalBits = precision * 5;
  const longitudeBits = Math.ceil(totalBits / 2);
  const latitudeBits = Math.floor(totalBits / 2);
  return {
    longitudeCells: 2 ** longitudeBits,
    latitudeCells: 2 ** latitudeBits,
    longitudeStep: 360 / (2 ** longitudeBits),
    latitudeStep: 180 / (2 ** latitudeBits),
  };
}

function cellIndex(value: number, minimum: number, step: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor((value - minimum) / step)));
}

/**
 * Returns every geohash cell intersecting the radius' conservative bounding
 * box. Query Firestore once per prefix using geohash >= prefix and
 * geohash <= prefix + "~", deduplicate driver IDs, then filter with distanceKm.
 *
 * The prefix count is capped to prevent accidentally issuing an excessive
 * number of Firestore queries. Choose a coarser precision for larger radii.
 */
export function geohashQueryPrefixes(
  center: GeoPoint,
  radiusKm: number,
  precision = 4,
): string[] {
  if (!isValidPoint(center)) throw new RangeError("invalid_geographic_point");
  if (!Number.isFinite(radiusKm) || radiusKm < 0) {
    throw new RangeError("invalid_query_radius");
  }
  if (!Number.isInteger(precision) || precision < 1 || precision > 8) {
    throw new RangeError("invalid_geohash_precision");
  }

  const grid = geohashGrid(precision);
  if (radiusKm >= Math.PI * EARTH_RADIUS_KM) {
    if (grid.longitudeCells * grid.latitudeCells > MAX_QUERY_PREFIXES) {
      throw new RangeError("geohash_query_too_broad");
    }
    const all: string[] = [];
    for (let latIndex = 0; latIndex < grid.latitudeCells; latIndex += 1) {
      for (let lngIndex = 0; lngIndex < grid.longitudeCells; lngIndex += 1) {
        const point = {
          lat: -90 + (latIndex + 0.5) * grid.latitudeStep,
          lng: -180 + (lngIndex + 0.5) * grid.longitudeStep,
        };
        all.push(encodeGeohash(point, precision));
      }
    }
    return all;
  }

  const latitudeDelta = radiusKm / 110.574;
  const minLat = Math.max(-90, center.lat - latitudeDelta);
  const maxLat = Math.min(90, center.lat + latitudeDelta);
  const minLatIndex = cellIndex(minLat, -90, grid.latitudeStep, grid.latitudeCells);
  const maxLatIndex = cellIndex(maxLat, -90, grid.latitudeStep, grid.latitudeCells);

  const reachesPole = minLat <= -90 || maxLat >= 90;
  const maxAbsoluteLatitude = Math.max(Math.abs(minLat), Math.abs(maxLat));
  const worstCaseCosine = Math.cos(maxAbsoluteLatitude * Math.PI / 180);
  const longitudeDelta = reachesPole || worstCaseCosine <= 1e-12
    ? 180
    : Math.min(180, radiusKm / (111.32 * worstCaseCosine));

  const longitudeIntervals: Array<[number, number]> = [];
  if (longitudeDelta >= 180) {
    longitudeIntervals.push([-180, 180]);
  } else {
    const rawMin = center.lng - longitudeDelta;
    const rawMax = center.lng + longitudeDelta;
    if (rawMin < -180) {
      longitudeIntervals.push([rawMin + 360, 180], [-180, rawMax]);
    } else if (rawMax > 180) {
      longitudeIntervals.push([rawMin, 180], [-180, rawMax - 360]);
    } else {
      longitudeIntervals.push([rawMin, rawMax]);
    }
  }

  const prefixes = new Set<string>();
  for (let latIndex = minLatIndex; latIndex <= maxLatIndex; latIndex += 1) {
    for (const [west, east] of longitudeIntervals) {
      const minLngIndex = cellIndex(west, -180, grid.longitudeStep, grid.longitudeCells);
      const maxLngIndex = cellIndex(east, -180, grid.longitudeStep, grid.longitudeCells);
      for (let lngIndex = minLngIndex; lngIndex <= maxLngIndex; lngIndex += 1) {
        const cellCenter = {
          lat: -90 + (latIndex + 0.5) * grid.latitudeStep,
          lng: -180 + (lngIndex + 0.5) * grid.longitudeStep,
        };
        prefixes.add(encodeGeohash(cellCenter, precision));
        if (prefixes.size > MAX_QUERY_PREFIXES) {
          throw new RangeError("geohash_query_too_broad");
        }
      }
    }
  }
  return [...prefixes].sort();
}
