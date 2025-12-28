import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps a city name to its corresponding image path in the public/cities folder.
 * Handles case-insensitive matching and special characters.
 */
export function getCityImagePath(cityName: string): string {
  if (!cityName || cityName.trim() === '') {
    return '/placeholder.jpg'
  }

  // Normalize city name: lowercase, replace spaces with hyphens, remove accents
  const normalized = cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w-]/g, '') // Remove special characters except hyphens

  // Special cases for cities with known variations
  const cityMap: Record<string, string> = {
    'den-haag': 'den-haag',
    'the-hague': 'den-haag',
    'las-palmas': 'las-palmas-de-gran-canaria',
    'las-palmas-de-gran-canaria': 'las-palmas-de-gran-canaria',
    'gran-canaria': 'las-palmas-de-gran-canaria',
    'innsbruck': 'innsbruck', // File is "Innsbruck.jpeg" but filesystem is case-insensitive
  }

  // Check if there's a direct mapping
  if (cityMap[normalized]) {
    return `/cities/${cityMap[normalized]}.jpeg`
  }

  // Return the normalized path
  return `/cities/${normalized}.jpeg`
}
