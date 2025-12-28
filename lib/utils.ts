import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Destination } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date using UK locale format.
 * Handles Date objects, date strings, and timestamps.
 */
export function formatDate(date: Date | string | number): string {
  const dateObj =
    typeof date === "number"
      ? new Date(date)
      : typeof date === "string"
      ? new Date(date)
      : date;

  return dateObj.toLocaleDateString("en-UK", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Gets the home city from destinations (always the first destination).
 * The home city is the starting/ending point of the trip.
 */
export function getHomeCity(destinations: Destination[]): string | null {
  if (!destinations || destinations.length === 0) {
    return null;
  }
  return destinations[0]?.city || null;
}

/**
 * Filters destinations to exclude the home city (first and last destination).
 * The home city is always the first destination and typically also the last.
 */
export function getDestinationsExcludingHome(
  destinations: Destination[]
): Destination[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }
  const homeCity = getHomeCity(destinations);
  if (!homeCity) {
    return destinations;
  }
  return destinations.filter((d) => d.city !== homeCity);
}

/**
 * Maps a city name to its corresponding image path in the public/cities folder.
 * Handles case-insensitive matching and special characters.
 */
export function getCityImagePath(cityName: string): string {
  if (!cityName || cityName.trim() === "") {
    return "/placeholder.jpg";
  }

  // Normalize city name: lowercase, replace spaces with hyphens, remove accents
  const normalized = cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w-]/g, ""); // Remove special characters except hyphens

  // Special cases for cities with known variations
  const cityMap: Record<string, string> = {
    "den-haag": "den-haag",
    "the-hague": "den-haag",
    "las-palmas": "las-palmas-de-gran-canaria",
    "las-palmas-de-gran-canaria": "las-palmas-de-gran-canaria",
    "gran-canaria": "las-palmas-de-gran-canaria",
    innsbruck: "innsbruck", // File is "Innsbruck.jpeg" but filesystem is case-insensitive
  };

  // Check if there's a direct mapping
  if (cityMap[normalized]) {
    return `/cities/${cityMap[normalized]}.jpeg`;
  }

  // Return the normalized path
  return `/cities/${normalized}.jpeg`;
}
