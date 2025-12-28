'use client'

import { useState, useMemo } from 'react'
import { type Trip, TRANSPORTATION_COLORS, TRANSPORTATION_ICONS } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Calendar, Car, Users, Globe, DollarSign, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'

export interface FilterState {
  dateRange: [number, number]
  transportationTypes: string[]
  companions: string[]
  countries: string[]
  expenseRange: [number, number]
  expensePerNightRange: [number, number]
}

interface FilterBarProps {
  trips: Trip[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  allCompanions: string[]
  allCountries: string[]
  expenseBounds: [number, number]
  expensePerNightBounds: [number, number]
  dateBounds: [number, number]
}

export default function FilterBar({
  filters,
  onFiltersChange,
  allCompanions,
  allCountries,
  expenseBounds,
  expensePerNightBounds,
  dateBounds,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const transportationTypes = ['plane', 'train', 'car', 'bus', 'boat']

  const hasActiveFilters = useMemo(() => {
    return (
      filters.transportationTypes.length > 0 ||
      filters.companions.length > 0 ||
      filters.countries.length > 0 ||
      filters.dateRange[0] !== dateBounds[0] ||
      filters.dateRange[1] !== dateBounds[1] ||
      filters.expenseRange[0] !== expenseBounds[0] ||
      filters.expenseRange[1] !== expenseBounds[1] ||
      filters.expensePerNightRange[0] !== expensePerNightBounds[0] ||
      filters.expensePerNightRange[1] !== expensePerNightBounds[1]
    )
  }, [filters, dateBounds, expenseBounds, expensePerNightBounds])

  const resetFilters = () => {
    onFiltersChange({
      dateRange: dateBounds,
      transportationTypes: [],
      companions: [],
      countries: [],
      expenseRange: expenseBounds,
      expensePerNightRange: expensePerNightBounds,
    })
  }

  const toggleTransportation = (type: string) => {
    const newTypes = filters.transportationTypes.includes(type)
      ? filters.transportationTypes.filter((t) => t !== type)
      : [...filters.transportationTypes, type]
    onFiltersChange({ ...filters, transportationTypes: newTypes })
  }

  const toggleCompanion = (companion: string) => {
    const newCompanions = filters.companions.includes(companion)
      ? filters.companions.filter((c) => c !== companion)
      : [...filters.companions, companion]
    onFiltersChange({ ...filters, companions: newCompanions })
  }

  const toggleCountry = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter((c) => c !== country)
      : [...filters.countries, country]
    onFiltersChange({ ...filters, countries: newCountries })
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-4 z-1000 w-[calc(60%-2rem)]"
    >
      <div className="glass overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div
          className="hover:bg-secondary/20 flex cursor-pointer items-center justify-between px-4 py-3 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Filter className="text-primary h-5 w-5" />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  resetFilters()
                }}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset
              </Button>
            )}
            {isExpanded ? (
              <ChevronDown className="text-muted-foreground h-5 w-5" />
            ) : (
              <ChevronUp className="text-muted-foreground h-5 w-5" />
            )}
          </div>
        </div>

        {/* Filter Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 px-4 pb-4">
                {/* Timeline Slider */}
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Timeline</span>
                    <span className="text-foreground ml-auto">
                      {formatDate(filters.dateRange[0])} - {formatDate(filters.dateRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={filters.dateRange}
                    min={dateBounds[0]}
                    max={dateBounds[1]}
                    step={86400000 * 30} // 30 days
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        dateRange: value as [number, number],
                      })
                    }
                    className="py-2"
                  />
                </div>

                {/* Transportation Types */}
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4" />
                    <span>Transportation</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transportationTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleTransportation(type)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                          filters.transportationTypes.includes(type)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-foreground hover:bg-secondary'
                        } `}
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: TRANSPORTATION_COLORS[type],
                          }}
                        />
                        {TRANSPORTATION_ICONS[type]} {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Companions */}
                  {allCompanions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>Companions</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allCompanions.map((companion) => (
                          <button
                            key={companion}
                            onClick={() => toggleCompanion(companion)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                              filters.companions.includes(companion)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary/50 text-foreground hover:bg-secondary'
                            } `}
                          >
                            {companion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Countries */}
                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <span>Countries</span>
                    </div>
                    <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto">
                      {allCountries.map((country) => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                            filters.countries.includes(country)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary'
                          } `}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expense Sliders */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>Total Expenses</span>
                      <span className="text-foreground ml-auto">
                        {formatCurrency(filters.expenseRange[0], 0)} - {formatCurrency(filters.expenseRange[1], 0)}
                      </span>
                    </div>
                    <Slider
                      value={filters.expenseRange}
                      min={expenseBounds[0]}
                      max={expenseBounds[1]}
                      step={50}
                      onValueChange={(value) =>
                        onFiltersChange({
                          ...filters,
                          expenseRange: value as [number, number],
                        })
                      }
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>Per Night</span>
                      <span className="text-foreground ml-auto">
                        {formatCurrency(filters.expensePerNightRange[0], 0)} -{' '}
                        {formatCurrency(filters.expensePerNightRange[1], 0)}
                      </span>
                    </div>
                    <Slider
                      value={filters.expensePerNightRange}
                      min={expensePerNightBounds[0]}
                      max={expensePerNightBounds[1]}
                      step={10}
                      onValueChange={(value) =>
                        onFiltersChange({
                          ...filters,
                          expensePerNightRange: value as [number, number],
                        })
                      }
                      className="py-2"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
