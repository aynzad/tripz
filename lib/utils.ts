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
 * Formats a number as UK-style currency (e.g., 1,234.52).
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @param showSymbol - Whether to include the € symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  decimals: number = 2,
  showSymbol: boolean = true
): string {
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `€${formatted}` : formatted;
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
 * Normalizes a city name for use in URLs.
 * Handles case-insensitive matching and special characters.
 */
export function normalizeCityNameForUrl(cityName: string): string {
  if (!cityName || cityName.trim() === "") {
    return "/cities/placeholder.png";
  }

  // Normalize city name: lowercase, replace spaces with hyphens, remove accents
  const normalized = cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w-]/g, ""); // Remove special characters except hyphens

  return normalized;
}

/**
 * Maps a city name to its corresponding image path in the public/cities folder.
 * Handles case-insensitive matching and special characters.
 */
export function getCityImagePath(cityName: string): string {
  if (!cityName || cityName.trim() === "") {
    return "/placeholder.jpg";
  }

  const normalized = normalizeCityNameForUrl(cityName);
  return `/cities/${normalized}.jpeg`;
}
