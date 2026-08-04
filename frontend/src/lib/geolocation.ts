"use client";

export type GeoCoords = { latitude: number; longitude: number };

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function isGeoError(err: unknown): err is GeolocationPositionError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as GeolocationPositionError).code === "number"
  );
}

/** Short, calm copy — same idea as ChatApp ShareLocationModal. */
export function explainGeoFailure(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Геолокация недоступна. Выберите точку на карте.";
  }
  if (typeof navigator !== "undefined" && !navigator.geolocation) {
    return "Геолокация недоступна. Выберите точку на карте.";
  }
  if (isGeoError(err) && err.code === 1) {
    return "Доступ к геолокации запрещён.";
  }
  return "Не удалось определить местоположение.";
}

export async function requestGeoCoords(): Promise<GeoCoords> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw Object.assign(new Error("insecure"), { code: 1 });
  }
  if (!navigator.geolocation) {
    throw Object.assign(new Error("unsupported"), { code: 2 });
  }

  const pos = await getPosition({
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 60_000,
  });

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  };
}
