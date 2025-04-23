import { FileText, Stethoscope, UserCheck, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function StatsCards({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Stethoscope className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Médicos</p>
            <p className="text-lg font-bold">{data.totalDoctors}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consultas</p>
            <p className="text-lg font-bold">{data.totalConsultations}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Finalizados</p>
            <p className="text-lg font-bold">{data.completedConsultations + data.completedExams}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Exames</p>
            <p className="text-lg font-bold">{data.totalExams}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

