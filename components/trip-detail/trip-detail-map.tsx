"use client"

import type React from "react"

import { useState, useMemo, useCallback } from "react"
import type { Trip } from "@/lib/types"
import { TRANSPORTATION_COLORS, TRANSPORTATION_ICONS } from "@/lib/types"
import { motion } from "framer-motion"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TripDetailMapProps {
  trip: Trip
}

// Map projection utilities (Web Mercator)
function latLngToPoint(lat: number, lng: number, zoom: number, tileSize = 256) {
  const scale = Math.pow(2, zoom) * tileSize
  const x = ((lng + 180) / 360) * scale
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  return { x, y }
}

function pointToLatLng(x: number, y: number, zoom: number, tileSize = 256) {
  const scale = Math.pow(2, zoom) * tileSize
  const lng = (x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

export default function TripDetailMap({ trip }: TripDetailMapProps) {
  const mapWidth = 800
  const mapHeight = 500
  const tileSize = 256

  // Calculate initial center and zoom from trip destinations
  const initialView = useMemo(() => {
    const lats = trip.destinations.map((d) => d.latitude)
    const lngs = trip.destinations.map((d) => d.longitude)
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

    // Calculate appropriate zoom level
    const latRange = Math.max(...lats) - Math.min(...lats)
    const lngRange = Math.max(...lngs) - Math.min(...lngs)
    const maxRange = Math.max(latRange, lngRange)
    let zoom = 6
    if (maxRange > 20) zoom = 4
    else if (maxRange > 10) zoom = 5
    else if (maxRange > 5) zoom = 6
    else zoom = 7

    return { lat: centerLat, lng: centerLng, zoom }
  }, [trip.destinations])

  const [zoom, setZoom] = useState(initialView.zoom)
  const [center, setCenter] = useState({ lat: initialView.lat, lng: initialView.lng })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Get center point from current view
  const centerPoint = useMemo(() => {
    return latLngToPoint(center.lat, center.lng, zoom, tileSize)
  }, [center, zoom])

  // Project lat/lng to SVG coordinates
  const projectPoint = useCallback(
    (lat: number, lng: number) => {
      const point = latLngToPoint(lat, lng, zoom, tileSize)
      return {
        x: point.x - centerPoint.x + mapWidth / 2,
        y: point.y - centerPoint.y + mapHeight / 2,
      }
    },
    [zoom, centerPoint],
  )

  // Generate tile URLs for background
  const tiles = useMemo(() => {
    const tilesArray: { x: number; y: number; url: string; left: number; top: number }[] = []
    const scale = Math.pow(2, zoom)

    const centerTileX = Math.floor(((center.lng + 180) / 360) * scale)
    const latRad = (center.lat * Math.PI) / 180
    const centerTileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)

    const tilesX = Math.ceil(mapWidth / tileSize) + 2
    const tilesY = Math.ceil(mapHeight / tileSize) + 2

    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
        const tileX = centerTileX + dx
        const tileY = centerTileY + dy

        if (tileX < 0 || tileX >= scale || tileY < 0 || tileY >= scale) continue

        const tileWorldX = tileX * tileSize
        const tileWorldY = tileY * tileSize

        const screenX = tileWorldX - centerPoint.x + mapWidth / 2
        const screenY = tileWorldY - centerPoint.y + mapHeight / 2

        tilesArray.push({
          x: tileX,
          y: tileY,
          url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tileX}/${tileY}.png`,
          left: screenX,
          top: screenY,
        })
      }
    }

    return tilesArray
  }, [zoom, center, centerPoint])

  // Handle zoom
  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 12))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 3))
  const handleReset = () => {
    setZoom(initialView.zoom)
    setCenter({ lat: initialView.lat, lng: initialView.lng })
  }

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    const newCenterX = centerPoint.x - dx
    const newCenterY = centerPoint.y - dy

    const newCenter = pointToLatLng(newCenterX, newCenterY, zoom, tileSize)
    setCenter(newCenter)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-background">
      {/* Map Container */}
      <div
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Tile Layer */}
        <div className="absolute inset-0 overflow-hidden">
          {tiles.map((tile) => (
            <img
              key={`${tile.x}-${tile.y}-${zoom}`}
              src={tile.url || "/placeholder.svg"}
              alt=""
              className="absolute pointer-events-none"
              style={{
                left: tile.left,
                top: tile.top,
                width: tileSize,
                height: tileSize,
              }}
              draggable={false}
            />
          ))}
        </div>

        {/* SVG Overlay for Routes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
          {/* Route Lines */}
          {trip.destinations.slice(0, -1).map((dest, i) => {
            const nextDest = trip.destinations[i + 1]
            const from = projectPoint(dest.latitude, dest.longitude)
            const to = projectPoint(nextDest.latitude, nextDest.longitude)
            const color = TRANSPORTATION_COLORS[nextDest.transportationType] || TRANSPORTATION_COLORS.default
            const isPlane = nextDest.transportationType === "plane"

            return (
              <motion.line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth={4}
                strokeDasharray={isPlane ? "10,10" : undefined}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: i * 0.3 }}
              />
            )
          })}
        </svg>

        {/* Destination Markers */}
        {trip.destinations.map((dest, index) => {
          const point = projectPoint(dest.latitude, dest.longitude)
          const isStart = index === 0
          const isEnd = index === trip.destinations.length - 1
          const color =
            isStart || isEnd
              ? "#f59e0b"
              : TRANSPORTATION_COLORS[dest.transportationType] || TRANSPORTATION_COLORS.default

          return (
            <motion.div
              key={index}
              className="absolute pointer-events-auto group"
              style={{
                left: point.x,
                top: point.y,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 300 }}
            >
              <div
                className="rounded-full border-3 border-white shadow-lg"
                style={{
                  width: isStart || isEnd ? 20 : 14,
                  height: isStart || isEnd ? 20 : 14,
                  backgroundColor: color,
                  boxShadow: `0 0 15px ${color}60`,
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                <strong>{dest.city}</strong>
                <br />
                {dest.country}
                {dest.transportationType && (
                  <>
                    <br />
                    {TRANSPORTATION_ICONS[dest.transportationType]} {dest.transportationType}
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-40">
        <Button variant="secondary" size="icon" onClick={handleZoomIn} className="h-8 w-8">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} className="h-8 w-8">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleReset} className="h-8 w-8">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Transportation Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg p-3 z-40 border border-border/50">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Route</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(trip.destinations.map((d) => d.transportationType).filter(Boolean))).map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRANSPORTATION_COLORS[type!] }} />
              <span className="text-xs text-foreground">
                {TRANSPORTATION_ICONS[type!]} {type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
