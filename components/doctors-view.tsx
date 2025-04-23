"use client"

import { useState, useEffect, useCallback } from "react"
import { Filter, Search, Eye, Clock, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RegistrationDialog } from "./doctor-registration/registration-dialog"
import { getDoctors, getConsultations, getExams, getClinic } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ServicesDialog } from "./services-dialog"
import { getDoctorServices } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { usePermissions } from "@/hooks/use-permissions"
import { useClinic } from "@/contexts/clinic-context"

interface Clinic {
  id: string;
  name: string;
}

export function DoctorsView() {
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const { canRegisterDoctors } = usePermissions()
  const [clinicsMap, setClinicsMap] = useState<Record<string, string>>({})
  const { selectedClinicId } = useClinic()

  // Estado para o diálogo de detalhes do médico
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [doctorDetailsOpen, setDoctorDetailsOpen] = useState(false)
  const [doctorConsultations, setDoctorConsultations] = useState<any[]>([])
  const [doctorExams, setDoctorExams] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [doctorServices, setDoctorServices] = useState<any[]>([])
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false)

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true)
      // Use selectedClinicId from context for admin users, otherwise use user's clinicId
      const clinicIdToUse = user?.type === 'admin' ? 
        (selectedClinicId === 'all' ? undefined : selectedClinicId) : 
        user?.clinicId

      const data = await getDoctors(clinicIdToUse)
      
      // Get unique clinic IDs using Array.from and filter
      const uniqueClinicIds = Array.from(
        new Set(data.map(d => d.clinicId).filter(Boolean))
      );
      
      const clinicsData: Record<string, string> = {}
      
      await Promise.all(
        uniqueClinicIds.map(async (clinicId) => {
          const clinic = await getClinic(clinicId) as Clinic | null
          if (clinic && clinic.name) {
            clinicsData[clinicId] = clinic.name
          }
        })
      )
      
      setClinicsMap(clinicsData)
      setDoctors(data)
    } catch (error) {
      console.error("Error fetching doctors:", error)
      toast({
        title: "Erro ao carregar médicos",
        description: "Não foi possível carregar a lista de médicos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, selectedClinicId, toast])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors, selectedClinicId])

  const filteredDoctors = doctors.filter((doctor) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      doctor.firstName?.toLowerCase().includes(searchLower) ||
      doctor.lastName?.toLowerCase().includes(searchLower) ||
      doctor.function?.toLowerCase().includes(searchLower) ||
      doctor.medicalId?.toLowerCase().includes(searchLower)
    )
  })

  // Função para abrir os detalhes do médico
  const openDoctorDetails = async (doctor: any) => {
    setSelectedDoctor(doctor)
    setDoctorDetailsOpen(true)
    setLoadingDetails(true)

    try {
      const [consultations, exams, services] = await Promise.all([
        getConsultations(user?.clinicId, doctor.id),
        getExams(user?.clinicId, doctor.id),
        getDoctorServices(user?.clinicId || '', doctor.id),
      ])

      setDoctorConsultations(consultations)
      setDoctorExams(exams)
      setDoctorServices(services || []) // Garantir que services seja um array
    } catch (error) {
      console.error("Error fetching doctor details:", error)

      // Check if the error is due to missing index
      if (error instanceof Error && error.message.includes("The query requires an index")) {
        toast({
          title: "Erro ao carregar detalhes",
          description: "É necessário criar um índice no Firestore. Por favor, contate o administrador do sistema.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro ao carregar detalhes",
          description: "Ocorreu um erro ao carregar os detalhes do médico. Por favor, tente novamente.",
          variant: "destructive",
        })
      }

      // Set empty arrays to prevent undefined errors
      setDoctorConsultations([])
      setDoctorExams([])
      setDoctorServices([])
    } finally {
      setLoadingDetails(false)
    }
  }

  // Função para formatar os dias de trabalho
  const formatWorkingDays = (days: string[] = []) => {
    if (!days || days.length === 0) return "Não definido"

    const dayMap: Record<string, string> = {
      monday: "Segunda",
      tuesday: "Terça",
      wednesday: "Quarta",
      thursday: "Quinta",
      friday: "Sexta",
      saturday: "Sábado",
      sunday: "Domingo",
    }

    return days.map((day) => dayMap[day] || day).join(", ")
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Rede de Médicos</h1>
        <p className="text-sm text-muted-foreground">Lista de médicos e seu respectivo local.</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Total Médicos ({doctors.length})</h2>
        </div>
        <div className="flex items-center gap-4">
          {canRegisterDoctors() && (
            <Button variant="default" onClick={() => setRegistrationOpen(true)}>
              Cadastrar +
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 border-b bg-muted/50 p-4 font-medium">
          <div>Nome & Função</div>
          <div>COREN/CRM</div>
          <div>Entrou Em</div>
          <div>Postinho</div>
          <div>Status</div>
        </div>
        <div className="divide-y">
          {loading
            ? // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            : filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={doctor.profileImage} />
                      <AvatarFallback>
                        {doctor.firstName?.[0]}
                        {doctor.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className="font-medium cursor-pointer hover:text-primary hover:underline"
                        onClick={() => openDoctorDetails(doctor)}
                      >
                        {doctor.firstName} {doctor.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {doctor.specialties && doctor.specialties.length > 0
                          ? `- ${doctor.specialties.join(", ")}`
                          : doctor.function
                            ? `- ${doctor.function}`
                            : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">{doctor.medicalId}</div>
                  <div className="flex items-center">
                    {doctor.createdAt && doctor.createdAt.seconds
                      ? new Date(doctor.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
                      : doctor.createdAt instanceof Date
                        ? doctor.createdAt.toLocaleDateString("pt-BR")
                        : "Data não disponível"}
                  </div>
                  <div className="flex items-center">
                    {clinicsMap[doctor.clinicId] || "Não associado"}
                  </div>
                  <div className="flex items-center">
                    <Badge variant={doctor.status === "Trabalhando" ? "default" : "secondary"}>{doctor.status}</Badge>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {canRegisterDoctors() && (
        <RegistrationDialog open={registrationOpen} onOpenChange={setRegistrationOpen} onSuccess={fetchDoctors} />
      )}

      {/* Diálogo de detalhes do médico */}
      <Dialog open={doctorDetailsOpen} onOpenChange={setDoctorDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Médico</DialogTitle>
          </DialogHeader>

          {selectedDoctor && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedDoctor.profileImage} />
                  <AvatarFallback>
                    {selectedDoctor.firstName?.[0]}
                    {selectedDoctor.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctor.specialties && selectedDoctor.specialties.length > 0
                      ? selectedDoctor.specialties.join(", ")
                      : selectedDoctor.function || "Sem especialidade"}
                  </p>
                  <p className="text-sm">ID: {selectedDoctor.medicalId}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={selectedDoctor.status === "Trabalhando" ? "default" : "secondary"}>
                      {selectedDoctor.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">Email:</span> {selectedDoctor.email}
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span> {selectedDoctor.phone}
                    </div>
                    <div>
                      <span className="font-medium">Posto:</span> {selectedDoctor.clinic}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Horário de Trabalho</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedDoctor.workingDays && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatWorkingDays(selectedDoctor.workingDays)}</span>
                      </div>
                    )}
                    {selectedDoctor.workingHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedDoctor.workingHours.start || "08:00"} - {selectedDoctor.workingHours.end || "18:00"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="consultations">
                <TabsList className="w-full">
                  <TabsTrigger value="consultations" className="flex-1">
                    Consultas
                  </TabsTrigger>
                  <TabsTrigger value="exams" className="flex-1">
                    Exames
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">
                    Documentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consultations" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Consultas</CardTitle>
                      <CardDescription>Total de {doctorConsultations.length} consultas realizadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingDetails ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : doctorConsultations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhuma consulta encontrada para este médico.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {doctorConsultations.map((consultation) => (
                            <div key={consultation.id} className="flex items-center justify-between border-b pb-2">
                              <div>
                                <p className="font-medium">{consultation.patientName}</p>
                                <p className="text-sm text-muted-foreground">{consultation.type}</p>
                              </div>
                              <div className="text-right">
                                <p>{format(new Date(consultation.date), "dd/MM/yyyy")}</p>
                                <p className="text-sm text-muted-foreground">{consultation.time}</p>
                              </div>
                              <Badge
                                variant={
                                  consultation.status === "Em Andamento"
                                    ? "default"
                                    : consultation.status === "Concluída"
                                      ? "success"
                                      : consultation.status === "Cancelada"
                                        ? "destructive"
                                        : "secondary"
                                }
                              >
                                {consultation.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="exams" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Exames</CardTitle>
                      <CardDescription>Total de {doctorExams.length} exames realizados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingDetails ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : doctorExams.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum exame encontrado para este médico.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {doctorExams.map((exam) => (
                            <div key={exam.id} className="flex items-center justify-between border-b pb-2">
                              <div>
                                <p className="font-medium">{exam.patientName}</p>
                                <p className="text-sm text-muted-foreground">{exam.type}</p>
                              </div>
                              <div className="text-right">
                                <p>{format(new Date(exam.date), "dd/MM/yyyy")}</p>
                                <p className="text-sm text-muted-foreground">{exam.time}</p>
                              </div>
                              <Badge
                                variant={
                                  exam.status === "Em Andamento"
                                    ? "default"
                                    : exam.status === "Concluído"
                                      ? "success"
                                      : exam.status === "Cancelado"
                                        ? "destructive"
                                        : "secondary"
                                }
                              >
                                {exam.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Documentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedDoctor.documents && selectedDoctor.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDoctor.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between border-b pb-2">
                              <div>
                                <p className="font-medium">{doc.name || `Documento ${index + 1}`}</p>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum documento encontrado para este médico.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {canRegisterDoctors() && <Button onClick={() => setServicesDialogOpen(true)}>Serviços</Button>}

              <ServicesDialog
                open={servicesDialogOpen}
                onOpenChange={setServicesDialogOpen}
                doctorId={selectedDoctor?.id}
                existingServices={doctorServices}
                onSuccess={() => {
                  // Recarregar serviços do médico
                  getDoctorServices(user?.clinicId || '', selectedDoctor?.id)
                    .then((services) => setDoctorServices(services || []))
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

