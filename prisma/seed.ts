import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { loadEnvConfig } from '@next/env'
import pluralize from 'pluralize'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const adapter = new PrismaBetterSqlite3(
  {
    url: process.env.DATABASE_URL!,
  },
  {
    timestampFormat: 'unixepoch-ms',
  },
)
const prisma = new PrismaClient({
  adapter,
})

// Read and parse the seed data
// Using process.cwd() to get project root, then navigate to prisma directory
const seedDataPath = join(process.cwd(), 'prisma', 'trips-seed.json')
const tripsData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))

async function main() {
  console.log('Starting database seed...')

  // Clear existing data
  console.log('Clearing existing trips and destinations...')
  await prisma.destination.deleteMany()
  await prisma.trip.deleteMany()

  // Seed trips
  for (const tripData of tripsData) {
    const { destinations, companions, expenses } = tripData

    const trip = await prisma.trip.create({
      data: {
        id: tripData.id,
        name: tripData.name,
        description: tripData.description || '',
        startDate: new Date(tripData.startDate),
        endDate: new Date(tripData.endDate),
        companions: JSON.stringify(companions),
        expenses: JSON.stringify(expenses),
        destinations: {
          create: destinations.map(
            (
              destination: {
                city: string
                country: string
                latitude: number
                longitude: number
                transportationType: string | null
              },
              index: number,
            ) => ({
              city: destination.city,
              country: destination.country,
              latitude: destination.latitude,
              longitude: destination.longitude,
              transportationType: destination.transportationType,
              order: index,
            }),
          ),
        },
      },
    })

    console.log(`Created trip: ${trip.name} (${trip.id})`)
  }

  console.log(`\n✅ Successfully seeded ${tripsData.length} ${pluralize('trip', tripsData.length)}!`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
