"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { addDoctor, getClinics } from "@/lib/firebase"
import { useEffect } from "react"
import { Home, Clock, Calendar, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"

// Tipos
interface Clinic {
  id: string
  name: string
}

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Componente principal
export function RegistrationDialog({ open, onOpenChange, onSuccess }: RegistrationDialogProps) {
  // Estados
  const [step, setStep] = useState(1)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Adicionar um novo estado para controlar a opção de 24 horas
  const [is24Hours, setIs24Hours] = useState(false)

  // Estado do formulário com valores iniciais definidos para evitar undefined
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "", // Novo campo para a senha
    phone: "",
    medicalId: "",
    function: "",
    specialties: [] as string[],
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    workingHours: {
      start: "08:00",
      end: "18:00",
    },
    clinic: "", // ID do postinho selecionado
    clinicId: "", // Adicionado clinicId
    status: "Ativo",
    documents: [] as any[],
    isTemporary: false,
    country: "Brasil",
    gender: "",
    role: "",
    profileImage: null as File | null,
  })

  // Buscar clínicas ao montar o componente
  useEffect(() => {
    const loadClinics = async () => {
      try {
        setIsLoading(true)
        const clinicsData = await getClinics()

        // Garantir que os dados retornados tenham as propriedades id e name
        const formattedClinics = clinicsData.map((clinic: any) => ({
          id: clinic.id,
          name: clinic.name || "Nome não disponível", // Adicione um valor padrão para 'name' se estiver ausente
        }))

        setClinics(formattedClinics)
      } catch (error) {
        console.error("Erro ao carregar clínicas:", error)
        toast({
          title: "Erro ao carregar clínicas",
          description: "Não foi possível carregar a lista de clínicas.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      loadClinics()
    }
  }, [open, toast])

  // Atualizar dados do formulário
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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

  // Manipular documentos
  const handleDocumentChange = (index: number, field: string, value: any) => {
    const updatedDocuments = [...formData.documents]
    if (!updatedDocuments[index]) {
      updatedDocuments[index] = {}
    }
    updatedDocuments[index] = { ...updatedDocuments[index], [field]: value }
    updateFormData("documents", updatedDocuments)
  }

  const addDocument = () => {
    updateFormData("documents", [...formData.documents, { name: "", file: null, requiresSignature: false }])
  }

  const removeDocument = (index: number) => {
    const updatedDocuments = formData.documents.filter((_, i) => i !== index)
    updateFormData("documents", updatedDocuments)
  }

  // Manipular imagem de perfil
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateFormData("profileImage", e.target.files[0])
    }
  }

  // Enviar formulário
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validar dados obrigatórios
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.clinic) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Criar ID do documento baseado no nome do médico
      const docId = `${formData.firstName.toLowerCase()}-${formData.lastName.toLowerCase()}`

      // Adiciona o ID do documento ao formData
      const userData = {
        ...formData,
        clinicId: formData.clinic, // Certifique-se de que clinicId está sendo enviado
        id: docId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Chama a função addDoctor apenas com os dados do usuário
      await addDoctor(userData)

      toast({
        title: "Médico cadastrado com sucesso!",
        description: "Os dados foram salvos no sistema.",
      })

      // Resetar formulário
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "", // Novo campo para a senha
        phone: "",
        medicalId: "",
        function: "",
        specialties: [],
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workingHours: {
          start: "08:00",
          end: "18:00",
        },
        clinic: "",
        clinicId: "", // Adicionado clinicId
        status: "Ativo",
        documents: [],
        isTemporary: false,
        country: "Brasil",
        gender: "",
        role: "",
        profileImage: null,
      })

      setStep(1)
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Erro ao cadastrar médico:", error)
      toast({
        title: "Erro ao cadastrar médico",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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

  // Lista de especialidades
  const specialties = [
    "Clínico Geral",
    "Pediatra",
    "Cardiologista",
    "Dermatologista",
    "Ortopedista",
    "Ginecologista",
    "Neurologista",
    "Oftalmologista",
    "Otorrinolaringologista",
    "Psiquiatra",
    "Urologista",
    "Endocrinologista",
    "Dentista",
    "Cirurgião",
    "Fisioterapeuta",
    "Nutricionista",
  ]

  // Renderizar etapa 1: Informações básicas
  const renderStep1 = () => (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-2 px-6">
        <Home className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Médicos</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm">Cadastrar</span>
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-semibold">Cadastro Médico</h2>
        <p className="text-sm text-muted-foreground">Preencha todos os dados abaixo.</p>
      </div>

      <div className="flex items-center justify-between px-6">
        <div className="text-sm font-medium">Informações Básicas</div>
        <div className="flex items-center gap-2">
          <Switch
            id="temporary"
            checked={formData.isTemporary}
            onCheckedChange={(checked) => updateFormData("isTemporary", checked)}
          />
          <Label htmlFor="temporary">Médico Temporário</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 px-6">
        <div className="space-y-4">
          <div>
            <Label>Primeiro Nome</Label>
            <Input
              placeholder="Digite o Primeiro Nome"
              value={formData.firstName}
              onChange={(e) => updateFormData("firstName", e.target.value)}
            />
          </div>

          <div>
            <Label>
              Especialidades <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {specialties.map((specialty) => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={`specialty-${specialty}`}
                    checked={formData.specialties.includes(specialty)}
                    onCheckedChange={(checked) => handleSpecialtyChange(specialty, checked === true)}
                  />
                  <Label htmlFor={`specialty-${specialty}`}>{specialty}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Digite o Email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
            />
          </div>

          <div>
            <Label>
              Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Digite a Senha"
              value={formData.password || ""}
              onChange={(e) => updateFormData("password", e.target.value)} // Atualiza o estado com a senha
            />
          </div>

          <div>
            <Label>País</Label>
            <Select value={formData.country} onValueChange={(value) => updateFormData("country", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Brasil">Brasil</SelectItem>
                <SelectItem value="Portugal">Portugal</SelectItem>
                <SelectItem value="Cuba">Cuba</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Gênero</Label>
            <Select value={formData.gender} onValueChange={(value) => updateFormData("gender", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>
              Sobrenome <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Digite o Sobrenome"
              value={formData.lastName}
              onChange={(e) => updateFormData("lastName", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="medicalId">COREN/CRM</Label>
            <Input
              placeholder="Digite o ID do Médico"
              value={formData.medicalId}
              onChange={(e) => updateFormData("medicalId", e.target.value)}
            />
          </div>

          <div>
            <Label>
              Telefone <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Digite o Número de Telefone"
              value={formData.phone}
              onChange={(e) => updateFormData("phone", e.target.value)}
            />
          </div>

          <div>
            <Label>Sala</Label>
            <Input
              placeholder="Digite o nome da sala"
              value={formData.role}
              onChange={(e) => updateFormData("role", e.target.value)} // Atualiza o estado com o valor digitado
            />
          </div>

          <div>
            <Label>Postinho</Label>
            <Select
              value={formData.clinic}
              onValueChange={(value) => updateFormData("clinic", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Postinho" />
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
        </div>
      </div>

      <Separator className="my-2 mx-6" />

      <div className="px-6">
        <div className="text-sm font-medium mb-4">Horário de Trabalho</div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Dias de Trabalho
            </Label>
            <div className="grid grid-cols-2 gap-2">
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
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Horário de Trabalho
              </Label>
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="is24Hours"
                  checked={is24Hours}
                  onCheckedChange={(checked) => {
                    setIs24Hours(checked === true)
                    if (checked === true) {
                      updateFormData("workingHours", {
                        start: "00:00",
                        end: "23:59",
                      })
                    }
                  }}
                />
                <Label htmlFor="is24Hours">Disponível 24 horas</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workingHoursStart" className="text-xs text-muted-foreground">
                    Início
                  </Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={formData.workingHours.start}
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
                    Fim
                  </Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={formData.workingHours.end}
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-6 pt-4">
        <div className="flex gap-2">
          <div className="h-2 w-8 rounded-full bg-primary"></div>
          <div className="h-2 w-8 rounded-full bg-gray-200"></div>
          <div className="h-2 w-8 rounded-full bg-gray-200"></div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setStep(2)}>Próximo &gt;</Button>
        </div>
      </div>
    </div>
  )

  // Renderizar etapa 2: Documentos
  const renderStep2 = () => (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-2 px-6">
        <Home className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Médicos</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm">Cadastrar</span>
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-semibold">Documentos</h2>
        <p className="text-sm text-muted-foreground">Adicione os documentos do médico.</p>
      </div>

      <div className="px-6 space-y-6">
        <div>
          <Label className="flex items-center gap-2 mb-4">
            <Upload className="h-4 w-4" />
            Foto de Perfil
          </Label>
          <div className="flex items-center gap-4">
            {formData.profileImage && (
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={URL.createObjectURL(formData.profileImage) || "/placeholder.svg"}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleProfileImageChange} className="max-w-xs" />
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </Label>
            <Button variant="outline" size="sm" onClick={addDocument}>
              Adicionar Documento
            </Button>
          </div>

          {formData.documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum documento adicionado. Clique em "Adicionar Documento" para começar.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.documents.map((doc, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Documento {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Documento</Label>
                      <Input
                        placeholder="Ex: Diploma, CRM, RG"
                        value={doc.name || ""}
                        onChange={(e) => handleDocumentChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Arquivo</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDocumentChange(index, "file", e.target.files[0])
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`requires-signature-${index}`}
                      checked={doc.requiresSignature || false}
                      onCheckedChange={(checked) => handleDocumentChange(index, "requiresSignature", checked === true)}
                    />
                    <Label htmlFor={`requires-signature-${index}`}>Requer assinatura</Label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-6 pt-4">
        <div className="flex gap-2">
          <div className="h-2 w-8 rounded-full bg-primary"></div>
          <div className="h-2 w-8 rounded-full bg-primary"></div>
          <div className="h-2 w-8 rounded-full bg-gray-200"></div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep(1)}>
            &lt; Anterior
          </Button>
          <Button onClick={() => setStep(3)}>Próximo &gt;</Button>
        </div>
      </div>
    </div>
  )

  // Renderizar etapa 3: Verificação
  const renderStep3 = () => (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-2 px-6">
        <Home className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Médicos</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm">Cadastrar</span>
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-semibold">Verificação</h2>
        <p className="text-sm text-muted-foreground">Verifique os dados antes de finalizar o cadastro.</p>
      </div>

      <div className="px-6 space-y-6">
        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium text-lg">Informações Pessoais</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Completo</p>
              <p>
                {formData.firstName} {formData.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p>{formData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CRM</p>
              <p>{formData.medicalId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gênero</p>
              <p>{formData.gender || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">País</p>
              <p>{formData.country}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Função</p>
              <p>{formData.role || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p>{formData.isTemporary ? "Temporário" : "Permanente"}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium text-lg">Especialidades</h3>
          {formData.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.specialties.map((specialty) => (
                <div key={specialty} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                  {specialty}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma especialidade selecionada</p>
          )}
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium text-lg">Horário de Trabalho</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dias de Trabalho</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.workingDays.map((day) => (
                  <div key={day} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {weekDays.find((d) => d.id === day)?.label.split("-")[0]}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horário</p>
              <p>{is24Hours ? "24 horas" : `${formData.workingHours.start} às ${formData.workingHours.end}`}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium text-lg">Documentos</h3>
          {formData.documents.length > 0 ? (
            <div className="space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{doc.name || `Documento ${index + 1}`}</span>
                  {doc.file ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum documento adicionado</p>
          )}
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium text-lg">Foto de Perfil</h3>
          {formData.profileImage ? (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={URL.createObjectURL(formData.profileImage) || "/placeholder.svg"}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <p>{formData.profileImage.name}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma foto de perfil adicionada</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-6 pt-4">
        <div className="flex gap-2">
          <div className="h-2 w-8 rounded-full bg-primary"></div>
          <div className="h-2 w-8 rounded-full bg-primary"></div>
          <div className="h-2 w-8 rounded-full bg-primary"></div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep(2)}>
            &lt; Anterior
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Cadastrando..." : "Finalizar Cadastro"}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

