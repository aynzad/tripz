import { getAllTrips } from '@/lib/trips'
import { calculateStatistics } from '@/lib/statistics'
import SummaryPageClient from '@/components/summary/summary-page-client'

// Force dynamic rendering to avoid database access during build
export const dynamic = 'force-dynamic'

export default async function SummaryPage() {
  const trips = await getAllTrips()
  const statistics = calculateStatistics(trips)

  return <SummaryPageClient statistics={statistics} trips={trips} />
}
