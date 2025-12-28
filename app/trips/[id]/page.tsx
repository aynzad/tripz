import {
  getTripById,
  getAllTrips,
  calculateTotalExpenses,
  calculateExpensesPerNight,
} from "@/lib/trips";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import pluralize from "pluralize";
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Moon,
  Map,
} from "lucide-react";
import TripDetailMap from "@/components/trip-detail/trip-detail-map";
import ExpenseBreakdown from "@/components/trip-detail/expense-breakdown";
import RouteTimeline from "@/components/trip-detail/route-timeline";
import {
  getCityImagePath,
  formatDate,
  getDestinationsExcludingHome,
} from "@/lib/utils";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTripById(id);

  if (!trip) {
    return { title: "Trip Not Found" };
  }

  return {
    title: `${trip.name} - TripViz`,
    description:
      trip.description ||
      `Explore the ${trip.name} trip with interactive maps and expense tracking`,
  };
}

export async function generateStaticParams() {
  const trips = await getAllTrips();
  return trips.map((trip) => ({ id: trip.id }));
}

export default async function TripDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const trip = await getTripById(id);

  if (!trip) {
    notFound();
  }

  const totalExpenses = calculateTotalExpenses(trip.expenses);
  const perNight = calculateExpensesPerNight(
    trip.expenses,
    trip.startDate,
    trip.endDate
  );
  const nights = Math.max(
    1,
    Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Filter out home city (first and last destination) from all calculations
  const destinationsExcludingHome = getDestinationsExcludingHome(
    trip.destinations
  );
  const mainCity =
    destinationsExcludingHome[0]?.city || trip.destinations[0]?.city;

  // Calculate unique destinations excluding home city
  const uniqueDestinations = new Set(
    destinationsExcludingHome.map((d) => d.city)
  );
  const uniqueDestinationCount = uniqueDestinations.size;

  // Calculate unique cities excluding home city
  const uniqueCities = new Set(destinationsExcludingHome.map((d) => d.city));
  const uniqueCityCount = uniqueCities.size;

  // Calculate unique countries excluding home city
  const uniqueCountries = new Set(
    destinationsExcludingHome.map((d) => d.country)
  );
  const uniqueCountryCount = uniqueCountries.size;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src={getCityImagePath(mainCity)}
          alt={trip.name}
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
              {trip.name}
            </h1>
            {trip.description && (
              <p className="text-xl text-muted-foreground mb-6 max-w-2xl">
                {trip.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
              </div>
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                <span>
                  {nights} {pluralize("night", nights)}
                </span>
              </div>
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>
                  {uniqueDestinationCount}{" "}
                  {pluralize("destination", uniqueDestinationCount)}
                </span>
              </div>
              {trip.companions.length > 0 && (
                <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>
                    {trip.companions.length}{" "}
                    {pluralize("companion", trip.companions.length)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="text-3xl font-bold text-accent">
              €{totalExpenses.toFixed(0)}
            </p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Moon className="w-4 h-4" />
              <span className="text-sm">Per Night</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              €{perNight.toFixed(0)}
            </p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {pluralize("City", uniqueCityCount)}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {uniqueCityCount}
            </p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Map className="w-4 h-4" />
              <span className="text-sm">
                {pluralize("Country", uniqueCountryCount)}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {uniqueCountryCount}
            </p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {nights + 1} {pluralize("day", nights + 1)}
            </p>
          </div>
        </div>

        {/* Map Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Route Map</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border h-[400px]">
            <TripDetailMap trip={trip} />
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Route Timeline */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Journey</h2>
            <RouteTimeline destinations={trip.destinations} />
          </section>

          {/* Expense Breakdown */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Expenses</h2>
            <ExpenseBreakdown expenses={trip.expenses} nights={nights} />
          </section>
        </div>

        {/* Companions Section */}
        {trip.companions.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Travel Companions</h2>
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trip.companions.map((companion) => (
                  <div
                    key={companion}
                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-lg">
                        {companion[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground block truncate">
                        {companion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
