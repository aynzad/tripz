import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllTrips } from '@/lib/trips'
import AdminDashboard from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/admin/login')
  }

  const trips = await getAllTrips()

  return <AdminDashboard user={session.user} initialTrips={trips} />
}
