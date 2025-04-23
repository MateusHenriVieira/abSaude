"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileSpreadsheet, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getClinic, getDoctorsByClinic, getConsultationsByClinic, getExamsByClinic } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { generateClinicReport } from "@/lib/excel"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { formatHour } from "@/lib/utils"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ClinicDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
}

export function ClinicDetailsDialog({ open, onOpenChange, clinicId }: ClinicDetailsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [clinic, setClinic] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const { toast } = useToast()

  const formatWorkingDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      segunda: 'Segunda',
      terca: 'Terça',
      quarta: 'Quarta',
      quinta: 'Quinta',
      sexta: 'Sexta',
      sabado: 'Sábado',
      domingo: 'Domingo'
    };
    return days?.map(day => dayMap[day]).join(', ') || 'Não informado';
  };

  useEffect(() => {
    const fetchClinicDetails = async () => {
      if (!open || !clinicId) return

      try {
        setLoading(true)
        
        // Fetch schedule from subcollection
        const scheduleRef = doc(db, `clinics/${clinicId}/funcionamento/schedule`);
        const scheduleDoc = await getDoc(scheduleRef);
        const scheduleData = scheduleDoc.exists() ? scheduleDoc.data() : null;

        const [clinicDetails, clinicDoctors, clinicConsultations, clinicExams] = await Promise.all([
          getClinic(clinicId),
          getDoctorsByClinic(clinicId),
          getConsultationsByClinic(clinicId, startDate, endDate),
          getExamsByClinic(clinicId, startDate, endDate),
        ])

        // Merge schedule data with clinic details
        setClinic({
          ...clinicDetails,
          schedule: {
            workingDays: scheduleData?.workingDays || [],
            workingHours: scheduleData?.workingHours || {
              start: "08:00",
              end: "18:00"
            }
          }
        });
        setDoctors(clinicDoctors)
        setConsultations(clinicConsultations)
        setExams(clinicExams)
      } catch (error) {
        console.error("Error fetching clinic details:", error)
        toast({
          title: "Erro ao carregar detalhes",
          description: "Não foi possível carregar os detalhes do posto de saúde.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClinicDetails()
  }, [open, clinicId, startDate, endDate, toast])

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true)
      await generateClinicReport(clinic.name, startDate, endDate, doctors, consultations, exams)
      toast({
        title: "Relatório gerado",
        description: "O relatório foi gerado com sucesso.",
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const clearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Detalhes do Posto de Saúde</DialogTitle>
          <DialogDescription>Informações detalhadas sobre o posto e suas atividades.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando detalhes do posto...</span>
          </div>
        ) : !clinic ? (
          <div className="text-center p-4">
            <p>Posto não encontrado.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{clinic.name}</CardTitle>
                  <CardDescription>{clinic.address}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="font-medium">Telefone:</span>
                      <span className="block truncate">{clinic.phone || "Não informado"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">Email:</span>
                      <span className="block truncate">{clinic.email || "Não informado"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">Horário de Funcionamento:</span>
                      <span className="block truncate">
                        {clinic.schedule?.workingHours ? 
                          `${clinic.schedule.workingHours.start} às ${clinic.schedule.workingHours.end}` : 
                          "Não informado"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">Dias de Funcionamento:</span>
                      <span className="block truncate">
                        {clinic.schedule?.workingDays ? 
                          formatWorkingDays(clinic.schedule.workingDays) : 
                          "Não informado"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Data inicial</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Data final</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => (startDate ? date < startDate : false)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {(startDate || endDate) && (
                    <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                      Limpar
                    </Button>
                  )}
                </div>
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isGeneratingReport}
                  className="shrink-0"
                >
                  {isGeneratingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Gerar Relatório Excel
                    </>
                  )}
                </Button>
              </div>

              <Tabs defaultValue="doctors" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="doctors">Médicos ({doctors.length})</TabsTrigger>
                  <TabsTrigger value="consultations">Consultas ({consultations.length})</TabsTrigger>
                  <TabsTrigger value="exams">Exames ({exams.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="doctors" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {doctors.map((doctor) => (
                        <Card key={doctor.id}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="font-medium">Nome:</span>
                                <span>
                                  Dr(a). {doctor.firstName} {doctor.lastName}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium">Especialidade:</span>
                                <span>{doctor.function || "Médico"}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium">CRM:</span>
                                <span>{doctor.medicalId}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="consultations" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Consultas</CardTitle>
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
                                    <span className="font-medium">Paciente:</span>
                                    <span>{consultation.patientName}</span>
                                  </div>
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
                                    <span>{consultation.status}</span>
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
                <TabsContent value="exams" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Exames</CardTitle>
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
                                    <span className="font-medium">Paciente:</span>
                                    <span>{exam.patientName}</span>
                                  </div>
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
                                    <span>{exam.status}</span>
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

