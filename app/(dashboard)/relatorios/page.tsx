// Arquivo: app/(dashboard)/relatorios/page.tsx
// Descrição: Página para exibir relatórios

"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { getDoctors, getClinics } from "@/lib/firebase"
import { generateClinicReport } from "@/lib/excel"
import { Loader2 } from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"

// Adicione estas interfaces no topo do arquivo
interface Consultation {
  id: string;
  date: Date;
  patientName: string;
  doctorId: string;
  clinicId: string;
  status: string;
  [key: string]: any;
}

interface Exam {
  id: string;
  date: Date;
  patientName: string;
  doctorId: string;
  clinicId: string;
  type: string;
  status: string;
  [key: string]: any;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  clinicId: string;
  [key: string]: any;
}

interface Clinic {
  id: string;
  name: string;
  [key: string]: any;
}

// Add this interface with the raw doctor data structure
interface RawDoctor {
  id: string;
  clinicId: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export default function RelatoriosPage() {
  const { user } = useAuth()
  const [reportType, setReportType] = useState<"completo" | "medico" | "posto">("completo")
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>(undefined)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string | undefined>(user?.clinicId || undefined)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    const fetchDoctorsAndClinics = async () => {
      if (!user) return
      setLoading(true)
      try {
        const [doctorsData, clinicsData] = await Promise.all([getDoctors(user?.clinicId || ""), getClinics()])
        
        // Cast doctorsData to RawDoctor[] and handle the mapping
        const typedDoctors: Doctor[] = (doctorsData as RawDoctor[]).map(doc => ({
          ...doc,
          firstName: doc.firstName ?? '',  // Use nullish coalescing
          lastName: doc.lastName ?? '',
          clinicId: doc.clinicId,
        }));

        setDoctors(typedDoctors)
        setClinics(clinicsData)
      } catch (error) {
        console.error("Erro ao carregar médicos e postos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorsAndClinics()
  }, [user])

  const handleGenerateReport = async () => {
    if (!user) return

    if (reportType === "medico" && !selectedDoctor) {
      toast.error("Selecione um médico para gerar o relatório.")
      return
    }

    if (reportType === "posto" && !selectedClinic) {
      toast.error("Selecione um posto para gerar o relatório.")
      return
    }

    try {
      setLoading(true)

      const clinicId = selectedClinic || user?.clinicId
      if (!clinicId) {
        toast.error("Selecione um posto de saúde para gerar o relatório.")
        return
      }

      // Encontrar nome da clínica
      const clinic = clinics.find(c => c.id === clinicId);
      if (!clinic) {
        toast.error("Posto de saúde não encontrado.")
        return
      }

      // Arrays tipados
      const consultations: Consultation[] = []
      const exams: Exam[] = []

      // Gerar o relatório com parâmetros apropriados
      await generateClinicReport(
        clinic.name, // Nome da clínica em vez do ID
        startDate,
        endDate,
        doctors,
        consultations,
        exams,
        selectedDoctor, // ID do médico selecionado (se houver)
        reportType // Tipo do relatório
      )
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
      toast.error("Erro ao gerar relatório")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório</CardTitle>
          <CardDescription>Selecione as opções para gerar o relatório desejado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção do tipo de relatório */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Relatório</Label>
              <Select 
                value={reportType} 
                onValueChange={(value: string) => setReportType(value as "completo" | "medico" | "posto")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Completo</SelectItem>
                  <SelectItem value="medico">Por Médico</SelectItem>
                  {user?.type === "gestor" && <SelectItem value="posto">Por Posto</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de médico (se o tipo for "medico") */}
            {reportType === "medico" && (
              <div>
                <Label>Médico</Label>
                <Select 
                  value={selectedDoctor || ""} 
                  onValueChange={(value) => setSelectedDoctor(value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.firstName} {doctor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seleção de posto (se o tipo for "posto" e o usuário for gestor) */}
            {reportType === "posto" && user?.type === "gestor" && (
              <div>
                <Label>Posto de Saúde</Label>
                <Select 
                  value={selectedClinic || ""} 
                  onValueChange={(value) => setSelectedClinic(value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o posto" />
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
          </div>

          {/* Seleção de período */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Data inicial</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={ptBR} />
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
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando Relatório...
              </>
            ) : (
              "Gerar Relatório"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

