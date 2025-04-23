interface DailyScheduleProps {
  consultations: any[]
  exams: any[]
}

export function DailySchedule({ consultations, exams }: DailyScheduleProps) {
  const today = new Date()
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
  const currentWeekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - today.getDay() + i)
    return {
      day: date.getDate(),
      current: date.toDateString() === today.toDateString(),
    }
  })

  const allActivities = [
    ...consultations.map((c) => ({ ...c, type: "appointment" })),
    ...exams.map((e) => ({ ...e, type: "exam" })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-muted-foreground">
            {day}
          </div>
        ))}
        {currentWeekDates.map((date) => (
          <div
            key={date.day}
            className={`rounded-full p-2 ${date.current ? "bg-primary text-primary-foreground" : ""}`}
          >
            {date.day}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {allActivities.map((activity, index) => (
          <div key={index}>
            <h3 className="mb-2 font-medium">{new Date(activity.date).toLocaleDateString("pt-BR")}</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border p-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    activity.type === "exam"
                      ? "bg-blue-500"
                      : activity.type === "appointment"
                        ? "bg-orange-500"
                        : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="font-medium">{activity.title || (activity.type === "exam" ? "Exame" : "Consulta")}</p>
                  <p className="text-sm text-muted-foreground">{activity.patientName}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">Acompanhe todas as atividades pendentes acima.</p>
    </div>
  )
}

