"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { Loader2, Bell } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUserNotifications, markNotificationAsRead } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export function UserNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || !user.uid) return

      try {
        setLoading(true)
        const userNotifications = await getUserNotifications(user.uid)
        setNotifications(userNotifications)
      } catch (error) {
        console.error("Erro ao carregar notificações:", error)
        toast.error("Erro ao carregar notificações")
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [user])

  const handleMarkAsRead = async (notificationId: string) => {
    if (!notificationId) {
      console.error("ID de notificação inválido")
      return
    }

    try {
      await markNotificationAsRead(notificationId)

      // Atualizar o estado local
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )

      toast.success("Notificação marcada como lida")
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error)
      toast.error("Erro ao marcar notificação como lida")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Você não tem notificações</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">Quando você receber notificações, elas aparecerão aqui.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Suas notificações mais recentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg ${notification.read ? "bg-background" : "bg-primary/5"}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{notification.title || "Sem título"}</h3>
              {!notification.read && (
                <Badge variant="default" className="ml-2">
                  Nova
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{notification.message || "Sem mensagem"}</p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>
                {notification.createdAt
                  ? format(notification.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                  : "Data desconhecida"}
              </span>
              {!notification.read && (
                <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                  Marcar como lida
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

