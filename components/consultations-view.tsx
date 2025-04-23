"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getConsultations, updateConsultationStatus } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ConsultationForm } from "./consultation-form"

export function ConsultationsView() {
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchConsultations()
  }, [user])

  const fetchConsultations = async () => {
    if (!user) {
      console.error("User is undefined")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let fetchedConsultations

      if (user.type === "doctor" && user.doctorId) {
        // Se for médico, buscar apenas as consultas deste médico
        fetchedConsultations = await getConsultations(user.clinicId, user.doctorId)
      } else if (user.type === "admin") {
        // Se for admin, buscar todas as consultas de todos os postos
        fetchedConsultations = await getConsultations()
      } else {
        // Se for outro tipo, buscar apenas as consultas do posto do usuário
        fetchedConsultations = await getConsultations(user.clinicId)
      }

      setConsultations(fetchedConsultations)
    } catch (error) {
      console.error("Error fetching consultations:", error)
      toast({
        title: "Erro ao carregar consultas",
        description: "Não foi possível carregar as consultas. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateConsultationStatus = async (id: string, status: string) => {
    try {
      await updateConsultationStatus(id, status)
      toast({
        title: "Status atualizado",
        description: "O status da consulta foi atualizado com sucesso.",
      })
      fetchConsultations() // Recarrega as consultas após a atualização
    } catch (error) {
      console.error("Error updating consultation status:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da consulta. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Consultas</h1>
        <p className="text-sm text-muted-foreground">
          {user?.type === "doctor"
            ? "Lista de consultas agendadas para você."
            : user?.type === "admin"
            ? "Lista de todas as consultas de todos os postos."
            : `Lista de consultas do posto ${user?.clinicName || ''}.`}
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Total de Consultas: {consultations.length}</h2>
        </div>
        <ConsultationForm onSuccess={fetchConsultations} />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 border-b bg-muted/50 p-4 font-medium">
          <div>Nome do Paciente</div>
          <div>Consulta ID</div>
          <div>Data</div>
          <div>Médico</div>
          <div>Status</div>
          <div>Ações</div>
        </div>
        <div className="divide-y">
          {consultations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Nenhuma consulta encontrada.</div>
          ) : (
            consultations.map((consultation) => (
              <div key={consultation.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={consultation.patientAvatar} />
                    <AvatarFallback>{consultation.patientName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{consultation.patientName}</div>
                    <div className="text-sm text-muted-foreground">- {consultation.type}</div>
                  </div>
                </div>
                <div className="flex items-center">{consultation.consultationId || consultation.id}</div>
                <div className="flex items-center">
                  {consultation.formattedDate || new Date(consultation.date).toLocaleDateString()}
                </div>
                <div className="flex items-center">{consultation.doctorName || "Não atribuído"}</div>
                <div className="flex items-center">
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
                <div className="flex items-center gap-2">
                  {consultation.status === "Agendada" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateConsultationStatus(consultation.id, "Em Andamento")}
                      >
                        Iniciar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdateConsultationStatus(consultation.id, "Cancelada")}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  {consultation.status === "Em Andamento" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateConsultationStatus(consultation.id, "Concluída")}
                      >
                        Concluir
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdateConsultationStatus(consultation.id, "Cancelada")}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Mais
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {consultation.status === "Agendada" && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateConsultationStatus(consultation.id, "Em Andamento")}
                        >
                          Iniciar Atendimento
                        </DropdownMenuItem>
                      )}
                      {consultation.status === "Em Andamento" && (
                        <DropdownMenuItem onClick={() => handleUpdateConsultationStatus(consultation.id, "Concluída")}>
                          Concluir Atendimento
                        </DropdownMenuItem>
                      )}
                      {(consultation.status === "Agendada" || consultation.status === "Em Andamento") && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateConsultationStatus(consultation.id, "Cancelada")}
                          className="text-destructive"
                        >
                          Cancelar Atendimento
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

