"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDoctorServicesByDoctor, deleteDoctorService } from "@/lib/firebase"
import { ServiceDialog } from "./service-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Stethoscope, Plus, Edit, Trash2, Search, AlertCircle } from "lucide-react"
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

interface ServicesListProps {
  doctorId: string
}

export function ServicesList({ doctorId }: ServicesListProps) {
  const [services, setServices] = useState<any[]>([])
  const [filteredServices, setFilteredServices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const { toast } = useToast()

  // Carregar serviços
  const loadServices = async () => {
    try {
      setIsLoading(true)
      const data = await getDoctorServicesByDoctor(doctorId)
      setServices(data)
      setFilteredServices(data)
    } catch (error) {
      console.error("Erro ao carregar serviços:", error)
      toast({
        title: "Erro ao carregar serviços",
        description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    if (doctorId) {
      loadServices()
    }
  }, [doctorId])

  // Filtrar serviços
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(services)
    } else {
      const filtered = services.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.code && service.code.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredServices(filtered)
    }
  }, [searchTerm, services])

  // Excluir serviço
  const handleDelete = async () => {
    if (!selectedService) return

    try {
      await deleteDoctorService(selectedService.id, doctorId)
      toast({
        title: "Serviço excluído com sucesso!",
        description: "O serviço foi removido do sistema.",
      })
      loadServices()
      setIsDeleteDialogOpen(false)
      setSelectedService(null)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message || "Ocorreu um erro ao excluir o serviço.",
        variant: "destructive",
      })
    }
  }

  // Renderizar categoria
  const renderCategory = (category: string) => {
    switch (category) {
      case "CONSULTA":
        return (
          <Badge variant="outline" className="bg-blue-50">
            Consulta Regular
          </Badge>
        )
      case "CONSULTA_ESPECIALIZADA":
        return (
          <Badge variant="outline" className="bg-purple-50">
            Consulta Especializada
          </Badge>
        )
      case "RETORNO":
        return (
          <Badge variant="outline" className="bg-green-50">
            Retorno
          </Badge>
        )
      case "EMERGENCIA":
        return (
          <Badge variant="outline" className="bg-red-50">
            Emergência
          </Badge>
        )
      case "PROCEDIMENTO":
        return (
          <Badge variant="outline" className="bg-yellow-50">
            Procedimento
          </Badge>
        )
      case "CIRURGIA":
        return (
          <Badge variant="outline" className="bg-orange-50">
            Cirurgia
          </Badge>
        )
      case "TELEMEDICINA":
        return (
          <Badge variant="outline" className="bg-indigo-50">
            Telemedicina
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
            <Stethoscope className="h-5 w-5" />
            Serviços Médicos
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviços..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando serviços...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum serviço encontrado.</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? "Tente uma busca diferente." : "Clique em 'Novo Serviço' para adicionar."}
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
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{renderCategory(service.category)}</TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell>{service.duration} min</TableCell>
                      <TableCell>
                        {service.active ? (
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
                              setSelectedService(service)
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
      <ServiceDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} doctorId={doctorId} onSuccess={loadServices} />

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o serviço "{selectedService?.name}"? Esta ação não pode ser desfeita.
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

