import {
  getTripsByCity,
  getCityNameFromUrl,
  calculateTotalExpenses,
} from "@/lib/trips";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import pluralize from "pluralize";
import { ArrowLeft, Calendar, MapPin, Globe, ExternalLink } from "lucide-react";
import { getCityImagePath, formatDate, formatCurrency } from "@/lib/utils";

type Params = Promise<{ city: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { city } = await params;
  const cityName = await getCityNameFromUrl(city);

  if (!cityName) {
    return { title: "City Not Found" };
  }

  return {
    title: `${cityName} - TripViz`,
    description: `Explore trips that visited ${cityName}`,
  };
}

export default async function CityDetailPage({ params }: { params: Params }) {
  const { city } = await params;
  const cityName = await getCityNameFromUrl(city);

  if (!cityName) {
    notFound();
  }

  const trips = await getTripsByCity(cityName);

  if (trips.length === 0) {
    notFound();
  }

  // Get city info from first trip's destination
  const cityDestination = trips[0].destinations.find(
    (d) => d.city === cityName
  );
  const country = cityDestination?.country || "";

  // Calculate statistics
  const totalTrips = trips.length;
  const totalNights = trips.reduce((sum, trip) => {
    const nights = Math.max(
      1,
      Math.ceil(
        (trip.endDate.getTime() - trip.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    return sum + nights;
  }, 0);
  const totalExpenses = trips.reduce((sum, trip) => {
    return sum + calculateTotalExpenses(trip.expenses);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[350px] overflow-hidden">
        <Image
          src={getCityImagePath(cityName)}
          alt={cityName}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-6 left-6 glass rounded-full p-3 hover:bg-secondary/50 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              {cityName}
            </h1>
            {country && (
              <div className="flex items-center gap-2 text-xl text-muted-foreground mb-6">
                <Globe className="w-5 h-5" />
                <span>{country}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>
                  {totalTrips} {pluralize("trip", totalTrips)}
                </span>
              </div>
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {totalNights} {pluralize("night", totalNights)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Total Trips</span>
            </div>
            <p className="text-xs -mt-1 mb-2 text-muted-foreground">
              which included {cityName}
            </p>
            <p className="text-3xl font-bold text-foreground">{totalTrips}</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Total Nights</span>
            </div>
            <p className="text-xs -mt-1 mb-2 text-muted-foreground">
              which included {cityName}
            </p>
            <p className="text-3xl font-bold text-foreground">{totalNights}</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="text-xs -mt-1 mb-2 text-muted-foreground">
              which included {cityName}
            </p>
            <p className="text-3xl font-bold text-accent">
              {formatCurrency(totalExpenses, 0)}
            </p>
          </div>
        </div>

        {/* Trips Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Trips to {cityName}</h2>
          <div className="space-y-4">
            {trips.map((trip) => {
              const nights = Math.max(
                1,
                Math.ceil(
                  (trip.endDate.getTime() - trip.startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              const tripExpenses = calculateTotalExpenses(trip.expenses);

              const isHomeCity =
                trip.destinations[0]?.city === cityName ||
                trip.destinations[trip.destinations.length - 1]?.city ===
                  cityName;

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">
                          {trip.name}
                        </h3>
                        {isHomeCity && (
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                            Home City
                          </span>
                        )}
                      </div>
                      {trip.description && (
                        <p className="text-muted-foreground mb-3">
                          {trip.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(trip.startDate)} -{" "}
                            {formatDate(trip.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            {nights} {pluralize("night", nights)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(tripExpenses, 0)}</span>
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
