export type TransportationType = "car" | "plane" | "train" | "bus" | "boat" | null

export type Expenses = {
  hotel: number
  food: number
  transportation: number
  entryFees: number
  other: number
}

export type Destination = {
  id: string
  city: string
  country: string
  latitude: number
  longitude: number
  transportationType: TransportationType
  order: number
}

export type Trip = {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  destinations: Destination[]
  companions: string[]
  expenses: Expenses
}

export type TripInput = {
  id?: string
  name: string
  description: string
  startDate: string
  endDate: string
  destinations: {
    city: string
    country: string
    latitude: number
    longitude: number
    transportationType: TransportationType
  }[]
  companions: string[]
  expenses: Expenses
}

export const TRANSPORTATION_COLORS: Record<string, string> = {
  plane: "#3b82f6", // blue
  train: "#22c55e", // green
  car: "#f59e0b", // amber
  bus: "#8b5cf6", // purple
  boat: "#06b6d4", // cyan
  default: "#6b7280", // gray
}

export const TRANSPORTATION_ICONS: Record<string, string> = {
  plane: "✈️",
  train: "🚄",
  car: "🚗",
  bus: "🚌",
  boat: "⛵",
}
