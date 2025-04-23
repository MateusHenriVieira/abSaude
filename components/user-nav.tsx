import { logUserActivity } from "@/lib/user-activity";
import { useAuth } from "@/contexts/auth-context"; // Fix auth context import
import { useRouter } from "next/navigation"; // Fix router import for App Router
import { useToast } from "@/components/ui/use-toast"; // Fix toast import
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Log the logout activity before actually logging out
      if (user?.uid && user?.type && (
        user.type === "admin" ||
        user.type === "doctor" ||
        user.type === "nurse" ||
        user.type === "receptionist" ||
        user.type === "patient"
      )) {
        await logUserActivity(
          user.uid,
          "logout",
          user.type,
          user.clinicId
        );
      }
      
      // Perform logout
      await logout();
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Erro ao sair",
        description: "Não foi possível finalizar sua sessão corretamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenuItem onClick={handleLogout}>
      Sair
    </DropdownMenuItem>
  );
}