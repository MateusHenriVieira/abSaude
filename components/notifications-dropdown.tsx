"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { countUnreadNotifications } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export function NotificationsDropdown() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user || !user.uid) return

      try {
        const count = await countUnreadNotifications(user.uid)
        setUnreadCount(count)
      } catch (error) {
        console.error("Erro ao carregar contagem de notificações:", error)
      }
    }

    loadUnreadCount()

    // Atualizar a cada 60 segundos
    const interval = setInterval(loadUnreadCount, 60000)

    return () => clearInterval(interval)
  }, [user])

  const handleClick = () => {
    router.push("/notificacoes")
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  )
}

