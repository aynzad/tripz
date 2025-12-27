"use client"

import type React from "react"

import { useState } from "react"
import type { Trip, TripInput, TransportationType, Expenses } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, Trash2, GripVertical, Loader2 } from "lucide-react"
import { createTrip, updateTrip } from "@/app/admin/actions"

interface TripFormProps {
  trip: Trip | null
  onClose: () => void
  onSave: (trip: Trip) => void
}

interface DestinationInput {
  city: string
  country: string
  latitude: string
  longitude: string
  transportationType: TransportationType
}

export default function TripForm({ trip, onClose, onSave }: TripFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(trip?.name || "")
  const [description, setDescription] = useState(trip?.description || "")
  const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate).toISOString().split("T")[0] : "")
  const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate).toISOString().split("T")[0] : "")
  const [companions, setCompanions] = useState(trip?.companions.join(", ") || "")
  const [destinations, setDestinations] = useState<DestinationInput[]>(
    trip?.destinations.map((d) => ({
      city: d.city,
      country: d.country,
      latitude: d.latitude.toString(),
      longitude: d.longitude.toString(),
      transportationType: d.transportationType,
    })) || [{ city: "", country: "", latitude: "", longitude: "", transportationType: null }],
  )
  const [expenses, setExpenses] = useState<Expenses>(
    trip?.expenses || {
      hotel: 0,
      food: 0,
      transportation: 0,
      entryFees: 0,
      other: 0,
    },
  )

  const addDestination = () => {
    setDestinations([...destinations, { city: "", country: "", latitude: "", longitude: "", transportationType: null }])
  }

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter((_, i) => i !== index))
    }
  }

  const updateDestination = (index: number, field: keyof DestinationInput, value: string) => {
    const updated = [...destinations]
    updated[index] = { ...updated[index], [field]: value }
    setDestinations(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const tripInput: TripInput = {
        id: trip?.id,
        name,
        description,
        startDate,
        endDate,
        destinations: destinations.map((d) => ({
          city: d.city,
          country: d.country,
          latitude: Number.parseFloat(d.latitude) || 0,
          longitude: Number.parseFloat(d.longitude) || 0,
          transportationType: d.transportationType || null,
        })),
        companions: companions
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        expenses,
      }

      let savedTrip: Trip
      if (trip) {
        savedTrip = await updateTrip(trip.id, tripInput)
      } else {
        savedTrip = await createTrip(tripInput)
      }

      onSave(savedTrip)
    } catch {
      console.error("Failed to save trip")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold">{trip ? "Edit Trip" : "Add New Trip"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Trip Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer in Barcelona"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this trip..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>

              <div className="col-span-2">
                <Label htmlFor="companions">Companions (comma separated)</Label>
                <Input
                  id="companions"
                  value={companions}
                  onChange={(e) => setCompanions(e.target.value)}
                  placeholder="e.g., John, Jane, Bob"
                />
              </div>
            </div>

            {/* Destinations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Destinations</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDestination}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Stop
                </Button>
              </div>

              <div className="space-y-3">
                {destinations.map((dest, index) => (
                  <div key={index} className="bg-secondary/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Stop {index + 1}</span>
                      {destinations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-8 w-8"
                          onClick={() => removeDestination(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="City"
                        value={dest.city}
                        onChange={(e) => updateDestination(index, "city", e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Country"
                        value={dest.country}
                        onChange={(e) => updateDestination(index, "country", e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Latitude"
                        type="number"
                        step="any"
                        value={dest.latitude}
                        onChange={(e) => updateDestination(index, "latitude", e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Longitude"
                        type="number"
                        step="any"
                        value={dest.longitude}
                        onChange={(e) => updateDestination(index, "longitude", e.target.value)}
                        required
                      />
                      <div className="col-span-2">
                        <Select
                          value={dest.transportationType || "none"}
                          onValueChange={(value) =>
                            updateDestination(index, "transportationType", value === "none" ? "" : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Transportation type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No transportation (start)</SelectItem>
                            <SelectItem value="plane">Plane</SelectItem>
                            <SelectItem value="train">Train</SelectItem>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="bus">Bus</SelectItem>
                            <SelectItem value="boat">Boat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div>
              <Label className="mb-3 block">Expenses (€)</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Hotel</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenses.hotel}
                    onChange={(e) => setExpenses({ ...expenses, hotel: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Food</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenses.food}
                    onChange={(e) => setExpenses({ ...expenses, food: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Transportation</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenses.transportation}
                    onChange={(e) =>
                      setExpenses({
                        ...expenses,
                        transportation: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entry Fees</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenses.entryFees}
                    onChange={(e) =>
                      setExpenses({
                        ...expenses,
                        entryFees: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Other</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenses.other}
                    onChange={(e) => setExpenses({ ...expenses, other: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {trip ? "Save Changes" : "Create Trip"}
          </Button>
        </div>
      </div>
    </div>
  )
}
