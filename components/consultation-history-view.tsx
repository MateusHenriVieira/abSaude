"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, Search, FileText } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getConsultationsByDoctor } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ConsultationHistoryView() {
  const { user } = useAuth()
  const [consultations, setConsultations] = useState<any[]>([])
  const [filteredConsultations, setFilteredConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    canceled: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  })

  useEffect(() => {
    const fetchConsultations = async () => {
      if (user?.doctorId) {
        setLoading(true)
        try {
          const data = await getConsultationsByDoctor(user.doctorId)
          setConsultations(data)
          setFilteredConsultations(data)
          calculateStats(data)
        } catch (error) {
          console.error("Erro ao buscar consultas:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchConsultations()
  }, [user])

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

  useEffect(() => {
    applyFilters()
  }, [searchTerm, statusFilter, dateFilter, consultations])

  const applyFilters = () => {
    let filtered = [...consultations]

    // Filtro de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.patientName?.toLowerCase().includes(term) ||
          c.type?.toLowerCase().includes(term) ||
          c.notes?.toLowerCase().includes(term),
      )
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    // Filtro de data
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dateFilter === "today") {
      filtered = filtered.filter((c) => {
        const consultationDate = new Date(c.date)
        return (
          consultationDate.getDate() === today.getDate() &&
          consultationDate.getMonth() === today.getMonth() &&
          consultationDate.getFullYear() === today.getFullYear()
        )
      })
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date(today)
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      filtered = filtered.filter((c) => new Date(c.date) >= oneWeekAgo)
    } else if (dateFilter === "month") {
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      filtered = filtered.filter((c) => new Date(c.date) >= oneMonthAgo)
    }

    setFilteredConsultations(filtered)
  }

  const openConsultationDetails = (consultation: any) => {
    setSelectedConsultation(consultation)
    setDetailsOpen(true)
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

  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  return (
    <div className="container mx-auto p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Consultas</h2>
          <p className="text-muted-foreground">Visualize e gerencie todas as suas consultas</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 w-full md:w-64"
              placeholder="Buscar paciente ou tipo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-[1fr,1fr,auto,auto] md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 font-medium border-b bg-muted/50">
              <div>Paciente</div>
              <div className="hidden md:block">Tipo</div>
              <div>Data</div>
              <div>Status</div>
              <div>Ações</div>
            </div>
            <div className="divide-y">
              {loading ? (
                // Skeletons para carregamento
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr,1fr,auto,auto] md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4"
                  >
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="hidden md:block h-5 w-full" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                ))
              ) : filteredConsultations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Nenhuma consulta encontrada.</div>
              ) : (
                filteredConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="grid grid-cols-[1fr,1fr,auto,auto] md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 items-center"
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

