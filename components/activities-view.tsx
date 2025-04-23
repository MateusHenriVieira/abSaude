// Arquivo: components/activities-view.tsx
// Descrição: Componente para exibir e gerenciar as atividades do médico/enfermeiro

"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Search, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context"
import { addDoctorService, removeDoctorService, getDoctorServices, getConsultationsByDoctor, getDoctorsByClinic, getClinics, saveActivity } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Checkbox } from "@/components/ui/checkbox"

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

const formatDate = (date: Date) => {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function ActivitiesView() {
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null)
  const [clinics, setClinics] = useState<any[]>([]) // Lista de postos de saúde
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    canceled: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  })
  const [filteredConsultations, setFilteredConsultations] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("") // Adicionado estado para o termo de busca
  const [statusFilter, setStatusFilter] = useState("all") // Adicionado estado para o filtro de status
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null) // Adicionado estado para a consulta selecionada
  const [detailsOpen, setDetailsOpen] = useState(false) // Adicionado estado para controlar o diálogo de detalhes
  const [dateFilter, setDateFilter] = useState("all") // Adicionado estado para o filtro de data

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

  useEffect(() => {
    if (user) {
      if (user.type === "doctor" || user.type === "nurse") {
        if (user.doctorId && user.clinicId) {
          fetchServices(user.clinicId, user.doctorId)
        } else {
          console.warn("Usuário conectado, mas doctorId ou clinicId não estão definidos.")
        }
      } else if (user.type === "receptionist" && user.clinicId) {
        fetchDoctors(user.clinicId)
      } else if (user.type === "admin") {
        fetchClinics()
      }
    } else {
      console.warn("Nenhum usuário conectado.")
    }
  }, [user])

  const fetchServices = async (clinicId: string, doctorId: string) => {
    try {
      const fetchedServices = await getDoctorServices(clinicId, doctorId)
      setServices(fetchedServices)
    } catch (error) {
      console.error("Erro ao buscar serviços:", error)
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar os serviços. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClinics = async () => {
    try {
      const fetchedClinics = await getClinics()
      setClinics(fetchedClinics)
    } catch (error) {
      console.error("Erro ao buscar postos de saúde:", error)
      toast({
        title: "Erro ao carregar postos de saúde",
        description: "Não foi possível carregar os postos de saúde. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const fetchDoctors = async (clinicId: string) => {
    try {
      const fetchedDoctors = await getDoctorsByClinic(clinicId);
      setClinics((prev) =>
        prev.map((clinic) =>
          clinic.id === clinicId ? { ...clinic, doctors: fetchedDoctors } : clinic
        )
      );
    } catch (error) {
      console.error("Erro ao buscar médicos:", error);
      toast({
        title: "Erro ao carregar médicos",
        description: "Não foi possível carregar os médicos. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const fetchConsultations = async () => {
    if (!user?.doctorId) {
      console.error("User or doctorId is undefined")
      return
    }

    try {
      const fetchedConsultations = await getConsultationsByDoctor(user.doctorId)
      setFilteredConsultations(fetchedConsultations)
      calculateStats(fetchedConsultations)
    } catch (error) {
      console.error("Error fetching consultations:", error)
      toast({
        title: "Erro ao carregar consultas",
        description: "Não foi possível carregar as consultas. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const calculateStats = (data: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneMonthAgo = new Date(today)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const stats = {
      total: data.length,
      completed: data.filter((c) => c.status === "Concluída").length,
      inProgress: data.filter((c) => c.status === "Em Andamento").length,
      canceled: data.filter((c) => c.status === "Cancelada").length,
      today: data.filter((c) => new Date(c.date) >= today).length,
      thisWeek: data.filter((c) => new Date(c.date) >= oneWeekAgo).length,
      thisMonth: data.filter((c) => new Date(c.date) >= oneMonthAgo).length,
    }

    setStats(stats)
  }

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      const availableDays = [
        data.monday && "monday",
        data.tuesday && "tuesday",
        data.wednesday && "wednesday",
        data.thursday && "thursday",
        data.friday && "friday",
        data.saturday && "saturday",
        data.sunday && "sunday",
      ].filter(Boolean) as string[]

      const serviceData = {
        name: data.name,
        duration: data.duration,
        price: data.price,
        availableDays: availableDays,
      }

      const serviceString = JSON.stringify(serviceData)

      if (user?.type === "admin" || user?.type === "receptionist") {
        // Salvar no posto de saúde associado
        const clinicId = user?.type === "admin" ? selectedClinic : user.clinicId

        if (!clinicId) {
          toast({
            title: "Erro",
            description: "Selecione ou configure um posto de saúde para adicionar o serviço.",
            variant: "destructive",
          })
          return
        }

        await addDoctorService(clinicId, serviceString)
        toast({
          title: "Sucesso",
          description: "O serviço foi adicionado ao posto de saúde com sucesso.",
          variant: "default",
        })
      } else if (user?.type === "doctor" || user?.type === "nurse") {
        // Salvar no posto de saúde e no perfil do usuário
        if (!user.clinicId || !user.doctorId) {
          toast({
            title: "Erro",
            description: "Seu perfil ou posto de saúde não está configurado corretamente.",
            variant: "destructive",
          })
          return
        }

        // Salvar no posto de saúde
        await addDoctorService(user.clinicId, serviceString)

        // Salvar no perfil do usuário
        await addDoctorService(user.doctorId, serviceString)

        toast({
          title: "Sucesso",
          description: "O serviço foi adicionado ao posto de saúde e ao seu perfil com sucesso.",
          variant: "default",
        })
      } else {
        toast({
          title: "Erro",
          description: "Tipo de usuário não suportado para adicionar serviços.",
          variant: "destructive",
        })
        return
      }

      reset()
      if (user?.clinicId && user?.doctorId) {
        fetchServices(user.clinicId, user.doctorId); // Atualizar a lista de serviços
      }
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error)
      toast({
        title: "Erro ao adicionar serviço",
        description: "Ocorreu um erro ao adicionar o serviço. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveService = async (service: string) => {
    if (!user?.doctorId || !user?.clinicId) {
      console.error("User, doctorId ou clinicId está indefinido")
      return
    }

    try {
      setDeleting(service)
      await removeDoctorService(user.clinicId, user.doctorId, service)
      setServices(services.filter((s) => s !== service))
      toast({
        title: "Serviço removido",
        description: "O serviço foi removido com sucesso.",
      })
    } catch (error) {
      console.error("Error removing service:", error)
      toast({
        title: "Erro ao remover serviço",
        description: "Ocorreu um erro ao remover o serviço. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

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
            onClick={() => handleRemoveService(serviceString)}
            disabled={deleting === serviceString}
          >
            {deleting === serviceString ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
          </Button>
        </div>
      )
    } catch (e) {
      return (
        <div className="flex justify-between items-center py-2 border-b">
          <p>{serviceString}</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRemoveService(serviceString)}
            disabled={deleting === serviceString}
          >
            {deleting === serviceString ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
          </Button>
        </div>
      )
    }
  }

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Concluída":
        return "success"
      case "Em Andamento":
        return "default"
      case "Cancelada":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const openConsultationDetails = (consultation: any) => {
    setSelectedConsultation(consultation) // Define a consulta selecionada
    setDetailsOpen(true) // Abre o diálogo de detalhes
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Minhas Atividades</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus serviços e visualize seu histórico de consultas</p>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Meus Serviços</TabsTrigger>
          <TabsTrigger value="history">Histórico de Consultas</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Atendimento</CardTitle>
              <CardDescription>
                Adicione ou remova os tipos de atendimento que você oferece aos pacientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.type === "admin" && (
                <div className="mb-4">
                  <Label htmlFor="clinic">Selecione o Posto de Saúde</Label>
                  <Select
                    onValueChange={(value) => {
                      setSelectedClinic(value)
                      fetchDoctors(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um posto de saúde" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(user?.type === "admin" || user?.type === "receptionist") && selectedClinic && (
                <div className="mb-4">
                  <Label htmlFor="doctor">Selecione o Médico</Label>
                  <Select
                    onValueChange={(value) => {
                      fetchServices(selectedClinic, value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um médico" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics
                        .find((clinic) => clinic.id === selectedClinic)
                        ?.doctors?.map((doctor: { id: string; name: string }) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name}
                          </SelectItem>
                        )) || (
                          <p className="text-muted-foreground px-4 py-2">Nenhum médico encontrado</p>
                        )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do Serviço</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      defaultValue="" // Certifique-se de que o valor inicial está definido
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duração (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        {...register("duration")}
                        defaultValue="30" // Certifique-se de que o valor inicial está definido
                      />
                      {errors.duration && <p className="text-sm text-red-500">{errors.duration.message}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="price">Valor (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...register("price")}
                        defaultValue="0" // Certifique-se de que o valor inicial está definido
                      />
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

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleSubmit(async (data) => {
                    try {
                      const availableDays = [
                        data.monday && "monday",
                        data.tuesday && "tuesday",
                        data.wednesday && "wednesday",
                        data.thursday && "thursday",
                        data.friday && "friday",
                        data.saturday && "saturday",
                        data.sunday && "sunday",
                      ].filter(Boolean) as string[];

                      const activityData = {
                        name: data.name,
                        duration: data.duration,
                        price: data.price,
                        availableDays: availableDays,
                      };

                      // Salvar os dados usando saveActivity
                      await saveActivity(user, activityData);

                      toast({
                        title: "Sucesso",
                        description: "O serviço foi adicionado com sucesso.",
                        variant: "default",
                      });

                      reset();
                      if (user?.clinicId && user?.doctorId) {
                        fetchServices(user.clinicId, user.doctorId); // Atualizar a lista de serviços
                      }
                    } catch (error) {
                      console.error("Erro ao adicionar serviço:", error);
                      toast({
                        title: "Erro ao adicionar serviço",
                        description: "Ocorreu um erro ao adicionar o serviço. Tente novamente.",
                        variant: "destructive",
                      });
                    }
                  })}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Adicionar Serviço
                </Button>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Todas as consultas realizadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% do total` : "0% do total"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">Consultas em progresso</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.canceled}</div>
                <p className="text-xs text-muted-foreground">Consultas canceladas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 w-full"
                placeholder="Buscar paciente ou tipo"
                value={searchTerm} // Usando o estado searchTerm
                onChange={(e) => setSearchTerm(e.target.value)} // Atualizando o estado searchTerm
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Concluída">Concluídas</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de consultas */}
          <Card>
            <CardHeader>
              <CardTitle>Consultas ({filteredConsultations.length})</CardTitle>
              <CardDescription>
                {filteredConsultations.length === 1
                  ? "1 consulta encontrada"
                  : `${filteredConsultations.length} consultas encontradas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr] md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 font-medium border-b bg-muted/50">
                  <div>Paciente</div>
                  <div className="hidden md:block">Tipo</div>
                  <div>Data</div>
                  <div>Status</div>
                  <div>Ações</div>
                </div>
                <div className="divide-y">
                  {filteredConsultations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">Nenhuma consulta encontrada.</div>
                  ) : (
                    filteredConsultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="grid grid-cols-[2fr,1fr,1fr,1fr] md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 items-center cursor-pointer hover:bg-muted/30"
                        onClick={() => openConsultationDetails(consultation)} // Chamada da função
                      >
                        <div className="font-medium">{consultation.patientName}</div>
                        <div className="hidden md:block text-muted-foreground">{consultation.type}</div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(consultation.date), "dd/MM/yyyy")}</span>
                        </div>
                        <div>
                          <Badge variant={getStatusBadgeVariant(consultation.status)}>{consultation.status}</Badge>
                        </div>
                        <div>
                          <Button variant="ghost" size="icon" onClick={() => openConsultationDetails(consultation)}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de detalhes da consulta */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
            <DialogDescription>Informações completas sobre a consulta</DialogDescription>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Paciente</h3>
                  <p className="text-lg font-semibold">{selectedConsultation.patientName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Tipo de Consulta</h3>
                  <p className="text-lg font-semibold">{selectedConsultation.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Data</h3>
                  <p className="text-lg font-semibold">{formatDate(new Date(selectedConsultation.date))}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Horário</h3>
                  <p className="text-lg font-semibold">{selectedConsultation.time}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge className="mt-1" variant={getStatusBadgeVariant(selectedConsultation.status)}>
                    {selectedConsultation.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Postinho</h3>
                  <p className="text-lg font-semibold">{selectedConsultation.clinicName || "Não especificado"}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Observações</h3>
                <div className="rounded-md border p-4 bg-muted/20">
                  {selectedConsultation.notes ? (
                    <p>{selectedConsultation.notes}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Nenhuma observação registrada</p>
                  )}
                </div>
              </div>

              <Tabs defaultValue="history">
                <TabsList className="w-full">
                  <TabsTrigger value="history" className="flex-1">
                    Histórico do Paciente
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="flex-1">
                    Prescrições
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="space-y-4 mt-4">
                  <p className="text-muted-foreground">Histórico de consultas anteriores com este paciente.</p>
                  <div className="rounded-md border">
                    {/* Aqui poderia ser implementado um histórico de consultas do paciente */}
                    <div className="p-4 text-center text-muted-foreground">Funcionalidade em desenvolvimento.</div>
                  </div>
                </TabsContent>
                <TabsContent value="prescriptions" className="space-y-4 mt-4">
                  <p className="text-muted-foreground">Prescrições emitidas nesta consulta.</p>
                  <div className="rounded-md border">
                    {/* Aqui poderia ser implementado um histórico de prescrições */}
                    <div className="p-4 text-center text-muted-foreground">Funcionalidade em desenvolvimento.</div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

