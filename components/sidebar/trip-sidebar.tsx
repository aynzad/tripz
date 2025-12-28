'use client'

import type { Trip } from '@/lib/types'
import { calculateTotalExpenses, calculateExpensesPerNight } from '@/lib/trips-utils'
import { calculateStatistics } from '@/lib/statistics'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, MapPin, Users, BarChart3, TrendingUp, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getCityImagePath, formatDate, getDestinationsExcludingHome, formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'

interface TripSidebarProps {
  trips: Trip[]
  selectedTripId: string | null
  onTripSelect: (tripId: string | null) => void
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

export default function TripSidebar({
  trips,
  selectedTripId,
  onTripSelect,
  isOpen,
  onClose,
  isMobile,
}: TripSidebarProps) {
  const router = useRouter()

  const statistics = useMemo(() => calculateStatistics(trips), [trips])

  const getMainCity = (trip: Trip) => {
    const destinations = getDestinationsExcludingHome(trip.destinations)
    return destinations[0]?.city || trip.destinations[0]?.city || 'Unknown'
  }

  const getMainCountry = (trip: Trip) => {
    const destinations = getDestinationsExcludingHome(trip.destinations)
    return destinations[0]?.country || trip.destinations[0]?.country || 'Unknown'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`bg-card/95 border-border flex h-full w-80 flex-col border-l backdrop-blur-md ${
            isMobile ? 'fixed top-0 right-0 z-1000 shadow-2xl' : ''
          }`}
        >
          {/* Mobile close button */}
          {isMobile && (
            <div className="border-border flex items-center justify-between border-b p-3">
              <span className="text-sm font-medium">Trip List</span>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Summary Card */}
          <div className="border-border border-b p-3">
            <Link href="/summary">
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors">
                      <BarChart3 className="text-primary h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">Trip Statistics</h3>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-all group-hover:translate-x-1" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Trips</span>
                    <span className="text-base font-semibold">{statistics.totalTrips}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-base font-semibold">{formatCurrency(statistics.totalExpenses, 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Countries</span>
                    <span className="text-base font-semibold">{statistics.mostVisitedCountries.length}</span>
                  </div>
                </div>

                <div className="border-border/50 flex items-center gap-4 border-t pt-2 text-xs">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" />
                    <span>View full stats</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Trip List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <AnimatePresence mode="popLayout">
              {trips.map((trip, index) => {
                const isSelected = selectedTripId === trip.id
                const totalExpenses = calculateTotalExpenses(trip.expenses)
                const perNight = calculateExpensesPerNight(trip.expenses, trip.startDate, trip.endDate)
                const mainCity = getMainCity(trip)
                const mainCountry = getMainCountry(trip)

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <div
                      onClick={() => onTripSelect(isSelected ? null : trip.id)}
                      onDoubleClick={() => router.push(`/trips/${trip.id}`)}
                      className={`group relative transform cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? 'ring-primary shadow-primary/20 scale-[1.02] shadow-lg ring-2'
                          : 'hover:scale-[1.01] hover:shadow-lg'
                      } `}
                    >
                      {/* Hero Image */}
                      <div className="relative h-36 overflow-hidden">
                        <Image
                          src={getCityImagePath(mainCity)}
                          alt={trip.name}
                          fill
                          className={`object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'} `}
                          sizes="320px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Trip Name Overlay */}
                        <div className="absolute right-0 bottom-0 left-0 p-3">
                          <h3 className="text-lg leading-tight font-semibold text-white">{trip.name}</h3>
                          <div className="mt-1 flex items-center gap-1 text-sm text-white/70">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {mainCity}, {mainCountry}
                            </span>
                          </div>
                        </div>

                        {/* Date Badge */}
                        <div className="glass absolute top-2 right-2 rounded-md px-2 py-1 text-xs text-white">
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="bg-card p-3">
                        <Link
                          href={`/trips/${trip.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-foreground group/link text-sm font-medium transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-sm">
                                <span className="font-medium">{formatCurrency(totalExpenses, 0)}</span>
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                                <span>{formatCurrency(perNight, 0)}/night</span>
                              </div>
                              {trip.companions.length > 0 && (
                                <div className="text-foreground flex items-center gap-1 text-sm">
                                  <Users className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 justify-end">
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {trips.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <MapPin className="text-muted-foreground/30 mb-4 h-12 w-12" />
                <p className="text-muted-foreground">No trips found</p>
                <p className="text-muted-foreground/70 mt-1 text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
