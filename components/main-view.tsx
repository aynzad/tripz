'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Trip } from '@/lib/types'
import {
  calculateTotalExpenses,
  calculateExpensesPerNight,
  getUniqueCompanions,
  getUniqueCountries,
} from '@/lib/trips-utils'
import TripSidebar from '@/components/sidebar/trip-sidebar'
import FilterBar, { type FilterState } from '@/components/filters/filter-bar'

// Dynamic import for the map to avoid SSR issues with Leaflet
const TripMap = dynamic(() => import('@/components/map/trip-map'), {
  ssr: false,
  loading: () => (
    <div className="bg-background flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

interface MainViewProps {
  initialTrips: Trip[]
}

export default function MainView({ initialTrips }: MainViewProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  // Calculate bounds for filters
  const bounds = useMemo(() => {
    const expenses = initialTrips.map((t) => calculateTotalExpenses(t.expenses))
    const perNight = initialTrips.map((t) => calculateExpensesPerNight(t.expenses, t.startDate, t.endDate))
    const dates = initialTrips.flatMap((t) => [t.startDate.getTime(), t.endDate.getTime()])

    return {
      expense: [Math.min(...expenses), Math.max(...expenses)] as [number, number],
      perNight: [Math.min(...perNight), Math.max(...perNight)] as [number, number],
      date: [Math.min(...dates), Math.max(...dates)] as [number, number],
    }
  }, [initialTrips])

  const [filters, setFilters] = useState<FilterState>({
    dateRange: bounds.date,
    transportationTypes: [],
    companions: [],
    countries: [],
    expenseRange: bounds.expense,
    expensePerNightRange: bounds.perNight,
  })

  const allCompanions = useMemo(() => getUniqueCompanions(initialTrips), [initialTrips])
  const allCountries = useMemo(() => getUniqueCountries(initialTrips), [initialTrips])

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    return initialTrips.filter((trip) => {
      // Date range filter
      const tripStart = trip.startDate.getTime()
      const tripEnd = trip.endDate.getTime()
      if (tripEnd < filters.dateRange[0] || tripStart > filters.dateRange[1]) {
        return false
      }

      // Transportation type filter
      if (filters.transportationTypes.length > 0) {
        const tripTransportTypes = trip.destinations.map((d) => d.transportationType).filter(Boolean) as string[]
        if (!filters.transportationTypes.some((t) => tripTransportTypes.includes(t))) {
          return false
        }
      }

      // Companions filter
      if (filters.companions.length > 0) {
        if (!filters.companions.some((c) => trip.companions.includes(c))) {
          return false
        }
      }

      // Countries filter
      if (filters.countries.length > 0) {
        const tripCountries = trip.destinations.map((d) => d.country)
        if (!filters.countries.some((c) => tripCountries.includes(c))) {
          return false
        }
      }

      // Expense range filter
      const totalExpenses = calculateTotalExpenses(trip.expenses)
      if (totalExpenses < filters.expenseRange[0] || totalExpenses > filters.expenseRange[1]) {
        return false
      }

      // Expense per night filter
      const perNight = calculateExpensesPerNight(trip.expenses, trip.startDate, trip.endDate)
      if (perNight < filters.expensePerNightRange[0] || perNight > filters.expensePerNightRange[1]) {
        return false
      }

      return true
    })
  }, [initialTrips, filters])

  const handleTripSelect = useCallback((tripId: string | null) => {
    setSelectedTripId(tripId)
  }, [])

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* Main Map Section */}
      <div className="relative flex-1">
        <TripMap trips={filteredTrips} selectedTripId={selectedTripId} onTripSelect={handleTripSelect} />

        {/* Filter Bar */}
        <FilterBar
          trips={filteredTrips}
          filters={filters}
          onFiltersChange={setFilters}
          allCompanions={allCompanions}
          allCountries={allCountries}
          expenseBounds={bounds.expense}
          expensePerNightBounds={bounds.perNight}
          dateBounds={bounds.date}
        />
      </div>

      {/* Right Sidebar */}
      <TripSidebar trips={filteredTrips} selectedTripId={selectedTripId} onTripSelect={handleTripSelect} />
    </div>
  )
}
