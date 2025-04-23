"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Clock, User, MapPin, Phone, Mail, AlertCircle } from "lucide-react"
import { getPatientAppointments, updateExamDate } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ExamForm } from "./exam-form"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface PatientDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: {
    name: string
    age: number
    examType: string
    date: Date
    observations?: string
    status: string
    clinicName: string
    examId: string
  } | null
  onSuccess?: () => void
  isRescheduling?: boolean
  onStatusUpdate?: (examId: string, status: string) => Promise<void>
}

export function PatientDetailsDialog({ 
  open, 
  onOpenChange, 
  patient, 
  onSuccess,
  isRescheduling = false,
  onStatusUpdate 
}: PatientDetailsDialogProps) {
  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {isRescheduling ? (
          <ExamForm 
            defaultValues={{
              patientName: patient.name,
              type: patient.examType,
              observations: patient.observations,
            }}
            editMode={true}
            examId={patient.examId}
            onSuccess={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Detalhes do Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Nome:</span> {patient.name}
              </div>
              <div>
                <span className="font-semibold">Idade:</span> {patient.age} anos
              </div>
              <div>
                <span className="font-semibold">Tipo de Exame:</span> {patient.examType}
              </div>
              <div>
                <span className="font-semibold">Data Agendada:</span>{" "}
                {format(patient.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                <Badge
                  variant={
                    patient.status === "Em Andamento"
                      ? "default"
                      : patient.status === "Finalizado"
                        ? "success"
                        : patient.status === "Cancelado"
                          ? "destructive"
                          : "secondary"
                  }
                >
                  {patient.status}
                </Badge>
              </div>
              {patient.observations && (
                <div>
                  <span className="font-semibold">Observações:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{patient.observations}</p>
                </div>
              )}
              <div>
                <span className="font-semibold">Posto de Saúde:</span> {patient.clinicName}
              </div>
              <div className="flex justify-between items-center gap-4">
                <Button 
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                >
                  Fechar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default">
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {patient.status === "Agendado" && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => onStatusUpdate?.(patient.examId, "Em Andamento")}
                        >
                          Iniciar Atendimento
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onStatusUpdate?.(patient.examId, "Cancelado")}
                          className="text-destructive"
                        >
                          Cancelar Agendamento
                        </DropdownMenuItem>
                      </>
                    )}
                    {patient.status === "Em Andamento" && (
                      <DropdownMenuItem 
                        onClick={() => onStatusUpdate?.(patient.examId, "Finalizado")}
                      >
                        Finalizar Atendimento
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

