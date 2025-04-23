"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2, Download, Calendar } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js"
import { Bar, Pie } from "react-chartjs-2"

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

interface AppointmentData {
  id: string
  patientName: string
  doctorName: string
  doctorId: string
  date: Date
  type: string
  status: string
}

interface DoctorData {
  id: string
  name: string
  appointmentCount: number
}

export function AppointmentReports() {
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [doctors, setDoctors] = useState<DoctorData[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  })
  const [selectedPeriod, setSelectedPeriod] = useState<string>("thisMonth")
  const { user } = useAuth()
  const { toast } = useToast()

  // Carregar dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!user?.clinicId) return

        // Buscar médicos
        const doctorsRef = collection(db, "clinics", user.clinicId, "doctors")
        const doctorsSnapshot = await getDocs(doctorsRef)
        const doctorsList = doctorsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
            appointmentCount: 0,
          }
        })
        setDoctors(doctorsList)

        // Buscar agendamentos do mês atual
        await fetchAppointmentData(user.clinicId, "all", dateRange.start, dateRange.end)
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados para os relatórios.",
          variant: "destructive",
        })
      }
    }

    fetchInitialData()
  }, [user, toast])

  // Atualizar dados quando os filtros mudarem
  useEffect(() => {
    if (user?.clinicId) {
      fetchAppointmentData(user.clinicId, selectedDoctor, dateRange.start, dateRange.end)
    }
  }, [selectedDoctor, dateRange, user])

  // Função para buscar dados de agendamentos
  const fetchAppointmentData = async (clinicId: string, doctorId: string, startDate: Date, endDate: Date) => {
    try {
      setLoading(true)

      // Construir a consulta base
      let appointmentsQuery = query(
        collection(db, "appointments"),
        where("clinicId", "==", clinicId),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
      )

      // Adicionar filtro por médico se necessário
      if (doctorId !== "all") {
        appointmentsQuery = query(
          collection(db, "appointments"),
          where("clinicId", "==", clinicId),
          where("doctorId", "==", doctorId),
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
        )
      }

      const appointmentsSnapshot = await getDocs(appointmentsQuery)
      const appointmentsList: AppointmentData[] = []

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

        // Adicionar à lista de agendamentos
        appointmentsList.push({
          id: doc.id,
          patientName: data.patientName,
          doctorName,
          doctorId: data.doctorId || "",
          date: appointmentDate,
          type: data.type || "Consulta",
          status: data.status || "Agendado",
        })
      }

      setAppointments(appointmentsList)

      // Atualizar contagem de agendamentos por médico
      const updatedDoctors = [...doctors]
      updatedDoctors.forEach((doctor) => {
        doctor.appointmentCount = appointmentsList.filter((app) => app.doctorId === doctor.id).length
      })
      setDoctors(updatedDoctors)
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error)
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os dados de agendamentos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para lidar com a mudança de período
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    const now = new Date()

    switch (period) {
      case "today":
        setDateRange({
          start: startOfDay(now),
          end: endOfDay(now),
        })
        break
      case "thisMonth":
        setDateRange({
          start: startOfMonth(now),
          end: endOfMonth(now),
        })
        break
      case "lastMonth":
        const lastMonth = subMonths(now, 1)
        setDateRange({
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        })
        break
      case "custom":
        // Manter o intervalo atual para seleção personalizada
        break
    }
  }

  // Função para exportar dados para CSV
  const exportToCSV = () => {
    try {
      // Cabeçalhos do CSV
      const headers = ["Paciente", "Médico", "Data", "Hora", "Tipo", "Status"]

      // Dados formatados
      const csvData = appointments.map((app) => [
        app.patientName,
        app.doctorName,
        format(app.date, "dd/MM/yyyy", { locale: ptBR }),
        format(app.date, "HH:mm", { locale: ptBR }),
        app.type,
        app.status,
      ])

      // Combinar cabeçalhos e dados
      const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

      // Criar blob e link para download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `agendamentos_${format(new Date(), "dd-MM-yyyy")}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erro ao exportar dados:", error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados para CSV.",
        variant: "destructive",
      })
    }
  }

  // Preparar dados para os gráficos
  const getStatusChartData = () => {
    const statusCounts: Record<string, number> = {}
    appointments.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
    })

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          label: "Status dos Agendamentos",
          data: Object.values(statusCounts),
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(153, 102, 255, 0.6)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  const getDoctorChartData = () => {
    const doctorsWithAppointments = doctors.filter((doc) => doc.appointmentCount > 0)

    return {
      labels: doctorsWithAppointments.map((doc) => doc.name),
      datasets: [
        {
          label: "Consultas por Médico",
          data: doctorsWithAppointments.map((doc) => doc.appointmentCount),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    }
  }

  const getTypeChartData = () => {
    const typeCounts: Record<string, number> = {}
    appointments.forEach((app) => {
      typeCounts[app.type] = (typeCounts[app.type] || 0) + 1
    })

    return {
      labels: Object.keys(typeCounts),
      datasets: [
        {
          label: "Tipos de Consulta",
          data: Object.values(typeCounts),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Relatórios de Agendamentos</CardTitle>
        <CardDescription>Visualize e analise os dados de agendamentos da clínica.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod === "custom" && (
                <div className="flex flex-col md:flex-row gap-2">
                  <DatePicker
                    date={dateRange.start}
                    setDate={(date) => date && setDateRange({ ...dateRange, start: date })}
                    placeholder="Data inicial"
                  />
                  <DatePicker
                    date={dateRange.end}
                    setDate={(date) => date && setDateRange({ ...dateRange, end: date })}
                    placeholder="Data final"
                  />
                </div>
              )}

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
            </div>

            <Button variant="outline" onClick={exportToCSV} disabled={loading || appointments.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Calendar className="h-16 w-16 mb-4 opacity-30" />
              <p>Nenhum agendamento encontrado para o período selecionado.</p>
            </div>
          ) : (
            <Tabs defaultValue="summary" className="mt-4">
              <TabsList>
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="byDoctor">Por Médico</TabsTrigger>
                <TabsTrigger value="byType">Por Tipo</TabsTrigger>
                <TabsTrigger value="byStatus">Por Status</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total de Agendamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{appointments.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Médicos Ativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{doctors.filter((d) => d.appointmentCount > 0).length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Taxa de Conclusão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">
                        {Math.round(
                          (appointments.filter((a) => a.status === "Concluído").length / appointments.length) * 100,
                        )}
                        %
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="byDoctor" className="pt-4">
                <div className="h-[400px]">
                  <Bar
                    data={getDoctorChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top" as const,
                        },
                        title: {
                          display: true,
                          text: "Agendamentos por Médico",
                        },
                      },
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="byType" className="pt-4">
                <div className="h-[400px] flex justify-center">
                  <div className="w-[400px]">
                    <Pie
                      data={getTypeChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "right" as const,
                          },
                          title: {
                            display: true,
                            text: "Agendamentos por Tipo",
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="byStatus" className="pt-4">
                <div className="h-[400px] flex justify-center">
                  <div className="w-[400px]">
                    <Pie
                      data={getStatusChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "right" as const,
                          },
                          title: {
                            display: true,
                            text: "Agendamentos por Status",
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
