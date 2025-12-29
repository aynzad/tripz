'use client'

import type React from 'react'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { Trip } from '@/lib/types'
import { TRANSPORTATION_COLORS, TRANSPORTATION_ICONS } from '@/lib/types'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

// Generate a curved path between two points
function createCurvedPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  isPlane: boolean = false,
  isBoat: boolean = false,
  fromLat?: number,
  fromLng?: number,
  toLat?: number,
  toLng?: number,
  _zoom?: number,
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // If points are too close, return a straight line
  if (distance < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  }

  // For boat routes, create a path that curves around land (more ocean-going route)
  if (isBoat && fromLat !== undefined && fromLng !== undefined && toLat !== undefined && toLng !== undefined) {
    // Calculate geographic midpoint
    const midLat = (fromLat + toLat) / 2

    // Determine curve direction to avoid land
    // Strategy: curve toward the equator for routes in mid-latitudes (more ocean)
    // or curve toward poles for equatorial routes
    // For transoceanic routes, curve toward the middle of the ocean

    // Calculate the bearing/direction of travel
    const dLng = toLng - fromLng
    const dLat = toLat - fromLat

    // Determine which direction to curve to avoid land
    // For east-west routes, curve toward equator (more ocean in mid-latitudes)
    // For north-south routes, curve east or west depending on hemisphere
    let curveDirection = 1 // Default: curve right (clockwise)

    // If route is primarily east-west (longitude change > latitude change)
    if (Math.abs(dLng) > Math.abs(dLat)) {
      // For northern hemisphere routes, curve south (toward equator/ocean)
      // For southern hemisphere routes, curve north (toward equator/ocean)
      if (midLat > 0) {
        curveDirection = -1 // Curve south (down on map = negative Y)
      } else {
        curveDirection = 1 // Curve north (up on map = positive Y)
      }
    } else {
      // For north-south routes, curve east (right) for most cases
      // This tends to go around landmasses
      curveDirection = 1
    }

    // Calculate perpendicular direction in screen space
    const perpX = -dy / distance
    const perpY = dx / distance

    // Apply curve direction
    const perpDirX = perpX * curveDirection
    const perpDirY = perpY * curveDirection

    // For boats, create a more pronounced curve that suggests going around land
    const boatCurveFactor = 0.25 // More pronounced curve for maritime routes
    const curveAmount = distance * boatCurveFactor

    // Create control points that curve away from the direct line
    // Use a single cubic bezier with two control points for a smooth ocean route
    const cp1x = from.x + dx * 0.33 + perpDirX * curveAmount * 0.7
    const cp1y = from.y + dy * 0.33 + perpDirY * curveAmount * 0.7
    const cp2x = from.x + dx * 0.67 + perpDirX * curveAmount * 0.8
    const cp2y = from.y + dy * 0.67 + perpDirY * curveAmount * 0.8

    // Use a single cubic bezier curve that creates a smooth ocean route
    // This curves away from the direct line to suggest going around landmasses
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`
  }

  // Calculate curve amount - more pronounced for longer distances and planes
  const curveFactor = isPlane ? 0.15 : 0.12
  const curveAmount = distance * curveFactor

  // Calculate perpendicular direction for the control point
  // Rotate the direction vector 90 degrees
  const perpX = -dy / distance
  const perpY = dx / distance

  // Control point is offset perpendicular to the line
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const controlX = midX + perpX * curveAmount
  const controlY = midY + perpY * curveAmount

  // Create quadratic bezier curve path
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
}

export default function TripDetailMap({ trip }: TripDetailMapProps) {
  'use no memo'

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 500,
  })
  const tileSize = 256

  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  const mapWidth = containerSize.width
  const mapHeight = containerSize.height

  // Calculate initial center and zoom from trip destinations
  const initialView = useMemo(() => {
    if (trip.destinations.length === 0) {
      return { lat: 45, lng: 10, zoom: 5 }
    }

    const lats = trip.destinations.map((d) => d.latitude)
    const lngs = trip.destinations.map((d) => d.longitude)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Add padding (25% on each side = 50% total)
    const padding = 0.25

    // Calculate zoom level that fits the bounding box
    // Use an iterative approach to find the right zoom
    const tileSize = 256
    let bestZoom = 5

    for (let testZoom = 3; testZoom <= 12; testZoom++) {
      const scale = Math.pow(2, testZoom) * tileSize

      // Calculate pixel dimensions of the bounding box at this zoom
      const minLatRad = (minLat * Math.PI) / 180
      const maxLatRad = (maxLat * Math.PI) / 180
      const minY = ((1 - Math.log(Math.tan(minLatRad) + 1 / Math.cos(minLatRad)) / Math.PI) / 2) * scale
      const maxY = ((1 - Math.log(Math.tan(maxLatRad) + 1 / Math.cos(maxLatRad)) / Math.PI) / 2) * scale
      const heightPx = Math.abs(maxY - minY)

      const minX = ((minLng + 180) / 360) * scale
      const maxX = ((maxLng + 180) / 360) * scale
      const widthPx = Math.abs(maxX - minX)

      // Account for latitude scaling for longitude
      const centerLatRad = (centerLat * Math.PI) / 180
      const latScale = Math.cos(centerLatRad)
      const adjustedWidthPx = widthPx * latScale

      // Check if bounding box fits with padding
      const availableWidth = mapWidth * (1 - padding * 2)
      const availableHeight = mapHeight * (1 - padding * 2)

      if (adjustedWidthPx <= availableWidth && heightPx <= availableHeight) {
        bestZoom = testZoom
      } else {
        // If it doesn't fit, use the previous zoom level
        break
      }
    }

    return { lat: centerLat, lng: centerLng, zoom: bestZoom }
  }, [trip.destinations, mapWidth, mapHeight])

  const [zoom, setZoom] = useState(initialView.zoom)
  const [center, setCenter] = useState({
    lat: initialView.lat,
    lng: initialView.lng,
  })
  const [isLeftMouseDown, setIsLeftMouseDown] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; touches: React.TouchList | null } | null>(null)
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null)
  const [initialZoom, setInitialZoom] = useState<number | null>(null)
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [pinchCenter, setPinchCenter] = useState<{ x: number; y: number } | null>(null)

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
    [zoom, centerPoint.x, centerPoint.y, mapWidth, mapHeight],
  )

  // Generate tile URLs for background
  const tiles = useMemo(() => {
    const tilesArray: {
      x: number
      y: number
      url: string
      left: number
      top: number
    }[] = []
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
  }, [zoom, center.lng, center.lat, mapWidth, mapHeight, centerPoint.x, centerPoint.y])

  // Handle zoom
  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 12))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 3))
  const handleReset = () => {
    setZoom(initialView.zoom)
    setCenter({ lat: initialView.lat, lng: initialView.lng })
  }

  // Handle pan with left mouse button
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with left mouse button (button 0) and not on markers
    if (e.button === 0) {
      const target = e.target as HTMLElement
      // Don't start panning if clicking on a marker or button
      if (
        target.closest('[class*="pointer-events-auto"]') ||
        target.closest('button') ||
        target.closest('[role="button"]')
      ) {
        return
      }
      e.preventDefault()
      setIsLeftMouseDown(true)
      setHasDragged(false)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLeftMouseDown) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    // Only consider it a drag if moved more than 3 pixels
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setHasDragged(true)
      e.preventDefault()
    }

    if (hasDragged || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      const newCenterX = centerPoint.x - dx
      const newCenterY = centerPoint.y - dy

      const newCenter = pointToLatLng(newCenterX, newCenterY, zoom, tileSize)
      setCenter(newCenter)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsLeftMouseDown(false)
      setHasDragged(false)
    }
  }

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate the lat/lng under the mouse cursor
    const mousePoint = {
      x: mouseX - mapWidth / 2 + centerPoint.x,
      y: mouseY - mapHeight / 2 + centerPoint.y,
    }
    const mouseLatLng = pointToLatLng(mousePoint.x, mousePoint.y, zoom, tileSize)

    // Determine zoom direction
    const zoomDelta = e.deltaY > 0 ? -1 : 1
    const newZoom = Math.max(3, Math.min(12, zoom + zoomDelta))

    // If zoom changed, adjust center to keep the point under mouse cursor fixed
    if (newZoom !== zoom) {
      const newCenterPoint = latLngToPoint(mouseLatLng.lat, mouseLatLng.lng, newZoom, tileSize)
      const newCenterX = newCenterPoint.x - (mouseX - mapWidth / 2)
      const newCenterY = newCenterPoint.y - (mouseY - mapHeight / 2)
      const newCenter = pointToLatLng(newCenterX, newCenterY, newZoom, tileSize)

      setZoom(newZoom)
      setCenter(newCenter)
    }
  }

  // Calculate distance between two touches
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Get center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }
  }

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return

    const target = e.target as HTMLElement
    // Don't start panning if touching on a marker or button
    if (
      target.closest('[class*="pointer-events-auto"]') ||
      target.closest('button') ||
      target.closest('[role="button"]')
    ) {
      return
    }

    if (e.touches.length === 1) {
      // Single touch - prepare for panning
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        touches: e.touches,
      })
      setInitialPinchDistance(null)
      setInitialZoom(null)
      setInitialCenter(null)
      setPinchCenter(null)
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = getTouchDistance(touch1, touch2)
      const touchCenterPoint = getTouchCenter(touch1, touch2)

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = touchCenterPoint.x - rect.left
      const centerY = touchCenterPoint.y - rect.top

      setTouchStart(null)
      setInitialPinchDistance(distance)
      setInitialZoom(zoom)
      setInitialCenter({ lat: center.lat, lng: center.lng })
      setPinchCenter({ x: centerX, y: centerY })
    }
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()

    if (!containerRef.current) return

    if (e.touches.length === 1 && touchStart) {
      // Single touch panning
      const touch = e.touches[0]
      const dx = touch.clientX - touchStart.x
      const dy = touch.clientY - touchStart.y

      // Only pan if moved more than 3 pixels
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const newCenterX = centerPoint.x - dx
        const newCenterY = centerPoint.y - dy

        const newCenter = pointToLatLng(newCenterX, newCenterY, zoom, tileSize)
        setCenter(newCenter)
        setTouchStart({
          x: touch.clientX,
          y: touch.clientY,
          touches: e.touches,
        })
      }
    } else if (
      e.touches.length === 2 &&
      initialPinchDistance !== null &&
      initialZoom !== null &&
      initialCenter !== null &&
      pinchCenter
    ) {
      // Two touches - pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const currentDistance = getTouchDistance(touch1, touch2)

      // Calculate zoom based on distance change
      const scale = currentDistance / initialPinchDistance
      const zoomDelta = Math.log2(scale)
      const newZoom = Math.max(3, Math.min(12, initialZoom + zoomDelta))

      if (newZoom !== initialZoom) {
        // Calculate the lat/lng under the pinch center using initial zoom and center
        const initialCenterPoint = latLngToPoint(initialCenter.lat, initialCenter.lng, initialZoom, tileSize)
        const mousePoint = {
          x: pinchCenter.x - mapWidth / 2 + initialCenterPoint.x,
          y: pinchCenter.y - mapHeight / 2 + initialCenterPoint.y,
        }
        const mouseLatLng = pointToLatLng(mousePoint.x, mousePoint.y, initialZoom, tileSize)

        // Adjust center to keep the point under pinch center fixed
        const newCenterPoint = latLngToPoint(mouseLatLng.lat, mouseLatLng.lng, newZoom, tileSize)
        const newCenterX = newCenterPoint.x - (pinchCenter.x - mapWidth / 2)
        const newCenterY = newCenterPoint.y - (pinchCenter.y - mapHeight / 2)
        const newCenter = pointToLatLng(newCenterX, newCenterY, newZoom, tileSize)

        setZoom(newZoom)
        setCenter(newCenter)
      }
    }
  }

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All touches ended
      setTouchStart(null)
      setInitialPinchDistance(null)
      setInitialZoom(null)
      setInitialCenter(null)
      setPinchCenter(null)
    } else if (e.touches.length === 1 && initialPinchDistance !== null) {
      // Switched from two touches to one touch - reset to single touch panning
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        touches: e.touches,
      })
      setInitialPinchDistance(null)
      setInitialZoom(null)
      setInitialCenter(null)
      setPinchCenter(null)
    }
  }

  return (
    <div ref={containerRef} className="bg-background relative h-full w-full overflow-hidden rounded-xl">
      {/* Map Container */}
      <div
        className="relative h-full w-full touch-none"
        style={{ cursor: isLeftMouseDown ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Tile Layer */}
        <div className="absolute inset-0 overflow-hidden">
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${tile.x}-${tile.y}-${zoom}`}
              src={tile.url || '/placeholder.svg'}
              alt=""
              className="pointer-events-none absolute"
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
        <svg
          className="pointer-events-none absolute inset-0"
          width={mapWidth}
          height={mapHeight}
          style={{ width: mapWidth, height: mapHeight }}
        >
          {/* Route Lines */}
          {trip.destinations.slice(0, -1).map((dest, i) => {
            const nextDest = trip.destinations[i + 1]
            const from = projectPoint(dest.latitude, dest.longitude)
            const to = projectPoint(nextDest.latitude, nextDest.longitude)
            const color =
              (nextDest.transportationType && TRANSPORTATION_COLORS[nextDest.transportationType]) ||
              TRANSPORTATION_COLORS.default
            const isPlane = nextDest.transportationType === 'plane'
            const isBoat = nextDest.transportationType === 'boat'
            const path = createCurvedPath(
              from,
              to,
              isPlane,
              isBoat,
              dest.latitude,
              dest.longitude,
              nextDest.latitude,
              nextDest.longitude,
              zoom,
            )

            return (
              <motion.path
                key={i}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeDasharray={isPlane ? '10,10' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
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
              ? '#f59e0b'
              : (dest.transportationType && TRANSPORTATION_COLORS[dest.transportationType]) ||
                TRANSPORTATION_COLORS.default

          return (
            <motion.div
              key={index}
              className="group pointer-events-auto absolute"
              style={{
                left: `${point.x - 10}px`,
                top: `${point.y - 10}px`,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 300,
              }}
            >
              <div
                className="box-border rounded-full border-2 border-white shadow-lg"
                style={{
                  width: `${isStart || isEnd ? 20 : 14}px`,
                  height: `${isStart || isEnd ? 20 : 14}px`,
                  backgroundColor: color,
                  boxShadow: `0 0 15px ${color}60`,
                }}
              />
              {/* Tooltip */}
              <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
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
      <div className="bg-card/90 border-border/50 absolute bottom-4 left-4 z-40 rounded-lg border p-3 backdrop-blur">
        <p className="text-muted-foreground mb-2 text-xs font-medium">Route</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(trip.destinations.map((d) => d.transportationType).filter(Boolean))).map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: TRANSPORTATION_COLORS[type!] }} />
              <span className="text-foreground text-xs">
                {TRANSPORTATION_ICONS[type!]} {type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
