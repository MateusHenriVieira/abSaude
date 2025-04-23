"use client"

import { useState, useEffect } from "react"
import { Calendar, Views, momentLocalizer } from "react-big-calendar"
import moment from "moment"
import "moment/locale/pt-br"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"

// Setup the localizer
moment.locale("pt-br")
const localizer = momentLocalizer(moment)

interface AppointmentEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  consultationId?: string
  patientName: string
  doctorName: string
  doctorId: string
  clinicId: string
  type: string
  status: string
  reminderId?: string
}

interface Doctor {
  id: string
  name: string
}

export function AppointmentCalendar() {
  const [events, setEvents] = useState<AppointmentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('week')
  const [date, setDate] = useState(new Date())
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all")
  const { user } = useAuth()
  const { toast } = useToast()

  // Carregar médicos e agendamentos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        if (!user?.clinicId) {
          console.error("ID da clínica não encontrado")
          return
        }

        // Buscar médicos
        const doctorsRef = collection(db, "clinics", user.clinicId, "doctors")
        const doctorsSnapshot = await getDocs(doctorsRef)
        const doctorsList = doctorsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
          }
        })
        setDoctors(doctorsList)

        // Buscar agendamentos
        await fetchAppointments(user.clinicId, selectedDoctor)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os agendamentos.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

  // Buscar agendamentos quando o médico selecionado mudar
  useEffect(() => {
    if (user?.clinicId) {
      fetchAppointments(user.clinicId, selectedDoctor)
    }
  }, [selectedDoctor, user])

  // Função para buscar agendamentos
  const fetchAppointments = async (clinicId: string, doctorId = "all") => {
    try {
      setLoading(true)

      // Construir a consulta base
      let appointmentsQuery = query(collection(db, "appointments"), where("clinicId", "==", clinicId))

      // Adicionar filtro por médico se necessário
      if (doctorId !== "all") {
        appointmentsQuery = query(
          collection(db, "appointments"),
          where("clinicId", "==", clinicId),
          where("doctorId", "==", doctorId),
        )
      }

      const appointmentsSnapshot = await getDocs(appointmentsQuery)
      const appointmentsList: AppointmentEvent[] = []

      // Processar cada agendamento
      for (const doc of appointmentsSnapshot.docs) {
        const data = doc.data()
        const appointmentDate = data.date.toDate()

        // Buscar informações do médico
        let doctorName = "Médico não especificado"
        if (data.doctorId) {
          try {
            const doctorDoc = await getDocs(
              query(collection(db, "clinics", clinicId, "doctors"), where("id", "==", data.doctorId)),
            )
            if (!doctorDoc.empty) {
              const doctorData = doctorDoc.docs[0].data()
              doctorName = `Dr(a). ${doctorData.firstName} ${doctorData.lastName}`
            }
          } catch (error) {
            console.error("Erro ao buscar informações do médico:", error)
          }
        }

        // Calcular horário de término (30 minutos após o início)
        const endDate = new Date(appointmentDate)
        endDate.setMinutes(endDate.getMinutes() + (data.duration || 30))

        // Criar evento para o calendário
        appointmentsList.push({
          id: doc.id,
          title: `${data.patientName} - ${data.type || "Consulta"}`,
          start: appointmentDate,
          end: endDate,
          resourceId: data.doctorId || "unassigned",
          consultationId: data.consultationId,
          patientName: data.patientName,
          doctorName,
          doctorId: data.doctorId || "",
          clinicId,
          type: data.type || "Consulta",
          status: data.status || "Agendado",
          reminderId: data.reminderId,
        })
      }

      setEvents(appointmentsList)
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error)
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para lidar com a seleção de um evento
  const handleSelectEvent = (event: AppointmentEvent) => {
    toast({
      title: event.title,
      description: `${format(event.start, "PPP 'às' HH:mm", { locale: ptBR })} - ${event.doctorName}`,
    })
  }

  // Componente personalizado para renderizar eventos
  const EventComponent = ({ event }: { event: AppointmentEvent }) => (
    <div
      className={`rbc-event-content ${
        event.status === "Cancelado"
          ? "line-through opacity-50"
          : event.status === "Reagendado"
            ? "italic"
            : event.status === "Concluído"
              ? "font-bold"
              : ""
      }`}
      title={`${event.patientName} - ${event.type} (${event.status})`}
    >
      <div className="text-xs">{format(event.start, "HH:mm")}</div>
      <div className="font-medium truncate">{event.patientName}</div>
      <div className="text-xs truncate">{event.type}</div>
    </div>
  )

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Calendário de Agendamentos</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por médico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os médicos</SelectItem>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setDate(new Date())
              if (user?.clinicId) {
                fetchAppointments(user.clinicId, selectedDoctor)
              }
            }}
          >
            Hoje
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              views={["month", "week", "day", "agenda"]}
              view={view}
              onView={(newView) => setView(newView as 'month' | 'week' | 'day' | 'agenda')}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              components={{
                event: EventComponent as any,
              }}
              messages={{
                today: "Hoje",
                previous: "Anterior",
                next: "Próximo",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Não há agendamentos neste período.",
              }}
              formats={{
                dayFormat: "ddd DD/MM",
                weekdayFormat: "ddd",
                monthHeaderFormat: "MMMM YYYY",
                dayHeaderFormat: "dddd, DD [de] MMMM [de] YYYY",
                dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) =>
                  `${moment(start).format("DD [de] MMMM")} - ${moment(end).format("DD [de] MMMM [de] YYYY")}`,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
