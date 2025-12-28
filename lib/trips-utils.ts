import type { Trip, Expenses } from './types'

/**
 * Pure utility functions that can be used in both client and server components.
 * These functions don't require database access.
 */

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
