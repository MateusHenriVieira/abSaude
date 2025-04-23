"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DailySchedule } from "@/components/daily-schedule"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CalendarView } from "@/components/calendar-view"
import { getConsultations, getExams } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { parseISO } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { useRouter } from "next/navigation"

export function DailyRoutineCard() {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [todayConsultations, setTodayConsultations] = useState<any[]>([])
  const [todayExams, setTodayExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) {
        console.warn("User is not defined. Waiting for authentication...");
        setLoading(false)
        return
      }

      if (!user.clinicId) {
        console.error("User does not have a clinicId.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [consultationsData, examsData] = await Promise.all([
          getConsultations(user.clinicId),
          getExams(user.clinicId),
        ])

        // Filtrar eventos para hoje
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayConsultations = consultationsData.filter((consultation: any) => {
          const consultationDate =
            consultation.date instanceof Timestamp ? consultation.date.toDate() : new Date(consultation.date)
          consultationDate.setHours(0, 0, 0, 0)
          return consultationDate.getTime() === today.getTime()
        })

        const todayExams = examsData.filter((exam: any) => {
          const examDate = exam.date instanceof Timestamp ? exam.date.toDate() : new Date(exam.date)
          examDate.setHours(0, 0, 0, 0)
          return examDate.getTime() === today.getTime()
        })

        setTodayConsultations(todayConsultations)
        setTodayExams(todayExams)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user])

  const calendarEvents = [
    ...(todayConsultations || []).map((consultation: any) => ({
      id: consultation.id,
      title: consultation.title || "Consulta",
      date: typeof consultation.date === "string" ? parseISO(consultation.date) : new Date(consultation.date),
      startTime: consultation.time || "08:00",
      endTime: consultation.endTime,
      type: "consultation" as const,
      patientName: consultation.patientName,
      description: consultation.description,
    })),
    ...(todayExams || []).map((exam: any) => ({
      id: exam.id,
      title: exam.title || "Exame",
      date: typeof exam.date === "string" ? parseISO(exam.date) : new Date(exam.date),
      startTime: exam.time || "08:00",
      endTime: exam.endTime,
      type: "exam" as const,
      patientName: exam.patientName,
      description: exam.description,
    })),
  ]

  if (loading) {
    return <Skeleton className="h-full w-full" />
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Rotina Diária</h2>
          <Button variant="ghost" className="text-sm text-primary" onClick={() => setCalendarOpen(true)}>
            Detalhes
          </Button>
        </div>
        <div className="mt-4 flex-1 overflow-auto">
          <DailySchedule consultations={todayConsultations} exams={todayExams} />
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span>{todayConsultations?.length || 0} Consultas</span>
            </div>
            <p className="ml-6 text-sm text-muted-foreground">
              {todayConsultations?.filter((c) => c.status === "Agendada").length || 0} agendadas,{" "}
              {todayConsultations?.filter((c) => c.status === "Em Andamento").length || 0} em andamento.
            </p>
            <Button
              variant="link"
              className="ml-6 h-auto p-0 text-primary"
              onClick={() => router.push("/consultas/today")}
            >
              Ver Detalhes
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span>{todayExams.length} Exames</span>
            </div>
            <p className="ml-6 text-sm text-muted-foreground">
              {todayExams.length - (todayExams.filter((e) => e.status === "Concluído").length || 0)} pendentes,{" "}
              {todayExams.filter((e) => e.status === "Em Andamento").length || 0} em andamento.
            </p>
            <Button variant="link" className="ml-6 h-auto p-0 text-primary" onClick={() => router.push("/exames")}>
              Ver Detalhes
            </Button>
          </div>
        </div>
        <Button
          className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setCalendarOpen(true)}
        >
          Ver Calendário
        </Button>
      </CardContent>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-6xl p-0">
          <CalendarView events={calendarEvents} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

