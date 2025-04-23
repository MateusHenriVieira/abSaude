"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { login, getClinics } from "@/lib/firebase"
import { auth } from "@/lib/firebaseConfig"
import { logUserActivity } from "@/lib/user-activity"

// Add this interface after imports
interface LoginResponse {
  clinicName?: string;
  isAdmin?: boolean;
  [key: string]: any;
}

export function LoginView() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClinic, setSelectedClinic] = useState<string>("")
  const [showClinics, setShowClinics] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    console.log("Auth app options:", auth.app.options)
    if (!auth.app.options.apiKey) {
      console.error("Firebase API Key is missing or invalid")
      toast({
        title: "Configuration Error",
        description: "There was an error with the app configuration. Please contact support.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const clinicsData = await getClinics()
        setClinics(clinicsData)
      } catch (error) {
        console.error("Error fetching clinics:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de postos de saúde.",
          variant: "destructive",
        })
      }
    }

    fetchClinics()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isAdmin = formData.email === "santanamateus8979@gmail.com";
      const user = await login(formData.email, formData.password) as LoginResponse;

      // Log do login com informações do dispositivo
      if (user?.uid && user?.type) {
        await logUserActivity(
          user.uid,
          "login",
          user.type,
          user.clinicId,
          'logins' // Usar subcoleção 'logins' para atividades de login
        );
      }

      // Ensure user ID is retrieved correctly
      if (!user?.id) {
        throw new Error("User ID is missing from the login response.");
      }

      // Log user activity
      await logUserActivity(user.id, "login", isAdmin ? "admin" : user.type, user.clinicId);

      if (isAdmin) {
        toast({
          title: "Bem-vindo, Administrador!",
          description: "Login realizado com sucesso. Você tem acesso global ao sistema.",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: user?.clinicName
            ? `Bem-vindo ao posto ${user.clinicName}`
            : "Bem-vindo ao sistema de saúde",
        });
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
      if (error.code === "auth/api-key-not-valid") {
        errorMessage = "Há um problema com a configuração do aplicativo. Entre em contato com o suporte.";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Email ou senha inválidos. Verifique suas credenciais e tente novamente.";
      }
      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-sky-100" />
        <Image
          src="/imgs/login.png"
          alt="Login Illustration"
          layout="fill"
          objectFit="cover"
          className="relative z-20"
          priority
        />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Log In</h1>
            <p className="text-sm text-muted-foreground">
              Bem-vindo de volta! 👋
              <br />
              Acesse sua conta
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Posto de Saúde</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowClinics(!showClinics)}
                >
                  {selectedClinic ? 
                    clinics.find(c => c.id === selectedClinic)?.name : 
                    "Selecione um posto de saúde"}
                  <span className="ml-2">▼</span>
                </Button>
                {showClinics && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    <div className="py-1">
                      {clinics.map((clinic) => (
                        <button
                          key={clinic.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setSelectedClinic(clinic.id)
                            setShowClinics(false)
                          }}
                        >
                          {clinic.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="Digite seu email"
                  type="email"
                  className="pl-9"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-9"
                  placeholder="Digite sua Senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Acessar"}
            </Button>
          </form>
          <div className="flex flex-col space-y-4">
            <Link href="/forgot-password" className="text-sm text-center text-muted-foreground hover:underline">
              Esqueceu a senha?
            </Link>
            <div className="text-sm text-center text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Crie aqui
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

