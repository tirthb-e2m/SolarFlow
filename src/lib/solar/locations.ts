export type LocationPreset = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

/** Matches the story bearing of 28.61°N. */
export const defaultLocation: LocationPreset = {
  id: "delhi",
  name: "New Delhi",
  latitude: 28.61,
  longitude: 77.21,
};

export const locationPresets: readonly LocationPreset[] = [
  defaultLocation,
  { id: "jaipur", name: "Jaipur", latitude: 26.91, longitude: 75.79 },
  { id: "ahmedabad", name: "Ahmedabad", latitude: 23.02, longitude: 72.57 },
  { id: "mumbai", name: "Mumbai", latitude: 19.08, longitude: 72.88 },
  { id: "bengaluru", name: "Bengaluru", latitude: 12.97, longitude: 77.59 },
];

/** PVGIS default for "sum of system losses". Not the demo performance ratio. */
export const defaultSystemLossPercent = 14;

export function formatCoordinate(latitude: number, longitude: number): string {
  const north = latitude >= 0 ? "N" : "S";
  const east = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(2)}°${north}, ${Math.abs(longitude).toFixed(2)}°${east}`;
}

export function matchingPreset(latitude: number, longitude: number): LocationPreset | null {
  return (
    locationPresets.find(
      (preset) =>
        Math.abs(preset.latitude - latitude) < 0.001 &&
        Math.abs(preset.longitude - longitude) < 0.001,
    ) ?? null
  );
}
