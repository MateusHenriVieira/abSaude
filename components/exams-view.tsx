"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getExams, updateExamStatus } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ExamForm } from "./exam-form"
import { ExamTypesDialog } from "./exam-types-dialog"
import { PatientDetailsDialog } from "./patient-details-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ExamData {
  id: string;
  patientName: string;
  patientAge: number;
  patientAvatar?: string;
  type: string;
  examId?: string;
  date: any; // Firebase Timestamp
  formattedDate?: string;
  doctorName?: string;
  status?: string;
  clinicId: string;
  clinicName?: string;
}

interface Exam {
  id: string;
  patientName: string;
  patientAge: number;
  patientAvatar?: string;
  type: string;
  examId?: string;
  date: Date;
  formattedDate?: string;
  doctorName?: string;
  status: 'Agendado' | 'Em Andamento' | 'Finalizado' | 'Cancelado';
  clinicId: string;
  observations?: string;
  clinicName: string;
}

const formatExamDate = (date: Date) => {
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })
}

export function ExamsView() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const [examTypesDialogOpen, setExamTypesDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientDialogOpen, setPatientDialogOpen] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)

  useEffect(() => {
    fetchExams()
  }, [user])

  const fetchExams = async () => {
    if (!user?.clinicId) {
      console.error("ClinicId is undefined")
      setLoading(false)
      setExams([])
      toast({
        title: "Erro ao carregar exames",
        description: "Identificação do posto de saúde não encontrada.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const fetchedExams = await getExams(user.clinicId)
      const clinicId = user.clinicId

      const validExams = (Array.isArray(fetchedExams) ? fetchedExams : [])
        .filter((raw: any) => {
          return (
            raw &&
            typeof raw === 'object' &&
            typeof raw.id === 'string' &&
            raw.patientName
          )
        })
        .map((raw: any) => {
          const exam: Exam = {
            id: raw.id,
            patientName: String(raw.patientName || ''),
            patientAge: typeof raw.patientAge === 'number' ? raw.patientAge : 0,
            patientAvatar: typeof raw.patientAvatar === 'string' ? raw.patientAvatar : undefined,
            type: String(raw.type || ''),
            examId: typeof raw.examId === 'string' ? raw.examId : undefined,
            date: raw.date?.toDate?.() instanceof Date ? raw.date.toDate() : new Date(),
            formattedDate: typeof raw.formattedDate === 'string' ? raw.formattedDate : undefined,
            doctorName: typeof raw.doctorName === 'string' ? raw.doctorName : '',
            status: typeof raw.status === 'string' ? raw.status : 'Agendado',
            clinicName: String(raw.clinicName || 'Não especificado'),
            clinicId
          }
          return exam
        })

      setExams(validExams)
    } catch (error) {
      console.error("Error fetching exams:", error)
      toast({
        title: "Erro ao carregar exames",
        description: "Não foi possível carregar os exames. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateExamStatus = async (examId: string, newStatus: string) => {
    try {
      await updateExamStatus(examId, newStatus)
      toast({
        title: "Status atualizado",
        description: "O status do exame foi atualizado com sucesso.",
      })
      fetchExams() // Recarrega os exames após a atualização
    } catch (error) {
      console.error("Error updating exam status:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do exame. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleStatusUpdate = async (examId: string, newStatus: string) => {
    try {
      await updateExamStatus(examId, newStatus)
      toast({
        title: "Status atualizado",
        description: "O status do exame foi atualizado com sucesso.",
      })
      fetchExams() // Recarrega os exames após a atualização
      setPatientDialogOpen(false) // Fecha o diálogo após atualizar
    } catch (error) {
      console.error("Error updating exam status:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do exame.",
        variant: "destructive",
      })
    }
  }

  const handlePatientClick = (exam: Exam) => {
    setSelectedPatient({
      name: exam.patientName,
      age: exam.patientAge,
      examType: exam.type,
      date: exam.date,
      observations: exam.observations,
      status: exam.status,
      clinicName: exam.clinicName,
      examId: exam.id
    })
    setIsRescheduling(false)
    setPatientDialogOpen(true)
  }

  const handleRescheduleClick = (exam: Exam) => {
    setSelectedPatient({
      name: exam.patientName,
      age: exam.patientAge,
      examType: exam.type,
      date: exam.date,
      observations: exam.observations,
      status: exam.status,
      clinicName: exam.clinicName,
      examId: exam.id
    })
    setIsRescheduling(true)
    setPatientDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exames</h2>
        <div className="space-x-2">
          <Button onClick={() => setExamTypesDialogOpen(true)}>Cadastrar Exames</Button>
          <ExamForm onSuccess={fetchExams} />
        </div>
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 border-b bg-muted/50 p-4 font-medium">
          <div>Nome - Exame</div>
          <div>Exame ID</div>
          <div>Data</div>
          <div>Médico</div>
          <div>Status</div>
          <div>Ações</div>
        </div>
        <div className="divide-y">
          {exams.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Nenhum exame encontrado.</div>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={exam.patientAvatar} />
                    <AvatarFallback>{exam.patientName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium cursor-pointer hover:underline" onClick={() => handlePatientClick(exam)}>
                      {exam.patientName}
                    </div>
                    <div className="text-sm text-muted-foreground">- {exam.type}</div>
                  </div>
                </div>
                <div className="flex items-center">{exam.examId || exam.id}</div>
                <div className="flex items-center">{exam.formattedDate || formatExamDate(exam.date)}</div>
                <div className="flex items-center">{exam.doctorName || "Não atribuído"}</div>
                <div className="flex items-center">
                  <Badge
                    variant={
                      exam.status === "Em Andamento"
                        ? "default"
                        : exam.status === "Finalizado"
                          ? "success"
                          : exam.status === "Cancelado"
                            ? "destructive"
                            : "secondary"
                    }
                  >
                    {exam.status}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-[200px] bg-white border rounded-md shadow-md z-50"
                    >
                      {exam.status === "Agendado" && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(exam.id, "Em Andamento")}
                            className="cursor-pointer hover:bg-muted px-3 py-2"
                          >
                            Iniciar Atendimento
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(exam.id, "Cancelado")}
                            className="cursor-pointer hover:bg-destructive/10 text-destructive px-3 py-2"
                          >
                            Cancelar Agendamento
                          </DropdownMenuItem>
                        </>
                      )}
                      {exam.status === "Em Andamento" && (
                        <DropdownMenuItem 
                          onClick={() => handleStatusUpdate(exam.id, "Finalizado")}
                          className="cursor-pointer hover:bg-muted px-3 py-2"
                        >
                          Finalizar Atendimento
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
      <ExamTypesDialog
        open={examTypesDialogOpen}
        onOpenChange={setExamTypesDialogOpen}
        clinicId={user?.clinicId || ""}
        onSuccess={fetchExams}
      />
      <PatientDetailsDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        patient={selectedPatient}
        onSuccess={fetchExams}
        isRescheduling={isRescheduling}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  )
}

