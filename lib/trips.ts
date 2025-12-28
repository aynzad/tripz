import { tripStore } from './db'
import type { Trip, Expenses, TripInput } from './types'
import { normalizeCityNameForUrl } from './utils'

export async function getAllTrips(): Promise<Trip[]> {
  return tripStore.getAll()
}

export async function getTripById(id: string): Promise<Trip | null> {
  return tripStore.getById(id)
}

export async function createTrip(input: TripInput): Promise<Trip> {
  return tripStore.create(input)
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip> {
  const trip = tripStore.update(id, input)
  if (!trip) throw new Error('Trip not found')
  return trip
}

export async function deleteTrip(id: string): Promise<void> {
  tripStore.delete(id)
}

export async function importTrips(trips: TripInput[]): Promise<number> {
  let count = 0
  for (const tripInput of trips) {
    const existing = tripInput.id ? tripStore.getById(tripInput.id) : null
    if (existing) {
      tripStore.update(tripInput.id!, tripInput)
    } else {
      tripStore.create(tripInput)
    }
    count++
  }
  return count
}

export function calculateTotalExpenses(expenses: Expenses): number {
  return expenses.hotel + expenses.food + expenses.transportation + expenses.entryFees + expenses.other
}

export function calculateExpensesPerNight(expenses: Expenses, startDate: Date, endDate: Date): number {
  const nights = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  return calculateTotalExpenses(expenses) / nights
}

export function getUniqueCompanions(trips: Trip[]): string[] {
  const companions = new Set<string>()
  trips.forEach((trip) => trip.companions.forEach((c) => companions.add(c)))
  return Array.from(companions).sort()
}

export function getUniqueCountries(trips: Trip[]): string[] {
  const countries = new Set<string>()
  trips.forEach((trip) => trip.destinations.forEach((d) => countries.add(d.country)))
  return Array.from(countries).sort()
}

export async function getTripsByCity(cityName: string): Promise<Trip[]> {
  const allTrips = await getAllTrips()
  return allTrips.filter((trip) => trip.destinations.some((dest) => dest.city === cityName))
}

/**
 * Gets the actual city name from a URL-encoded city name by matching against all trips.
 * Returns null if no matching city is found.
 */
export async function getCityNameFromUrl(urlName: string): Promise<string | null> {
  const allTrips = await getAllTrips()
  const cityNames = new Set<string>()

  // Collect all unique city names
  allTrips.forEach((trip) => {
    trip.destinations.forEach((dest) => {
      cityNames.add(dest.city)
    })
  })

  // Normalize the URL name for comparison
  const normalizedUrlName = urlName.toLowerCase().trim()

  // Find the city name that normalizes to the given URL name
  for (const cityName of cityNames) {
    const normalized = normalizeCityNameForUrl(cityName)

    if (normalized === normalizedUrlName) {
      return cityName
    }
  }

  return null
}
