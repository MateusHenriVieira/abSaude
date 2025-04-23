"use client"

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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getClinics } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePermissions } from "@/hooks/use-permissions"
import { fetchDoctorWorkingHours, scheduleAppointment, unblockTimeSlot } from "@/lib/doctor-scheduling"

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

// Schema de validação para o formulário de consulta
const consultationSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  doctorId: z.string().min(1, "Médico é obrigatório"),
  clinicId: z.string().min(1, "Posto de saúde é obrigatório"),
  date: z
    .date({
      required_error: "Data é obrigatória",
      invalid_type_error: "Data inválida",
    })
    .nullable(), // Make date nullable
  time: z.string().min(1, "Horário é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().optional(),
})

/**
 * Componente para agendamento de consultas médicas
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSuccess - Função chamada após o agendamento bem-sucedido
 */
export function ConsultationForm({ onSuccess }: { onSuccess?: () => void }) {
  // Estados do componente
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { canScheduleAppointments } = usePermissions()
  const [selectedDoctorServices, setSelectedDoctorServices] = useState<string[]>([])
  const [doctorWorkingDays, setDoctorWorkingDays] = useState<string[]>([])
  const [doctorWorkingHours, setDoctorWorkingHours] = useState<{ start: string; end: string }>({
    start: "08:00",
    end: "18:00",
  })
  // Estado para controlar o popover do calendário
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Estado para armazenar o ID do bloqueio temporário
  const [temporaryBlockId, setTemporaryBlockId] = useState<string | null>(null)

  // Inicialização do formulário com React Hook Form
  const form = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      patientName: "",
      doctorId: "",
      clinicId: user?.clinicId || "",
      time: "",
      type: "",
      description: "",
    },
  })

  // Observar valores do formulário para atualização dinâmica
  const selectedDate = form.watch("date")
  const selectedClinic = form.watch("clinicId")
  const selectedDoctor = form.watch("doctorId")
  const selectedTime = form.watch("time")

  // Carregar médicos e postos de saúde ao iniciar o componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const fetchedClinics = await getClinics()
        setClinics(Array.isArray(fetchedClinics) ? fetchedClinics : [])

        if (selectedClinic) {
          // Buscar médicos da subcoleção doctors
          const doctorsCollectionRef = collection(db, "clinics", selectedClinic, "doctors")
          const doctorsSnapshot = await getDocs(doctorsCollectionRef)

          const doctorsData = doctorsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              fullName: `${data.firstName} ${data.lastName}`,
              workingDays: data.schedule?.workingDays || [],
              workingHours: data.schedule?.workingHours || { start: "08:00", end: "18:00" },
            }
          })

          setDoctors(doctorsData)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar a lista de médicos e postos de saúde.",
          variant: "destructive",
        })
        setDoctors([])
        setClinics([])
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchData()
    }
  }, [open, selectedClinic, toast])

  // Função para lidar com a mudança de médico selecionado
  const handleDoctorChange = async (doctorId: string) => {
    if (!doctorId || !selectedClinic) return

    try {
      // Limpar bloqueio temporário se existir
      if (temporaryBlockId) {
        await unblockTimeSlot(temporaryBlockId, "cancelled")
        setTemporaryBlockId(null)
      }

      const selectedDoctor = doctors.find((d) => d.id === doctorId)
      if (!selectedDoctor) {
        throw new Error("Médico não encontrado")
      }

      // Atualizar formulário com dados do médico
      form.setValue("doctorId", doctorId)
      form.setValue("type", "")
      form.setValue("date", null)
      form.setValue("time", "")

      // Buscar horários de trabalho do médico diretamente do Firestore
      const doctorSchedule = await fetchDoctorWorkingHours(selectedClinic, doctorId)

      // Atualizar estados com os dados do schedule do médico
      setSelectedDoctorServices(selectedDoctor.services || [])
      setDoctorWorkingDays(doctorSchedule.workingDays)
      setDoctorWorkingHours(doctorSchedule.workingHours)
    } catch (error) {
      console.error("Erro ao buscar informações do médico:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações do médico.",
        variant: "destructive",
      })
      // Resetar estados
      setSelectedDoctorServices([])
      setDoctorWorkingDays([])
      setDoctorWorkingHours({ start: "08:00", end: "18:00" })
    }
  }

  // Move fetchAvailableTimeSlots outside useEffect but inside component
  const fetchAvailableTimeSlots = async () => {
    if (!selectedDate || !selectedClinic || !selectedDoctor) return

    try {
      setLoadingTimeSlots(true)
      setAvailableTimeSlots([])

      console.log('Fetching slots with params:', {
        clinicId: selectedClinic,
        doctorId: selectedDoctor,
        date: selectedDate.toISOString()
      })

      const response = await fetch(
        `/api/appointments?clinicId=${selectedClinic}&doctorId=${selectedDoctor}&date=${selectedDate.toISOString()}`
      )

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || 'Failed to fetch available slots')
      }

      console.log('API Response:', data)

      if (!Array.isArray(data.availableSlots)) {
        console.error('Invalid response format:', data)
        throw new Error('Invalid server response format')
      }

      setAvailableTimeSlots(data.availableSlots)
    } catch (error) {
      console.error('Error fetching slots:', error)
      toast({
        title: "Erro ao carregar horários",
        description: error instanceof Error ? error.message : "Erro ao carregar horários disponíveis",
        variant: "destructive",
      })
      setAvailableTimeSlots([])
    } finally {
      setLoadingTimeSlots(false)
    }
  }

  // Update the useEffect to use the function
  useEffect(() => {
    fetchAvailableTimeSlots()
  }, [selectedDate, selectedClinic, selectedDoctor, doctorWorkingHours])

  // Bloquear horário temporariamente quando o usuário selecionar um horário
  useEffect(() => {
    const blockSelectedTimeSlot = async () => {
      // Verificar se todos os campos necessários estão preenchidos
      if (!selectedDate || !selectedClinic || !selectedDoctor || !selectedTime) return

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
            clinicId: selectedClinic,
            doctorId: selectedDoctor,
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

                  // Recarregar os horários disponíveis
                  await fetchAvailableTimeSlots()
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
  }, [selectedTime, selectedDate, selectedClinic, selectedDoctor, temporaryBlockId, open, toast, form])

  // Função para enviar o formulário
  async function onSubmit(data: z.infer<typeof consultationSchema>) {
    try {
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

      // Agendar a consulta usando o bloqueio temporário
      const result = await scheduleAppointment(
        {
          ...data,
          date: data.date,
          time: data.time,
          status: "Agendado",
        },
        temporaryBlockId,
      )

      toast({
        title: "Consulta agendada",
        description: "A consulta foi agendada com sucesso.",
      })

      // Limpar o ID do bloqueio temporário
      setTemporaryBlockId(null)

      form.reset()
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Erro ao agendar consulta:", error)

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
        title: "Erro ao agendar consulta",
        description: "Ocorreu um erro ao agendar a consulta. Tente novamente.",
        variant: "destructive",
      })
    }
  }

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

  // Verificar permissões - permitir agendamento para admin, receptionist, doctor e nurse
  if (!canScheduleAppointments() && !["doctor", "nurse"].includes(user?.type || "")) {
    return null
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
      <DialogTrigger asChild>
        <Button>Agendar Consulta</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Agendar Consulta</DialogTitle>
          <DialogDescription>
            {user?.type === "admin"
              ? "Como administrador, você pode agendar consultas para qualquer posto."
              : "Você só pode agendar consultas para seu posto atual."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
              {/* Campo: Nome do Paciente */}
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Paciente</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do paciente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Posto de Saúde */}
              {user?.type === "admin" ? (
                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posto de Saúde</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Limpar médico, data e hora ao mudar de clínica
                          form.setValue("doctorId", "")
                          form.setValue("date", null)
                          form.setValue("time", "")

                          // Limpar bloqueio temporário se existir
                          if (temporaryBlockId) {
                            unblockTimeSlot(temporaryBlockId, "cancelled").catch((error) =>
                              console.error("Erro ao desbloquear horário:", error),
                            )
                            setTemporaryBlockId(null)
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o posto de saúde" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm">Carregando...</span>
                            </div>
                          ) : clinics.length === 0 ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Nenhum posto de saúde encontrado
                            </div>
                          ) : (
                            clinics.map((clinic) => (
                              <SelectItem key={clinic.id} value={clinic.id}>
                                {clinic.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <input type="hidden" {...form.register("clinicId")} value={user?.clinicId} />
              )}

              {/* Campo: Médico */}
              {user?.type === "doctor" ? (
                <FormField
                  control={form.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Médico</FormLabel>
                      <FormControl>
                        <Input value={`Dr(a). ${user.name}`} disabled className="bg-muted" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Médico</FormLabel>
                      <Select onValueChange={handleDoctorChange} value={field.value} disabled={!selectedClinic}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={selectedClinic ? "Selecione o médico" : "Selecione um posto primeiro"}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm">Carregando...</span>
                            </div>
                          ) : doctors.length === 0 ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Nenhum médico encontrado
                            </div>
                          ) : (
                            doctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                Dr(a). {doctor.fullName} - {doctor.function || "Médico"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo: Data - Corrigido para garantir que o calendário funcione */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            disabled={!selectedDoctor}
                            onClick={() => setCalendarOpen(true)}
                            type="button"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>{selectedDoctor ? "Selecione uma data" : "Selecione um médico primeiro"}</span>
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
                    {selectedDoctor && doctorWorkingDays.length > 0 && (
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
                    <FormLabel>Horário</FormLabel>
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

              {/* Campo: Tipo de Consulta */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Consulta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o tipo de consulta" 
                        {...field}
                        disabled={!selectedDoctor}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Descrição */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Digite uma descrição para a consulta (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botão de Envio */}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting || !form.formState.isValid || !temporaryBlockId}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  "Agendar"
                )}
              </Button>

              {/* Mensagem sobre bloqueio temporário */}
              {temporaryBlockId && (
                <p className="text-xs text-muted-foreground text-center">
                  Horário reservado temporariamente por 5 minutos. Complete o agendamento antes que expire.
                </p>
              )}
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
