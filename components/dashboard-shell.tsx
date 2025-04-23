"use client"

import type React from "react"

import {
  Calendar,
  ChevronLeftCircle,
  LayoutDashboard,
  Search,
  UserRound,
  FileText,
  Building2,
  Users,
  Activity,
  Bell,
  UserCircle,
  ListChecks,
  BarChart3,
  Speaker,
} from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useClinic } from "@/contexts/clinic-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserDropdown } from "@/components/user-dropdown"
import { SettingsDialog } from "@/components/settings-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LogoAB from "@/components/images/logo-ab.png" // Importando a logo
import { getClinics } from "@/lib/firebase"
import type { Clinic } from "@/lib/types"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

export function DashboardShell({ children }: { children?: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { selectedClinicId, setSelectedClinicId, setSelectedClinic } = useClinic()
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [isLoadingClinic, setIsLoadingClinic] = useState(false)

  useEffect(() => {
    // Base menu items for all users
    const baseMenuItems = [
      {
        id: "patients",
        label: "Pacientes",
        icon: UserCircle,
        path: "/pacientes",
      },
      {
        id: "consultations",
        label: "Consultas",
        icon: Calendar,
        path: "/consultas",
      },
      {
        id: "exams",
        label: "Exames",
        icon: FileText,
        path: "/exames",
      },
      {
        id: "patient-call",
        label: "Chamada de Pacientes",
        icon: Speaker,
        path: "/chamada-pacientes",
      },
      {
        id: "activities",
        label: "Atividades",
        icon: ListChecks,
        path: "/atividades", // Caminho correto para a rota de atividades
      },
      {
        id: "notifications",
        label: "Notificações",
        icon: Bell,
        path: "/notificacoes",
      }
    ];

    // Additional items for admin and receptionist
    const adminMenuItems = [
      {
        id: "dashboard",
        label: "Painel de Controle",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      {
        id: "clinics",
        label: "Postinhos",
        icon: Building2,
        path: "/postinhos",
      },
      {
        id: "doctors",
        label: "Médicos",
        icon: UserRound,
        path: "/medicos",
      },
      {
        id: "users",
        label: "Usuários",
        icon: Users,
        path: "/usuarios",
      },
      {
        id: "register",
        label: "Novo Usuário",
        icon: Users,
        path: "/register",
      },
      {
        id: "reports",
        label: "Relatórios",
        icon: BarChart3,
        path: "/relatorios",
      },
    ];

    // Set menu items based on user type
    if (user?.type === 'admin' || user?.type === 'receptionist') {
      setMenuItems([...adminMenuItems, ...baseMenuItems]);
    } else {
      setMenuItems(baseMenuItems);
    }
  }, [user?.type]); // Add user.type as dependency

  useEffect(() => {
    const loadClinics = async () => {
      if (user?.type === 'admin') {
        const fetchedClinics = await getClinics()
        setClinics(fetchedClinics)
      }
    }
    loadClinics()
  }, [user?.type])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implementar a lógica de busca global aqui
    console.log("Searching for:", searchTerm)
    // Redirecionar para uma página de resultados ou filtrar os dados atuais
  }

  const handleClinicChange = async (clinicId: string) => {
    setIsLoadingClinic(true)
    setSelectedClinicId(clinicId)
    const clinic = clinics.find(c => c.id === clinicId)
    setSelectedClinic(clinicId === "all" ? null : (clinic || null))
    // Give time for the state to update and loading to show
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoadingClinic(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isLoadingClinic && (
        <LoadingOverlay message={`Carregando dados do posto ${clinics.find(c => c.id === selectedClinicId)?.name || 'selecionado'}...`} />
      )}
      {/* Sidebar */}
      <aside
        className={`relative transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-24" : "w-64"
        } border-r bg-background`}
      >
        <div className="flex h-full flex-col">
          <div className={`p-4 flex items-center justify-center`}>
            <Image
              src={LogoAB}
              alt="Águas Belas Logo"
              width={sidebarCollapsed ? 150 : 150} // Ajusta o tamanho da logo
              height={sidebarCollapsed ? 40 : 30}
              className={`transition-all duration-300 ${sidebarCollapsed ? "-mb-20" : "-mb-20"}`} // Reduz a margem inferior
            />
          </div>
          <nav className={`space-y-1 ${sidebarCollapsed ? "mt-20" : "mt-[77px]"}`}>
            {menuItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 ${
                  pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                } ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
              >
                <item.icon size={sidebarCollapsed ? 24 : 20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-md"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <ChevronLeftCircle className={`h-6 w-6 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </Button>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-hidden">
        {/* Cabeçalho */}
        <header className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-4">
            {user?.type === 'admin' && (
              <Select
                value={selectedClinicId}
                onValueChange={handleClinicChange}
                defaultValue="all"
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar posto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os postos</SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-64 pl-9"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsDropdown />
            <UserDropdown />
          </div>
        </header>

        {/* Conteúdo */}
        <div className="h-[calc(100vh-64px)] overflow-auto p-4">{children}</div>
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

