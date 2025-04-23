"use client"

import type React from "react"

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
import { addExamType } from "@/lib/firebase"
import { FileText, Upload } from "lucide-react"
import { uploadFile } from "@/lib/firebase" // Import uploadFile

interface ExamTypeFormData {
  name: string;
  code: string;
  description: string;
  category: string;
  preparationInstructions: string;
  duration: number;
  price: number;
  cost: number;
  requiresFasting: boolean;
  requiresAppointment: boolean;
  active: boolean;
  image: string;
  resultTime: {
    value: number;
    unit: string;
  };
  notes: string;
}

interface ExamTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  onSuccess?: () => void
}

export function ExamTypeDialog({ open, onOpenChange, clinicId, onSuccess }: ExamTypeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Estado do formulário com valores iniciais
  const [formData, setFormData] = useState<ExamTypeFormData>({
    name: "",
    code: "",
    description: "",
    category: "LABORATORIAL",
    preparationInstructions: "",
    duration: 30,
    price: 0,
    cost: 0,
    requiresFasting: false,
    requiresAppointment: true,
    active: true,
    image: "",
    resultTime: {
      value: 1,
      unit: "dias",
    },
    notes: "",
  })

  // Resetar o formulário quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        code: "",
        description: "",
        category: "LABORATORIAL",
        preparationInstructions: "",
        duration: 30,
        price: 0,
        cost: 0,
        requiresFasting: false,
        requiresAppointment: true,
        active: true,
        image: "",
        resultTime: {
          value: 1,
          unit: "dias",
        },
        notes: "",
      })
      setImagePreview(null)
      setImageFile(null)
      setValidationErrors({})
    }
  }, [open])

  // Atualizar dados do formulário
  const updateFormData = (field: string, value: any) => {
    setFormData((prev: ExamTypeFormData) => {
      if (field.includes(".")) {
        const [parent, child] = field.split(".") as [keyof ExamTypeFormData, string];
        const parentObj = prev[parent] as Record<string, any>;
        return {
          ...prev,
          [parent]: {
            ...parentObj,
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

  // Manipular upload de imagem
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Validar formulário
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validar campos obrigatórios
    if (!formData.name.trim()) errors["name"] = "Nome é obrigatório"
    if (!formData.category.trim()) errors["category"] = "Categoria é obrigatória"
    if (formData.price < 0) errors["price"] = "Preço não pode ser negativo"
    if (formData.cost < 0) errors["cost"] = "Custo não pode ser negativo"
    if (formData.duration <= 0) errors["duration"] = "Duração deve ser maior que zero"
    if (formData.resultTime.value <= 0) errors["resultTime.value"] = "Tempo de resultado deve ser maior que zero"

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
        clinicId,
        createdAt: new Date(),
      }

      // Processar upload de imagem se houver
      if (imageFile) {
        const imagePath = `exam-types/${Date.now()}_${imageFile.name}`
        const imageUrl = await uploadFile(imageFile, imagePath)
        dataToSubmit.image = imageUrl
      }

      await addExamType(clinicId, dataToSubmit)

      toast({
        title: "Tipo de exame cadastrado com sucesso!",
        description: "Os dados foram salvos no sistema.",
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Erro ao adicionar tipo de exame:", error)
      toast({
        title: "Erro ao cadastrar tipo de exame",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Categorias de exames
  const examCategories = [
    { id: "LABORATORIAL", label: "Laboratorial (Sangue, Urina, etc)" },
    { id: "IMAGEM", label: "Imagem (Raio-X, Ultrassom, etc)" },
    { id: "CARDIOLOGICO", label: "Cardiológico (ECG, Holter, etc)" },
    { id: "NEUROLOGICO", label: "Neurológico (EEG, etc)" },
    { id: "OFTALMOLOGICO", label: "Oftalmológico" },
    { id: "GINECOLOGICO", label: "Ginecológico" },
    { id: "OUTRO", label: "Outro" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2 px-6">
              <FileText className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Exames</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm">Cadastrar Tipo</span>
            </div>

            <div className="px-6">
              <h2 className="text-2xl font-semibold">Cadastro de Tipo de Exame</h2>
              <p className="text-sm text-muted-foreground">Preencha os dados do tipo de exame.</p>
            </div>

            <div className="px-6 space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-medium mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["name"] ? "text-destructive" : ""}>
                        Nome do Exame <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o nome do exame"
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
                        placeholder="Digite o código do exame (se houver)"
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
                          {examCategories.map((category) => (
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
                        placeholder="Descreva o exame"
                        className="h-[100px]"
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Instruções de Preparação</Label>
                      <Textarea
                        placeholder="Instruções para o paciente antes do exame"
                        className="h-[100px]"
                        value={formData.preparationInstructions}
                        onChange={(e) => updateFormData("preparationInstructions", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Imagem do Exame</Label>
                      <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 h-[120px]">
                        {imagePreview ? (
                          <div className="relative w-full h-full">
                            <img
                              src={imagePreview || "/placeholder.svg"}
                              alt="Exam Type Preview"
                              className="w-full h-full object-contain"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0"
                              onClick={() => {
                                setImagePreview(null)
                                setImageFile(null)
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-gray-400" />
                            <label
                              htmlFor="image-upload"
                              className="mt-2 cursor-pointer text-sm text-blue-500 hover:text-blue-700"
                            >
                              Carregar imagem
                              <input
                                id="image-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => updateFormData("active", checked === true)}
                      />
                      <Label htmlFor="active">Exame ativo</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes do Exame */}
              <div>
                <h3 className="text-lg font-medium mb-4">Detalhes do Exame</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["duration"] ? "text-destructive" : ""}>
                        Duração (minutos) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Duração estimada do exame"
                        value={formData.duration}
                        onChange={(e) => updateFormData("duration", Number.parseInt(e.target.value) || 0)}
                        className={validationErrors["duration"] ? "border-destructive" : ""}
                      />
                      {validationErrors["duration"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["duration"]}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={validationErrors["resultTime.value"] ? "text-destructive" : ""}>
                          Tempo para Resultado <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Tempo"
                          value={formData.resultTime.value}
                          onChange={(e) => updateFormData("resultTime.value", Number.parseInt(e.target.value) || 0)}
                          className={validationErrors["resultTime.value"] ? "border-destructive" : ""}
                        />
                        {validationErrors["resultTime.value"] && (
                          <p className="text-xs text-destructive mt-1">{validationErrors["resultTime.value"]}</p>
                        )}
                      </div>
                      <div>
                        <Label>Unidade</Label>
                        <Select
                          value={formData.resultTime.unit}
                          onValueChange={(value) => updateFormData("resultTime.unit", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horas">Horas</SelectItem>
                            <SelectItem value="dias">Dias</SelectItem>
                            <SelectItem value="semanas">Semanas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresFasting"
                        checked={formData.requiresFasting}
                        onCheckedChange={(checked) => updateFormData("requiresFasting", checked === true)}
                      />
                      <Label htmlFor="requiresFasting">Requer jejum</Label>
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

                  <div className="space-y-4">
                    <div>
                      <Label className={validationErrors["price"] ? "text-destructive" : ""}>
                        Preço (R$) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preço do exame"
                        value={formData.price}
                        onChange={(e) => updateFormData("price", Number.parseFloat(e.target.value) || 0)}
                        className={validationErrors["price"] ? "border-destructive" : ""}
                      />
                      {validationErrors["price"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["price"]}</p>
                      )}
                    </div>

                    <div>
                      <Label className={validationErrors["cost"] ? "text-destructive" : ""}>Custo (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Custo para realizar o exame"
                        value={formData.cost}
                        onChange={(e) => updateFormData("cost", Number.parseFloat(e.target.value) || 0)}
                        className={validationErrors["cost"] ? "border-destructive" : ""}
                      />
                      {validationErrors["cost"] && (
                        <p className="text-xs text-destructive mt-1">{validationErrors["cost"]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="Informações adicionais sobre o exame"
                        className="h-[100px]"
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
                  {isLoading ? "Cadastrando..." : "Cadastrar Tipo de Exame"}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

