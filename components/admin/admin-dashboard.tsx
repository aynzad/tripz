'use client'

import { useState, useMemo } from 'react'
import type { Trip } from '@/lib/types'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Search,
  X,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { calculateTotalExpenses, getUniqueCompanions } from '@/lib/trips-utils'
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
import { Logo } from '../logo'
import { Badge } from '@/components/ui/badge'

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

type SortField = 'date' | 'price' | 'name' | 'destinations'
type SortOrder = 'asc' | 'desc'

export default function AdminDashboard({ user, initialTrips }: AdminDashboardProps) {
  const [trips, setTrips] = useState(initialTrips)
  const [showTripForm, setShowTripForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompanion, setSelectedCompanion] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

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

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  // Get unique companions for filter
  const allCompanions = useMemo(() => getUniqueCompanions(trips), [trips])

  // Filter and sort trips
  const filteredAndSortedTrips = useMemo(() => {
    let filtered = [...trips]

    // Search filter (name, city, country)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((trip) => {
        const nameMatch = trip.name.toLowerCase().includes(query)
        const cityMatch = trip.destinations.some((dest) => dest.city.toLowerCase().includes(query))
        const countryMatch = trip.destinations.some((dest) => dest.country.toLowerCase().includes(query))
        return nameMatch || cityMatch || countryMatch
      })
    }

    // Companion filter
    if (selectedCompanion !== 'all') {
      filtered = filtered.filter((trip) => trip.companions.includes(selectedCompanion))
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case 'price':
          comparison = calculateTotalExpenses(a.expenses) - calculateTotalExpenses(b.expenses)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'destinations':
          comparison = a.destinations.length - b.destinations.length
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [trips, searchQuery, selectedCompanion, sortField, sortOrder])

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCompanion !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCompanion('all')
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
              <Logo className="fill-primary size-8" />
              <span className="font-semibold">Tripz Admin</span>
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
            <Link href="/admin/change-password">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </Link>
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
              {filteredAndSortedTrips.length} of {trips.length} {pluralize('trip', trips.length)} shown
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

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by name, city, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Companion Filter */}
            <Select value={selectedCompanion} onValueChange={setSelectedCompanion}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by companion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companions</SelectItem>
                {allCompanions.map((companion) => (
                  <SelectItem key={companion} value={companion}>
                    {companion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Field */}
            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="price">Total Price</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="destinations">Destinations</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery('')} className="ml-1 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCompanion !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Companion: {selectedCompanion}
                  <button onClick={() => setSelectedCompanion('all')} className="ml-1 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Trip List */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedTrips.map((trip, index) => (
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

          {trips.length > 0 && filteredAndSortedTrips.length === 0 && (
            <div className="bg-card border-border rounded-xl border p-12 text-center">
              <Search className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No trips match your filters</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
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
