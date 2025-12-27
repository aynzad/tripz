"use client"

import type { Expenses } from "@/lib/types"
import { calculateTotalExpenses } from "@/lib/trips"
import { motion } from "framer-motion"
import { Home, Utensils, Car, Ticket, Package } from "lucide-react"

interface ExpenseBreakdownProps {
  expenses: Expenses
  nights: number
}

const EXPENSE_CONFIG = {
  hotel: { label: "Accommodation", icon: Home, color: "#3b82f6" },
  food: { label: "Food & Dining", icon: Utensils, color: "#22c55e" },
  transportation: { label: "Transportation", icon: Car, color: "#f59e0b" },
  entryFees: { label: "Entry Fees", icon: Ticket, color: "#8b5cf6" },
  other: { label: "Other", icon: Package, color: "#6b7280" },
}

export default function ExpenseBreakdown({ expenses, nights }: ExpenseBreakdownProps) {
  const total = calculateTotalExpenses(expenses)

  const sortedExpenses = Object.entries(expenses)
    .map(([key, value]) => ({
      key: key as keyof Expenses,
      value,
      ...EXPENSE_CONFIG[key as keyof typeof EXPENSE_CONFIG],
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Total */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Total Expenses</span>
          <span className="text-3xl font-bold text-accent">€{total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Per Night Average</span>
          <span className="font-medium">€{(total / nights).toFixed(2)}</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-6 space-y-4">
        {sortedExpenses.map(({ key, value, label, icon: Icon, color }, index) => {
          const percentage = total > 0 ? (value / total) * 100 : 0

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="font-medium">{label}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">€{value.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground ml-2">({percentage.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
