'use client'

import type { Expenses } from '@/lib/types'
import { calculateTotalExpenses } from '@/lib/trips-utils'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Home, Utensils, Ticket, Package, Plane } from 'lucide-react'

interface ExpenseBreakdownProps {
  expenses: Expenses
  nights: number
}

const EXPENSE_CONFIG = {
  hotel: { label: 'Accommodation', icon: Home, color: '#3b82f6' },
  food: { label: 'Food & Dining', icon: Utensils, color: '#22c55e' },
  transportation: { label: 'Transportation', icon: Plane, color: '#f59e0b' },
  entryFees: { label: 'Entry Fees', icon: Ticket, color: '#8b5cf6' },
  other: { label: 'Other', icon: Package, color: '#6b7280' },
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
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      {/* Total */}
      <div className="border-border border-b p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-muted-foreground">Total Expenses</span>
          <span className="text-accent text-2xl font-bold md:text-3xl">{formatCurrency(total, 2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Per Night Average</span>
          <span className="text-xs font-medium md:text-sm">{formatCurrency(total / nights, 2)}</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-4 p-6">
        {sortedExpenses.map(({ key, value, label, icon: Icon, color }, index) => {
          const percentage = total > 0 ? (value / total) * 100 : 0

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <span className="text-xs font-medium md:text-sm">{label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold md:text-sm">{formatCurrency(value, 2)}</span>
                  <span className="text-muted-foreground ml-2 text-xs md:text-sm">({percentage.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="bg-secondary h-2 overflow-hidden rounded-full">
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
