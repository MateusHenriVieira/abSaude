"use client"

import type React from "react"
import type { ClinicData, ClinicFormData } from "@/types/clinic"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { addClinic, uploadFile } from "@/lib/firebase"
import { Clock, Calendar, Upload, Info, AlertCircle, Building } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ClinicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ClinicDialog({ open, onOpenChange, onSuccess }: ClinicDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [is24Hours, setIs24Hours] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Estado do formulário com valores iniciais
  const [formData, setFormData] = useState<ClinicFormData>({
    name: "",
    code: "",
    type: "UBS",
    status: "Ativo",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Brasil",
      latitude: "",
      longitude: "",
    },
    contact: {
      phone: "",
      secondaryPhone: "",
      email: "",
      website: "",
    },
    description: "",
    specialties: [] as string[],
    facilities: {
      hasEmergency: false,
      hasPharmacy: false,
      hasLaboratory: false,
      hasXRay: false,
      hasUltrasound: false,
      hasMRI: false,
      hasCTScan: false,
    },
    capacity: {
      dailyAppointments: 50,
      emergencyBeds: 0,
      regularBeds: 0,
    },
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    workingHours: {
      start: "08:00",
      end: "18:00",
    },
    logo: "",
    photo: "",
    manager: "",
    notes: "",
  })

  // Resetar o formulário quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        code: "",
        type: "UBS",
        status: "Ativo",
        address: {
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zipCode: "",
          country: "Brasil",
          latitude: "",
          longitude: "",
        },
        contact: {
          phone: "",
          secondaryPhone: "",
          email: "",
          website: "",
        },
        description: "",
        specialties: [],
        facilities: {
          hasEmergency: false,
          hasPharmacy: false,
          hasLaboratory: false,
          hasXRay: false,
          hasUltrasound: false,
          hasMRI: false,
          hasCTScan: false,
        },
        capacity: {
          dailyAppointments: 50,
          emergencyBeds: 0,
          regularBeds: 0,
        },
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workingHours: {
          start: "08:00",
          end: "18:00",
        },
        logo: "",
        photo: "",
        manager: "",
        notes: "",
      })
      setIs24Hours(false)
      setLogoPreview(null)
      setLogoFile(null)
      setPhotoPreview(null)
      setPhotoFile(null)
      setValidationErrors({})
      setActiveTab("basic")
    }
  }, [open])

  // Atualizar dados do formulário
  const updateFormData = (field: string, value: any) => {
    setFormData((prev: ClinicFormData) => {
      if (field.includes(".")) {
        const [parent, child] = field.split(".") as [keyof ClinicFormData, string];
        return {
          ...prev,
          [parent]: {
            ...(prev[parent] as Record<string, any>),
            [child]: value,
          },
        }
      }
      return {
        ...prev,
        [field]: value,
      }
    })

    // Limpar erro de validação quando o campo é atualizado
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Manipular dias de trabalho
  const handleWorkingDayChange = (day: string, checked: boolean) => {
    if (checked) {
      updateFormData("workingDays", [...formData.workingDays, day])
    } else {
      updateFormData(
        "workingDays",
        formData.workingDays.filter((d) => d !== day),
      )
    }
  }

  // Manipular especialidades
  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    if (checked) {
      updateFormData("specialties", [...formData.specialties, specialty])
    } else {
      updateFormData(
        "specialties",
        formData.specialties.filter((s) => s !== specialty),
      )
    }
  }

  // Manipular upload de logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Manipular upload de foto
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Validar formulário
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validar campos obrigatórios
    if (!formData.name.trim()) errors["name"] = "Nome é obrigatório"
    if (!formData.address.street.trim()) errors["address.street"] = "Rua é obrigatória"
    if (!formData.address.number.trim()) errors["address.number"] = "Número é obrigatório"
    if (!formData.address.neighborhood.trim()) errors["address.neighborhood"] = "Bairro é obrigatório"
    if (!formData.address.city.trim()) errors["address.city"] = "Cidade é obrigatória"
    if (!formData.address.state.trim()) errors["address.state"] = "Estado é obrigatório"
    if (!formData.contact.phone.trim()) errors["contact.phone"] = "Telefone é obrigatório"

    // Validar formato de email
    if (formData.contact.email && !/\S+@\S+\.\S+/.test(formData.contact.email)) {
      errors["contact.email"] = "Email inválido"
    }

    // Validar formato de CEP
    if (formData.address.zipCode && !/^\d{5}-?\d{3}$/.test(formData.address.zipCode)) {
      errors["address.zipCode"] = "CEP inválido"
    }

    // Validar formato de telefone
    if (formData.contact.phone && !/^($$\d{2}$$\s?)?\d{4,5}-?\d{4}$/.test(formData.contact.phone)) {
      errors["contact.phone"] = "Telefone inválido"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Enviar formulário
  const handleSubmit = async () => {
    try {
      if (!validateForm()) {
        toast({
          title: "Formulário inválido",
          description: "Por favor, corrija os erros antes de enviar.",
          variant: "destructive",
        })
        return
      }

      setIsLoading(true)

      // Preparar dados para envio
      const dataToSubmit: ClinicData = {
        ...formData,
        workingHours: is24Hours 
          ? { start: "00:00", end: "23:59" }
          : formData.workingHours,
        is24Hours,
      }

      // Processar uploads de imagens se houver
      if (logoFile) {
        const logoPath = `clinics/${Date.now()}_logo_${logoFile.name}`
        const logoUrl = await uploadFile(logoFile, logoPath)
        dataToSubmit.logo = logoUrl
      }

      if (photoFile) {
        const photoPath = `clinics/${Date.now()}_photo_${photoFile.name}`
        const photoUrl = await uploadFile(photoFile, photoPath)
        dataToSubmit.photo = photoUrl
      }

      await addClinic(dataToSubmit)

      toast({
        title: "Posto de saúde cadastrado com sucesso!",
        description: "Os dados foram salvos no sistema.",
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Erro ao adicionar posto de saúde:", error)
      toast({
        title: "Erro ao cadastrar posto de saúde",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Dias da semana para seleção
  const weekDays = [
    { id: "monday", label: "Segunda-feira" },
    { id: "tuesday", label: "Terça-feira" },
    { id: "wednesday", label: "Quarta-feira" },
    { id: "thursday", label: "Quinta-feira" },
    { id: "friday", label: "Sexta-feira" },
    { id: "saturday", label: "Sábado" },
    { id: "sunday", label: "Domingo" },
  ]

  // Tipos de postos de saúde
  const clinicTypes = [
    { id: "UBS", label: "Unidade Básica de Saúde (UBS)" },
    { id: "UPA", label: "Unidade de Pronto Atendimento (UPA)" },
    { id: "PSF", label: "Programa Saúde da Família (PSF)" },
    { id: "CAPS", label: "Centro de Atenção Psicossocial (CAPS)" },
    { id: "HOSPITAL", label: "Hospital" },
    { id: "CLINICA", label: "Clínica Especializada" },
    { id: "LABORATORIO", label: "Laboratório" },
  ]

  // Especialidades médicas
  const specialties = [
    { id: "general", label: "Clínica Geral" },
    { id: "pediatrics", label: "Pediatria" },
    { id: "gynecology", label: "Ginecologia" },
    { id: "orthopedics", label: "Ortopedia" },
    { id: "cardiology", label: "Cardiologia" },
    { id: "neurology", label: "Neurologia" },
    { id: "psychiatry", label: "Psiquiatria" },
    { id: "dermatology", label: "Dermatologia" },
    { id: "ophthalmology", label: "Oftalmologia" },
    { id: "otolaryngology", label: "Otorrinolaringologia" },
    { id: "urology", label: "Urologia" },
    { id: "endocrinology", label: "Endocrinologia" },
    { id: "gastroenterology", label: "Gastroenterologia" },
    { id: "pulmonology", label: "Pneumologia" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2 px-6">
              <Building className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Postos de Saúde</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm">Cadastrar</span>
            </div>

            <div className="px-6">
              <h2 className="text-2xl font-semibold">Cadastro de Posto de Saúde</h2>
              <p className="text-sm text-muted-foreground">Preencha todos os dados do posto de saúde.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="schedule">Horários</TabsTrigger>
              </TabsList>

              {/* Informações Básicas */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["name"] ? "text-destructive" : ""}>
                        Nome do Posto <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o nome do posto de saúde"
                        value={formData.name}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        className={validationErrors["name"] ? "border-destructive" : ""}
                      />
                      {validationErrors["name"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["name"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Código/Identificador</Label>
                      <Input
                        placeholder="Digite o código do posto (se houver)"
                        value={formData.code}
                        onChange={(e) => updateFormData("code", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>
                        Tipo de Unidade <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinicTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => updateFormData("status", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                          <SelectItem value="Em Construção">Em Construção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Responsável/Gerente</Label>
                      <Input
                        placeholder="Nome do responsável pelo posto"
                        value={formData.manager}
                        onChange={(e) => updateFormData("manager", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descreva o posto de saúde, seus serviços e características"
                        className="h-[120px]"
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Logo do Posto</Label>
                        <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 h-[120px]">
                          {logoPreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={logoPreview || "/placeholder.svg"}
                                alt="Logo Preview"
                                className="w-full h-full object-contain"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0"
                                onClick={() => {
                                  setLogoPreview(null)
                                  setLogoFile(null)
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-gray-400" />
                              <label
                                htmlFor="logo-upload"
                                className="mt-2 cursor-pointer text-sm text-blue-500 hover:text-blue-700"
                              >
                                Carregar logo
                                <input
                                  id="logo-upload"
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Foto do Posto</Label>
                        <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 h-[120px]">
                          {photoPreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={photoPreview || "/placeholder.svg"}
                                alt="Photo Preview"
                                className="w-full h-full object-cover"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0"
                                onClick={() => {
                                  setPhotoPreview(null)
                                  setPhotoFile(null)
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-gray-400" />
                              <label
                                htmlFor="photo-upload"
                                className="mt-2 cursor-pointer text-sm text-blue-500 hover:text-blue-700"
                              >
                                Carregar foto
                                <input
                                  id="photo-upload"
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="Informações adicionais sobre o posto"
                        className="h-[80px]"
                        value={formData.notes}
                        onChange={(e) => updateFormData("notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Endereço */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["address.street"] ? "text-destructive" : ""}>
                        Rua <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o nome da rua"
                        value={formData.address.street}
                        onChange={(e) => updateFormData("address.street", e.target.value)}
                        className={validationErrors["address.street"] ? "border-destructive" : ""}
                      />
                      {validationErrors["address.street"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["address.street"]}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={validationErrors["address.number"] ? "text-destructive" : ""}>
                          Número <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Nº"
                          value={formData.address.number}
                          onChange={(e) => updateFormData("address.number", e.target.value)}
                          className={validationErrors["address.number"] ? "border-destructive" : ""}
                        />
                        {validationErrors["address.number"] && (
                          <p className="text-xs text-destructive mt-1">{validationErrors["address.number"]}</p>
                        )}
                      </div>
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          placeholder="Complemento"
                          value={formData.address.complement}
                          onChange={(e) => updateFormData("address.complement", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className={validationErrors["address.neighborhood"] ? "text-destructive" : ""}>
                        Bairro <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o bairro"
                        value={formData.address.neighborhood}
                        onChange={(e) => updateFormData("address.neighborhood", e.target.value)}
                        className={validationErrors["address.neighborhood"] ? "border-destructive" : ""}
                      />
                      {validationErrors["address.neighborhood"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["address.neighborhood"]}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={validationErrors["address.city"] ? "text-destructive" : ""}>
                          Cidade <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Digite a cidade"
                          value={formData.address.city}
                          onChange={(e) => updateFormData("address.city", e.target.value)}
                          className={validationErrors["address.city"] ? "border-destructive" : ""}
                        />
                        {validationErrors["address.city"] && (
                          <p className="text-xs text-destructive mt-1">{validationErrors["address.city"]}</p>
                        )}
                      </div>
                      <div>
                        <Label className={validationErrors["address.state"] ? "text-destructive" : ""}>
                          Estado <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="UF"
                          value={formData.address.state}
                          onChange={(e) => updateFormData("address.state", e.target.value)}
                          className={validationErrors["address.state"] ? "border-destructive" : ""}
                        />
                        {validationErrors["address.state"] && (
                          <p className="text-xs text-destructive mt-1">{validationErrors["address.state"]}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className={validationErrors["address.zipCode"] ? "text-destructive" : ""}>CEP</Label>
                      <Input
                        placeholder="Digite o CEP"
                        value={formData.address.zipCode}
                        onChange={(e) => updateFormData("address.zipCode", e.target.value)}
                        className={validationErrors["address.zipCode"] ? "border-destructive" : ""}
                      />
                      {validationErrors["address.zipCode"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["address.zipCode"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>País</Label>
                      <Select
                        value={formData.address.country}
                        onValueChange={(value) => updateFormData("address.country", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Brasil">Brasil</SelectItem>
                          <SelectItem value="Portugal">Portugal</SelectItem>
                          <SelectItem value="Angola">Angola</SelectItem>
                          <SelectItem value="Moçambique">Moçambique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Latitude</Label>
                        <Input
                          placeholder="Latitude (opcional)"
                          value={formData.address.latitude}
                          onChange={(e) => updateFormData("address.latitude", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Longitude</Label>
                        <Input
                          placeholder="Longitude (opcional)"
                          value={formData.address.longitude}
                          onChange={(e) => updateFormData("address.longitude", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Contato */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["contact.phone"] ? "text-destructive" : ""}>
                        Telefone Principal <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o número de telefone"
                        value={formData.contact.phone}
                        onChange={(e) => updateFormData("contact.phone", e.target.value)}
                        className={validationErrors["contact.phone"] ? "border-destructive" : ""}
                      />
                      {validationErrors["contact.phone"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["contact.phone"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Telefone Secundário</Label>
                      <Input
                        placeholder="Digite um telefone alternativo"
                        value={formData.contact.secondaryPhone}
                        onChange={(e) => updateFormData("contact.secondaryPhone", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className={validationErrors["contact.email"] ? "text-destructive" : ""}>Email</Label>
                      <Input
                        type="email"
                        placeholder="Digite o email"
                        value={formData.contact.email}
                        onChange={(e) => updateFormData("contact.email", e.target.value)}
                        className={validationErrors["contact.email"] ? "border-destructive" : ""}
                      />
                      {validationErrors["contact.email"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["contact.email"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Website</Label>
                      <Input
                        placeholder="Digite o site do posto (se houver)"
                        value={formData.contact.website}
                        onChange={(e) => updateFormData("contact.website", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Info className="h-5 w-5 text-blue-500" />
                          <h3 className="font-medium">Informações de Contato</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Forneça informações de contato precisas para que os pacientes possam entrar em contato com o
                          posto de saúde facilmente.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <p className="text-xs text-muted-foreground">
                              O telefone principal é usado para agendamentos e emergências.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <p className="text-xs text-muted-foreground">
                              O email é usado para comunicações oficiais e contato administrativo.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Serviços */}
              <TabsContent value="services" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Especialidades Disponíveis</Label>
                    <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                      {specialties.map((specialty) => (
                        <div key={specialty.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`specialty-${specialty.id}`}
                            checked={formData.specialties.includes(specialty.id)}
                            onCheckedChange={(checked) => handleSpecialtyChange(specialty.id, checked === true)}
                          />
                          <Label htmlFor={`specialty-${specialty.id}`} className="text-sm">
                            {specialty.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Instalações e Serviços</Label>
                      <div className="space-y-3 border rounded-md p-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasEmergency" className="text-sm">
                            Pronto-Socorro
                          </Label>
                          <Switch
                            id="hasEmergency"
                            checked={formData.facilities.hasEmergency}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasEmergency: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasPharmacy" className="text-sm">
                            Farmácia
                          </Label>
                          <Switch
                            id="hasPharmacy"
                            checked={formData.facilities.hasPharmacy}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasPharmacy: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasLaboratory" className="text-sm">
                            Laboratório
                          </Label>
                          <Switch
                            id="hasLaboratory"
                            checked={formData.facilities.hasLaboratory}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasLaboratory: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasXRay" className="text-sm">
                            Raio-X
                          </Label>
                          <Switch
                            id="hasXRay"
                            checked={formData.facilities.hasXRay}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasXRay: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasUltrasound" className="text-sm">
                            Ultrassom
                          </Label>
                          <Switch
                            id="hasUltrasound"
                            checked={formData.facilities.hasUltrasound}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasUltrasound: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasMRI" className="text-sm">
                            Ressonância Magnética
                          </Label>
                          <Switch
                            id="hasMRI"
                            checked={formData.facilities.hasMRI}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasMRI: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="hasCTScan" className="text-sm">
                            Tomografia
                          </Label>
                          <Switch
                            id="hasCTScan"
                            checked={formData.facilities.hasCTScan}
                            onCheckedChange={(checked) =>
                              updateFormData("facilities", { ...formData.facilities, hasCTScan: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Capacidade</Label>
                      <div className="space-y-3 border rounded-md p-4">
                        <div>
                          <Label htmlFor="dailyAppointments" className="text-sm">
                            Atendimentos diários
                          </Label>
                          <Input
                            id="dailyAppointments"
                            type="number"
                            min="0"
                            value={formData.capacity.dailyAppointments}
                            onChange={(e) =>
                              updateFormData("capacity", {
                                ...formData.capacity,
                                dailyAppointments: Number.parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyBeds" className="text-sm">
                            Leitos de emergência
                          </Label>
                          <Input
                            id="emergencyBeds"
                            type="number"
                            min="0"
                            value={formData.capacity.emergencyBeds}
                            onChange={(e) =>
                              updateFormData("capacity", {
                                ...formData.capacity,
                                emergencyBeds: Number.parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="regularBeds" className="text-sm">
                            Leitos regulares
                          </Label>
                          <Input
                            id="regularBeds"
                            type="number"
                            min="0"
                            value={formData.capacity.regularBeds}
                            onChange={(e) =>
                              updateFormData("capacity", {
                                ...formData.capacity,
                                regularBeds: Number.parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Horários */}
              <TabsContent value="schedule" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      Dias de Funcionamento
                    </Label>
                    <div className="grid grid-cols-2 gap-2 border rounded-md p-4">
                      {weekDays.map((day) => (
                        <div key={day.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.id}`}
                            checked={formData.workingDays.includes(day.id)}
                            onCheckedChange={(checked) => handleWorkingDayChange(day.id, checked === true)}
                          />
                          <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Horário de Funcionamento
                    </Label>
                    <div className="border rounded-md p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="is24Hours"
                          checked={is24Hours}
                          onCheckedChange={(checked) => {
                            setIs24Hours(checked === true)
                          }}
                        />
                        <Label htmlFor="is24Hours" className="font-medium">
                          Aberto 24 horas
                        </Label>
                      </div>

                      <div className={cn("grid grid-cols-2 gap-4", is24Hours ? "opacity-50" : "")}>
                        <div>
                          <Label htmlFor="workingHoursStart" className="text-xs text-muted-foreground">
                            Horário de Abertura
                          </Label>
                          <Input
                            id="workingHoursStart"
                            type="time"
                            value={is24Hours ? "00:00" : formData.workingHours.start}
                            onChange={(e) =>
                              updateFormData("workingHours", {
                                ...formData.workingHours,
                                start: e.target.value,
                              })
                            }
                            disabled={is24Hours}
                          />
                        </div>
                        <div>
                          <Label htmlFor="workingHoursEnd" className="text-xs text-muted-foreground">
                            Horário de Fechamento
                          </Label>
                          <Input
                            id="workingHoursEnd"
                            type="time"
                            value={is24Hours ? "23:59" : formData.workingHours.end}
                            onChange={(e) =>
                              updateFormData("workingHours", {
                                ...formData.workingHours,
                                end: e.target.value,
                              })
                            }
                            disabled={is24Hours}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">Resumo do Horário</Label>
                        <div className="bg-muted p-3 rounded-md">
                          {is24Hours ? (
                            <p className="text-sm">
                              Aberto 24 horas por dia, {formData.workingDays.length} dias por semana
                            </p>
                          ) : (
                            <p className="text-sm">
                              Aberto das {formData.workingHours.start} às {formData.workingHours.end},
                              {formData.workingDays.length} dias por semana
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {formData.workingDays.map((day) => {
                              const dayLabel = weekDays.find((d) => d.id === day)?.label.split("-")[0]
                              return (
                                <Badge key={day} variant="outline" className="text-xs">
                                  {dayLabel}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between border-t px-6 pt-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-1">*</span> Campos obrigatórios
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Cadastrando..." : "Cadastrar Posto de Saúde"}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

