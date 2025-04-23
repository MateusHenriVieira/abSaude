"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getClinic } from "@/lib/firebase"
import { MapPin, Phone, Mail, Clock, Calendar } from "lucide-react"

interface ClinicDetailsProps {
  clinicId: string
}

export function ClinicDetails({ clinicId }: ClinicDetailsProps) {
  const [clinic, setClinic] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClinic = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("Buscando detalhes do posto com ID:", clinicId)
        const clinicData = await getClinic(clinicId)
        console.log("Dados do posto recebidos:", clinicData)
        setClinic(clinicData)
      } catch (error) {
        console.error("Erro ao buscar detalhes do posto:", error)
        setError("Não foi possível carregar os detalhes do posto. Tente novamente mais tarde.")
      } finally {
        setLoading(false)
      }
    }

    if (clinicId) {
      fetchClinic()
    } else {
      setError("ID do posto não fornecido")
      setLoading(false)
    }
  }, [clinicId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clinic) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-muted-foreground">Posto de saúde não encontrado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mapear dias da semana
  const weekDays = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{clinic.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{clinic.type}</p>
          </div>
          <Badge variant={clinic.status === "Ativo" ? "default" : "secondary"}>{clinic.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {clinic.description && (
          <div>
            <h3 className="text-sm font-medium mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground">{clinic.description}</p>
          </div>
        )}

        <Separator />

        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Endereço
          </h3>
          <div className="text-sm text-muted-foreground">
            <p>
              {clinic.address?.street || "Não informado"}, {clinic.address?.number || ""}
              {clinic.address?.complement && `, ${clinic.address.complement}`}
            </p>
            <p>
              {clinic.address?.neighborhood || ""}, {clinic.address?.city || ""} - {clinic.address?.state || ""}
            </p>
            {clinic.address?.zipCode && <p>CEP: {clinic.address.zipCode}</p>}
            <p>{clinic.address?.country || "Brasil"}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Dias de Funcionamento
            </h3>
            <div className="flex flex-wrap gap-2">
              {clinic.workingDays && clinic.workingDays.length > 0 ? (
                clinic.workingDays.map((day: string) => (
                  <Badge key={day} variant="outline">
                    {weekDays[day as keyof typeof weekDays] || day}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Não informado</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Horário de Funcionamento
            </h3>
            <p className="text-sm text-muted-foreground">
              {clinic.is24Hours ? (
                <Badge variant="outline">Aberto 24 horas</Badge>
              ) : clinic.workingHours ? (
                `${clinic.workingHours.start} às ${clinic.workingHours.end}`
              ) : (
                "Não informado"
              )}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" /> Contato
            </h3>
            <p className="text-sm text-muted-foreground">{clinic.phone || "Não informado"}</p>
          </div>

          {clinic.email && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </h3>
              <p className="text-sm text-muted-foreground">{clinic.email}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

