"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// Schema de validação para o formulário de disponibilidade
const availabilitySchema = z.object({
  workingDays: z.array(z.string()).min(1, "Selecione pelo menos um dia de trabalho"),
  workingHours: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  }),
  is24Hours: z.boolean().optional(),
  lunchBreak: z
    .object({
      enabled: z.boolean().optional(),
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)")
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)")
        .optional(),
    })
    .optional(),
  slotDuration: z.number().min(5, "A duração mínima é de 5 minutos").max(120, "A duração máxima é de 120 minutos"),
  maxDailyAppointments: z.number().min(1, "O mínimo é 1 consulta por dia").optional(),
})

interface DoctorAvailabilityProps {
  doctorId: string
  clinicId: string
}

export function DoctorAvailability({ doctorId, clinicId }: DoctorAvailabilityProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Dias da semana
  const weekDays = [
    { id: "sunday", label: "Domingo" },
    { id: "monday", label: "Segunda-feira" },
    { id: "tuesday", label: "Terça-feira" },
    { id: "wednesday", label: "Quarta-feira" },
    { id: "thursday", label: "Quinta-feira" },
    { id: "friday", label: "Sexta-feira" },
    { id: "saturday", label: "Sábado" },
  ]

  // Inicialização do formulário com React Hook Form
  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      workingHours: {
        start: "08:00",
        end: "18:00",
      },
      is24Hours: false,
      lunchBreak: {
        enabled: true,
        start: "12:00",
        end: "13:00",
      },
      slotDuration: 30,
      maxDailyAppointments: 20,
    },
  })

  // Observar valores do formulário para atualização dinâmica
  const is24Hours = form.watch("is24Hours")
  const lunchBreakEnabled = form.watch("lunchBreak.enabled")

  // Carregar dados do médico ao iniciar o componente
  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        setLoading(true)

        const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId)
        const doctorDoc = await getDoc(doctorRef)

        if (doctorDoc.exists()) {
          const doctorData = doctorDoc.data()

          // Verificar se o médico tem configurações de agenda
          if (doctorData.schedule) {
            form.reset({
              workingDays: doctorData.schedule.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
              workingHours: doctorData.schedule.workingHours || {
                start: "08:00",
                end: "18:00",
              },
              is24Hours: doctorData.schedule.is24Hours || false,
              lunchBreak: doctorData.schedule.lunchBreak || {
                enabled: true,
                start: "12:00",
                end: "13:00",
              },
              slotDuration: doctorData.schedule.slotDuration || 30,
              maxDailyAppointments: doctorData.schedule.maxDailyAppointments || 20,
            })
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do médico:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as configurações de disponibilidade do médico.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorData()
  }, [doctorId, clinicId, form, toast])

  // Função para salvar as configurações de disponibilidade
  async function onSubmit(data: z.infer<typeof availabilitySchema>) {
    try {
      setSaving(true)

      // Se o médico trabalha 24 horas, ajustar os horários
      if (data.is24Hours) {
        data.workingHours = {
          start: "00:00",
          end: "23:59",
        }
      }

      // Se o intervalo de almoço não estiver habilitado, remover os horários
      if (!data.lunchBreak?.enabled) {
        data.lunchBreak = {
          enabled: false,
        }
      }

      const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId)
      await updateDoc(doctorRef, {
        schedule: {
          ...data,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Configurações salvas",
        description: "As configurações de disponibilidade foram salvas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de disponibilidade.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Disponibilidade</CardTitle>
        <CardDescription>Configure os dias e horários de atendimento do médico.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schedule">
          <TabsList className="mb-4">
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="advanced">Configurações Avançadas</TabsTrigger>
          </TabsList>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="schedule" className="space-y-6">
                {/* Dias de trabalho */}
                <FormField
                  control={form.control}
                  name="workingDays"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Dias de Atendimento</FormLabel>
                        <FormDescription>Selecione os dias em que o médico atende.</FormDescription>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {weekDays.map((day) => (
                          <FormField
                            key={day.id}
                            control={form.control}
                            name="workingDays"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, day.id])
                                          : field.onChange(field.value?.filter((value) => value !== day.id))
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{day.label}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Horário de trabalho */}
                <div className="space-y-4">
                  <div>
                    <FormLabel className="text-base">Horário de Atendimento</FormLabel>
                    <FormDescription>Configure o horário de início e término do atendimento.</FormDescription>
                  </div>

                  <FormField
                    control={form.control}
                    name="is24Hours"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Atendimento 24 horas</FormLabel>
                      </FormItem>
                    )}
                  />

                  {!is24Hours && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workingHours.start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário de Início</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workingHours.end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário de Término</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Intervalo de almoço */}
                  {!is24Hours && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="lunchBreak.enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Intervalo para almoço</FormLabel>
                          </FormItem>
                        )}
                      />

                      {lunchBreakEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="lunchBreak.start"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Início do Intervalo</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lunchBreak.end"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fim do Intervalo</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                {/* Duração dos slots */}
                <FormField
                  control={form.control}
                  name="slotDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração das Consultas (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={120}
                          step={5}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Defina a duração padrão de cada consulta em minutos (entre 5 e 120).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Máximo de consultas por dia */}
                <FormField
                  control={form.control}
                  name="maxDailyAppointments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Consultas por Dia</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Limite o número máximo de consultas que o médico pode atender em um dia.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <CardFooter className="flex justify-end pt-6 px-0">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
