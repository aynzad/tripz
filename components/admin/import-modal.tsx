"use client"

import type React from "react"

import { useState, useCallback } from "react"
import type { Trip, TripInput } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { X, Upload, FileJson, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { importTrips } from "@/app/admin/actions"
import pluralize from "pluralize"

interface ImportModalProps {
  onClose: () => void
  onImportComplete: (trips: Trip[]) => void
}

export default function ImportModal({ onClose, onImportComplete }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [jsonContent, setJsonContent] = useState<TripInput[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateAndParseJson = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data)) {
        throw new Error("JSON must be an array of trips")
      }

      for (let i = 0; i < data.length; i++) {
        const trip = data[i]
        if (!trip.name) throw new Error(`Trip at index ${i} is missing 'name'`)
        if (!trip.startDate) throw new Error(`Trip at index ${i} is missing 'startDate'`)
        if (!trip.endDate) throw new Error(`Trip at index ${i} is missing 'endDate'`)
        if (!Array.isArray(trip.destinations)) {
          throw new Error(`Trip at index ${i} is missing 'destinations' array`)
        }
      }

      setJsonContent(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON file")
      setJsonContent(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "application/json") {
      setFile(droppedFile)
      validateAndParseJson(droppedFile)
    } else {
      setError("Please drop a valid JSON file")
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      validateAndParseJson(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!jsonContent) return

    setIsImporting(true)
    try {
      const imported = await importTrips(jsonContent)
      onImportComplete(imported)
    } catch {
      setError("Failed to import trips")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold">Import Trips</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/10" : "border-border"}
              ${file && !error ? "border-green-500 bg-green-500/10" : ""}
              ${error ? "border-destructive bg-destructive/10" : ""}
            `}
          >
            {file && !error ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{jsonContent?.length || 0} {pluralize("trip", jsonContent?.length || 0)} ready to import</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Validation Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileJson className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your JSON file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Format Info */}
          <div className="mt-4 p-4 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Expected format:</p>
            <pre className="text-xs overflow-x-auto">
              {`[{
  "id": "trip-1",
  "name": "Trip Name",
  "startDate": "2024-01-01",
  "endDate": "2024-01-05",
  "destinations": [...],
  "companions": [...],
  "expenses": {...}
}]`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!jsonContent || isImporting}>
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Import {jsonContent?.length || 0} {pluralize("Trip", jsonContent?.length || 0)}
          </Button>
        </div>
      </div>
    </div>
  )
}
