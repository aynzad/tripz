"use client";

import { useState } from "react";
import type { Trip } from "@/lib/types";
import { logoutAction } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { calculateTotalExpenses } from "@/lib/trips";
import { getCityImagePath } from "@/lib/utils";
import TripForm from "./trip-form";
import ImportModal from "./import-modal";
import { deleteTrip } from "@/app/admin/actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface AdminDashboardProps {
  user: AdminUser;
  initialTrips: Trip[];
}

export default function AdminDashboard({
  user,
  initialTrips,
}: AdminDashboardProps) {
  const [trips, setTrips] = useState(initialTrips);
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const handleTripSaved = (savedTrip: Trip) => {
    if (editingTrip) {
      setTrips(trips.map((t) => (t.id === savedTrip.id ? savedTrip : t)));
    } else {
      setTrips([savedTrip, ...trips]);
    }
    setShowTripForm(false);
    setEditingTrip(null);
  };

  const handleDeleteTrip = async () => {
    if (!deletingTripId) return;

    try {
      await deleteTrip(deletingTripId);
      setTrips(trips.filter((t) => t.id !== deletingTripId));
    } catch {
      console.error("Failed to delete trip");
    }
    setDeletingTripId(null);
  };

  const handleImportComplete = (importedTrips: Trip[]) => {
    const tripMap = new Map(trips.map((t) => [t.id, t]));
    importedTrips.forEach((t) => tripMap.set(t.id, t));
    setTrips(
      Array.from(tripMap.values()).sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
    );
    setShowImportModal(false);
  };

  const handleSignOut = async () => {
    await logoutAction();
    window.location.href = "/";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold">TripViz Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
              {user.image && (
                <img
                  src={user.image || "/placeholder.svg"}
                  alt={user.name || ""}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm">{user.name || user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Trips</h1>
            <p className="text-muted-foreground">
              {trips.length} trips in your collection
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
            <Button onClick={() => setShowTripForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
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
                <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 group hover:border-primary/50 transition-colors">
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={getCityImagePath(
                        trip.destinations[1]?.city ||
                          trip.destinations[0]?.city ||
                          "Unknown"
                      )}
                      alt={trip.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {trip.name}
                    </h3>
                    {trip.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {trip.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(trip.startDate)} -{" "}
                          {formatDate(trip.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          €{calculateTotalExpenses(trip.expenses).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{trip.destinations.length - 2} stops</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTrip(trip);
                        setShowTripForm(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTripId(trip.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {trips.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No trips yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first trip or importing from JSON
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
                <Button onClick={() => setShowTripForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
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
            setShowTripForm(false);
            setEditingTrip(null);
          }}
          onSave={handleTripSaved}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTripId}
        onOpenChange={() => setDeletingTripId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Trip
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
