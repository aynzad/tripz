"use client";

import type React from "react";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  type Trip,
  TRANSPORTATION_COLORS,
  TRANSPORTATION_ICONS,
} from "@/lib/types";
import { calculateTotalExpenses } from "@/lib/trips";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { getCityImagePath } from "@/lib/utils";

interface TripMapProps {
  trips: Trip[];
  selectedTripId: string | null;
  onTripSelect: (tripId: string | null) => void;
}

// Map projection utilities (Web Mercator)
function latLngToPoint(lat: number, lng: number, zoom: number, tileSize = 256) {
  const scale = Math.pow(2, zoom) * tileSize;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;
  return { x, y };
}

function pointToLatLng(x: number, y: number, zoom: number, tileSize = 256) {
  const scale = Math.pow(2, zoom) * tileSize;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
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
  _zoom?: number
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // If points are too close, return a straight line
  if (distance < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  // For boat routes, create a path that curves around land (more ocean-going route)
  if (
    isBoat &&
    fromLat !== undefined &&
    fromLng !== undefined &&
    toLat !== undefined &&
    toLng !== undefined
  ) {
    // Calculate geographic midpoint
    const midLat = (fromLat + toLat) / 2;

    // Determine curve direction to avoid land
    // Strategy: curve toward the equator for routes in mid-latitudes (more ocean)
    // or curve toward poles for equatorial routes
    // For transoceanic routes, curve toward the middle of the ocean

    // Calculate the bearing/direction of travel
    const dLng = toLng - fromLng;
    const dLat = toLat - fromLat;

    // Determine which direction to curve to avoid land
    // For east-west routes, curve toward equator (more ocean in mid-latitudes)
    // For north-south routes, curve east or west depending on hemisphere
    let curveDirection = 1; // Default: curve right (clockwise)

    // If route is primarily east-west (longitude change > latitude change)
    if (Math.abs(dLng) > Math.abs(dLat)) {
      // For northern hemisphere routes, curve south (toward equator/ocean)
      // For southern hemisphere routes, curve north (toward equator/ocean)
      if (midLat > 0) {
        curveDirection = -1; // Curve south (down on map = negative Y)
      } else {
        curveDirection = 1; // Curve north (up on map = positive Y)
      }
    } else {
      // For north-south routes, curve east (right) for most cases
      // This tends to go around landmasses
      curveDirection = 1;
    }

    // Calculate perpendicular direction in screen space
    const perpX = -dy / distance;
    const perpY = dx / distance;

    // Apply curve direction
    const perpDirX = perpX * curveDirection;
    const perpDirY = perpY * curveDirection;

    // For boats, create a more pronounced curve that suggests going around land
    const boatCurveFactor = 0.25; // More pronounced curve for maritime routes
    const curveAmount = distance * boatCurveFactor;

    // Create control points that curve away from the direct line
    // Use a single cubic bezier with two control points for a smooth ocean route
    const cp1x = from.x + dx * 0.33 + perpDirX * curveAmount * 0.7;
    const cp1y = from.y + dy * 0.33 + perpDirY * curveAmount * 0.7;
    const cp2x = from.x + dx * 0.67 + perpDirX * curveAmount * 0.8;
    const cp2y = from.y + dy * 0.67 + perpDirY * curveAmount * 0.8;

    // Use a single cubic bezier curve that creates a smooth ocean route
    // This curves away from the direct line to suggest going around landmasses
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  }

  // Calculate curve amount - more pronounced for longer distances and planes
  const curveFactor = isPlane ? 0.15 : 0.12;
  const curveAmount = distance * curveFactor;

  // Calculate perpendicular direction for the control point
  // Rotate the direction vector 90 degrees
  const perpX = -dy / distance;
  const perpY = dx / distance;

  // Control point is offset perpendicular to the line
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const controlX = midX + perpX * curveAmount;
  const controlY = midY + perpY * curveAmount;

  // Create quadratic bezier curve path
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

export default function TripMap({
  trips,
  selectedTripId,
  onTripSelect,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 1200,
    height: 800,
  });
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState({ lat: 45, lng: 10 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLeftMouseDown, setIsLeftMouseDown] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [hoveredDestination, setHoveredDestination] = useState<{
    trip: Trip;
    destination: Trip["destinations"][0];
    position: { x: number; y: number };
  } | null>(null);

  const tileSize = 256;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const mapWidth = containerSize.width;
  const mapHeight = containerSize.height;

  // Calculate bounds from all destinations
  const bounds = useMemo(() => {
    const allDests = trips.flatMap((t) => t.destinations);
    if (allDests.length === 0)
      return { minLat: 35, maxLat: 60, minLng: -10, maxLng: 30 };

    const lats = allDests.map((d) => d.latitude);
    const lngs = allDests.map((d) => d.longitude);

    return {
      minLat: Math.min(...lats) - 2,
      maxLat: Math.max(...lats) + 2,
      minLng: Math.min(...lngs) - 2,
      maxLng: Math.max(...lngs) + 2,
    };
  }, [trips]);

  // Get center point from current view
  const centerPoint = useMemo(() => {
    return latLngToPoint(center.lat, center.lng, zoom, tileSize);
  }, [center, zoom]);

  const projectPoint = useCallback(
    (lat: number, lng: number) => {
      const point = latLngToPoint(lat, lng, zoom, tileSize);
      return {
        x: point.x - centerPoint.x + mapWidth / 2,
        y: point.y - centerPoint.y + mapHeight / 2,
      };
    },
    [zoom, centerPoint, mapWidth, mapHeight]
  );

  // Generate tile URLs for background
  const tiles = useMemo(() => {
    const tilesArray: {
      x: number;
      y: number;
      url: string;
      left: number;
      top: number;
    }[] = [];
    const scale = Math.pow(2, zoom);

    const centerTileX = Math.floor(((center.lng + 180) / 360) * scale);
    const latRad = (center.lat * Math.PI) / 180;
    const centerTileY = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        scale
    );

    const tilesX = Math.ceil(mapWidth / tileSize) + 2;
    const tilesY = Math.ceil(mapHeight / tileSize) + 2;

    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (
        let dy = -Math.floor(tilesY / 2);
        dy <= Math.floor(tilesY / 2);
        dy++
      ) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;

        if (tileX < 0 || tileX >= scale || tileY < 0 || tileY >= scale)
          continue;

        const tileWorldX = tileX * tileSize;
        const tileWorldY = tileY * tileSize;

        const screenX = tileWorldX - centerPoint.x + mapWidth / 2;
        const screenY = tileWorldY - centerPoint.y + mapHeight / 2;

        tilesArray.push({
          x: tileX,
          y: tileY,
          url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tileX}/${tileY}.png`,
          left: screenX,
          top: screenY,
        });
      }
    }

    return tilesArray;
  }, [zoom, center, centerPoint, mapWidth, mapHeight]);

  // Handle zoom
  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 12));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 3));
  const handleReset = () => {
    setZoom(5);
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    setCenter({ lat: centerLat, lng: centerLng });
  };

  // Handle pan with left mouse button
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with left mouse button (button 0) and not on markers
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      // Don't start panning if clicking on a marker or button
      if (
        target.closest('[class*="pointer-events-auto"]') ||
        target.closest("button") ||
        target.closest('[role="button"]')
      ) {
        return;
      }
      e.preventDefault();
      setIsLeftMouseDown(true);
      setHasDragged(false);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLeftMouseDown) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Only consider it a drag if moved more than 3 pixels
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setHasDragged(true);
      e.preventDefault();
    }

    if (hasDragged || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      const newCenterX = centerPoint.x - dx;
      const newCenterY = centerPoint.y - dy;

      const newCenter = pointToLatLng(newCenterX, newCenterY, zoom, tileSize);
      setCenter(newCenter);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsLeftMouseDown(false);
      setHasDragged(false);
    }
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate the lat/lng under the mouse cursor
    const mousePoint = {
      x: mouseX - mapWidth / 2 + centerPoint.x,
      y: mouseY - mapHeight / 2 + centerPoint.y,
    };
    const mouseLatLng = pointToLatLng(
      mousePoint.x,
      mousePoint.y,
      zoom,
      tileSize
    );

    // Determine zoom direction
    const zoomDelta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(3, Math.min(12, zoom + zoomDelta));

    // If zoom changed, adjust center to keep the point under mouse cursor fixed
    if (newZoom !== zoom) {
      const newCenterPoint = latLngToPoint(
        mouseLatLng.lat,
        mouseLatLng.lng,
        newZoom,
        tileSize
      );
      const newCenterX = newCenterPoint.x - (mouseX - mapWidth / 2);
      const newCenterY = newCenterPoint.y - (mouseY - mapHeight / 2);
      const newCenter = pointToLatLng(
        newCenterX,
        newCenterY,
        newZoom,
        tileSize
      );

      setZoom(newZoom);
      setCenter(newCenter);
    }
  };

  // Focus on selected trip
  const focusTrip = useCallback(
    (trip: Trip) => {
      if (trip.destinations.length === 0) return;

      const lats = trip.destinations.map((d) => d.latitude);
      const lngs = trip.destinations.map((d) => d.longitude);

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // Add padding (25% on each side = 50% total)
      const padding = 0.25;

      // Calculate zoom level that fits the bounding box
      // Use an iterative approach to find the right zoom
      let bestZoom = 5;

      for (let testZoom = 3; testZoom <= 12; testZoom++) {
        const scale = Math.pow(2, testZoom) * tileSize;

        // Calculate pixel dimensions of the bounding box at this zoom
        const minLatRad = (minLat * Math.PI) / 180;
        const maxLatRad = (maxLat * Math.PI) / 180;
        const minY =
          ((1 -
            Math.log(Math.tan(minLatRad) + 1 / Math.cos(minLatRad)) / Math.PI) /
            2) *
          scale;
        const maxY =
          ((1 -
            Math.log(Math.tan(maxLatRad) + 1 / Math.cos(maxLatRad)) / Math.PI) /
            2) *
          scale;
        const heightPx = Math.abs(maxY - minY);

        const minX = ((minLng + 180) / 360) * scale;
        const maxX = ((maxLng + 180) / 360) * scale;
        const widthPx = Math.abs(maxX - minX);

        // Account for latitude scaling for longitude
        const centerLatRad = (centerLat * Math.PI) / 180;
        const latScale = Math.cos(centerLatRad);
        const adjustedWidthPx = widthPx * latScale;

        // Check if bounding box fits with padding
        const availableWidth = mapWidth * (1 - padding * 2);
        const availableHeight = mapHeight * (1 - padding * 2);

        if (adjustedWidthPx <= availableWidth && heightPx <= availableHeight) {
          bestZoom = testZoom;
        } else {
          // If it doesn't fit, use the previous zoom level
          break;
        }
      }

      setCenter({ lat: centerLat, lng: centerLng });
      setZoom(bestZoom);
    },
    [mapWidth, mapHeight, tileSize]
  );

  // Auto-focus when trip is selected
  useMemo(() => {
    if (selectedTripId) {
      const trip = trips.find((t) => t.id === selectedTripId);
      if (trip) focusTrip(trip);
    }
  }, [selectedTripId, trips, focusTrip]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const routeData = useMemo(() => {
    return trips.map((trip) => {
      const isSelected = selectedTripId === trip.id;
      const opacity = selectedTripId ? (isSelected ? 1 : 0.15) : 0.8;

      const segments = trip.destinations.slice(0, -1).map((dest, i) => {
        const nextDest = trip.destinations[i + 1];
        const from = projectPoint(dest.latitude, dest.longitude);
        const to = projectPoint(nextDest.latitude, nextDest.longitude);
        const color =
          TRANSPORTATION_COLORS[nextDest.transportationType ?? "default"] ||
          TRANSPORTATION_COLORS.default;
        const isPlane = nextDest.transportationType === "plane";
        const isBoat = nextDest.transportationType === "boat";
        const path = createCurvedPath(
          from,
          to,
          isPlane,
          isBoat,
          dest.latitude,
          dest.longitude,
          nextDest.latitude,
          nextDest.longitude,
          zoom
        );

        return { from, to, color, isPlane, isBoat, isSelected, path };
      });

      return { tripId: trip.id, segments, opacity };
    });
  }, [trips, selectedTripId, projectPoint]);

  const markerData = useMemo(() => {
    return trips.flatMap((trip) => {
      const isSelected = selectedTripId === trip.id;
      const opacity = selectedTripId ? (isSelected ? 1 : 0.2) : 0.9;

      return trip.destinations.map((dest, index) => {
        const point = projectPoint(dest.latitude, dest.longitude);
        const color =
          TRANSPORTATION_COLORS[dest.transportationType ?? "default"] ||
          TRANSPORTATION_COLORS.default;

        return {
          key: `${trip.id}-${index}`,
          trip,
          dest,
          point,
          color,
          isSelected,
          opacity,
          index,
        };
      });
    });
  }, [trips, selectedTripId, projectPoint]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background"
    >
      {/* Map Container */}
      <div
        className="relative w-full h-full"
        style={{ cursor: isLeftMouseDown ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
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

        <svg
          className="absolute inset-0 pointer-events-none"
          width={mapWidth}
          height={mapHeight}
          style={{ width: mapWidth, height: mapHeight }}
        >
          {routeData.map(({ tripId, segments, opacity }) => (
            <g key={tripId} style={{ opacity }}>
              {segments.map((seg, i) => (
                <motion.path
                  key={`${tripId}-line-${i}`}
                  d={seg.path}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={seg.isSelected ? 4 : 2}
                  strokeDasharray={seg.isPlane ? "10,10" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              ))}
            </g>
          ))}
        </svg>

        {/* Destination Markers */}
        {markerData.map((marker) => (
          <motion.div
            key={marker.key}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: `${marker.point.x - 5}px`,
              top: `${marker.point.y - 5}px`,
              opacity: marker.opacity,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: marker.index * 0.1,
              type: "spring",
              stiffness: 300,
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const parentRect = containerRef.current?.getBoundingClientRect();
              if (parentRect) {
                setHoveredDestination({
                  trip: marker.trip,
                  destination: marker.dest,
                  position: {
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top,
                  },
                });
              }
            }}
            onMouseLeave={() => setHoveredDestination(null)}
            onClick={(e) => {
              // Prevent map panning when clicking markers
              e.stopPropagation();
              onTripSelect(
                marker.trip.id === selectedTripId ? null : marker.trip.id
              );
            }}
          >
            <div
              className="rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 box-border"
              style={{
                width: `${marker.isSelected ? 16 : 12}px`,
                height: `${marker.isSelected ? 16 : 12}px`,
                backgroundColor: marker.color,
                boxShadow: `0 0 10px ${marker.color}50`,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Hover Card */}
      <AnimatePresence>
        {hoveredDestination && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 pointer-events-none"
            style={{
              left: Math.min(
                hoveredDestination.position.x + 20,
                mapWidth - 320
              ),
              top: hoveredDestination.position.y - 20,
            }}
          >
            <div className="glass rounded-xl p-4 min-w-[280px] shadow-2xl border border-border/50">
              <div className="relative h-32 -mx-4 -mt-4 mb-3 rounded-t-xl overflow-hidden">
                <Image
                  src={getCityImagePath(hoveredDestination.destination.city)}
                  alt={hoveredDestination.destination.city}
                  fill
                  className="object-cover"
                  sizes="280px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-white font-semibold text-lg">
                    {hoveredDestination.destination.city}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {hoveredDestination.destination.country}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {hoveredDestination.trip.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(hoveredDestination.trip.startDate)} -{" "}
                    {formatDate(hoveredDestination.trip.endDate)}
                  </span>
                </div>
                {hoveredDestination.trip.companions.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{hoveredDestination.trip.companions.join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    €
                    {calculateTotalExpenses(
                      hoveredDestination.trip.expenses
                    ).toFixed(0)}{" "}
                    total
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-40">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          className="glass"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          className="glass"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleReset}
          className="glass"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Transportation Legend */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 glass rounded-lg p-3 h-13 items-center justify-center z-40 max-w-[calc(30%-2rem)]">
        <div className="flex flex-wrap gap-3">
          {Object.entries(TRANSPORTATION_ICONS).map(([type, icon]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TRANSPORTATION_COLORS[type] }}
              />
              <span className="text-xs text-foreground">
                {icon} {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Selection Button */}
      <AnimatePresence>
        {selectedTripId && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => onTripSelect(null)}
            className="absolute top-4 left-4 glass rounded-lg px-4 py-2 z-40 flex items-center gap-2 hover:bg-secondary/50 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Clear selection</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
