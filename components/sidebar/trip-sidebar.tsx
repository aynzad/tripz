"use client";

import type { Trip } from "@/lib/types";
import { calculateTotalExpenses, calculateExpensesPerNight } from "@/lib/trips";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getCityImagePath,
  formatDate,
  getDestinationsExcludingHome,
} from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TripSidebarProps {
  trips: Trip[];
  selectedTripId: string | null;
  onTripSelect: (tripId: string | null) => void;
}

export default function TripSidebar({
  trips,
  selectedTripId,
  onTripSelect,
}: TripSidebarProps) {
  const router = useRouter();

  const getMainCity = (trip: Trip) => {
    const destinations = getDestinationsExcludingHome(trip.destinations);
    return destinations[0]?.city || trip.destinations[0]?.city || "Unknown";
  };

  const getMainCountry = (trip: Trip) => {
    const destinations = getDestinationsExcludingHome(trip.destinations);
    return (
      destinations[0]?.country || trip.destinations[0]?.country || "Unknown"
    );
  };

  return (
    <div className="w-80 h-full bg-card/50 backdrop-blur-sm border-l border-border flex flex-col">
      {/* Trip List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {trips.map((trip, index) => {
            const isSelected = selectedTripId === trip.id;
            const totalExpenses = calculateTotalExpenses(trip.expenses);
            const perNight = calculateExpensesPerNight(
              trip.expenses,
              trip.startDate,
              trip.endDate
            );
            const mainCity = getMainCity(trip);
            const mainCountry = getMainCountry(trip);

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div
                  onClick={() => onTripSelect(isSelected ? null : trip.id)}
                  onDoubleClick={() => router.push(`/trips/${trip.id}`)}
                  className={`
                    relative group cursor-pointer rounded-xl overflow-hidden
                    transition-all duration-300 transform
                    ${
                      isSelected
                        ? "ring-2 ring-primary scale-[1.02] shadow-lg shadow-primary/20"
                        : "hover:scale-[1.01] hover:shadow-lg"
                    }
                  `}
                >
                  {/* Hero Image */}
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={getCityImagePath(mainCity)}
                      alt={trip.name}
                      fill
                      className={`
                        object-cover transition-transform duration-500
                        ${isSelected ? "scale-110" : "group-hover:scale-105"}
                      `}
                      sizes="320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Trip Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-lg leading-tight">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-white/70 text-sm">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {mainCity}, {mainCountry}
                        </span>
                      </div>
                    </div>

                    {/* Date Badge */}
                    <div className="absolute top-2 right-2 glass rounded-md px-2 py-1 text-xs text-white">
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium">
                            €{totalExpenses.toFixed(0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span>€{perNight.toFixed(0)}/night</span>
                        </div>
                        {trip.companions.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <Users className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex justify-end">
                        <Link
                          href={`/trips/${trip.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-foreground
                        transition-colors group/link
                      "
                        >
                          <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No trips found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
