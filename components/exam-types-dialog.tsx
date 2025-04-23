"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addExamType, removeExamType, getExamTypes } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

interface ExamTypesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  onSuccess: () => void
}

export function ExamTypesDialog({ open, onOpenChange, clinicId, onSuccess }: ExamTypesDialogProps) {
  const [examTypes, setExamTypes] = useState<string[]>([])
  const [newExamType, setNewExamType] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchExamTypes()
    }
  }, [open, clinicId])

  const fetchExamTypes = async () => {
    try {
      const types = await getExamTypes(clinicId)
      setExamTypes(types)
    } catch (error) {
      console.error("Error fetching exam types:", error)
      toast({
        title: "Erro ao carregar tipos de exames",
        description: "Não foi possível carregar os tipos de exames. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleAddExamType = async () => {
    if (newExamType.trim() === "") return

    try {
      await addExamType(clinicId, newExamType)
      setExamTypes([...examTypes, newExamType])
      setNewExamType("")
      onSuccess()
      toast({
        title: "Tipo de exame adicionado",
        description: "O novo tipo de exame foi adicionado com sucesso.",
      })
    } catch (error) {
      console.error("Error adding exam type:", error)
      toast({
        title: "Erro ao adicionar tipo de exame",
        description: "Ocorreu um erro ao adicionar o tipo de exame. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveExamType = async (examType: string) => {
    try {
      await removeExamType(clinicId, examType)
      setExamTypes(examTypes.filter((type) => type !== examType))
      onSuccess()
      toast({
        title: "Tipo de exame removido",
        description: "O tipo de exame foi removido com sucesso.",
      })
    } catch (error) {
      console.error("Error removing exam type:", error)
      toast({
        title: "Erro ao remover tipo de exame",
        description: "Ocorreu um erro ao remover o tipo de exame. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tipos de Exames Disponíveis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-exam-type">Novo Tipo de Exame</Label>
            <div className="flex space-x-2">
              <Input
                id="new-exam-type"
                value={newExamType}
                onChange={(e) => setNewExamType(e.target.value)}
                placeholder="Digite o nome do tipo de exame"
              />
              <Button onClick={handleAddExamType}>Adicionar</Button>
            </div>
          </div>
          <div className="space-y-2">
            {examTypes.map((examType, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{examType}</span>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveExamType(examType)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

