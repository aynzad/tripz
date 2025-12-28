import { getTripsByCity, getCityNameFromUrl, calculateTotalExpenses } from '@/lib/trips'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import pluralize from 'pluralize'
import { ArrowLeft, Calendar, MapPin, Globe, ExternalLink } from 'lucide-react'
import { getCityImagePath, formatDate, formatCurrency } from '@/lib/utils'

type Params = Promise<{ city: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params
  const cityName = await getCityNameFromUrl(city)

  if (!cityName) {
    return { title: 'City Not Found' }
  }

  return {
    title: `${cityName} - TripViz`,
    description: `Explore trips that visited ${cityName}`,
  }
}

export default async function CityDetailPage({ params }: { params: Params }) {
  const { city } = await params
  const cityName = await getCityNameFromUrl(city)

  if (!cityName) {
    notFound()
  }

  const trips = await getTripsByCity(cityName)

  if (trips.length === 0) {
    notFound()
  }

  // Get city info from first trip's destination
  const cityDestination = trips[0].destinations.find((d) => d.city === cityName)
  const country = cityDestination?.country || ''

  // Calculate statistics
  const totalTrips = trips.length
  const totalNights = trips.reduce((sum, trip) => {
    const nights = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)))
    return sum + nights
  }, 0)
  const totalExpenses = trips.reduce((sum, trip) => {
    return sum + calculateTotalExpenses(trip.expenses)
  }, 0)

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[350px] overflow-hidden">
        <Image src={getCityImagePath(cityName)} alt={cityName} fill className="object-cover" sizes="100vw" priority />
        <div className="from-background via-background/40 absolute inset-0 bg-linear-to-t to-transparent" />

        {/* Back Button */}
        <Link
          href="/"
          className="glass hover:bg-secondary/50 absolute top-6 left-6 z-10 rounded-full p-3 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Hero Content */}
        <div className="absolute right-0 bottom-0 left-0 p-8 md:p-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-foreground mb-4 text-4xl font-bold md:text-6xl">{cityName}</h1>
            {country && (
              <div className="text-muted-foreground mb-6 flex items-center gap-2 text-xl">
                <Globe className="h-5 w-5" />
                <span>{country}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <MapPin className="text-primary h-4 w-4" />
                <span>
                  {totalTrips} {pluralize('trip', totalTrips)}
                </span>
              </div>
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <Calendar className="text-primary h-4 w-4" />
                <span>
                  {totalNights} {pluralize('night', totalNights)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Stats Grid */}
        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Total Trips</span>
            </div>
            <p className="text-muted-foreground -mt-1 mb-2 text-xs">which included {cityName}</p>
            <p className="text-foreground text-3xl font-bold">{totalTrips}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Total Nights</span>
            </div>
            <p className="text-muted-foreground -mt-1 mb-2 text-xs">which included {cityName}</p>
            <p className="text-foreground text-3xl font-bold">{totalNights}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-6">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="text-muted-foreground -mt-1 mb-2 text-xs">which included {cityName}</p>
            <p className="text-accent text-3xl font-bold">{formatCurrency(totalExpenses, 0)}</p>
          </div>
        </div>

        {/* Trips Section */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Trips to {cityName}</h2>
          <div className="space-y-4">
            {trips.map((trip) => {
              const nights = Math.max(
                1,
                Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)),
              )
              const tripExpenses = calculateTotalExpenses(trip.expenses)

              const isHomeCity =
                trip.destinations[0]?.city === cityName ||
                trip.destinations[trip.destinations.length - 1]?.city === cityName

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="bg-card border-border hover:border-primary/50 block rounded-xl border p-6 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-foreground text-xl font-semibold">{trip.name}</h3>
                        {isHomeCity && (
                          <span className="bg-secondary text-muted-foreground rounded-full px-2 py-1 text-xs">
                            Home City
                          </span>
                        )}
                      </div>
                      {trip.description && <p className="text-muted-foreground mb-3">{trip.description}</p>}
                      <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            {nights} {pluralize('night', nights)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(tripExpenses, 0)}</span>
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="text-muted-foreground h-5 w-5 shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
