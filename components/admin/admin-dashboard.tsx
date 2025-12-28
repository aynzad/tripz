'use client'

import { useState } from 'react'
import type { Trip } from '@/lib/types'
import { logoutAction } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import pluralize from 'pluralize'
import {
  MapPin,
  Plus,
  Upload,
  LogOut,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { calculateTotalExpenses } from '@/lib/trips'
import { getCityImagePath, formatDate, getDestinationsExcludingHome, formatCurrency } from '@/lib/utils'
import TripForm from './trip-form'
import ImportModal from './import-modal'
import { deleteTrip } from '@/app/admin/actions'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AdminUser {
  id: string
  name: string
  email: string
  image?: string
}

interface AdminDashboardProps {
  user: AdminUser
  initialTrips: Trip[]
}

export default function AdminDashboard({ user, initialTrips }: AdminDashboardProps) {
  const [trips, setTrips] = useState(initialTrips)
  const [showTripForm, setShowTripForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  const handleTripSaved = (savedTrip: Trip) => {
    if (editingTrip) {
      setTrips(trips.map((t) => (t.id === savedTrip.id ? savedTrip : t)))
    } else {
      setTrips([savedTrip, ...trips])
    }
    setShowTripForm(false)
    setEditingTrip(null)
  }

  const handleDeleteTrip = async () => {
    if (!deletingTripId) return

    try {
      await deleteTrip(deletingTripId)
      setTrips(trips.filter((t) => t.id !== deletingTripId))
    } catch {
      console.error('Failed to delete trip')
    }
    setDeletingTripId(null)
  }

  const handleImportComplete = (importedTrips: Trip[]) => {
    const tripMap = new Map(trips.map((t) => [t.id, t]))
    importedTrips.forEach((t) => tripMap.set(t.id, t))
    setTrips(
      Array.from(tripMap.values()).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    )
    setShowImportModal(false)
  }

  const handleSignOut = async () => {
    await logoutAction()
    window.location.href = '/'
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card/80 border-border sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:bg-secondary rounded-lg p-2 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg">
                <MapPin className="text-primary h-4 w-4" />
              </div>
              <span className="font-semibold">TripViz Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-secondary flex items-center gap-2 rounded-full px-3 py-1.5">
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image || '/placeholder.svg'} alt={user.name || ''} className="h-6 w-6 rounded-full" />
              )}
              <span className="text-sm">{user.name || user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Actions */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Manage Trips</h1>
            <p className="text-muted-foreground">
              {trips.length} {pluralize('trip', trips.length)} in your collection
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON
            </Button>
            <Button onClick={() => setShowTripForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Trip
            </Button>
          </div>
        </div>

        {/* Trip List */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {trips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div className="bg-card border-border group hover:border-primary/50 flex items-center gap-4 rounded-xl border p-4 transition-colors">
                  {/* Image */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={getCityImagePath(
                        getDestinationsExcludingHome(trip.destinations)[0]?.city ||
                          trip.destinations[0]?.city ||
                          'Unknown',
                      )}
                      alt={trip.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">{trip.name}</h3>
                    {trip.description && <p className="text-muted-foreground truncate text-sm">{trip.description}</p>}
                    <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatCurrency(calculateTotalExpenses(trip.expenses), 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {trip.destinations.length - 2} {pluralize('stop', trip.destinations.length - 2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTrip(trip)
                        setShowTripForm(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingTripId(trip.id)}>
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {trips.length === 0 && (
            <div className="bg-card border-border rounded-xl border p-12 text-center">
              <MapPin className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No trips yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first trip or importing from JSON</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowImportModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import JSON
                </Button>
                <Button onClick={() => setShowTripForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trip
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Trip Form Modal */}
      {showTripForm && (
        <TripForm
          trip={editingTrip}
          onClose={() => {
            setShowTripForm(false)
            setEditingTrip(null)
          }}
          onSave={handleTripSaved}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImportComplete={handleImportComplete} />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTripId} onOpenChange={() => setDeletingTripId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive h-5 w-5" />
              Delete Trip
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrip} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
