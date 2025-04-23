"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import styles from '@/styles/calendar.module.css';

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
import { addExam, getClinics, addExamAppointment } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePermissions } from "@/hooks/use-permissions"
import { subscribeToSlots, lockTimeSlot, confirmBooking, releaseSlot, generateTimeSlots } from "@/lib/appointment-slots"
import type { ClinicSchedule } from "@/lib/clinics"
import { getClinicSchedule } from "@/lib/clinics"

// Schema de validação para o formulário de exame
const examSchema = z
  .object({
    patientName: z.string().min(1, "Nome do paciente é obrigatório"),
    clinicId: z.string().min(1, "Posto de saúde é obrigatório"),
    date: z
      .date({
        required_error: "Data é obrigatória",
        invalid_type_error: "Data inválida",
      })
      .optional(),
    time: z.string().min(1, "Horário é obrigatório"),
    type: z.string().min(1, "Tipo é obrigatório"),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.date) return false
      return true
    },
    {
      message: "Data é obrigatória",
      path: ["date"],
    }
  )

type ExamFormValues = z.infer<typeof examSchema>

interface ExamFormProps {
  onSuccess?: () => void
  defaultValues?: {
    patientName?: string
    type?: string
    observations?: string
  }
  editMode?: boolean
  examId?: string
  onCancel?: () => void
}

/**
 * Componente para agendamento de exames médicos
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSuccess - Função chamada após o agendamento bem-sucedido
 */
export function ExamForm({ onSuccess, defaultValues, editMode, examId, onCancel }: ExamFormProps) {
  // Estados do componente
  const [open, setOpen] = useState(false)
  const [clinics, setClinics] = useState<any[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clinicHours, setClinicHours] = useState<{ opening: string; closing: string }>({
    opening: "08:00",
    closing: "18:00",
  })
  const [slotsSubscription, setSlotsSubscription] = useState<() => void>()
  const [clinicSchedule, setClinicSchedule] = useState<ClinicSchedule | null>(null);
  // Estado para controlar o popover do calendário
  const [calendarOpen, setCalendarOpen] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()
  const { canScheduleAppointments } = usePermissions()

  // Inicialização do formulário com React Hook Form
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      patientName: defaultValues?.patientName || "",
      clinicId: user?.clinicId || "",
      date: undefined,
      time: "",
      type: defaultValues?.type || "",
      description: defaultValues?.observations || "",
    },
  })

  // Observar valores do formulário para atualização dinâmica
  const selectedDate = form.watch("date")
  const selectedClinic = form.watch("clinicId")

  // Carregar postos de saúde ao iniciar o componente
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true)
        const clinicsData = await getClinics()

        if (Array.isArray(clinicsData)) {
          setClinics(clinicsData)
        } else {
          console.error("Dados de clínicas inválidos:", clinicsData)
          setClinics([])
        }
      } catch (error) {
        console.error("Erro ao carregar postos:", error)
        toast({
          title: "Erro ao carregar postos",
          description: "Não foi possível carregar a lista de postos de saúde.",
          variant: "destructive",
        })
        setClinics([])
      } finally {
        setLoading(false)
      }
    }

    // Só buscar dados quando o diálogo estiver aberto
    if (open) {
      fetchClinics()
    }
  }, [toast, open])

  // Função para lidar com a mudança de clínica selecionada
  const handleClinicChange = async (clinicId: string) => {
    if (!clinicId) return;

    form.setValue("clinicId", clinicId);
    form.setValue("type", "");
    form.setValue("date", null as any);
    form.setValue("time", "");

    try {
      const schedule = await getClinicSchedule(clinicId);
      
      if (!schedule) {
        toast({
          title: "Aviso",
          description: "Este posto não possui horários configurados.",
          variant: "destructive",
        });
        return;
      }

      setClinicSchedule(schedule);
      setClinicHours({
        opening: schedule.workingHours.start,
        closing: schedule.workingHours.end
      });
    } catch (error) {
      console.error("Erro ao buscar informações da clínica:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações do posto de saúde.",
        variant: "destructive",
      });
    }
  };

  // Buscar horários disponíveis quando a data ou a clínica mudar
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      if (!selectedDate || !selectedClinic) return;

      try {
        if (slotsSubscription) {
          slotsSubscription();
        }

        setLoadingTimeSlots(true);

        const unsubscribeFunc = subscribeToSlots(
          selectedClinic, 
          selectedDate,
          (bookedSlots) => {
            if (!clinicSchedule?.workingHours) return;
            
            const allTimeSlots = generateTimeSlots(
              clinicSchedule.workingHours.start, 
              clinicSchedule.workingHours.end
            );
            
            const availableSlots = allTimeSlots
              .filter((slot) => !bookedSlots.includes(slot.time))
              .map(slot => slot.time);

            setAvailableTimeSlots(availableSlots);
            setLoadingTimeSlots(false);
          },
          'exam', // Type of appointment
          undefined // No doctor needed for exams
        );

        // Properly assign the unsubscribe function
        if (typeof unsubscribeFunc === 'function') {
          unsubscribe = unsubscribeFunc;
          setSlotsSubscription(() => unsubscribeFunc);
        }

      } catch (error) {
        console.error("Erro ao carregar dados do posto:", error);
        setLoadingTimeSlots(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedDate, selectedClinic, clinicSchedule]);

  // Função para enviar o formulário
  async function onSubmit(data: ExamFormValues) {
    try {
      // Lock the slot first
      const isLocked = await lockTimeSlot(data.clinicId, data.date!, data.time, user?.uid || "", "exam")

      if (!isLocked) {
        toast({
          title: "Horário indisponível",
          description: "Este horário já foi reservado. Por favor, escolha outro.",
          variant: "destructive",
        })
        return
      }

      // Get clinic details for the appointment
      const clinic = clinics.find(c => c.id === data.clinicId);

      // Create appointment in clinic's subcollection
      const appointmentData = {
        patientName: data.patientName,
        type: data.type,
        date: data.date,
        time: data.time,
        description: data.description,
        clinicId: data.clinicId,
        clinicName: clinic?.name || 'Não especificado',
        userId: user?.uid,
        status: "Agendado"
      };

      // Add to clinic's appointments subcollection
      await addExamAppointment(data.clinicId, appointmentData);

      // Confirm the booking
      await confirmBooking(data.clinicId, data.date!, data.time, user?.uid || "", "exam")

      toast({
        title: "Exame agendado",
        description: "O exame foi agendado com sucesso.",
      })

      form.reset()
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      // Release the slot if something goes wrong
      await releaseSlot(data.clinicId, data.date!, data.time)
      console.error("Erro ao agendar exame:", error)
      toast({
        title: "Erro ao agendar exame",
        description: "Ocorreu um erro ao agendar o exame. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Verificar permissões - não renderizar se o usuário não tiver permissão
  if (!canScheduleAppointments()) {
    return null
  }

  const isDateDisabled = (date: Date) => {
    if (!clinicSchedule) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Desabilitar datas passadas
    if (date < today) return true;

    // Verificar se o dia da semana está nos dias de funcionamento
    const weekDay = format(date, 'EEEE', { locale: ptBR })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace("-feira", ""); // Remove o sufixo -feira

    return !clinicSchedule.workingDays.includes(weekDay);
  };

  const isWorkingDay = (date: Date) => {
    if (!clinicSchedule) return false;

    const weekDay = format(date, 'EEEE', { locale: ptBR })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace("-feira", ""); // Remove o sufixo -feira

    return clinicSchedule.workingDays.includes(weekDay);
  };

  const formatWorkingDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      segunda: 'Segunda-feira',
      terca: 'Terça-feira',
      quarta: 'Quarta-feira',
      quinta: 'Quinta-feira',
      sexta: 'Sexta-feira',
      sabado: 'Sábado',
      domingo: 'Domingo'
    };
    return days?.map(day => dayMap[day]).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Agendar Exame</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Agendar Exame</DialogTitle>
          <DialogDescription>Preencha os dados para agendar um novo exame.</DialogDescription>
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
              <FormField
                control={form.control}
                name="clinicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posto de Saúde</FormLabel>
                    <Select onValueChange={handleClinicChange} value={field.value}>
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
                            disabled={!selectedClinic}
                            onClick={() => setCalendarOpen(true)}
                            type="button"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>{selectedClinic ? "Selecione uma data" : "Selecione um posto primeiro"}</span>
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
                            field.onChange(selected);
                            form.setValue("time", "");
                            setCalendarOpen(false);
                          }}
                          disabled={isDateDisabled}
                          modifiers={{ workingDay: isWorkingDay }}
                          modifiersClassNames={{
                            workingDay: styles.workingDay,
                            today: styles.today,
                            selected: styles.selected,
                            disabled: styles.disabled
                          }}
                          className={styles.calendar}
                          classNames={{
                            day: styles.calendarTile,
                            nav_button_previous: styles.navigation,
                            nav_button_next: styles.navigation,
                            caption: styles.monthLabel,
                            head_cell: styles.weekDay
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                      {selectedClinic && (
                        <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                          <p>
                            Horário de funcionamento: {clinicSchedule?.workingHours.start} às{" "}
                            {clinicSchedule?.workingHours.end}
                          </p>
                          <p>
                            Dias de funcionamento: {formatWorkingDays(clinicSchedule?.workingDays || [])}
                          </p>
                        </div>
                      )}
                    </Popover>
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
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-2">
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

              {/* Campo: Tipo de Exame */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Exame</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o tipo de exame"
                        {...field}
                        disabled={!selectedClinic}
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
                      <Textarea placeholder="Digite uma descrição para o exame (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botão de Envio */}
              <div className="flex justify-end gap-4">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit">
                  {editMode ? "Atualizar Agendamento" : "Agendar Exame"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

