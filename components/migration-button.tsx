"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { migrateToNewStructure } from "@/lib/firebase-migration"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"

export function MigrationButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { toast } = useToast()

  const handleMigration = async () => {
    try {
      setIsLoading(true)
      setMigrationStatus("idle")
      setErrorMessage("")

      await migrateToNewStructure()

      setMigrationStatus("success")
      toast({
        title: "Migração concluída",
        description: "Os dados foram migrados com sucesso para a nova estrutura.",
      })
    } catch (error) {
      console.error("Erro durante a migração:", error)
      setMigrationStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido durante a migração")
      toast({
        title: "Erro na migração",
        description: "Ocorreu um erro durante a migração dos dados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Migrar para Nova Estrutura</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Migração de Dados</DialogTitle>
          <DialogDescription>
            Esta operação irá migrar os dados existentes para a nova estrutura do Firebase. Este processo pode levar
            alguns minutos.
          </DialogDescription>
        </DialogHeader>

        {migrationStatus === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Migração concluída</AlertTitle>
            <AlertDescription className="text-green-700">
              Todos os dados foram migrados com sucesso para a nova estrutura.
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus === "error" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na migração</AlertTitle>
            <AlertDescription>{errorMessage || "Ocorreu um erro durante a migração dos dados."}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleMigration} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              "Iniciar Migração"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

