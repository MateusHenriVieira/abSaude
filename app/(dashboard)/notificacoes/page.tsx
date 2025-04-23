"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationForm } from "@/components/notification-form"
import { NotificationsView } from "@/components/notifications-view"
import { UserNotifications } from "@/components/user-notifications"
import { useAuth } from "@/contexts/auth-context"

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("minhas")
  const { user } = useAuth()

  const isAdmin = user?.type === "admin"
  const isStaff = user?.type === "admin" || user?.type === "receptionist" || user?.type === "nurse"

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Notificações</h1>

      <Tabs defaultValue="minhas" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="minhas">Minhas Notificações</TabsTrigger>
          {isStaff && <TabsTrigger value="enviar">Enviar Notificação</TabsTrigger>}
          {isAdmin && <TabsTrigger value="historico">Histórico de Envios</TabsTrigger>}
        </TabsList>

        <TabsContent value="minhas">
          <UserNotifications />
        </TabsContent>

        {isStaff && (
          <TabsContent value="enviar">
            <NotificationForm />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="historico">
            <NotificationsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

