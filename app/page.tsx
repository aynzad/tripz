import { getAllTrips } from '@/lib/trips'
import MainView from '@/components/main-view'

export default async function HomePage() {
  const trips = await getAllTrips()

  return <MainView initialTrips={trips} />
}
