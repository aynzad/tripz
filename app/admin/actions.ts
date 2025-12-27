"use server"

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import * as tripService from "@/lib/trips"
import type { Trip, TripInput } from "@/lib/types"
import { revalidatePath } from "next/cache"

async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect("/admin/login")
  }
  return session
}

export async function createTrip(input: TripInput): Promise<Trip> {
  await requireAuth()

  const trip = await tripService.createTrip(input)
  revalidatePath("/")
  revalidatePath("/admin")

  return trip
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip> {
  await requireAuth()

  const trip = await tripService.updateTrip(id, input)
  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath(`/trips/${id}`)

  return trip
}

export async function deleteTrip(id: string): Promise<void> {
  await requireAuth()

  await tripService.deleteTrip(id)
  revalidatePath("/")
  revalidatePath("/admin")
}

export async function importTrips(trips: TripInput[]): Promise<Trip[]> {
  await requireAuth()

  const imported: Trip[] = []

  for (const tripInput of trips) {
    // Check if trip exists
    const existing = tripInput.id ? await tripService.getTripById(tripInput.id) : null

    if (existing) {
      const updated = await tripService.updateTrip(tripInput.id!, tripInput)
      imported.push(updated)
    } else {
      const created = await tripService.createTrip(tripInput)
      imported.push(created)
    }
  }

  revalidatePath("/")
  revalidatePath("/admin")

  return imported
}
