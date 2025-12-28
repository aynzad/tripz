'server-only'

import { prisma } from './db'
import type { Trip, Expenses, TripInput } from './types'
import { normalizeCityNameForUrl } from './utils'

// Helper function to transform Prisma trip to Trip type
function transformPrismaTrip(prismaTrip: {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  companions: string
  expenses: string
  destinations: {
    id: string
    city: string
    country: string
    latitude: number
    longitude: number
    transportationType: string | null
    order: number
  }[]
}): Trip {
  return {
    id: prismaTrip.id,
    name: prismaTrip.name,
    description: prismaTrip.description,
    startDate: prismaTrip.startDate,
    endDate: prismaTrip.endDate,
    companions: JSON.parse(prismaTrip.companions || '[]') as string[],
    expenses: JSON.parse(prismaTrip.expenses || '{}') as Expenses,
    destinations: prismaTrip.destinations.map((d) => ({
      id: d.id,
      city: d.city,
      country: d.country,
      latitude: d.latitude,
      longitude: d.longitude,
      transportationType: d.transportationType as Trip['destinations'][0]['transportationType'],
      order: d.order,
    })),
  }
}

export async function getAllTrips(): Promise<Trip[]> {
  const trips = await prisma.trip.findMany({
    include: {
      destinations: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  })
  return trips.map(transformPrismaTrip)
}

export async function getTripById(id: string): Promise<Trip | null> {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      destinations: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  })
  return trip ? transformPrismaTrip(trip) : null
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const tripId = input.id || `trip-${Date.now()}`
  const trip = await prisma.trip.create({
    data: {
      id: tripId,
      name: input.name,
      description: input.description,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      companions: JSON.stringify(input.companions),
      expenses: JSON.stringify(input.expenses),
      destinations: {
        create: input.destinations.map((d, i) => ({
          city: d.city,
          country: d.country,
          latitude: d.latitude,
          longitude: d.longitude,
          transportationType: d.transportationType,
          order: i,
        })),
      },
    },
    include: {
      destinations: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  })
  return transformPrismaTrip(trip)
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip> {
  // First, delete existing destinations
  await prisma.destination.deleteMany({
    where: { tripId: id },
  })

  // Then update the trip and create new destinations
  const trip = await prisma.trip.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      companions: JSON.stringify(input.companions),
      expenses: JSON.stringify(input.expenses),
      destinations: {
        create: input.destinations.map((d, i) => ({
          city: d.city,
          country: d.country,
          latitude: d.latitude,
          longitude: d.longitude,
          transportationType: d.transportationType,
          order: i,
        })),
      },
    },
    include: {
      destinations: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  })
  return transformPrismaTrip(trip)
}

export async function deleteTrip(id: string): Promise<void> {
  // Destinations will be deleted automatically due to onDelete: Cascade
  await prisma.trip.delete({
    where: { id },
  })
}

export async function importTrips(trips: TripInput[]): Promise<number> {
  let count = 0
  for (const tripInput of trips) {
    const tripId = tripInput.id || `trip-${Date.now()}-${count}`
    const existing = tripInput.id ? await prisma.trip.findUnique({ where: { id: tripInput.id } }) : null

    if (existing) {
      await updateTrip(tripInput.id!, tripInput)
    } else {
      await createTrip({ ...tripInput, id: tripId })
    }
    count++
  }
  return count
}

// Utility functions moved to lib/trips-utils.ts for client component compatibility
// Re-export them here for backward compatibility with server components
export {
  calculateTotalExpenses,
  calculateExpensesPerNight,
  getUniqueCompanions,
  getUniqueCountries,
} from './trips-utils'

export async function getTripsByCity(cityName: string): Promise<Trip[]> {
  const trips = await prisma.trip.findMany({
    where: {
      destinations: {
        some: {
          city: cityName,
        },
      },
    },
    include: {
      destinations: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  })
  return trips.map(transformPrismaTrip)
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
