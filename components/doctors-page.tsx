"use client"

import { Bell, ChevronDown, Filter, Home, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const doctors = [
  {
    id: "2312",
    name: "José Lopes",
    role: "Ginecologista",
    avatar: "/imgs/doctors/jose.jpg",
    date: "12 Mar-2024",
    department: "Maria Elisangela",
    status: "Folga",
  },
  {
    id: "2313",
    name: "Wedson Leite",
    role: "Enfermeiro",
    avatar: "/imgs/doctors/wedson.jpg",
    date: "12 Mar-2024",
    department: "Maria Elisangela",
    status: "Trabalhando",
  },
  {
    id: "2314",
    name: "Edjosy Porfiro",
    role: "Dentista",
    avatar: "/imgs/doctors/edjosy.jpg",
    date: "12 Mar-2024",
    department: "Maria Elisangela",
    status: "Trabalhando",
  },
  {
    id: "2315",
    name: "Kelly Morgany",
    role: "Enfermeira",
    avatar: "/imgs/doctors/kelly.jpg",
    date: "11 Mar-2024",
    department: "Maria Elisangela",
    status: "Trabalhando",
  },
  {
    id: "2316",
    name: "Mateus Vieira",
    role: "Cirurgião",
    avatar: "/imgs/doctors/mateus.jpg",
    date: "11 Mar-2024",
    department: "Maria Elisangela",
    status: "Folga",
  },
  {
    id: "2317",
    name: "Edjosy Porfiro",
    role: "Dentista",
    avatar: "/imgs/doctors/edjosy.jpg",
    date: "10 Mar-2024",
    department: "Maria Elisangela",
    status: "Folga",
  },
  {
    id: "2318",
    name: "Mateus Vieira",
    role: "Cirurgião",
    avatar: "/imgs/doctors/mateus.jpg",
    date: "10 Mar-2024",
    department: "Maria Elisangela",
    status: "Folga",
  },
  {
    id: "2319",
    name: "José Lopes",
    role: "Ginecologista",
    avatar: "/imgs/doctors/jose.jpg",
    date: "10 Mar-2024",
    department: "Maria Elisangela",
    status: "Trabalhando",
  },
  {
    id: "2320",
    name: "Wedson Leite",
    role: "Enfermeiro",
    avatar: "/imgs/doctors/wedson.jpg",
    date: "10 Mar-2024",
    department: "Maria Elisangela",
    status: "Trabalhando",
  },
  {
    id: "2321",
    name: "José Lopes",
    role: "Ginecologista",
    avatar: "/imgs/doctors/jose.jpg",
    date: "09 Mar-2024",
    department: "Maria Elisangela",
    status: "Folga",
  },
]

export function DoctorsPage() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <Image src="/imgs/logo.png" alt="Águas Belas Logo" width={150} height={60} />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src="/imgs/avatar.jpg" />
              <AvatarFallback>MV</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <div>
                <p className="text-sm font-medium">Mateus Vieira</p>
                <p className="text-xs text-muted-foreground">Gestor</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-primary">Saúde na Mão</h2>
            </div>
            <nav className="space-y-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/medicos" className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary">
                <Home className="h-4 w-4" />
                Médicos
              </Link>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Rede de Médicos</h1>
              <p className="text-sm text-muted-foreground">Lista de médicos e seu respectivo local.</p>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">Total Médicos (12)</h2>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="default">Cadastrar +</Button>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="w-64 pl-8" placeholder="Buscar" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 border-b bg-muted/50 p-4 font-medium">
                <div>Employee Name & Designation</div>
                <div>Méd. ID</div>
                <div>Entrou Em</div>
                <div>Postinho</div>
                <div>Status</div>
              </div>
              <div className="divide-y">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback>{doctor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{doctor.name}</div>
                        <div className="text-sm text-muted-foreground">- {doctor.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center">{doctor.id}</div>
                    <div className="flex items-center">{doctor.date}</div>
                    <div className="flex items-center">{doctor.department}</div>
                    <div className="flex items-center">
                      <Badge variant={doctor.status === "Trabalhando" ? "default" : "secondary"}>{doctor.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

