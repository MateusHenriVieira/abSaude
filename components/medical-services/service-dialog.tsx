"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { addDoctorService } from "@/lib/firebase"
import { Stethoscope } from "lucide-react"

interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctorId: string
  onSuccess?: () => void
}

export function ServiceDialog({ open, onOpenChange, doctorId, onSuccess }: ServiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Estado do formulário com valores iniciais
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "CONSULTA",
    duration: 30,
    price: 0,
    followUpPrice: 0,
    requiresAppointment: true,
    active: true,
    isFollowUp: false,
    isSpecialized: false,
    isEmergency: false,
    notes: "",
    availableOnline: false,
    onlinePrice: 0,
    insuranceCovered: true,
    insuranceDetails: "",
  })

  // Resetar o formulário quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        code: "",
        description: "",
        category: "CONSULTA",
        duration: 30,
        price: 0,
        followUpPrice: 0,
        requiresAppointment: true,
        active: true,
        isFollowUp: false,
        isSpecialized: false,
        isEmergency: false,
        notes: "",
        availableOnline: false,
        onlinePrice: 0,
        insuranceCovered: true,
        insuranceDetails: "",
      })
      setValidationErrors({})
    }
  }, [open])

  // Atualizar dados do formulário
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
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

  // Validar formulário
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validar campos obrigatórios
    if (!formData.name.trim()) errors["name"] = "Nome é obrigatório"
    if (!formData.category.trim()) errors["category"] = "Categoria é obrigatória"
    if (formData.price < 0) errors["price"] = "Preço não pode ser negativo"
    if (formData.followUpPrice < 0) errors["followUpPrice"] = "Preço de retorno não pode ser negativo"
    if (formData.duration <= 0) errors["duration"] = "Duração deve ser maior que zero"
    if (formData.availableOnline && formData.onlinePrice < 0)
      errors["onlinePrice"] = "Preço online não pode ser negativo"

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
      const dataToSubmit = {
        ...formData,
        doctorId,
        createdAt: new Date(),
      }

      await addDoctorService(doctorId, dataToSubmit)

      toast({
        title: "Serviço médico cadastrado com sucesso!",
        description: "Os dados foram salvos no sistema.",
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Erro ao adicionar serviço médico:", error)
      toast({
        title: "Erro ao cadastrar serviço médico",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Categorias de serviços médicos
  const serviceCategories = [
    { id: "CONSULTA", label: "Consulta Regular" },
    { id: "CONSULTA_ESPECIALIZADA", label: "Consulta Especializada" },
    { id: "RETORNO", label: "Consulta de Retorno" },
    { id: "EMERGENCIA", label: "Atendimento de Emergência" },
    { id: "PROCEDIMENTO", label: "Procedimento Médico" },
    { id: "CIRURGIA", label: "Cirurgia" },
    { id: "TELEMEDICINA", label: "Telemedicina" },
    { id: "OUTRO", label: "Outro" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2 px-6">
              <Stethoscope className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Serviços Médicos</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm">Cadastrar Serviço</span>
            </div>

            <div className="px-6">
              <h2 className="text-2xl font-semibold">Cadastro de Serviço Médico</h2>
              <p className="text-sm text-muted-foreground">Preencha os dados do serviço oferecido pelo médico.</p>
            </div>

            <div className="px-6 space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-medium mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["name"] ? "text-destructive" : ""}>
                        Nome do Serviço <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o nome do serviço"
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
                        placeholder="Digite o código do serviço (se houver)"
                        value={formData.code}
                        onChange={(e) => updateFormData("code", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className={validationErrors["category"] ? "text-destructive" : ""}>
                        Categoria <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => updateFormData("category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors["category"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["category"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descreva o serviço médico"
                        className="h-[100px]"
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => updateFormData("active", checked === true)}
                      />
                      <Label htmlFor="active">Serviço ativo</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isSpecialized"
                        checked={formData.isSpecialized}
                        onCheckedChange={(checked) => updateFormData("isSpecialized", checked === true)}
                      />
                      <Label htmlFor="isSpecialized">Serviço especializado</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFollowUp"
                        checked={formData.isFollowUp}
                        onCheckedChange={(checked) => updateFormData("isFollowUp", checked === true)}
                      />
                      <Label htmlFor="isFollowUp">Consulta de retorno</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isEmergency"
                        checked={formData.isEmergency}
                        onCheckedChange={(checked) => updateFormData("isEmergency", checked === true)}
                      />
                      <Label htmlFor="isEmergency">Atendimento de emergência</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresAppointment"
                        checked={formData.requiresAppointment}
                        onCheckedChange={(checked) => updateFormData("requiresAppointment", checked === true)}
                      />
                      <Label htmlFor="requiresAppointment">Requer agendamento</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes do Serviço */}
              <div>
                <h3 className="text-lg font-medium mb-4">Detalhes do Serviço</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["duration"] ? "text-destructive" : ""}>
                        Duração (minutos) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Duração estimada do serviço"
                        value={formData.duration}
                        onChange={(e) => updateFormData("duration", Number.parseInt(e.target.value) || 0)}
                        className={validationErrors["duration"] ? "border-destructive" : ""}
                      />
                      {validationErrors["duration"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["duration"]}</p>
                      )}
                    </div>

                    <div>
                      <Label className={validationErrors["price"] ? "text-destructive" : ""}>
                        Preço (R$) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preço do serviço"
                        value={formData.price}
                        onChange={(e) => updateFormData("price", Number.parseFloat(e.target.value) || 0)}
                        className={validationErrors["price"] ? "border-destructive" : ""}
                      />
                      {validationErrors["price"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["price"]}</p>
                      )}
                    </div>

                    <div>
                      <Label className={validationErrors["followUpPrice"] ? "text-destructive" : ""}>
                        Preço de Retorno (R$)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preço para consulta de retorno"
                        value={formData.followUpPrice}
                        onChange={(e) => updateFormData("followUpPrice", Number.parseFloat(e.target.value) || 0)}
                        className={validationErrors["followUpPrice"] ? "border-destructive" : ""}
                      />
                      {validationErrors["followUpPrice"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["followUpPrice"]}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="availableOnline"
                        checked={formData.availableOnline}
                        onCheckedChange={(checked) => updateFormData("availableOnline", checked === true)}
                      />
                      <Label htmlFor="availableOnline">Disponível online (telemedicina)</Label>
                    </div>

                    {formData.availableOnline && (
                      <div>
                        <Label className={validationErrors["onlinePrice"] ? "text-destructive" : ""}>
                          Preço Online (R$)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Preço para atendimento online"
                          value={formData.onlinePrice}
                          onChange={(e) => updateFormData("onlinePrice", Number.parseFloat(e.target.value) || 0)}
                          className={validationErrors["onlinePrice"] ? "border-destructive" : ""}
                        />
                        {validationErrors["onlinePrice"] && (
                          <p className="text-xs text-destructive mt-1">{validationErrors["onlinePrice"]}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="insuranceCovered"
                        checked={formData.insuranceCovered}
                        onCheckedChange={(checked) => updateFormData("insuranceCovered", checked === true)}
                      />
                      <Label htmlFor="insuranceCovered">Coberto por convênios</Label>
                    </div>

                    {formData.insuranceCovered && (
                      <div>
                        <Label>Detalhes de Convênios</Label>
                        <Textarea
                          placeholder="Detalhes sobre cobertura de convênios"
                          className="h-[100px]"
                          value={formData.insuranceDetails}
                          onChange={(e) => updateFormData("insuranceDetails", e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="Informações adicionais sobre o serviço"
                        className="h-[80px]"
                        value={formData.notes}
                        onChange={(e) => updateFormData("notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 pt-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-1">*</span> Campos obrigatórios
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Cadastrando..." : "Cadastrar Serviço"}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

