"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import styles from "@/styles/calendar.module.css"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { fetchDoctorWorkingHours, unblockTimeSlot } from "@/lib/doctor-scheduling"
import { updateReminder } from "@/lib/reminder-service"
import { doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Helper functions
const isDateDisabled = (date: Date, doctorWorkingDays: string[]) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (date < today) return true

  const weekDay = format(date, "EEEE", { locale: ptBR })
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")

  return !doctorWorkingDays.includes(weekDay)
}

const isWorkingDay = (date: Date, doctorWorkingDays: string[]) => {
  const weekDay = format(date, "EEEE", { locale: ptBR })
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")

  return doctorWorkingDays.includes(weekDay)
}

// Schema de validação para o formulário de reagendamento
const rescheduleSchema = z.object({
  date: z
    .date({
      required_error: "Data é obrigatória",
      invalid_type_error: "Data inválida",
    })
    .nullable(),
  time: z.string().min(1, "Horário é obrigatório"),
})

interface RescheduleAppointmentProps {
  appointmentId: string
  consultationId: string
  clinicId: string
  doctorId: string
  patientName: string
  currentDate: Date
  reminderId?: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function RescheduleAppointment({
  appointmentId,
  consultationId,
  clinicId,
  doctorId,
  patientName,
  currentDate,
  reminderId,
  onSuccess,
  trigger,
}: RescheduleAppointmentProps) {
  // Estados do componente
  const [open, setOpen] = useState(false)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
  const [doctorWorkingDays, setDoctorWorkingDays] = useState<string[]>([])
  const [doctorWorkingHours, setDoctorWorkingHours] = useState<{ start: string; end: string }>({
    start: "08:00",
    end: "18:00",
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [temporaryBlockId, setTemporaryBlockId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Inicialização do formulário com React Hook Form
  const form = useForm<z.infer<typeof rescheduleSchema>>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      date: null,
      time: "",
    },
  })

  // Observar valores do formulário para atualização dinâmica
  const selectedDate = form.watch("date")
  const selectedTime = form.watch("time")

  // Carregar horários de trabalho do médico ao abrir o diálogo
  useEffect(() => {
    const loadDoctorSchedule = async () => {
      try {
        if (!open || !clinicId || !doctorId) return

        // Buscar horários de trabalho do médico
        const doctorSchedule = await fetchDoctorWorkingHours(clinicId, doctorId)
        setDoctorWorkingDays(doctorSchedule.workingDays)
        setDoctorWorkingHours(doctorSchedule.workingHours)
      } catch (error) {
        console.error("Erro ao carregar horários do médico:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os horários do médico.",
          variant: "destructive",
        })
      }
    }

    loadDoctorSchedule()
  }, [open, clinicId, doctorId, toast])

  // Buscar horários disponíveis quando a data mudar
  useEffect(() => {
    const fetchAvailableTimeSlots = async () => {
      if (!selectedDate || !clinicId || !doctorId) return

      try {
        setLoadingTimeSlots(true)
        setAvailableTimeSlots([]) // Limpar slots anteriores

        // Usar a API para buscar slots disponíveis
        const response = await fetch(
          `/api/appointments?clinicId=${clinicId}&doctorId=${doctorId}&date=${selectedDate.toISOString()}`,
        )

        if (!response.ok) {
          throw new Error("Failed to fetch available slots")
        }

        const data = await response.json()

        // Verificar se data.availableSlots é um array válido
        if (!Array.isArray(data.availableSlots)) {
          console.error("Slots de horário inválidos:", data.availableSlots)
          setAvailableTimeSlots([])
          return
        }

        // Filtrar apenas os slots dentro do horário de trabalho do médico
        const doctorStart = doctorWorkingHours.start || "08:00"
        const doctorEnd = doctorWorkingHours.end || "18:00"

        const filteredSlots = data.availableSlots.filter((slot: string) => {
          return slot >= doctorStart && slot <= doctorEnd
        })

        setAvailableTimeSlots(filteredSlots)
      } catch (error) {
        console.error("Erro ao buscar horários disponíveis:", error)
        toast({
          title: "Erro ao carregar horários",
          description: "Não foi possível carregar os horários disponíveis.",
          variant: "destructive",
        })
        setAvailableTimeSlots([])
      } finally {
        setLoadingTimeSlots(false)
      }
    }

    fetchAvailableTimeSlots()
  }, [selectedDate, clinicId, doctorId, doctorWorkingHours, toast])

  // Bloquear horário temporariamente quando o usuário selecionar um horário
  useEffect(() => {
    const blockSelectedTimeSlot = async () => {
      if (!selectedDate || !clinicId || !doctorId || !selectedTime) return

      try {
        // Limpar bloqueio anterior se existir
        if (temporaryBlockId) {
          await unblockTimeSlot(temporaryBlockId, "cancelled")
        }

        // Bloquear o novo horário
        const response = await fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clinicId,
            doctorId,
            date: selectedDate.toISOString(),
            time: selectedTime,
            action: "block",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to block time slot")
        }

        const data = await response.json()
        setTemporaryBlockId(data.blockId)

        // Configurar um temporizador para limpar o bloqueio após 5 minutos se o formulário não for enviado
        const timeoutId = setTimeout(
          async () => {
            if (temporaryBlockId) {
              try {
                await unblockTimeSlot(temporaryBlockId, "expired")
                setTemporaryBlockId(null)

                // Notificar o usuário se o formulário ainda estiver aberto
                if (open) {
                  toast({
                    title: "Reserva de horário expirada",
                    description: "A reserva temporária do horário expirou. Por favor, selecione o horário novamente.",
                    variant: "destructive",
                  })

                  // Limpar o horário selecionado
                  form.setValue("time", "")
                }
              } catch (error) {
                console.error("Erro ao expirar bloqueio:", error)
              }
            }
          },
          5 * 60 * 1000,
        ) // 5 minutos

        // Limpar o temporizador quando o componente for desmontado
        return () => clearTimeout(timeoutId)
      } catch (error) {
        console.error("Erro ao bloquear horário:", error)
      }
    }

    if (selectedTime) {
      blockSelectedTimeSlot()
    }
  }, [selectedTime, selectedDate, clinicId, doctorId, temporaryBlockId, open, toast, form])

  // Limpar bloqueio temporário ao fechar o diálogo
  useEffect(() => {
    return () => {
      // Cleanup function that runs when component unmounts
      if (temporaryBlockId) {
        unblockTimeSlot(temporaryBlockId, "cancelled").catch((error) =>
          console.error("Erro ao desbloquear horário:", error),
        )
      }
    }
  }, [temporaryBlockId])

  // Função para reagendar a consulta
  async function onSubmit(data: z.infer<typeof rescheduleSchema>) {
    try {
      setIsSubmitting(true)

      if (!data.date) {
        throw new Error("Data é obrigatória")
      }

      // Verificar se ainda temos um bloqueio válido
      if (!temporaryBlockId) {
        toast({
          title: "Reserva de horário expirada",
          description: "A reserva temporária do horário expirou. Por favor, selecione o horário novamente.",
          variant: "destructive",
        })
        return
      }

      // Combinar data e hora em um único objeto Date
      const [hours, minutes] = data.time.split(":").map(Number)
      const newAppointmentDate = new Date(data.date)
      newAppointmentDate.setHours(hours, minutes, 0, 0)

      // Atualizar o documento de consulta
      const consultationRef = doc(db, "consultations", consultationId)
      await updateDoc(consultationRef, {
        date: Timestamp.fromDate(newAppointmentDate),
        updatedAt: Timestamp.now(),
        status: "Reagendado",
      })

      // Atualizar o documento de agendamento
      const appointmentRef = doc(db, "appointments", appointmentId)
      await updateDoc(appointmentRef, {
        date: Timestamp.fromDate(newAppointmentDate),
        updatedAt: Timestamp.now(),
        status: "Reagendado",
      })

      // Atualizar o lembrete, se existir
      if (reminderId) {
        await updateReminder(reminderId, newAppointmentDate)
      }

      // Liberar o bloqueio temporário
      if (temporaryBlockId) {
        await unblockTimeSlot(temporaryBlockId, "confirmed")
        setTemporaryBlockId(null)
      }

      toast({
        title: "Consulta reagendada",
        description: `A consulta de ${patientName} foi reagendada com sucesso para ${format(
          newAppointmentDate,
          "PPP 'às' HH:mm",
          { locale: ptBR },
        )}.`,
      })

      form.reset()
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Erro ao reagendar consulta:", error)

      // Tentar liberar o bloqueio em caso de erro
      if (temporaryBlockId) {
        try {
          await unblockTimeSlot(temporaryBlockId, "cancelled")
          setTemporaryBlockId(null)
        } catch (unblockError) {
          console.error("Erro ao desbloquear horário:", unblockError)
        }
      }

      toast({
        title: "Erro ao reagendar consulta",
        description: "Ocorreu um erro ao reagendar a consulta. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mapear dias da semana para exibição em português
  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    return days[day]
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Se estiver fechando o diálogo e tiver um bloqueio temporário, cancelá-lo
        if (!newOpen && temporaryBlockId) {
          unblockTimeSlot(temporaryBlockId, "cancelled").catch((error) =>
            console.error("Erro ao desbloquear horário:", error),
          )
          setTemporaryBlockId(null)
        }
        setOpen(newOpen)
      }}
    >
      <DialogTrigger asChild>{trigger || <Button variant="outline">Reagendar</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Reagendar Consulta</DialogTitle>
          <DialogDescription>
            Consulta atual: {format(currentDate, "PPP 'às' HH:mm", { locale: ptBR })}
            <br />
            Paciente: {patientName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
              {/* Campo: Data */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nova Data</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={() => setCalendarOpen(true)}
                            type="button"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma nova data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          required={false}
                          selected={field.value || undefined}
                          onSelect={(selected: Date | undefined) => {
                            field.onChange(selected)

                            // Limpar horário e bloqueio temporário ao mudar a data
                            form.setValue("time", "")
                            if (temporaryBlockId) {
                              unblockTimeSlot(temporaryBlockId, "cancelled").catch((error) =>
                                console.error("Erro ao desbloquear horário:", error),
                              )
                              setTemporaryBlockId(null)
                            }

                            setCalendarOpen(false)
                          }}
                          disabled={(date) => isDateDisabled(date, doctorWorkingDays)}
                          modifiers={{ workingDay: (date) => isWorkingDay(date, doctorWorkingDays) }}
                          modifiersClassNames={{
                            workingDay: styles.workingDay,
                            today: styles.today,
                            selected: styles.selected,
                            disabled: styles.disabled,
                          }}
                          className={styles.calendar}
                          classNames={{
                            day: styles.calendarTile,
                            nav_button_previous: styles.navigation,
                            nav_button_next: styles.navigation,
                            caption: styles.monthLabel,
                            head_cell: styles.weekDay,
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {doctorWorkingDays.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Dias disponíveis:{" "}
                        {doctorWorkingDays
                          .map((day) => {
                            const dayIndex = [
                              "sunday",
                              "monday",
                              "tuesday",
                              "wednesday",
                              "thursday",
                              "friday",
                              "saturday",
                            ].indexOf(day)
                            return getDayName(dayIndex)
                          })
                          .join(", ")}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Horário */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo Horário</FormLabel>
                    {loadingTimeSlots ? (
                      <div className="flex items-center justify-center p-2 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Carregando horários disponíveis...</span>
                      </div>
                    ) : !selectedDate ? (
                      <div className="text-sm text-muted-foreground p-2 border rounded-md">
                        Selecione uma data para ver os horários disponíveis.
                      </div>
                    ) : availableTimeSlots.length > 0 ? (
                      <RadioGroup
                        onValueChange={(value) => {
                          // Limpar bloqueio temporário anterior se existir
                          if (temporaryBlockId && field.value !== value) {
                            unblockTimeSlot(temporaryBlockId, "cancelled").catch((error) =>
                              console.error("Erro ao desbloquear horário:", error),
                            )
                            setTemporaryBlockId(null)
                          }

                          field.onChange(value)
                        }}
                        value={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {availableTimeSlots.map((slot) => (
                          <FormItem key={slot} className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={slot} id={`time-${slot}`} />
                            </FormControl>
                            <FormLabel htmlFor={`time-${slot}`} className="text-sm font-normal cursor-pointer">
                              {slot}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2 border rounded-md">
                        Não há horários disponíveis para esta data. Por favor, selecione outra data.
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botão de Envio */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !form.formState.isValid || !temporaryBlockId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reagendando...
                  </>
                ) : (
                  "Confirmar Reagendamento"
                )}
              </Button>

              {/* Mensagem sobre bloqueio temporário */}
              {temporaryBlockId && (
                <p className="text-xs text-muted-foreground text-center">
                  Horário reservado temporariamente por 5 minutos. Complete o reagendamento antes que expire.
                </p>
              )}
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
