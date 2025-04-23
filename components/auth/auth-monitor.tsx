"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { logUserAccess, logUserExit } from "@/lib/firebase-structure"
import { useToast } from "@/components/ui/use-toast"

/**
 * Componente para monitorar a autenticação e registrar os horários de acesso e saída dos usuários.
 */
export function AuthMonitor() {
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    let accessLogId: string | null = null

    // Função para registrar o acesso do usuário
    const registerUserAccess = async () => {
      if (user && user.clinicId && user.type !== "patient") {
        try {
          const accessData = await logUserAccess(user.clinicId, user.uid)
          accessLogId = accessData.id // Salvar o ID do log de acesso

          toast({
            title: "Acesso registrado",
            description: `Acesso de ${user.name} registrado com sucesso.`,
          })
        } catch (error) {
          console.error("Erro ao registrar acesso do usuário:", error)
          toast({
            title: "Erro ao registrar acesso",
            description: "Não foi possível registrar o acesso do usuário.",
            variant: "destructive",
          })
        }
      }
    }

    // Função para registrar a saída do usuário
    const registerUserExit = async () => {
      if (user && user.clinicId && accessLogId) {
        try {
          await logUserExit(user.clinicId, user.uid, accessLogId)
          toast({
            title: "Saída registrada",
            description: `Saída de ${user.name} registrada com sucesso.`,
          })
        } catch (error) {
          console.error("Erro ao registrar saída do usuário:", error)
          toast({
            title: "Erro ao registrar saída",
            description: "Não foi possível registrar a saída do usuário.",
            variant: "destructive",
          })
        }
      }
    }

    // Registrar o acesso quando o usuário estiver autenticado
    if (user && user.type !== "patient") {
      registerUserAccess()
    }

    // Registrar a saída quando o componente for desmontado
    return () => {
      registerUserExit()
    }
  }, [user, toast])

  return null // Este componente não renderiza nada na tela
}

