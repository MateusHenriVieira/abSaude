"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getPatientsByClinic, getAllPatients } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, User, Calendar, FileText, Phone, Mail, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PatientDetailsDialog } from "@/components/patient-details-dialog"
import { FamilyForm } from "@/components/family-form" // Importe o componente FamilyForm
import { PatientForm } from "@/components/patient-form" // Importe o componente PatientForm

interface FirebasePatient {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: string;
  birthDate?: { seconds: number };
  consultationsCount?: number;
  examsCount?: number;
  clinicId?: string;
}

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: string;
  birthDate?: { seconds: number };
  consultationsCount?: number;
  examsCount?: number;
  clinicId?: string;
  age: number;  // Required
  examType: string;  // Required
  date: Date;  // Required
  status: string;  // Required
  clinicName: string;  // Required
  examId: string;  // Required
  observations?: string;
}

export function PatientsView() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true)
      try {
        let rawData: FirebasePatient[] = []

        if (user?.type === "admin") {
          rawData = await getAllPatients() as FirebasePatient[]
        } else if (user?.clinicId) {
          rawData = await getPatientsByClinic(user.clinicId) as FirebasePatient[]
        }

        const patientsData: Patient[] = rawData.map(patient => ({
          ...patient,
          name: patient.name || 'Sem nome',
          age: patient.birthDate 
            ? Math.floor((Date.now() - patient.birthDate.seconds * 1000) / (365.25 * 24 * 60 * 60 * 1000))
            : 0,
          examType: 'N/A',
          date: new Date(),
          status: 'active',
          clinicName: 'N/A',
          examId: patient.id,
        }));

        setPatients(patientsData)
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [user])

  // Filtrar pacientes com base no termo de pesquisa
  const filteredPatients = patients.filter((patient) => {
    const searchTermLower = searchTerm.toLowerCase()
    return (
      patient.name?.toLowerCase().includes(searchTermLower) ||
      patient.email?.toLowerCase().includes(searchTermLower) ||
      patient.phone?.toLowerCase().includes(searchTermLower) ||
      patient.address?.toLowerCase().includes(searchTermLower)
    )
  })

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient)
    setDetailsOpen(true)
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <p className="text-sm text-muted-foreground">Lista de todos os pacientes cadastrados</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar paciente por nome, email ou telefone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <FamilyForm /> {/* Adicione o componente FamilyForm aqui */}
        <PatientForm /> {/* Adicione o componente PatientForm aqui */}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum paciente encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Tente outro termo de busca" : "Não há pacientes cadastrados neste posto de saúde"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card
              key={patient.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePatientClick(patient)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{patient.name}</CardTitle>
                  <Badge variant="outline">{patient.gender || "Não informado"}</Badge>
                </div>
                <CardDescription>
                  {patient.birthDate
                    ? new Date(patient.birthDate.seconds * 1000).toLocaleDateString()
                    : "Data de nascimento não informada"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {patient.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      {patient.phone}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      {patient.email}
                    </div>
                  )}
                  {patient.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      {patient.address}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-xs">Consultas: {patient.consultationsCount || 0}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-xs">Exames: {patient.examsCount || 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPatient && (
        <PatientDetailsDialog patient={selectedPatient} open={detailsOpen} onOpenChange={setDetailsOpen} />
      )}
    </div>
  )
}

