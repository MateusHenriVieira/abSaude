"use client"

import { ChevronDown, LogOut, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { logout } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { logUserActivity } from "@/lib/user-activity"

export function UserDropdown() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = user?.email === "santanamateus8979@gmail.com"

  const handleLogout = async () => {
    try {
      if (!user) return;

      // Validate user type
      const validUserType = (type: string | undefined): type is "doctor" | "nurse" | "admin" | "receptionist" | "patient" => {
        return type === "doctor" || type === "nurse" || type === "admin" || type === "receptionist" || type === "patient";
      };

      // Log do logout com informações do dispositivo
      if (user?.uid && user?.type && validUserType(user.type)) {
        await logUserActivity(
          user.uid,
          "logout",
          user.type, // Now TypeScript knows this is a valid user type
          user.clinicId,
          'logouts' // Usar subcoleção 'logouts' para atividades de logout
        );
      }

      toast({
        title: "Saindo...",
        description: "Aguarde enquanto finalizamos sua sessão.",
      });

      await logout();
      
      // Force clear any remaining state
      localStorage.clear();
      sessionStorage.clear();
      
      // Force navigation to login
      window.location.href = '/login';
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erro ao sair",
        description: "Ocorreu um erro ao tentar sair. Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const handleSettings = () => {
    router.push("/configuracoes")
  }

  const getUserType = (type?: string) => {
    if (isAdmin) return "Administrador Global"
    switch (type) {
      case "admin":
        return "Administrador"
      case "doctor":
        return "Médico"
      case "nurse":
        return "Enfermeiro"
      case "receptionist":
        return "Recepcionista"
      default:
        return type || "Usuário"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2">
          <Avatar>
            <AvatarImage src="/imgs/avatar.jpg" />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1">
            <div>
              <p className="text-sm font-medium">{user?.name || user?.userData?.name}</p>
              <p className="text-xs text-muted-foreground">{getUserType(user?.type)}</p>
            </div>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Minha Conta {isAdmin && "(Admin Global)"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
            <span className="text-xs font-medium text-muted-foreground">Nome</span>
            <span className="text-sm">{user?.name || user?.userData?.name}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
            <span className="text-xs font-medium text-muted-foreground">Função</span>
            <span className="text-sm">{getUserType(user?.type)}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <span className="text-sm">{user?.email}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
            <span className="text-xs font-medium text-muted-foreground">Posto</span>
            <span className="text-sm">{isAdmin ? "Acesso Global" : (user?.clinicName || "Não definido")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSettings}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

