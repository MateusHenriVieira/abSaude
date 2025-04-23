"use client"

import { CardHeader } from "@/components/ui/card"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Calendar, PieChart } from "lucide-react"
import { StatsCards } from "@/components/stats-cards"
import { getDashboardData, getConsultationsByDoctor } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { DailyRoutineCard } from "@/components/daily-routine-card"
import { Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useClinic } from "@/contexts/clinic-context"

function RecentAppointments({ clinicId, doctorId }: { clinicId: string, doctorId: string }) {
  const { selectedClinicId } = useClinic()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Use selected clinic for admin, otherwise use provided clinicId
        const effectiveClinicId = user?.type === 'admin' ? 
          (selectedClinicId === 'all' ? undefined : selectedClinicId) : 
          clinicId;

        const consultations = await getConsultationsByDoctor(doctorId, effectiveClinicId);
        setAppointments(consultations.slice(0, 5));
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [doctorId, clinicId, selectedClinicId, user?.type]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                  <Skeleton className="h-5 w-[100px]" />
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atendimentos Recentes</CardTitle>
        <CardDescription>Últimos pacientes atendidos</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {appointments.map((apt) => (
            <div key={apt.id} className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{apt.patientName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(apt.date, "dd/MM/yyyy 'às' HH:mm")}
                </p>
                <Badge variant="secondary">{apt.status}</Badge>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedClinicId } = useClinic()

  useEffect(() => {
    const fetchData = async () => {
      // For admin users, use selected clinic. For others, use their assigned clinic
      const clinicIdToUse = user?.type === 'admin' ? 
        (selectedClinicId === 'all' ? undefined : selectedClinicId) : 
        user?.clinicId;

      if (!clinicIdToUse && user?.type !== 'admin') {
        setError("Usuário não está associado a um posto de saúde.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getDashboardData(clinicIdToUse || 'all')
        setDashboardData(data)
      } catch (error) {
        console.error("Error in fetchData:", error)
        setError("Falha ao carregar dados. Por favor, tente novamente mais tarde.")
        toast({
          title: "Erro ao carregar dados",
          description: "Ocorreu um problema ao buscar as informações. Tente novamente em alguns instantes.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast, selectedClinicId])

  const navigateToConsultations = (filter?: string) => {
    router.push(`/consultas${filter ? `?filter=${filter}` : ""}`)
  }

  const navigateToExams = () => {
    router.push("/exames")
  }

  const navigateToDoctors = () => {
    router.push("/medicos")
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Erro ao carregar dados</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return <div>Nenhum dado disponível. Por favor, tente novamente mais tarde.</div>
  }

  // Calcular os totais para o relatório
  const agendados = (dashboardData.consultationStatuses?.Agendada || 0) + (dashboardData.examStatuses?.Agendado || 0)
  const concluidos = (dashboardData.consultationStatuses?.Concluída || 0) + (dashboardData.examStatuses?.Concluído || 0)
  const cancelados = (dashboardData.consultationStatuses?.Cancelada || 0) + (dashboardData.examStatuses?.Cancelado || 0)

  // Calcular as porcentagens para o gráfico
  const total = agendados + concluidos + cancelados
  const agendadosPercent = total > 0 ? (agendados / total) * 100 : 0
  const concluidosPercent = total > 0 ? (concluidos / total) * 100 : 0
  const canceladosPercent = total > 0 ? (cancelados / total) * 100 : 0

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-[2fr,1fr] gap-6 p-6">
      {/* Left column */}
      <div className="space-y-6 overflow-auto pr-2">
        <StatsCards data={dashboardData} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-4">
            {user?.type === "doctor" || user?.type === "nurse" ? (
              user?.clinicId ? (
                <RecentAppointments 
                  clinicId={user.clinicId} 
                  doctorId={user.doctorId || ''} 
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">
                      Nenhum posto de saúde associado ao usuário.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="pt-4 px-6 pb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">Médicos Recentes</h2>
                    <Button variant="ghost" className="text-sm text-primary" onClick={navigateToDoctors}>
                      Ver Todos
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {dashboardData.recentDoctors && dashboardData.recentDoctors.length > 0 ? (
                      dashboardData.recentDoctors.map((doctor: any) => (
                        <div key={doctor.id} className="flex items-center gap-2">
                          <input type="checkbox" className="h-3 w-3 rounded border-gray-300" />
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gray-200">
                              {doctor.profileImage && (
                                <img
                                  src={doctor.profileImage || "/placeholder.svg"}
                                  alt={doctor.firstName}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium">
                                {`${doctor.firstName} ${doctor.lastName}`}
                                <span className="ml-1 text-xs text-muted-foreground">- {doctor.function}</span>
                              </p>
                            </div>
                          </div>
                          <div className="w-20">
                            <span
                              className={`text-[10px] px-1 py-0 rounded-full ${
                                doctor.status === "Trabalhando" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {doctor.status}
                            </span>
                          </div>
                          <div className="w-24 text-xs text-muted-foreground">
                            {doctor.createdAt instanceof Timestamp
                              ? format(doctor.createdAt.toDate(), "dd/MM/yyyy")
                              : new Date(doctor.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground">Nenhum médico recente encontrado.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Para Hoje</h2>
                <Button variant="ghost" size="sm">
                  Visualizar
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {(dashboardData.todayConsultations?.length || 0) + (dashboardData.todayExams?.length || 0)}{" "}
                      Atendimentos
                    </span>
                  </div>
                  <p className="ml-6 text-sm text-muted-foreground">
                    {dashboardData.todayExams?.length || 0} Exames. {dashboardData.todayConsultations?.length || 0}{" "}
                    Consultas.
                  </p>
                  <Button
                    variant="link"
                    className="ml-6 h-auto p-0 text-primary"
                    onClick={() => navigateToConsultations("today")}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{dashboardData.totalConsultations + dashboardData.totalExams} Atendimentos em andamento</span>
                  </div>
                  <p className="ml-6 text-sm text-muted-foreground">
                    {dashboardData.totalConsultations +
                      dashboardData.totalExams -
                      dashboardData.completedConsultations -
                      dashboardData.completedExams}{" "}
                    Pacientes Pendentes.
                  </p>
                  <Button
                    variant="link"
                    className="ml-6 h-auto p-0 text-primary"
                    onClick={() => navigateToConsultations("inProgress")}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Relatório</h2>
                <Button variant="ghost" size="sm" onClick={() => setReportDialogOpen(true)}>
                  Mais opções
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="relative h-36 w-36">
                  <div className="absolute inset-0">
                    <Progress value={agendadosPercent} className="h-36 w-36 rotate-180 rounded-full" />
                  </div>
                  <div className="absolute inset-[4px]">
                    <Progress
                      value={canceladosPercent}
                      className="h-[136px] w-[136px] rotate-180 rounded-full bg-red-200"
                    />
                  </div>
                  <div className="absolute inset-[8px]">
                    <Progress
                      value={concluidosPercent}
                      className="h-[128px] w-[128px] rotate-180 rounded-full bg-green-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{agendados}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Agendados</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">{cancelados}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Cancelados</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{concluidos}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right column */}
      <DailyRoutineCard />

      {/* Detailed Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Relatório Detalhado</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="consultations">Consultas</TabsTrigger>
              <TabsTrigger value="exams">Exames</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-primary">{agendados}</div>
                      <p className="text-sm text-muted-foreground">Agendados</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${agendadosPercent}%` }}></div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{agendadosPercent.toFixed(1)}% do total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-green-500">{concluidos}</div>
                      <p className="text-sm text-muted-foreground">Concluídos</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${concluidosPercent}%` }}></div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{concluidosPercent.toFixed(1)}% do total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-red-500">{cancelados}</div>
                      <p className="text-sm text-muted-foreground">Cancelados</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: `${canceladosPercent}%` }}></div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{canceladosPercent.toFixed(1)}% do total</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5" />
                    <h3 className="text-lg font-medium">Distribuição Total</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative h-48 w-48">
                      <div className="absolute inset-0">
                        <Progress value={agendadosPercent} className="h-48 w-48 rotate-180 rounded-full" />
                      </div>
                      <div className="absolute inset-[6px]">
                        <Progress
                          value={canceladosPercent}
                          className="h-[180px] w-[180px] rotate-180 rounded-full bg-red-200"
                        />
                      </div>
                      <div className="absolute inset-[12px]">
                        <Progress
                          value={concluidosPercent}
                          className="h-[168px] w-[168px] rotate-180 rounded-full bg-green-200"
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{total}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary"></div>
                        <span className="font-medium">Agendados</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {agendados} ({agendadosPercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">Concluídos</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {concluidos} ({concluidosPercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="font-medium">Cancelados</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cancelados} ({canceladosPercent.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consultations" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Detalhes das Consultas</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {dashboardData.consultationStatuses?.Agendada || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Agendadas</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {dashboardData.consultationStatuses?.Concluída || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Concluídas</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {dashboardData.consultationStatuses?.Cancelada || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Canceladas</p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">Distribuição por Status</h4>
                      <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                        {dashboardData.consultationStatuses?.Agendada && (
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(dashboardData.consultationStatuses.Agendada / dashboardData.totalConsultations) * 100}%`,
                            }}
                          ></div>
                        )}
                        {dashboardData.consultationStatuses?.Concluída && (
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(dashboardData.consultationStatuses.Concluída / dashboardData.totalConsultations) * 100}%`,
                            }}
                          ></div>
                        )}
                        {dashboardData.consultationStatuses?.Cancelada && (
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${(dashboardData.consultationStatuses.Cancelada / dashboardData.totalConsultations) * 100}%`,
                            }}
                          ></div>
                        )}
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Total: {dashboardData.totalConsultations}</span>
                        <span>
                          Taxa de conclusão:{" "}
                          {(
                            ((dashboardData.consultationStatuses?.Concluída || 0) / dashboardData.totalConsultations) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        setReportDialogOpen(false)
                        navigateToConsultations()
                      }}
                    >
                      Ver Todas as Consultas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exams" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Detalhes dos Exames</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {dashboardData.examStatuses?.Agendado || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Agendados</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {dashboardData.examStatuses?.Concluído || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Concluídos</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {dashboardData.examStatuses?.Cancelado || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Cancelados</p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium">Distribuição por Status</h4>
                      <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                        {dashboardData.examStatuses?.Agendado && (
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(dashboardData.examStatuses.Agendado / dashboardData.totalExams) * 100}%`,
                            }}
                          ></div>
                        )}
                        {dashboardData.examStatuses?.Concluído && (
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(dashboardData.examStatuses.Concluído / dashboardData.totalExams) * 100}%`,
                            }}
                          ></div>
                        )}
                        {dashboardData.examStatuses?.Cancelado && (
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${(dashboardData.examStatuses.Cancelado / dashboardData.totalExams) * 100}%`,
                            }}
                          ></div>
                        )}
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Total: {dashboardData.totalExams}</span>
                        <span>
                          Taxa de conclusão:{" "}
                          {(((dashboardData.examStatuses?.Concluído || 0) / dashboardData.totalExams) * 100).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        setReportDialogOpen(false)
                        navigateToExams()
                      }}
                    >
                      Ver Todos os Exames
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-[2fr,1fr] gap-6 p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      <Skeleton className="h-full w-full" />
    </div>
  )
}

