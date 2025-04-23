"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getDoctorById } from "@/lib/firebase"
import { Phone, Mail, Clock, Calendar, Stethoscope } from "lucide-react"

interface DoctorDetailsProps {
  doctorId: string
  clinicId: string // Adicionar clinicId como propriedade obrigatória
}

export function DoctorDetails({ doctorId, clinicId }: DoctorDetailsProps) {
  const [doctor, setDoctor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const doctorData = await getDoctorById(doctorId, clinicId) // Passar clinicId
        setDoctor(doctorData)
      } catch (error) {
        console.error("Erro ao buscar detalhes do médico:", error)
      } finally {
        setLoading(false)
      }
    }

    if (doctorId && clinicId) { // Garantir que ambos os valores estejam disponíveis
      fetchDoctor()
    }
  }, [doctorId, clinicId])

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

  if (!doctor) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-muted-foreground">Médico não encontrado</p>
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
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={doctor.profileImageUrl || ""} alt={`${doctor.firstName} ${doctor.lastName}`} />
              <AvatarFallback>{`${doctor.firstName?.charAt(0) || ""}${doctor.lastName?.charAt(0) || ""}`}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">
                {doctor.firstName} {doctor.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {doctor.medicalId && `CRM: ${doctor.medicalId}`}
                {doctor.isTemporary && <Badge className="ml-2">Temporário</Badge>}
              </p>
            </div>
          </div>
          <Badge variant={doctor.status === "Ativo" ? "default" : "secondary"}>{doctor.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Especialidades
          </h3>
          <div className="flex flex-wrap gap-2">
            {doctor.specialties && doctor.specialties.length > 0 ? (
              doctor.specialties.map((specialty: string) => (
                <Badge key={specialty} variant="outline">
                  {specialty}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Não informado</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Dias de Trabalho
            </h3>
            <div className="flex flex-wrap gap-2">
              {doctor.workingDays && doctor.workingDays.length > 0 ? (
                doctor.workingDays.map((day: string) => (
                  <Badge key={day} variant="outline">
                    {weekDays[day as keyof typeof weekDays]}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Não informado</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Horário de Trabalho
            </h3>
            <p className="text-sm text-muted-foreground">
              {doctor.is24Hours ? (
                <Badge variant="outline">Disponível 24 horas</Badge>
              ) : doctor.workingHours ? (
                `${doctor.workingHours.start} às ${doctor.workingHours.end}`
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
            <p className="text-sm text-muted-foreground">{doctor.phone}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </h3>
            <p className="text-sm text-muted-foreground">{doctor.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

