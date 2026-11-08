import "server-only";

type Coordinates = { lat: number; lng: number };

/** Returns Google's driving-route distance in kilometres. Never falls back to straight-line distance. */
export async function getDrivingDistanceKm(origin: Coordinates, destination: Coordinates): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_ROUTES_NOT_CONFIGURED");

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      computeAlternativeRoutes: false,
      units: "METRIC",
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("GOOGLE_ROUTES_REQUEST_FAILED");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("GOOGLE_ROUTES_INVALID_RESPONSE");
  const routes = (payload as { routes?: unknown }).routes;
  if (!Array.isArray(routes) || routes.length === 0) throw new Error("GOOGLE_ROUTES_NO_ROUTE");
  const meters = (routes[0] as { distanceMeters?: unknown } | null)?.distanceMeters;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) {
    throw new Error("GOOGLE_ROUTES_INVALID_DISTANCE");
  }
  return meters / 1000;
}
