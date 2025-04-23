"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  sendMassNotification,
  getNotifications,
  getNotificationTypes,
  addNotificationType,
  deleteNotificationType,
  getClinics,
} from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Bell, Send, Info, Calendar, Users, Plus, Trash2, Loader2, FileText } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatePicker } from "@/components/ui/date-picker"

// Add Firebase notification interface
interface FirebaseNotification {
  id: string;
  createdAt: any;
  title?: string;
  message?: string;
  type?: string;
  sendToAll?: boolean;
  clinicId?: string | null;
  status?: string;
  recipientCount?: number;
  senderName?: string;
}

// Raw data interfaces
interface FirebaseNotificationTypeRaw {
  id: string;
  name?: string;
  description?: string;
  template?: string;
}

interface FirebaseNotificationRaw {
  id: string;
  createdAt: any;
  title?: string;
  message?: string;
  type?: string;
  sendToAll?: boolean;
  clinicId?: string | null;
  status?: string;
  recipientCount?: number;
  senderName?: string;
}

interface NotificationType {
  id: string
  name: string
  description: string
  template: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  sendToAll: boolean
  clinicId: string | null
  createdAt: Date
  status: string
  recipientCount?: number
  senderName?: string
}

interface Clinic {
  id: string
  name: string
}

export function NotificationsView() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notificationType, setNotificationType] = useState("general")
  const [isSending, setIsSending] = useState(false)
  const [sendToAll, setSendToAll] = useState(false) // Alterado para false por padrão
  const [selectedClinic, setSelectedClinic] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false)
  const [newType, setNewType] = useState({
    name: "",
    description: "",
    template: "",
  })
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const { toast } = useToast()
  const { user } = useAuth()

  // Carregar notificações, tipos de notificação e postos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingNotifications(true)
        setLoadingTypes(true)
        setLoadingClinics(true)

        const rawData = await Promise.all([
          getNotifications(),
          getNotificationTypes(),
          getClinics(),
        ]) as [FirebaseNotificationRaw[], FirebaseNotificationTypeRaw[], Clinic[]]

        // Transform notification types
        const formattedTypes: NotificationType[] = rawData[1].map(type => ({
          id: type.id,
          name: type.name || '',
          description: type.description || '',
          template: type.template || '',
        }));

        // Transform notifications
        const formattedNotifications: Notification[] = rawData[0].map(notification => ({
          id: notification.id,
          title: notification.title || '',
          message: notification.message || '',
          type: notification.type || 'general',
          sendToAll: notification.sendToAll || false,
          clinicId: notification.clinicId || null,
          createdAt: notification.createdAt?.toDate() || new Date(),
          status: notification.status || 'sent',
          recipientCount: notification.recipientCount,
          senderName: notification.senderName,
        }));

        setNotifications(formattedNotifications)
        setFilteredNotifications(formattedNotifications)
        setNotificationTypes(formattedTypes)
        setClinics(rawData[2])

        // Se o usuário estiver associado a um posto, selecione-o por padrão
        if (user?.clinicId) {
          setSelectedClinic(user.clinicId)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as notificações ou tipos.",
          variant: "destructive",
        })
      } finally {
        setLoadingNotifications(false)
        setLoadingTypes(false)
        setLoadingClinics(false)
      }
    }

    fetchData()
  }, [toast, user])

  // Filtrar notificações quando a aba mudar ou datas forem selecionadas
  useEffect(() => {
    let filtered = [...notifications]

    // Filtrar por tipo
    if (activeTab !== "all") {
      filtered = filtered.filter((notification) => notification.type === activeTab)
    }

    // Filtrar por data de início
    if (startDate) {
      filtered = filtered.filter((notification) => {
        return notification.createdAt >= startDate
      })
    }

    // Filtrar por data de fim
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter((notification) => {
        return notification.createdAt <= endOfDay
      })
    }

    setFilteredNotifications(filtered)
  }, [activeTab, notifications, startDate, endDate])

  const handleSendNotification = async () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe um título para a notificação.",
        variant: "destructive",
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, escreva uma mensagem para a notificação.",
        variant: "destructive",
      })
      return
    }

    // Verificar se um posto foi selecionado quando não for enviar para todos
    if (!sendToAll && !selectedClinic) {
      toast({
        title: "Posto obrigatório",
        description: "Por favor, selecione um posto para enviar a notificação.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSending(true)

      // Se o usuário não for admin, sempre enviar apenas para o posto dele
      const clinicToSend = user?.type === "admin" ? (sendToAll ? null : selectedClinic) : user?.clinicId || null

      await sendMassNotification({
        title,
        message,
        type: notificationType,
        sendToAll: user?.type === "admin" ? sendToAll : false, // Apenas admin pode enviar para todos
        clinicId: clinicToSend,
      })

      // Update notifications with proper data transformation
      const rawUpdatedNotifications = await getNotifications() as FirebaseNotificationRaw[]
      const formattedNotifications: Notification[] = rawUpdatedNotifications.map(notification => ({
        id: notification.id,
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'general',
        sendToAll: notification.sendToAll || false,
        clinicId: notification.clinicId || null,
        createdAt: notification.createdAt?.toDate() || new Date(),
        status: notification.status || 'sent',
        recipientCount: notification.recipientCount,
        senderName: notification.senderName,
      }));

      setNotifications(formattedNotifications)

      toast({
        title: "Notificação enviada",
        description: "A notificação foi enviada com sucesso para os pacientes.",
      })

      // Limpar o formulário
      setTitle("")
      setMessage("")
      setNotificationType("general")
    } catch (error) {
      console.error("Error sending notification:", error)
      toast({
        title: "Erro ao enviar notificação",
        description: "Ocorreu um erro ao enviar a notificação. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleAddNotificationType = async () => {
    if (!newType.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe um nome para o tipo de notificação.",
        variant: "destructive",
      })
      return
    }

    if (!newType.template.trim()) {
      toast({
        title: "Modelo obrigatório",
        description: "Por favor, forneça um modelo de mensagem para este tipo de notificação.",
        variant: "destructive",
      })
      return
    }

    try {
      await addNotificationType(newType)

      // Get updated types and transform them
      const rawUpdatedTypes = await getNotificationTypes() as FirebaseNotificationTypeRaw[]
      const formattedTypes: NotificationType[] = rawUpdatedTypes.map(type => ({
        id: type.id,
        name: type.name || '',
        description: type.description || '',
        template: type.template || '',
      }));

      setNotificationTypes(formattedTypes)

      toast({
        title: "Tipo de notificação adicionado",
        description: "O novo tipo de notificação foi adicionado com sucesso.",
      })

      // Limpar o formulário e fechar o diálogo
      setNewType({
        name: "",
        description: "",
        template: "",
      })
      setIsAddTypeDialogOpen(false)
    } catch (error) {
      console.error("Error adding notification type:", error)
      toast({
        title: "Erro ao adicionar tipo",
        description: "Ocorreu um erro ao adicionar o tipo de notificação. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNotificationType = async (typeId: string) => {
    try {
      await deleteNotificationType(typeId)

      // Get updated types and transform them
      const rawUpdatedTypes = await getNotificationTypes() as FirebaseNotificationTypeRaw[]
      const formattedTypes: NotificationType[] = rawUpdatedTypes.map(type => ({
        id: type.id,
        name: type.name || '',
        description: type.description || '',
        template: type.template || '',
      }));

      setNotificationTypes(formattedTypes)

      toast({
        title: "Tipo de notificação excluído",
        description: "O tipo de notificação foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting notification type:", error)
      toast({
        title: "Erro ao excluir tipo",
        description: "Ocorreu um erro ao excluir o tipo de notificação. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateReport = () => {
    // Implementação básica de relatório - poderia ser expandida para exportar para PDF/Excel
    const reportData = filteredNotifications.map((notification) => ({
      title: notification.title,
      type: notification.type,
      date: format(notification.createdAt, "dd/MM/yyyy HH:mm"),
      recipients: notification.recipientCount || "Todos",
      sender: notification.senderName || "Sistema",
    }))

    console.log("Relatório gerado:", reportData)

    toast({
      title: "Relatório gerado",
      description: `${reportData.length} notificações incluídas no relatório.`,
    })
  }

  const getPlaceholderText = () => {
    // Verificar se é um tipo personalizado
    const customType = notificationTypes.find((type) => type.id === notificationType)
    if (customType) {
      return customType.template
    }

    // Tipos padrão
    switch (notificationType) {
      case "vaccination":
        return "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de vacinação contra [doença] no período de [data início] a [data fim].\n\nLocal: [nome do posto]\nHorário: [horário de atendimento]\n\nTraga seu cartão de vacinação e documento de identidade.\n\nAtenciosamente,\nEquipe de Saúde"
      case "medication":
        return "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de distribuição de medicamentos para [condição/doença] no período de [data início] a [data fim].\n\nLocal: [nome do posto]\nHorário: [horário de atendimento]\n\nTraga seu cartão do SUS e documento de identidade.\n\nAtenciosamente,\nEquipe de Saúde"
      case "campaign":
        return "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de [tipo de campanha] no período de [data início] a [data fim].\n\nLocal: [nome do posto]\nHorário: [horário de atendimento]\n\nMais informações: [detalhes adicionais]\n\nAtenciosamente,\nEquipe de Saúde"
      default:
        return "Digite aqui a mensagem que será enviada para os pacientes..."
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notificações em Massa</h1>
        <p className="text-sm text-muted-foreground">Envie notificações para os pacientes cadastrados no sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Nova Notificação</CardTitle>
              <CardDescription>Preencha os campos abaixo para enviar uma notificação para os pacientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Notificação</Label>
                <Input
                  id="title"
                  placeholder="Ex: Campanha de Vacinação Contra a Gripe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Notificação</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="vaccination">Campanha de Vacinação</SelectItem>
                    <SelectItem value="medication">Distribuição de Medicamentos</SelectItem>
                    <SelectItem value="campaign">Outra Campanha</SelectItem>

                    {/* Tipos personalizados */}
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Mensagem</Label>
                  <span className="text-xs text-muted-foreground">{message.length} caracteres</span>
                </div>
                <Textarea
                  id="message"
                  placeholder={getPlaceholderText()}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>

              {user?.type === "admin" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sendToAll">Enviar para todos os pacientes</Label>
                    <Switch id="sendToAll" checked={sendToAll} onCheckedChange={setSendToAll} />
                  </div>
                  {!sendToAll && (
                    <div className="pt-2">
                      <Label htmlFor="clinic">Selecione o Posto</Label>
                      <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o posto" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingClinics ? (
                            <SelectItem value="loading" disabled>
                              Carregando postos...
                            </SelectItem>
                          ) : (
                            clinics.map((clinic) => (
                              <SelectItem key={clinic.id} value={clinic.id}>
                                {clinic.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Para médicos e enfermeiros, mostrar apenas o posto deles */}
              {(user?.type === "doctor" || user?.type === "nurse") && user?.clinicId && (
                <div className="space-y-2">
                  <Label>Posto de Saúde</Label>
                  <div className="p-2 border rounded-md bg-muted/20">
                    {loadingClinics ? (
                      <Skeleton className="h-6 w-full" />
                    ) : (
                      <p>
                        {clinics.find((c) => c.id === user.clinicId)?.name || "Seu posto de saúde"}
                        <span className="text-xs text-muted-foreground ml-2">
                          (As notificações serão enviadas apenas para pacientes deste posto)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSendNotification} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Notificação
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Modelos de Notificação</CardTitle>
                <CardDescription>Selecione um modelo para preencher automaticamente</CardDescription>
              </div>
              <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Tipo de Notificação</DialogTitle>
                    <DialogDescription>Crie um novo tipo de notificação com modelo personalizado</DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="typeName">Nome do Tipo</Label>
                        <Input
                          id="typeName"
                          placeholder="Ex: Campanha de Saúde Bucal"
                          value={newType.name}
                          onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="typeDescription">Descrição</Label>
                        <Input
                          id="typeDescription"
                          placeholder="Ex: Notificações sobre campanhas de saúde bucal"
                          value={newType.description}
                          onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="typeTemplate">Modelo de Mensagem</Label>
                        <Textarea
                          id="typeTemplate"
                          placeholder="Digite o modelo de mensagem para este tipo de notificação..."
                          value={newType.template}
                          onChange={(e) => setNewType({ ...newType, template: e.target.value })}
                          className="min-h-[150px]"
                        />
                      </div>
                    </div>
                  </ScrollArea>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddTypeDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddNotificationType}>Adicionar Tipo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                {loadingTypes ? (
                  <>
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start mb-2"
                      onClick={() => {
                        setTitle("Campanha de Vacinação Contra a Gripe")
                        setNotificationType("vaccination")
                        setMessage(
                          "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de vacinação contra a gripe no período de 01/06/2023 a 30/06/2023.\n\nLocal: Posto de Saúde Central\nHorário: 8h às 17h\n\nTraga seu cartão de vacinação e documento de identidade.\n\nAtenciosamente,\nEquipe de Saúde",
                        )
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Campanha de Vacinação
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start mb-2"
                      onClick={() => {
                        setTitle("Campanha de Vermifugação")
                        setNotificationType("medication")
                        setMessage(
                          "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de distribuição de medicamentos para vermifugação no período de 01/06/2023 a 15/06/2023.\n\nLocal: Todos os Postos de Saúde\nHorário: 8h às 16h\n\nTraga seu cartão do SUS e documento de identidade.\n\nAtenciosamente,\nEquipe de Saúde",
                        )
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Campanha de Vermifugação
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start mb-2"
                      onClick={() => {
                        setTitle("Campanha de Prevenção à Dengue")
                        setNotificationType("campaign")
                        setMessage(
                          "Prezado(a) paciente,\n\nInformamos que estamos realizando uma campanha de prevenção à dengue no período de 01/06/2023 a 30/06/2023.\n\nLocal: Todos os Postos de Saúde\nHorário: 8h às 17h\n\nSerão distribuídos materiais informativos e realizadas visitas domiciliares para orientação sobre prevenção.\n\nAtenciosamente,\nEquipe de Saúde",
                        )
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Campanha de Prevenção à Dengue
                    </Button>

                    {/* Tipos personalizados */}
                    {notificationTypes.map((type) => (
                      <div key={type.id} className="flex items-center mb-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setTitle(type.name)
                            setNotificationType(type.id)
                            setMessage(type.template)
                          }}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {type.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-1 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNotificationType(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Dicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Mantenha as mensagens claras e concisas, com todas as informações necessárias.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">Inclua sempre o local, data e horário das campanhas.</p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">Informe quais documentos os pacientes devem levar.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>Visualize as notificações enviadas anteriormente</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="startDate" className="text-sm">
                  De:
                </Label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="endDate" className="text-sm">
                  Até:
                </Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateReport}>
                <FileText className="h-4 w-4 mr-1" /> Gerar Relatório
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="vaccination">Vacinação</TabsTrigger>
                <TabsTrigger value="medication">Medicamentos</TabsTrigger>
                <TabsTrigger value="campaign">Campanhas</TabsTrigger>
                {notificationTypes.map((type) => (
                  <TabsTrigger key={type.id} value={type.id}>
                    {type.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {loadingNotifications ? (
                    // Skeletons para carregamento
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma notificação encontrada.</div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <div key={notification.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            <div>
                              <h3 className="font-medium">{notification.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Enviada em: {format(notification.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {notification.senderName && ` por ${notification.senderName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {notification.recipientCount || "Todos"} destinatários
                              </span>
                            </div>
                            <Badge variant="outline">
                              {notification.type === "vaccination"
                                ? "Vacinação"
                                : notification.type === "medication"
                                  ? "Medicamentos"
                                  : notification.type === "campaign"
                                    ? "Campanha"
                                    : notification.type === "general"
                                      ? "Geral"
                                      : // Para tipos personalizados
                                        notificationTypes.find((t) => t.id === notification.type)?.name ||
                                        notification.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{notification.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

