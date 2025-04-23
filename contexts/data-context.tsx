"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useClinic } from "./clinic-context"
import { useAuth } from "./auth-context"
import { getDoctors, getConsultations, getExams } from "@/lib/firebase"

interface DataContextType {
  doctors: any[]
  consultations: any[]
  exams: any[]
  loading: boolean
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [doctors, setDoctors] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { selectedClinicId } = useClinic()
  const { user } = useAuth()

  const fetchData = async () => {
    setLoading(true)
    try {
      // For admin users, use selected clinic. For others, use their assigned clinic
      const clinicId = user?.type === 'admin' ? selectedClinicId : user?.clinicId

      // If admin selects 'all', fetch all data, otherwise fetch clinic-specific data
      const [fetchedDoctors, fetchedConsultations, fetchedExams] = await Promise.all([
        getDoctors(clinicId === 'all' ? undefined : clinicId),
        getConsultations(clinicId === 'all' ? undefined : clinicId),
        getExams(clinicId === 'all' ? undefined : clinicId)
      ])

      setDoctors(fetchedDoctors)
      setConsultations(fetchedConsultations)
      setExams(fetchedExams)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh data when clinic selection changes or user changes
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [selectedClinicId, user])

  return (
    <DataContext.Provider value={{ 
      doctors, 
      consultations, 
      exams, 
      loading,
      refreshData: fetchData
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
