"use client"

import { useAuth } from "@/contexts/auth-context"

/**
 * Hook para verificar permissões do usuário no sistema
 * Retorna funções que verificam se o usuário atual tem permissão para realizar determinadas ações
 */
export function usePermissions() {
  const { user } = useAuth()

  /**
   * Verifica se o usuário pode cadastrar médicos
   * Permissão: admin, recepcionista e enfermeiro
   */
  const canRegisterDoctors = () => {
    return user?.type === "admin" || user?.type === "receptionist" || user?.type === "nurse"
  }

  /**
   * Verifica se o usuário pode agendar consultas e exames
   * Permissão: admin, recepcionista, enfermeiro e médico
   */
  const canScheduleAppointments = () => {
    return user?.type === "admin" || user?.type === "receptionist" || user?.type === "nurse" || user?.type === "doctor"
  }

  /**
   * Verifica se o usuário pode gerenciar usuários
   * Permissão: admin
   */
  const canManageUsers = () => {
    return user?.type === "admin"
  }

  /**
   * Verifica se o usuário pode gerenciar postos de saúde
   * Permissão: admin
   */
  const canManageClinics = () => {
    return user?.type === "admin"
  }

  /**
   * Verifica se o usuário pode gerar relatórios
   * Permissão: admin, recepcionista e enfermeiro
   */
  const canGenerateReports = () => {
    return user?.type === "admin" || user?.type === "receptionist" || user?.type === "nurse"
  }

  /**
   * Verifica se o usuário tem acesso total ao sistema
   * Permissão: admin
   */
  const hasFullAccess = () => {
    return user?.type === "admin"
  }

  return {
    canRegisterDoctors,
    canScheduleAppointments,
    canManageUsers,
    canManageClinics,
    canGenerateReports,
    hasFullAccess,
  }
}

