"use client"

import React, { createContext, useContext, useState } from "react"
import type { Clinic } from "@/lib/types"

interface ClinicContextType {
  selectedClinicId: string
  setSelectedClinicId: (id: string) => void
  selectedClinic: Clinic | null
  setSelectedClinic: (clinic: Clinic | null) => void
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [selectedClinicId, setSelectedClinicId] = useState("all")
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)

  return (
    <ClinicContext.Provider 
      value={{ 
        selectedClinicId, 
        setSelectedClinicId, 
        selectedClinic, 
        setSelectedClinic 
      }}
    >
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider')
  }
  return context
}
