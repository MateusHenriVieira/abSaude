"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getConsultationsByDoctor } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search } from "lucide-react"

interface Consultation {
  id: string;
  date: Date;
  patientName: string;
  type: string;
  status: string;
}

interface Patient {
  name: string;
  consultations: Consultation[];
  lastConsultation: Consultation;
}

export function ClientsView() {
  const { user } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])

  useEffect(() => {
    const fetchConsultations = async () => {
      if (user?.doctorId) {
        setLoading(true)
        try {
          const data = await getConsultationsByDoctor(user.doctorId) as Consultation[]
          setConsultations(data)

          // Extrair pacientes únicos das consultas
          const uniquePatients = Array.from(
            new Map(
              data.map((consultation) => [
                consultation.patientName || 'Não informado',
                {
                  name: consultation.patientName || 'Não informado',
                  consultations: data.filter((c) => c.patientName === consultation.patientName),
                  lastConsultation: data
                    .filter((c) => c.patientName === consultation.patientName)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
                },
              ]),
            ).values(),
          )

          setPatients(uniquePatients)
        } catch (error) {
          console.error("Erro ao buscar consultas:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchConsultations()
  }, [user])

  // Filtrar pacientes com base no termo de pesquisa
  const filteredPatients = patients.filter((patient) => patient.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Meus Pacientes</h1>
        <p className="text-sm text-muted-foreground">Lista de todos os pacientes que você atendeu</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar paciente por nome"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle>{patient.name}</CardTitle>
                <CardDescription>
                  {patient.consultations.length} {patient.consultations.length === 1 ? "consulta" : "consultas"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Última consulta:</span>{" "}
                    {new Date(patient.lastConsultation.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Tipo:</span> {patient.lastConsultation.type}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={
                        patient.lastConsultation.status === "Concluída"
                          ? "text-green-600"
                          : patient.lastConsultation.status === "Cancelada"
                            ? "text-red-600"
                            : "text-blue-600"
                      }
                    >
                      {patient.lastConsultation.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

