"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { addDoctorService, removeDoctorService, getDoctorServices } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

// Esquema de validação para o formulário
const serviceSchema = z.object({
  name: z.string().min(3, "O nome do serviço deve ter pelo menos 3 caracteres"),
  duration: z.string().min(1, "A duração é obrigatória"),
  price: z.string().min(1, "O valor é obrigatório"),
  monday: z.boolean().optional(),
  tuesday: z.boolean().optional(),
  wednesday: z.boolean().optional(),
  thursday: z.boolean().optional(),
  friday: z.boolean().optional(),
  saturday: z.boolean().optional(),
  sunday: z.boolean().optional(),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

interface ServicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctorId: string
  clinicId?: string
  existingServices: string[] // Add this line
  onSuccess?: () => void
}

export function ServicesDialog({
  open,
  onOpenChange,
  doctorId,
  clinicId,
  existingServices = [], // Add default value
  onSuccess,
}: ServicesDialogProps) {
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      duration: "30",
      price: "0",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
  })

  // Carregar serviços do médico
  useEffect(() => {
    if (open && doctorId) {
      loadServices()
    }
  }, [open, doctorId])

  const loadServices = async () => {
    try {
      setLoading(true)
      const doctorServices = await getDoctorServices(clinicId || '', doctorId)
      setServices(doctorServices)
    } catch (error) {
      console.error("Erro ao carregar serviços:", error)
      toast.error("Erro ao carregar serviços")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      // Extrair os dias selecionados
      const availableDays = [
        data.monday && "monday",
        data.tuesday && "tuesday",
        data.wednesday && "wednesday",
        data.thursday && "thursday",
        data.friday && "friday",
        data.saturday && "saturday",
        data.sunday && "sunday",
      ].filter(Boolean) as string[]

      // Formatar o serviço como JSON
      const serviceData = {
        name: data.name,
        duration: data.duration,
        price: data.price,
        availableDays: availableDays,
      }

      // Converter para string para armazenar no Firebase
      const serviceString = JSON.stringify(serviceData)

      await addDoctorService(doctorId, serviceString)
      toast.success("Serviço adicionado com sucesso")
      reset()
      loadServices()
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error)
      toast.error("Erro ao adicionar serviço")
    }
  }

  const handleDeleteService = async (service: string) => {
    try {
      setDeleting(service)
      await removeDoctorService(clinicId || '', doctorId, service)
      toast.success("Serviço removido com sucesso")
      loadServices()
    } catch (error) {
      console.error("Erro ao remover serviço:", error)
      toast.error("Erro ao remover serviço")
    } finally {
      setDeleting(null)
    }
  }

  // Função para exibir os serviços de forma mais amigável
  const formatServiceDisplay = (serviceString: string) => {
    try {
      const service = JSON.parse(serviceString)
      return (
        <div className="flex justify-between items-center py-2 border-b">
          <div>
            <p className="font-medium">{service.name}</p>
            <div className="text-sm text-muted-foreground">
              <p>
                Duração: {service.duration} min | Valor: R$ {service.price}
              </p>
              <p>
                Dias: {service.availableDays?.map((day: string) => translateDay(day)).join(", ") || "Todos os dias"}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteService(serviceString)}
            disabled={deleting === serviceString}
          >
            {deleting === serviceString ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
          </Button>
        </div>
      )
    } catch (e) {
      // Fallback para serviços antigos que não estão no formato JSON
      return (
        <div className="flex justify-between items-center py-2 border-b">
          <p>{serviceString}</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteService(serviceString)}
            disabled={deleting === serviceString}
          >
            {deleting === serviceString ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
          </Button>
        </div>
      )
    }
  }

  // Função para traduzir os dias da semana
  const translateDay = (day: string) => {
    const translations: Record<string, string> = {
      monday: "Segunda",
      tuesday: "Terça",
      wednesday: "Quarta",
      thursday: "Quinta",
      friday: "Sexta",
      saturday: "Sábado",
      sunday: "Domingo",
    }
    return translations[day] || day
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Serviços</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Serviço</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input id="duration" type="number" {...register("duration")} />
                {errors.duration && <p className="text-sm text-red-500">{errors.duration.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Valor (R$)</Label>
                <Input id="price" type="number" step="0.01" {...register("price")} />
                {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Dias Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="monday" {...register("monday")} />
                  <Label htmlFor="monday">Segunda</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="tuesday" {...register("tuesday")} />
                  <Label htmlFor="tuesday">Terça</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="wednesday" {...register("wednesday")} />
                  <Label htmlFor="wednesday">Quarta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="thursday" {...register("thursday")} />
                  <Label htmlFor="thursday">Quinta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="friday" {...register("friday")} />
                  <Label htmlFor="friday">Sexta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="saturday" {...register("saturday")} />
                  <Label htmlFor="saturday">Sábado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sunday" {...register("sunday")} />
                  <Label htmlFor="sunday">Domingo</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar Serviço
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-6">
          <h3 className="font-medium mb-2">Serviços Cadastrados</h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : services.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {services.map((service, index) => (
                <div key={index}>{formatServiceDisplay(service)}</div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhum serviço cadastrado</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

