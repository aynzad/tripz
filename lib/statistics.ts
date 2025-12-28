import type { Trip } from './types'
import { calculateTotalExpenses, calculateExpensesPerNight } from './trips-utils'
import { getDestinationsExcludingHome } from './utils'

export interface TripStatistics {
  mostExpensiveTrip: Trip | null
  mostExpensivePerNight: Trip | null
  cheapestTrip: Trip | null
  cheapestPerNight: Trip | null
  longestTrip: Trip | null
  shortestTrip: Trip | null
  favoriteCompanions: { name: string; count: number }[]
  mostVisitedCities: { city: string; country: string; count: number }[]
  mostVisitedCountries: { country: string; count: number }[]
  totalTrips: number
  totalExpenses: number
  averageExpenses: number
  averagePerNight: number
}

export function calculateStatistics(trips: Trip[]): TripStatistics {
  if (trips.length === 0) {
    return {
      mostExpensiveTrip: null,
      mostExpensivePerNight: null,
      cheapestTrip: null,
      cheapestPerNight: null,
      longestTrip: null,
      shortestTrip: null,
      favoriteCompanions: [],
      mostVisitedCities: [],
      mostVisitedCountries: [],
      totalTrips: 0,
      totalExpenses: 0,
      averageExpenses: 0,
      averagePerNight: 0,
    }
  }

  // Most/Cheapest expensive trips
  let mostExpensiveTrip = trips[0]
  let cheapestTrip = trips[0]
  let mostExpensivePerNight = trips[0]
  let cheapestPerNight = trips[0]

  let maxTotal = calculateTotalExpenses(trips[0].expenses)
  let minTotal = calculateTotalExpenses(trips[0].expenses)
  let maxPerNight = calculateExpensesPerNight(trips[0].expenses, trips[0].startDate, trips[0].endDate)
  let minPerNight = maxPerNight

  // Longest/Shortest trips
  let longestTrip = trips[0]
  let shortestTrip = trips[0]
  let maxDuration = trips[0].endDate.getTime() - trips[0].startDate.getTime()
  let minDuration = maxDuration

  // Companions
  const companionCounts = new Map<string, number>()

  // Cities and Countries
  const cityCounts = new Map<string, { city: string; country: string; count: number }>()
  const countryCounts = new Map<string, number>()

  let totalExpenses = 0
  let totalPerNight = 0

  trips.forEach((trip) => {
    const total = calculateTotalExpenses(trip.expenses)
    const perNight = calculateExpensesPerNight(trip.expenses, trip.startDate, trip.endDate)
    const duration = trip.endDate.getTime() - trip.startDate.getTime()

    totalExpenses += total
    totalPerNight += perNight

    // Most/Cheapest expensive
    if (total > maxTotal) {
      maxTotal = total
      mostExpensiveTrip = trip
    }
    if (total < minTotal) {
      minTotal = total
      cheapestTrip = trip
    }

    // Most/Cheapest per night
    if (perNight > maxPerNight) {
      maxPerNight = perNight
      mostExpensivePerNight = trip
    }
    if (perNight < minPerNight) {
      minPerNight = perNight
      cheapestPerNight = trip
    }

    // Longest/Shortest
    if (duration > maxDuration) {
      maxDuration = duration
      longestTrip = trip
    }
    if (duration < minDuration) {
      minDuration = duration
      shortestTrip = trip
    }

    // Count companions
    trip.companions.forEach((companion) => {
      companionCounts.set(companion, (companionCounts.get(companion) || 0) + 1)
    })

    // Count cities and countries (excluding home/starting point)
    const destinationsExcludingHome = getDestinationsExcludingHome(trip.destinations)
    const uniqueCities = new Set<string>()
    const uniqueCountries = new Set<string>()

    destinationsExcludingHome.forEach((dest) => {
      const cityKey = `${dest.city}-${dest.country}`
      if (!uniqueCities.has(cityKey)) {
        uniqueCities.add(cityKey)
        const existing = cityCounts.get(cityKey) || { city: dest.city, country: dest.country, count: 0 }
        existing.count++
        cityCounts.set(cityKey, existing)
      }

      if (!uniqueCountries.has(dest.country)) {
        uniqueCountries.add(dest.country)
        countryCounts.set(dest.country, (countryCounts.get(dest.country) || 0) + 1)
      }
    })
  })

  // Sort companions by count
  const favoriteCompanions = Array.from(companionCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Sort cities by count
  const mostVisitedCities = Array.from(cityCounts.values()).sort((a, b) => b.count - a.count)

  // Sort countries by count
  const mostVisitedCountries = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  return {
    mostExpensiveTrip,
    mostExpensivePerNight,
    cheapestTrip,
    cheapestPerNight,
    longestTrip,
    shortestTrip,
    favoriteCompanions,
    mostVisitedCities,
    mostVisitedCountries,
    totalTrips: trips.length,
    totalExpenses,
    averageExpenses: totalExpenses / trips.length,
    averagePerNight: totalPerNight / trips.length,
  }
}
