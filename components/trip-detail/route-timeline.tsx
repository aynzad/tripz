'use client'

import type { Destination } from '@/lib/types'
import { TRANSPORTATION_COLORS, TRANSPORTATION_ICONS } from '@/lib/types'
import { motion } from 'framer-motion'
import { Home, MapPin } from 'lucide-react'
import Link from 'next/link'
import { normalizeCityNameForUrl } from '@/lib/utils'

interface RouteTimelineProps {
  destinations: Destination[]
}

export default function RouteTimeline({ destinations }: RouteTimelineProps) {
  return (
    <div className="space-y-0">
      {destinations.map((dest, index) => {
        const isFirst = index === 0
        const isLast = index === destinations.length - 1
        const nextDest = destinations[index + 1]

        return (
          <motion.div
            key={`${dest.id}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Connector Line */}
            {!isLast && (
              <div
                className="absolute top-12 left-[19px] h-full w-0.5 -translate-x-1/2 -translate-y-2"
                style={{
                  backgroundColor: nextDest?.transportationType
                    ? TRANSPORTATION_COLORS[nextDest.transportationType] || TRANSPORTATION_COLORS.default
                    : TRANSPORTATION_COLORS.default,
                }}
              />
            )}

            {/* Destination Card */}
            <div className="flex gap-4 pb-6">
              {/* Icon */}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isFirst || isLast ? 'bg-accent' : 'bg-primary'} text-primary-foreground`}
              >
                {isFirst ? (
                  <Home className="h-4 w-4" />
                ) : isLast ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{index}</span>
                )}
              </div>

              {/* Content */}
              <div className="bg-card border-border flex-1 rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/cities/${normalizeCityNameForUrl(dest.city)}`}
                      className="hover:text-primary transition-colors"
                    >
                      <h3 className="text-foreground font-semibold">{dest.city}</h3>
                    </Link>
                    <p className="text-muted-foreground text-sm">{dest.country}</p>
                  </div>
                  {dest.transportationType && (
                    <div
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        backgroundColor:
                          TRANSPORTATION_COLORS[dest.transportationType] || TRANSPORTATION_COLORS.default,
                        color: '#fff',
                      }}
                    >
                      {TRANSPORTATION_ICONS[dest.transportationType]} {dest.transportationType}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
