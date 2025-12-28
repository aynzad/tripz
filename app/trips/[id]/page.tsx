import { getTripById, getAllTrips, calculateTotalExpenses, calculateExpensesPerNight } from '@/lib/trips'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import pluralize from 'pluralize'
import { ArrowLeft, Calendar, Users, MapPin, DollarSign, Moon, Globe } from 'lucide-react'
import TripDetailMap from '@/components/trip-detail/trip-detail-map'
import ExpenseBreakdown from '@/components/trip-detail/expense-breakdown'
import RouteTimeline from '@/components/trip-detail/route-timeline'
import { getCityImagePath, formatDate, getDestinationsExcludingHome, formatCurrency } from '@/lib/utils'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const trip = await getTripById(id)

  if (!trip) {
    return { title: 'Trip Not Found' }
  }

  return {
    title: `${trip.name} - Tripz`,
    description: trip.description || `Explore the ${trip.name} trip with interactive maps and expense tracking`,
  }
}

export default async function TripDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const trip = await getTripById(id)

  if (!trip) {
    notFound()
  }

  const totalExpenses = calculateTotalExpenses(trip.expenses)
  const perNight = calculateExpensesPerNight(trip.expenses, trip.startDate, trip.endDate)
  const nights = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)))

  // Filter out home city (first and last destination) from all calculations
  const destinationsExcludingHome = getDestinationsExcludingHome(trip.destinations)
  const mainCity = destinationsExcludingHome[0]?.city || trip.destinations[0]?.city

  // Calculate unique destinations excluding home city
  const uniqueDestinations = new Set(destinationsExcludingHome.map((d) => d.city))
  const uniqueDestinationCount = uniqueDestinations.size

  // Calculate unique cities excluding home city
  const uniqueCities = new Set(destinationsExcludingHome.map((d) => d.city))
  const uniqueCityCount = uniqueCities.size

  // Calculate unique countries excluding home city
  const uniqueCountries = new Set(destinationsExcludingHome.map((d) => d.country))
  const uniqueCountryCount = uniqueCountries.size

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image src={getCityImagePath(mainCity)} alt={trip.name} fill className="object-cover" sizes="100vw" priority />
        <div className="from-background via-background/40 absolute inset-0 bg-linear-to-t to-transparent" />

        {/* Back Button */}
        <Link
          href="/"
          className="glass hover:bg-secondary/50 absolute top-6 right-6 z-10 rounded-full p-3 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Hero Content */}
        <div className="absolute right-0 bottom-0 left-0 p-8 md:p-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-foreground mb-4 text-4xl font-bold md:text-6xl">{trip.name}</h1>
            {trip.description && <p className="text-muted-foreground mb-6 max-w-2xl text-xl">{trip.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <Calendar className="text-primary h-4 w-4" />
                <span>
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
              </div>
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <Moon className="text-primary h-4 w-4" />
                <span>
                  {nights} {pluralize('night', nights)}
                </span>
              </div>
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <MapPin className="text-primary h-4 w-4" />
                <span>
                  {uniqueDestinationCount} {pluralize('destination', uniqueDestinationCount)}
                </span>
              </div>
              {trip.companions.length > 0 && (
                <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                  <Users className="text-primary h-4 w-4" />
                  <span>
                    {trip.companions.length} {pluralize('companion', trip.companions.length)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Stats Grid */}
        <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">
                Total <span className="hidden md:inline">Expenses</span>
              </span>
            </div>
            <p className="text-accent text-3xl font-bold">{formatCurrency(totalExpenses, 0)}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <span className="text-sm">Per Night</span>
            </div>
            <p className="text-foreground text-3xl font-bold">{formatCurrency(perNight, 0)}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{pluralize('City', uniqueCityCount)}</span>
            </div>
            <p className="text-foreground text-3xl font-bold">{uniqueCityCount}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-sm">{pluralize('Country', uniqueCountryCount)}</span>
            </div>
            <p className="text-foreground text-3xl font-bold">{uniqueCountryCount}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-foreground text-3xl font-bold">
              {nights + 1} {pluralize('day', nights + 1)}
            </p>
          </div>
        </div>

        {/* Map Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Route Map</h2>
          <div className="bg-card border-border h-[400px] overflow-hidden rounded-2xl border">
            <TripDetailMap trip={trip} />
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Route Timeline */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">Journey</h2>
            <RouteTimeline destinations={trip.destinations} />
          </section>

          {/* Expense Breakdown */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">Expenses</h2>
            <ExpenseBreakdown expenses={trip.expenses} nights={nights} />
          </section>
        </div>

        {/* Companions Section */}
        {trip.companions.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 text-2xl font-semibold">Travel Companions</h2>
            <div className="bg-card border-border rounded-2xl border p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trip.companions.map((companion) => (
                  <div
                    key={companion}
                    className="bg-secondary/30 hover:bg-secondary/50 border-border/50 flex items-center gap-3 rounded-xl border p-4 transition-colors"
                  >
                    <div className="bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                      <span className="text-primary text-lg font-semibold">{companion[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground block truncate font-medium">{companion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
