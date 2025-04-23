"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { sendMassNotification, getClinics, getNotificationTypes } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

// Esquema de validação para o formulário
const notificationSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
  type: z.string().min(1, "Selecione um tipo de notificação"),
  sendToAll: z.boolean(), // Remove default, making it required
  clinicId: z.string().optional(),
})

type NotificationFormValues = {
  title: string
  message: string
  type: string
  sendToAll: boolean // Make it required, not optional
  clinicId?: string
}

export function NotificationForm() {
  const [clinics, setClinics] = useState<any[]>([])
  const [notificationTypes, setNotificationTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "",
      sendToAll: false, // Provide initial value
      clinicId: "",
    },
  })

  const sendToAll = watch("sendToAll")

  // Carregar postos de saúde e tipos de notificação
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [clinicsData, typesData] = await Promise.all([getClinics(), getNotificationTypes()])
        setClinics(clinicsData || [])
        setNotificationTypes(typesData || [])

        // Se o usuário não for admin, pré-selecionar o posto do usuário
        if (user && user.clinicId && user.type !== "admin") {
          setValue("clinicId", user.clinicId)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast.error("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, setValue])

  const onSubmit = async (data: NotificationFormValues) => {
    try {
      if (!data.title || !data.message || !data.type) {
        toast.error("Preencha todos os campos obrigatórios")
        return
      }

      const notificationData = {
        title: data.title,
        message: data.message,
        type: data.type,
        sendToAll: data.sendToAll, // Ensure boolean value
        clinicId: data.sendToAll ? null : (user?.type !== "admin" ? user?.clinicId : data.clinicId) || null
      }

      await sendMassNotification(notificationData)
      toast.success("Notificação enviada com sucesso")
      reset()
    } catch (error: any) {
      console.error("Erro ao enviar notificação:", error)
      toast.error(error.message || "Erro ao enviar notificação")
    }
  }

  // Quando o usuário marcar "Enviar para todos", desabilitar a seleção de posto
  useEffect(() => {
    if (sendToAll) {
      setValue("clinicId", "")
    }
  }, [sendToAll, setValue])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Notificação</CardTitle>
        <CardDescription>
          Envie notificações para os pacientes do posto de saúde ou para todos os pacientes do sistema.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" rows={4} {...register("message")} />
            {errors.message && <p className="text-sm text-red-500">{errors.message.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Notificação</Label>
            <Select onValueChange={(value) => setValue("type", value)} defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {notificationTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("type")} />
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => setValue("sendToAll", checked as boolean)}
              />
              <Label htmlFor="sendToAll">Enviar para todos os pacientes</Label>
            </div>
          </div>

          {!sendToAll && user?.type === "admin" && (
            <div className="grid gap-2">
              <Label htmlFor="clinicId">Posto de Saúde</Label>
              <Select onValueChange={(value) => setValue("clinicId", value)} defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um posto" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("clinicId")} />
              {errors.clinicId && <p className="text-sm text-red-500">{errors.clinicId.message}</p>}
            </div>
          )}

          {!sendToAll && user?.type !== "admin" && (
            <div className="grid gap-2">
              <Label>Posto de Saúde</Label>
              <p className="text-sm text-muted-foreground">
                As notificações serão enviadas para os pacientes do seu posto de saúde.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar Notificação
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

