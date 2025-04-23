// Arquivo: app/(dashboard)/chamada-pacientes/page.tsx
// Descrição: Página para exibir a tela de chamada de pacientes

"use client"

import { useState, useEffect } from "react"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getConsultationsByClinic, getExamsByClinic } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Calendar, Stethoscope, FileText } from "lucide-react"
import { openCallWindow } from "@/components/patient-call-window"

interface ConsultationData {
  id: string;
  date: { toDate(): Date } | Date;
  patientName: string;
  doctorName: string;
  room?: string;
  status?: string;
}

interface ExamData {
  id: string;
  date: { toDate(): Date } | Date;
  patientName: string;
  doctorName: string;
  room?: string;
  status?: string;
}

interface Appointment {
  id: string
  type: 'consultation' | 'exam'
  patientName: string
  doctorName: string
  date: Date
  room?: string
  status: string
}

export default function ChamadaPacientesPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.clinicId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Fetch both consultations and exams
        const [consultationsData, examsData] = await Promise.all([
          getConsultationsByClinic(user.clinicId),
          getExamsByClinic(user.clinicId)
        ])

        // Process and combine appointments
        const todayAppointments = [
          ...(consultationsData as ConsultationData[])
            .filter(consultation => isSameDay(
              consultation.date instanceof Date ? consultation.date : consultation.date.toDate(),
              today
            ))
            .map(consultation => ({
              id: consultation.id,
              type: 'consultation' as const,
              patientName: consultation.patientName || 'Sem nome',
              doctorName: consultation.doctorName || 'Médico não especificado',
              date: consultation.date instanceof Date ? consultation.date : consultation.date.toDate(),
              room: consultation.room,
              status: consultation.status || 'waiting'
            })),
          ...(examsData as ExamData[])
            .filter(exam => isSameDay(
              exam.date instanceof Date ? exam.date : exam.date.toDate(),
              today
            ))
            .map(exam => ({
              id: exam.id,
              type: 'exam' as const,
              patientName: exam.patientName || 'Sem nome',
              doctorName: exam.doctorName || 'Médico não especificado',
              date: exam.date instanceof Date ? exam.date : exam.date.toDate(),
              room: exam.room,
              status: exam.status || 'waiting'
            }))
        ].sort((a, b) => a.date.getTime() - b.date.getTime())

        setAppointments(todayAppointments)
      } catch (error) {
        console.error("Erro ao buscar agendamentos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [user])

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Chamada de Pacientes</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">Nenhum agendamento para hoje.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {appointment.type === 'consultation' ? (
                        <Stethoscope className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-green-500" />
                      )}
                      <p className="font-medium">{appointment.patientName}</p>
                      <Badge variant="outline">
                        {appointment.type === 'consultation' ? 'Consulta' : 'Exame'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dr(a). {appointment.doctorName}
                      {appointment.room && ` - Sala ${appointment.room}`}
                    </p>
                    <p className="text-sm font-medium">
                      {format(appointment.date, "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={appointment.status === 'waiting' ? 'default' : 'secondary'}
                    >
                      {appointment.status === 'waiting' ? 'Aguardando' : 'Chamado'}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => openCallWindow(user?.clinicName || 'Posto de Saúde', appointment)}
                    >
                      Chamar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

