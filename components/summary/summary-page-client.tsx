"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import type { Trip } from "@/lib/types";
import type { TripStatistics } from "@/lib/statistics";
import { calculateTotalExpenses, calculateExpensesPerNight } from "@/lib/trips";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  MapPin,
  Globe,
  Euro,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import pluralize from "pluralize";

interface SummaryPageClientProps {
  statistics: TripStatistics;
  trips: Trip[];
}

// Helper function to get computed CSS variable value
function useChartColors() {
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      const computedColors = [
        getComputedStyle(root).getPropertyValue("--chart-1").trim(),
        getComputedStyle(root).getPropertyValue("--chart-2").trim(),
        getComputedStyle(root).getPropertyValue("--chart-3").trim(),
        getComputedStyle(root).getPropertyValue("--chart-4").trim(),
        getComputedStyle(root).getPropertyValue("--chart-5").trim(),
      ];
      setColors(computedColors);
    }
  }, []);

  return colors;
}

export default function SummaryPageClient({
  statistics,
  trips,
}: SummaryPageClientProps) {
  const chartColors = useChartColors();
  const [showPerNight, setShowPerNight] = useState(false);
  const [breakdownPerNight, setBreakdownPerNight] = useState(false);

  // Calculate date range for all trips
  const dateRange = useMemo(() => {
    if (trips.length === 0) return null;

    const dates = trips.flatMap((trip) => [
      trip.startDate.getTime(),
      trip.endDate.getTime(),
    ]);

    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));

    return {
      from: earliest,
      until: latest,
    };
  }, [trips]);

  // Prepare data for expense over time chart
  const expenseOverTime = useMemo(() => {
    return trips
      .map((trip) => ({
        name: trip.name,
        date: formatDate(trip.startDate),
        total: calculateTotalExpenses(trip.expenses),
        perNight: calculateExpensesPerNight(
          trip.expenses,
          trip.startDate,
          trip.endDate
        ),
      }))
      .sort((a, b) => {
        const dateA =
          trips.find((t) => t.name === a.name)?.startDate.getTime() || 0;
        const dateB =
          trips.find((t) => t.name === b.name)?.startDate.getTime() || 0;
        return dateA - dateB;
      });
  }, [trips]);

  // Calculate trend line data using linear regression
  const trendLineData = useMemo(() => {
    if (expenseOverTime.length === 0) return [];

    const dataKey = showPerNight ? "perNight" : "total";
    const n = expenseOverTime.length;

    // Calculate linear regression: y = mx + b
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    expenseOverTime.forEach((point, index) => {
      const x = index;
      const y = point[dataKey];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate trend line points
    return expenseOverTime.map((point, index) => ({
      name: point.name,
      value: slope * index + intercept,
    }));
  }, [expenseOverTime, showPerNight]);

  // Calculate Y-axis domain to include both data and trend line
  const yAxisDomain = useMemo(() => {
    if (expenseOverTime.length === 0) return [0, 100];

    const dataKey = showPerNight ? "perNight" : "total";
    const dataValues = expenseOverTime.map((point) => point[dataKey]);
    const trendValues = trendLineData.map((point) => point.value);
    const allValues = [...dataValues, ...trendValues];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1; // 10% padding

    return [Math.max(0, min - padding), max + padding];
  }, [expenseOverTime, trendLineData, showPerNight]);

  // Prepare data for expense breakdown
  const expenseBreakdown = useMemo(() => {
    const categories = {
      hotel: 0,
      food: 0,
      transportation: 0,
      entryFees: 0,
      other: 0,
    };

    trips.forEach((trip) => {
      categories.hotel += trip.expenses.hotel;
      categories.food += trip.expenses.food;
      categories.transportation += trip.expenses.transportation;
      categories.entryFees += trip.expenses.entryFees;
      categories.other += trip.expenses.other;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name:
          name.charAt(0).toUpperCase() +
          name.slice(1).replace(/([A-Z])/g, " $1"),
        value: Math.round(value),
      }))
      .filter((item) => item.value > 0);
  }, [trips]);

  // Prepare data for expense breakdown comparison between trips
  const expenseBreakdownByTrip = useMemo(() => {
    return trips
      .map((trip) => {
        const nights = Math.ceil(
          (trip.endDate.getTime() - trip.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          name: trip.name,
          Hotel: breakdownPerNight
            ? trip.expenses.hotel / nights
            : trip.expenses.hotel,
          Food: breakdownPerNight
            ? trip.expenses.food / nights
            : trip.expenses.food,
          Transportation: breakdownPerNight
            ? trip.expenses.transportation / nights
            : trip.expenses.transportation,
          "Entry Fees": breakdownPerNight
            ? trip.expenses.entryFees / nights
            : trip.expenses.entryFees,
          Other: breakdownPerNight
            ? trip.expenses.other / nights
            : trip.expenses.other,
        };
      })
      .sort((a, b) => {
        const dateA =
          trips.find((t) => t.name === a.name)?.startDate.getTime() || 0;
        const dateB =
          trips.find((t) => t.name === b.name)?.startDate.getTime() || 0;
        return dateA - dateB;
      });
  }, [trips, breakdownPerNight]);

  const chartConfig = {
    total: {
      label: "Total Expenses",
      color: chartColors[0] || "oklch(0.65 0.2 200)",
    },
    perNight: {
      label: "Per Night",
      color: chartColors[1] || "oklch(0.65 0.18 145)",
    },
  };

  // Use computed colors or fallback to default oklch values
  const COLORS =
    chartColors.length > 0
      ? chartColors
      : [
          "oklch(0.65 0.2 200)",
          "oklch(0.65 0.18 145)",
          "oklch(0.7 0.15 50)",
          "oklch(0.6 0.2 280)",
          "oklch(0.65 0.15 180)",
        ];

  // Extended color palette for charts with many items
  const EXTENDED_COLORS = [
    ...COLORS,
    "oklch(0.7 0.2 300)",
    "oklch(0.65 0.18 60)",
    "oklch(0.6 0.2 320)",
    "oklch(0.7 0.15 100)",
    "oklch(0.65 0.2 240)",
    "oklch(0.6 0.18 20)",
    "oklch(0.7 0.2 340)",
    "oklch(0.65 0.15 120)",
    "oklch(0.6 0.2 260)",
    "oklch(0.7 0.18 80)",
  ];

  // Helper to get color by index
  const getColor = (index: number) =>
    EXTENDED_COLORS[index % EXTENDED_COLORS.length];

  const getDuration = (trip: Trip) => {
    const days = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Trip Statistics
            </h1>
            {dateRange && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(dateRange.from)} {" - "}
                {formatDate(dateRange.until)}
              </p>
            )}
          </div>

          {/* Back Button */}
          <Link
            href="/"
            className="absolute top-6 left-6 glass rounded-full p-3 hover:bg-secondary/50 transition-colors z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                {pluralize("trip", statistics.totalTrips)} recorded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.totalExpenses, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average: {formatCurrency(statistics.averageExpenses, 0)} per{" "}
                {pluralize("trip", 1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Per Night
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.averagePerNight, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                per {pluralize("night", 1)} average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Countries Visited
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.mostVisitedCountries.length}
              </div>
              <p className="text-xs text-muted-foreground">
                unique{" "}
                {pluralize("country", statistics.mostVisitedCountries.length)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Most Expensive Trip */}
          {statistics.mostExpensiveTrip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Most Expensive Trip
                </CardTitle>
                <CardDescription>Highest total cost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.mostExpensiveTrip.name}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(
                      calculateTotalExpenses(
                        statistics.mostExpensiveTrip.expenses
                      ),
                      2
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(statistics.mostExpensiveTrip.startDate)} -{" "}
                    {formatDate(statistics.mostExpensiveTrip.endDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cheapest Trip */}
          {statistics.cheapestTrip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                  Cheapest Trip
                </CardTitle>
                <CardDescription>Lowest total cost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.cheapestTrip.name}
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(
                      calculateTotalExpenses(statistics.cheapestTrip.expenses),
                      2
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(statistics.cheapestTrip.startDate)} -{" "}
                    {formatDate(statistics.cheapestTrip.endDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Expensive Per Night */}
          {statistics.mostExpensivePerNight && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Most Expensive Per Night
                </CardTitle>
                <CardDescription>
                  Highest cost per {pluralize("night", 1)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.mostExpensivePerNight.name}
                  </div>
                  <div className="text-lg font-semibold text-orange-600">
                    {formatCurrency(
                      calculateExpensesPerNight(
                        statistics.mostExpensivePerNight.expenses,
                        statistics.mostExpensivePerNight.startDate,
                        statistics.mostExpensivePerNight.endDate
                      ),
                      2
                    )}
                    /{pluralize("night", 1)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDuration(statistics.mostExpensivePerNight)}{" "}
                    {pluralize(
                      "night",
                      getDuration(statistics.mostExpensivePerNight)
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cheapest Per Night */}
          {statistics.cheapestPerNight && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-purple-500" />
                  Cheapest Per Night
                </CardTitle>
                <CardDescription>
                  Lowest cost per {pluralize("night", 1)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.cheapestPerNight.name}
                  </div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatCurrency(
                      calculateExpensesPerNight(
                        statistics.cheapestPerNight.expenses,
                        statistics.cheapestPerNight.startDate,
                        statistics.cheapestPerNight.endDate
                      ),
                      2
                    )}
                    /{pluralize("night", 1)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDuration(statistics.cheapestPerNight)}{" "}
                    {pluralize(
                      "night",
                      getDuration(statistics.cheapestPerNight)
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Longest Trip */}
          {statistics.longestTrip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-500" />
                  Longest Trip
                </CardTitle>
                <CardDescription>
                  Most {pluralize("night", 2)} traveled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.longestTrip.name}
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    {getDuration(statistics.longestTrip)}{" "}
                    {pluralize("night", getDuration(statistics.longestTrip))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(statistics.longestTrip.startDate)} -{" "}
                    {formatDate(statistics.longestTrip.endDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shortest Trip */}
          {statistics.shortestTrip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  Shortest Trip
                </CardTitle>
                <CardDescription>
                  Fewest {pluralize("night", 2)} traveled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {statistics.shortestTrip.name}
                  </div>
                  <div className="text-lg font-semibold text-indigo-600">
                    {getDuration(statistics.shortestTrip)}{" "}
                    {pluralize("night", getDuration(statistics.shortestTrip))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(statistics.shortestTrip.startDate)} -{" "}
                    {formatDate(statistics.shortestTrip.endDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Row 1: Expense Breakdown / Favorite Companions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Expense Breakdown */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Total spending by category</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ChartContainer config={chartConfig} className="h-full">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Favorite Companions */}
          {statistics.favoriteCompanions.length > 0 ? (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Favorite Companions
                </CardTitle>
                <CardDescription>
                  Travel{" "}
                  {pluralize("companion", statistics.favoriteCompanions.length)}{" "}
                  by {pluralize("trip", 2)} count
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                <ChartContainer config={chartConfig} className="h-full">
                  <BarChart
                    data={statistics.favoriteCompanions.map((item, index) => ({
                      name: item.name,
                      trips: item.count,
                      fill: getColor(index),
                    }))}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                      tickFormatter={(value) => Math.round(value).toString()}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="trips"
                      radius={[4, 4, 0, 0]}
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        const fillColor = payload?.fill || getColor(0);
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={fillColor}
                            rx={4}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Favorite Companions
                </CardTitle>
                <CardDescription>No companions data available</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No companions recorded</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Row 2: Expenses Over Time / Expense Breakdown by Trip */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Expenses Over Time */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expenses Over Time</CardTitle>
                  <CardDescription>
                    {showPerNight
                      ? `Per ${pluralize("night", 1)} expenses`
                      : `Total expenses per ${pluralize("trip", 1)}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="expense-toggle"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Total
                  </Label>
                  <Switch
                    id="expense-toggle"
                    checked={showPerNight}
                    onCheckedChange={setShowPerNight}
                  />
                  <Label
                    htmlFor="expense-toggle"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Per Night
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ChartContainer config={chartConfig} className="h-full">
                <LineChart
                  data={expenseOverTime}
                  key={showPerNight ? "perNight" : "total"}
                >
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    tickFormatter={(value) => Math.round(value).toString()}
                    domain={yAxisDomain}
                  />
                  <ChartTooltip
                    content={(props: any) => {
                      // Filter out trend line from tooltip
                      if (props?.payload) {
                        const filteredPayload = props.payload.filter(
                          (item: any) =>
                            item.dataKey !== "value" || item.name !== "Trend"
                        );
                        return (
                          <ChartTooltipContent
                            {...props}
                            payload={filteredPayload}
                          />
                        );
                      }
                      return <ChartTooltipContent {...props} />;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={showPerNight ? "perNight" : "total"}
                    stroke={showPerNight ? COLORS[1] : COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    data={trendLineData}
                    stroke={showPerNight ? COLORS[1] : COLORS[0]}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                    name="Trend"
                    legendType="none"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown by Trip */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense Breakdown by Trip</CardTitle>
                  <CardDescription>
                    Compare expense categories{" "}
                    {breakdownPerNight
                      ? `per ${pluralize("night", 1)}`
                      : "per trip"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="breakdown-toggle"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Total
                  </Label>
                  <Switch
                    id="breakdown-toggle"
                    checked={breakdownPerNight}
                    onCheckedChange={setBreakdownPerNight}
                  />
                  <Label
                    htmlFor="breakdown-toggle"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Per Night
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ChartContainer config={chartConfig} className="h-full">
                <BarChart
                  data={expenseBreakdownByTrip}
                  key={breakdownPerNight ? "perNight" : "total"}
                >
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="Hotel"
                    stackId="a"
                    fill={COLORS[0]}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Bar
                    dataKey="Food"
                    stackId="a"
                    fill={COLORS[1]}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Bar
                    dataKey="Transportation"
                    stackId="a"
                    fill={COLORS[2]}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Bar
                    dataKey="Entry Fees"
                    stackId="a"
                    fill={COLORS[3]}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                  <Bar
                    dataKey="Other"
                    stackId="a"
                    fill={COLORS[4]}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-in-out"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3: Most Visited Cities / Most Visited Countries */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Most Visited Cities */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Most Visited Cities
              </CardTitle>
              <CardDescription>
                Top {pluralize("city", statistics.mostVisitedCities.length)} by
                visit count
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ChartContainer config={chartConfig} className="h-full">
                {(() => {
                  const citiesData = statistics.mostVisitedCities
                    .slice(0, 10)
                    .map((item, index) => ({
                      name: item.city,
                      visits: item.count,
                      fill: getColor(index),
                    }));
                  return (
                    <BarChart data={citiesData}>
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        tickFormatter={(value) => Math.round(value).toString()}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="visits"
                        radius={[4, 4, 0, 0]}
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          const fillColor = payload?.fill || getColor(0);
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={fillColor}
                              rx={4}
                            />
                          );
                        }}
                      />
                    </BarChart>
                  );
                })()}
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Most Visited Countries */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Most Visited Countries
              </CardTitle>
              <CardDescription>
                Top{" "}
                {pluralize("country", statistics.mostVisitedCountries.length)}{" "}
                by visit count
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ChartContainer config={chartConfig} className="h-full">
                {(() => {
                  const countriesData = statistics.mostVisitedCountries
                    .slice(0, 10)
                    .map((item, index) => ({
                      name: item.country,
                      visits: item.count,
                      fill: getColor(index),
                    }));
                  return (
                    <BarChart data={countriesData}>
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        tickFormatter={(value) => Math.round(value).toString()}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="visits"
                        radius={[4, 4, 0, 0]}
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          const fillColor = payload?.fill || getColor(0);
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={fillColor}
                              rx={4}
                            />
                          );
                        }}
                      />
                    </BarChart>
                  );
                })()}
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
