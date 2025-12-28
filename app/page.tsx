import { getAllTrips } from '@/lib/trips'
import MainView from '@/components/main-view'

// Force dynamic rendering to avoid database access during build
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const trips = await getAllTrips()

  return <MainView initialTrips={trips} />
}
