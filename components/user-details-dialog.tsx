"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getUserDetails, getConsultationsByUser, getExamsByUser } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

interface UserDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function UserDetailsDialog({ open, onOpenChange, userId }: UserDetailsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!open || !userId) return

      try {
        setLoading(true)
        const [userDetails, userConsultations, userExams] = await Promise.all([
          getUserDetails(userId),
          getConsultationsByUser(userId),
          getExamsByUser(userId),
        ])

        setUser(userDetails)
        setConsultations(userConsultations)
        setExams(userExams)
      } catch (error) {
        console.error("Error fetching user details:", error)
        toast({
          title: "Erro ao carregar detalhes",
          description: "Não foi possível carregar os detalhes do usuário.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [open, userId, toast])

  const getUserTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      admin: "Administrador",
      doctor: "Médico",
      nurse: "Enfermeiro",
      receptionist: "Recepcionista",
      patient: "Paciente",
    }
    return types[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
          <DialogDescription>Informações detalhadas sobre o usuário e seu histórico.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando detalhes do usuário...</span>
          </div>
        ) : !user ? (
          <div className="text-center p-4">
            <p>Usuário não encontrado.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-1">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Nome:</span>
                    <span>{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tipo:</span>
                    <Badge variant="outline">{getUserTypeLabel(user.type)}</Badge>
                  </div>
                  {user.specialty && (
                    <div className="flex justify-between">
                      <span className="font-medium">Especialidade:</span>
                      <span>{user.specialty}</span>
                    </div>
                  )}
                  {user.clinicId && (
                    <div className="flex justify-between">
                      <span className="font-medium">Posto de Saúde:</span>
                      <span>{user.clinicName || user.clinicId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="consultations">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="consultations">Consultas ({consultations.length})</TabsTrigger>
                  <TabsTrigger value="exams">Exames ({exams.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="consultations">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Consultas</CardTitle>
                      <CardDescription>
                        {consultations.length === 0
                          ? "Nenhuma consulta encontrada."
                          : `Total de ${consultations.length} consulta(s).`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {consultations.length > 0 && (
                        <div className="space-y-4">
                          {consultations.map((consultation) => (
                            <Card key={consultation.id}>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">Data:</span>
                                    <span>
                                      {format(consultation.date, "dd/MM/yyyy 'às' HH:mm", {
                                        locale: ptBR,
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Médico:</span>
                                    <span>{consultation.doctorName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Tipo:</span>
                                    <span>{consultation.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Status:</span>
                                    <Badge
                                      variant={
                                        consultation.status === "Concluída"
                                          ? "success"
                                          : consultation.status === "Cancelada"
                                            ? "destructive"
                                            : "default"
                                      }
                                    >
                                      {consultation.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="exams">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Exames</CardTitle>
                      <CardDescription>
                        {exams.length === 0 ? "Nenhum exame encontrado." : `Total de ${exams.length} exame(s).`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exams.length > 0 && (
                        <div className="space-y-4">
                          {exams.map((exam) => (
                            <Card key={exam.id}>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">Data:</span>
                                    <span>
                                      {format(exam.date, "dd/MM/yyyy 'às' HH:mm", {
                                        locale: ptBR,
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Tipo:</span>
                                    <span>{exam.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Status:</span>
                                    <Badge
                                      variant={
                                        exam.status === "Concluído"
                                          ? "success"
                                          : exam.status === "Cancelado"
                                            ? "destructive"
                                            : "default"
                                      }
                                    >
                                      {exam.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

