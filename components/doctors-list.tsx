import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const doctors = [
  {
    name: "José Lopes",
    role: "Ginecologista",
    status: "Férias",
    lastSeen: "12 Mar 2024",
    avatar: "/imgs/doctors/jose.jpg",
  },
  {
    name: "Wedson Leite",
    role: "Enfermeiro",
    status: "Trabalhando",
    lastSeen: "12 Mar 2024",
    avatar: "/imgs/doctors/wedson.jpg",
  },
  {
    name: "Edjosy Porfiro",
    role: "Dentista",
    status: "Trabalhando",
    lastSeen: "12 Mar 2024",
    avatar: "/imgs/doctors/edjosy.jpg",
  },
  {
    name: "Kelly Morgany",
    role: "Enfermeira",
    status: "Férias",
    lastSeen: "12 Mar 2024",
    avatar: "/imgs/doctors/kelly.jpg",
  },
]

export function DoctorsList() {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <div className="w-6" />
        <div className="flex-1 font-medium">Nome e atuação</div>
        <div className="w-20 font-medium">Status</div>
        <div className="w-24 font-medium">Entrou em</div>
      </div>
      {doctors.map((doctor) => (
        <div key={doctor.name} className="flex items-center gap-2">
          <input type="checkbox" className="h-3 w-3 rounded border-gray-300" />
          <div className="flex flex-1 items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={doctor.avatar} />
              <AvatarFallback>{doctor.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium">{doctor.name}</p>
              <p className="text-xs text-muted-foreground">- {doctor.role}</p>
            </div>
          </div>
          <div className="w-20">
            <Badge
              variant={doctor.status === "Trabalhando" ? "default" : "secondary"}
              className="text-[10px] px-1 py-0"
            >
              {doctor.status}
            </Badge>
          </div>
          <div className="w-24 text-xs text-muted-foreground">{doctor.lastSeen}</div>
        </div>
      ))}
    </div>
  )
}

