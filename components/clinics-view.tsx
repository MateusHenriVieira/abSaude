"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { PlusCircle, Pencil, Trash2, Clock, MapPin, Phone, Mail, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { addClinic, deleteClinic, getClinic, getClinics, updateClinic } from "@/lib/firebase"
import type { Clinic } from "@/types"
import { ClinicDetailsDialog } from "./clinic-details-dialog"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Função que formata a hora para exibição no formato HH:mm
const formatHour = (hour: any): string => {
  // Verifica se hour é undefined, null ou não é uma string
  if (hour === undefined || hour === null) {
    return "--:--"
  }

  // Converte para string se não for uma string
  const hourStr = String(hour)

  // Verifica se a string tem pelo menos 4 caracteres
  if (hourStr.length < 4) {
    return hourStr // Retorna como está se for muito curta
  }

  try {
    return `${hourStr.substring(0, 2)}:${hourStr.substring(2, 4)}`
  } catch (error) {
    console.error("Erro ao formatar hora:", error, "Valor recebido:", hour)
    return String(hour) // Retorna o valor original como string em caso de erro
  }
}

// Add time validation helper
const validateTimeFormat = (time: string) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Organize working days in rows
const workingDaysRows = [
  [
    { id: 'segunda', label: 'Segunda' },
    { id: 'quarta', label: 'Quarta' },
    { id: 'sexta', label: 'Sexta' },
    { id: 'domingo', label: 'Domingo' }
  ],
  [
    { id: 'terca', label: 'Terça' },
    { id: 'quinta', label: 'Quinta' },
    { id: 'sabado', label: 'Sábado' }
  ]
];

// Interface que define a estrutura de um horário disponível
interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

// Função que gera os horários disponíveis em intervalos de 30 minutos
function generateDailyTimeSlots(start: string, end: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);

  let currentSlot = startDate;
  while (currentSlot < endDate) {
    slots.push({
      time: format(currentSlot, 'HH:mm'),
      isAvailable: true
    });
    currentSlot = new Date(currentSlot.getTime() + 30 * 60000); // Add 30 minutes
  }

  return slots;
}

export function ClinicsView() {
  // Estado para armazenar a lista de postos de saúde
  const [clinics, setClinics] = useState<Clinic[]>([])
  
  // Estado para controlar o carregamento da página
  const [loading, setLoading] = useState(true)
  
  // Estados para controlar os diálogos de adição/edição e detalhes
  const [openDialog, setOpenDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  
  // Estado para armazenar o posto selecionado para edição/visualização
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  
  // Estado do formulário com valores iniciais
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    workingDays: [] as string[],
    workingHours: {
      start: "08:00",
      end: "18:00"
    },
    manager: "",
  })

  const { toast } = useToast()

  // Função que busca a lista de postos ao carregar a página
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const clinicsData = await getClinics()
        setClinics(clinicsData as Clinic[])
      } catch (error) {
        console.error("Error fetching clinics:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os postos de saúde.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClinics()
  }, [toast])

  // Função que atualiza os campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Função que salva ou atualiza um posto de saúde
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!formData.name || !formData.address) {
        toast({
          title: "Erro",
          description: "Nome e endereço são obrigatórios.",
          variant: "destructive",
        })
        return
      }

      if (formData.workingDays.length === 0) {
        toast({
          title: "Erro",
          description: "Selecione pelo menos um dia de funcionamento.",
          variant: "destructive",
        })
        return
      }

      // Format clinic name to be used as ID
      const clinicId = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Save working schedule in a subcollection
      const scheduleRef = doc(db, `clinics/${clinicId}/funcionamento/schedule`);
      await setDoc(scheduleRef, {
        workingDays: formData.workingDays,
        workingHours: formData.workingHours,
        updatedAt: new Date()
      });

      const clinicData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        manager: formData.manager,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (selectedClinic) {
        await updateClinic(selectedClinic.id, clinicData);
        // Update schedule for existing clinic
        const existingScheduleRef = doc(db, `clinics/${selectedClinic.id}/funcionamento/schedule`);
        await setDoc(existingScheduleRef, {
          workingDays: formData.workingDays,
          workingHours: formData.workingHours,
          updatedAt: new Date()
        });
        toast({
          title: "Sucesso",
          description: "Posto de saúde atualizado com sucesso.",
        })
      } else {
        await setDoc(doc(db, "clinics", clinicId), clinicData);
        toast({
          title: "Sucesso",
          description: "Posto de saúde adicionado com sucesso.",
        })
      }

      // Recarregar a lista de postos
      const clinicsData = await getClinics()
      setClinics(clinicsData as Clinic[])

      // Resetar o formulário e fechar o diálogo
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        workingDays: [],
        workingHours: {
          start: "08:00",
          end: "18:00"
        },
        manager: "",
      })
      setOpenDialog(false)
      setSelectedClinic(null)
    } catch (error) {
      console.error("Error saving clinic:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o posto de saúde.",
        variant: "destructive",
      })
    }
  }

  // Função que carrega os dados de um posto para edição
  const handleEdit = async (clinic: Clinic) => {
    try {
      const clinicData = await getClinic(clinic.id) as Clinic;
      if (clinicData) {
        // Fetch schedule from subcollection
        const scheduleRef = doc(db, `clinics/${clinic.id}/funcionamento/schedule`);
        const scheduleDoc = await getDoc(scheduleRef);
        const scheduleData = scheduleDoc.exists() ? scheduleDoc.data() : null;

        setSelectedClinic(clinicData);
        setFormData({
          name: clinicData.name || "",
          address: clinicData.address || "",
          phone: clinicData.phone || "",
          email: clinicData.email || "",
          workingDays: scheduleData?.workingDays || [],
          workingHours: scheduleData?.workingHours || {
            start: "08:00",
            end: "18:00"
          },
          manager: clinicData.manager || "",
        });
        setOpenDialog(true);
      }
    } catch (error) {
      console.error("Error fetching clinic details:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do posto de saúde.",
        variant: "destructive",
      })
    }
  }

  // Função que exclui um posto de saúde
  const handleDelete = async (clinicId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este posto de saúde?")) {
      try {
        await deleteClinic(clinicId)
        toast({
          title: "Sucesso",
          description: "Posto de saúde excluído com sucesso.",
        })
        // Atualizar a lista de postos
        const clinicsData = await getClinics()
        setClinics(clinicsData as Clinic[])
      } catch (error) {
        console.error("Error deleting clinic:", error)
        toast({
          title: "Erro",
          description: "Não foi possível excluir o posto de saúde.",
        variant: "destructive",
        })
      }
    }
  }

  // Função que abre o diálogo de detalhes do posto
  const handleOpenDetails = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setOpenDetailsDialog(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Postos de Saúde</h2>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSelectedClinic(null)
                setFormData({
                  name: "",
                  address: "",
                  phone: "",
                  email: "",
                  workingDays: [],
                  workingHours: {
                    start: "08:00",
                    end: "18:00"
                  },
                  manager: "",
                })
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Posto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[800px] w-[90vw] lg:min-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 z-50 bg-background pb-4">
              <DialogTitle>{selectedClinic ? "Editar Posto de Saúde" : "Adicionar Posto de Saúde"}</DialogTitle>
              <DialogDescription>Preencha os dados do posto de saúde abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 pt-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Dias de Funcionamento
                  </Label>
                  <div className="col-span-3">
                    {workingDaysRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-6 mb-2">
                        {row.map((day) => (
                          <div key={day.id} className="flex items-center gap-2 min-w-[100px]">
                            <Checkbox
                              id={day.id}
                              checked={formData.workingDays.includes(day.id)}
                              onCheckedChange={(checked) => {
                                const newDays = checked
                                  ? [...formData.workingDays, day.id]
                                  : formData.workingDays.filter(d => d !== day.id);
                                setFormData(prev => ({
                                  ...prev,
                                  workingDays: newDays
                                }));
                              }}
                            />
                            <Label htmlFor={day.id} className="font-normal">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="workingHoursStart" className="text-right">
                    Horário de Funcionamento
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        id="workingHoursStart"
                        placeholder="08:00"
                        value={formData.workingHours.start}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || validateTimeFormat(value)) {
                            setFormData(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, start: value }
                            }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (!validateTimeFormat(value)) {
                            setFormData(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, start: "08:00" }
                            }));
                          }
                        }}
                      />
                    </div>
                    <span className="text-center">até</span>
                    <div className="flex-1">
                      <Input
                        id="workingHoursEnd"
                        placeholder="18:00"
                        value={formData.workingHours.end}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || validateTimeFormat(value)) {
                            setFormData(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, end: value }
                            }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (!validateTimeFormat(value)) {
                            setFormData(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, end: "18:00" }
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manager" className="text-right">
                    Responsável
                  </Label>
                  <Input
                    id="manager"
                    name="manager"
                    value={formData.manager}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter className="sticky bottom-0 pt-4 bg-background">
                <Button type="submit">{selectedClinic ? "Salvar Alterações" : "Adicionar Posto"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando postos de saúde...</p>
        </div>
      ) : clinics.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p>Nenhum posto de saúde cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{clinic.name}</CardTitle>
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {clinic.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  {clinic.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {clinic.phone}
                    </div>
                  )}
                  {clinic.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {clinic.email}
                    </div>
                  )}
                  {(clinic.openingHour || clinic.closingHour) && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {clinic.openingHour ? formatHour(clinic.openingHour) : "--:--"} às{" "}
                      {clinic.closingHour ? formatHour(clinic.closingHour) : "--:--"}
                    </div>
                  )}
                  {clinic.manager && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {clinic.manager}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDetails(clinic)}>
                  Detalhes
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(clinic)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(clinic.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedClinic && (
        <ClinicDetailsDialog 
          clinicId={selectedClinic.id} 
          open={openDetailsDialog} 
          onOpenChange={setOpenDetailsDialog} 
        />
      )}
    </div>
  )
}

