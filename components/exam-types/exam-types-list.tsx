"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExamTypesByClinic, deleteExamType } from "@/lib/firebase"
import { ExamTypeDialog } from "./exam-type-dialog"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, Edit, Trash2, Search, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"

interface ExamTypesListProps {
  clinicId: string
}

export function ExamTypesList({ clinicId }: ExamTypesListProps) {
  const [examTypes, setExamTypes] = useState<any[]>([])
  const [filteredExamTypes, setFilteredExamTypes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExamType, setSelectedExamType] = useState<any>(null)
  const { toast } = useToast()

  // Carregar tipos de exame
  const loadExamTypes = async () => {
    try {
      setIsLoading(true)
      const data = await getExamTypesByClinic(clinicId)
      setExamTypes(data)
      setFilteredExamTypes(data)
    } catch (error) {
      console.error("Erro ao carregar tipos de exame:", error)
      toast({
        title: "Erro ao carregar tipos de exame",
        description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    if (clinicId) {
      loadExamTypes()
    }
  }, [clinicId])

  // Filtrar tipos de exame
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredExamTypes(examTypes)
    } else {
      const filtered = examTypes.filter(
        (examType) =>
          examType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          examType.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (examType.code && examType.code.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredExamTypes(filtered)
    }
  }, [searchTerm, examTypes])

  // Excluir tipo de exame
  const handleDelete = async () => {
    if (!selectedExamType) return

    try {
      await deleteExamType(selectedExamType.id, clinicId)
      toast({
        title: "Tipo de exame excluído com sucesso!",
        description: "O tipo de exame foi removido do sistema.",
      })
      loadExamTypes()
      setIsDeleteDialogOpen(false)
      setSelectedExamType(null)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tipo de exame",
        description: error.message || "Ocorreu um erro ao excluir o tipo de exame.",
        variant: "destructive",
      })
    }
  }

  // Renderizar categoria
  const renderCategory = (category: string) => {
    switch (category) {
      case "LABORATORIAL":
        return (
          <Badge variant="outline" className="bg-blue-50">
            Laboratorial
          </Badge>
        )
      case "IMAGEM":
        return (
          <Badge variant="outline" className="bg-purple-50">
            Imagem
          </Badge>
        )
      case "CARDIOLOGICO":
        return (
          <Badge variant="outline" className="bg-red-50">
            Cardiológico
          </Badge>
        )
      case "NEUROLOGICO":
        return (
          <Badge variant="outline" className="bg-yellow-50">
            Neurológico
          </Badge>
        )
      case "OFTALMOLOGICO":
        return (
          <Badge variant="outline" className="bg-green-50">
            Oftalmológico
          </Badge>
        )
      case "GINECOLOGICO":
        return (
          <Badge variant="outline" className="bg-pink-50">
            Ginecológico
          </Badge>
        )
      default:
        return <Badge variant="outline">Outro</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tipos de Exames
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Exame
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tipos de exame..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando tipos de exame...</p>
            </div>
          ) : filteredExamTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum tipo de exame encontrado.</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? "Tente uma busca diferente." : "Clique em 'Novo Tipo de Exame' para adicionar."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExamTypes.map((examType) => (
                    <TableRow key={examType.id}>
                      <TableCell className="font-medium">{examType.name}</TableCell>
                      <TableCell>{renderCategory(examType.category)}</TableCell>
                      <TableCell>{formatCurrency(examType.price)}</TableCell>
                      <TableCell>{examType.duration} min</TableCell>
                      <TableCell>
                        {examType.active ? (
                          <Badge variant="outline" className="bg-green-50">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedExamType(examType)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de cadastro */}
      <ExamTypeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        clinicId={clinicId}
        onSuccess={loadExamTypes}
      />

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o tipo de exame "{selectedExamType?.name}"? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

