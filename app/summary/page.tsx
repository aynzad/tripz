import { getAllTrips } from "@/lib/trips"
import { calculateStatistics } from "@/lib/statistics"
import SummaryPageClient from "@/components/summary/summary-page-client"

export default async function SummaryPage() {
  const trips = await getAllTrips()
  const statistics = calculateStatistics(trips)

  return <SummaryPageClient statistics={statistics} trips={trips} />
}

