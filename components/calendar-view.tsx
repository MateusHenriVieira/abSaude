"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getConsultations, getExams } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

interface ConsultationData {
  id: string;
  date: any;
  time?: string;
  patientName: string;
  description?: string;
  doctorName?: string;
  status?: string;
}

interface ExamData {
  id: string;
  date: any;
  time?: string;
  patientName: string;
  description?: string;
  type?: string;
  status?: string;
}

interface FirebaseConsultation {
  id: string;
  date: any;
  formattedDate: string;
  consultationId: string;
  patientName?: string;
  description?: string;
  doctorName?: string;
  status?: string;
  time?: string;
}

interface FirebaseExam {
  id: string;
  date: any;
  formattedDate: string;
  examId: string;
  patientName?: string;
  description?: string;
  type?: string;
  status?: string;
  time?: string;
}

interface Event {
  id: string
  title: string
  date: Date
  startTime: string
  endTime?: string
  type: "consultation" | "exam"
  description?: string
  patientName?: string
}

export function CalendarView({ events: propEvents }: { events?: Event[] } = {}) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(propEvents ? false : true)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const { user } = useAuth()

  // Generate week days
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  // Generate time slots
  const timeSlots = Array.from({ length: 12 }).map((_, i) => {
    const hour = i + 8 // Start from 8:00
    return `${hour.toString().padStart(2, "0")}:00`
  })

  useEffect(() => {
    // Se eventos foram passados como prop, use-os
    if (propEvents) {
      setEvents(propEvents)
      return
    }

    // Caso contrário, busque do Firebase
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const [consultations, exams] = await Promise.all([
          getConsultations(user?.clinicId),
          getExams(user?.clinicId)
        ]) as [FirebaseConsultation[], FirebaseExam[]]

        const formattedEvents: Event[] = [
          ...consultations.map((consultation) => {
            const date = typeof consultation.date === 'string' 
              ? parseISO(consultation.date) 
              : new Date(consultation.date);
              
            return {
              id: consultation.id,
              title: "Consulta",
              date: date,
              startTime: consultation.time || format(date, 'HH:mm'),
              type: 'consultation' as const,
              patientName: consultation.patientName || 'Não informado',
              description: consultation.description,
            };
          }),
          ...exams.map((exam) => {
            const date = typeof exam.date === 'string'
              ? parseISO(exam.date)
              : new Date(exam.date);

            return {
              id: exam.id,
              title: "Exame",
              date: date,
              startTime: exam.time || format(date, 'HH:mm'),
              type: 'exam' as const,
              patientName: exam.patientName || 'Não informado',
              description: exam.description,
            };
          })
        ]

        setEvents(formattedEvents)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user, propEvents])

  const getEventsForDateAndTime = (date: Date, time: string) => {
    return events.filter((event) => isSameDay(event.date, date) && event.startTime === time)
  }

  const previousWeek = () => {
    setSelectedDate(addDays(selectedDate, -7))
  }

  const nextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7))
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{format(weekStart, "MMMM yyyy", { locale: ptBR })}</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(weekStart, "dd")} - {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar evento
        </Button>
      </header>

      {/* Calendar Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time slots */}
        <div className="w-20 border-r bg-muted/10">
          <div className="h-12 border-b" /> {/* Header spacer */}
          {timeSlots.map((time) => (
            <div key={time} className="flex h-20 items-center justify-end border-b px-2 text-sm text-muted-foreground">
              {time}
            </div>
          ))}
        </div>

        {/* Days columns */}
        <div className="flex flex-1">
          {weekDays.map((date, dateIndex) => (
            <div key={dateIndex} className="flex-1 border-r last:border-r-0">
              {/* Day header */}
              <div className="h-12 border-b p-2 text-center">
                <div className="text-sm font-medium">{format(date, "EEE", { locale: ptBR })}</div>
                <div className="text-sm text-muted-foreground">{format(date, "dd")}</div>
              </div>

              {/* Time slots */}
              {timeSlots.map((time) => {
                const slotEvents = getEventsForDateAndTime(date, time)
                return (
                  <div key={`${dateIndex}-${time}`} className="relative h-20 border-b">
                    {slotEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute inset-x-1 rounded-md p-2 text-xs",
                          event.type === "consultation" ? "bg-blue-100 text-blue-900" : "bg-green-100 text-green-900",
                        )}
                        style={{
                          top: "4px",
                          minHeight: "calc(100% - 8px)",
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        {event.patientName && <div className="text-[10px] opacity-80">{event.patientName}</div>}
                        <div className="text-[10px] opacity-80">
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

