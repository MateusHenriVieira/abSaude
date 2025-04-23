"use client"

import { useState, useEffect } from "react"
import { Search, UserPlus, Edit, Trash2, AlertTriangle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getUsers, addUser, getClinics, updateUser, deleteUser } from "@/lib/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserDetailsDialog } from "./user-details-dialog"
import { usePermissions } from "@/hooks/use-permissions"

export function UsersView() {
  const [users, setUsers] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isViewingUser, setIsViewingUser] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { toast } = useToast()
  const { hasFullAccess } = usePermissions()

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    type: "doctor" as "admin" | "doctor" | "nurse" | "receptionist",
    clinicId: "",
  })

  const [editingUser, setEditingUser] = useState<any>(null)
  const [viewingUser, setViewingUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [usersData, clinicsData] = await Promise.all([getUsers(), getClinics()])
        setUsers(usersData)
        setClinics(clinicsData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar a lista de usuários e postos.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleAddUser = async () => {
    try {
      await addUser(newUser)
      setIsAddingUser(false)
      setNewUser({
        name: "",
        email: "",
        password: "",
        type: "doctor",
        clinicId: "",
      })
      const updatedUsers = await getUsers()
      setUsers(updatedUsers)
      toast({
        title: "Usuário adicionado",
        description: "O novo usuário foi cadastrado com sucesso.",
      })
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: "Erro ao adicionar usuário",
        description: "Não foi possível cadastrar o novo usuário.",
        variant: "destructive",
      })
    }
  }

  const handleEditUser = async () => {
    try {
      await updateUser(editingUser.id, editingUser, editingUser.clinicId)
      setIsEditingUser(false)
      setEditingUser(null)
      const updatedUsers = await getUsers()
      setUsers(updatedUsers)
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      })
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Erro ao atualizar usuário",
        description: "Não foi possível atualizar as informações do usuário.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async () => {
    try {
      await deleteUser(editingUser.id, editingUser.clinicId)
      setIsDeletingUser(false)
      setEditingUser(null)
      const updatedUsers = await getUsers()
      setUsers(updatedUsers)
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      })
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setDeleteError(error.message || "Não foi possível excluir o usuário.")
    }
  }

  const handleViewUser = (user: any) => {
    setViewingUser(user)
    setIsViewingUser(true)
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários do sistema</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Total de Usuários ({filteredUsers.length})</h2>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Tipo de Usuário</Label>
                    <Select
                      value={newUser.type}
                      onValueChange={(value: "admin" | "doctor" | "nurse" | "receptionist") =>
                        setNewUser({ ...newUser, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="doctor">Médico</SelectItem>
                        <SelectItem value="nurse">Enfermeiro</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clinic">Posto de Saúde</Label>
                    <Select
                      value={newUser.clinicId}
                      onValueChange={(value) => setNewUser({ ...newUser, clinicId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingUser(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUser}>Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr] gap-4 border-b bg-muted/50 p-4 font-medium">
          <div>Nome</div>
          <div>Email</div>
          <div>Tipo</div>
          <div>Posto de Saúde</div>
          <div>Ações</div>
        </div>
        <div className="divide-y">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))
            : filteredUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr] gap-4 p-4">
                  <div className="cursor-pointer hover:text-primary" onClick={() => handleViewUser(user)}>
                    {user.name}
                  </div>
                  <div>{user.email}</div>
                  <div>{user.type}</div>
                  <div>{clinics.find((clinic) => clinic.id === user.clinicId)?.name || "N/A"}</div>
                  <div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user)
                          setIsEditingUser(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setEditingUser(user)
                          setIsDeletingUser(true)
                          setDeleteError(null)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <>
        <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              {editingUser && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Tipo de Usuário</Label>
                    <Select
                      value={editingUser.type}
                      onValueChange={(value: "admin" | "doctor" | "nurse" | "receptionist") =>
                        setEditingUser({ ...editingUser, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="doctor">Médico</SelectItem>
                        <SelectItem value="nurse">Enfermeiro</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-clinic">Posto de Saúde</Label>
                    <Select
                      value={editingUser.clinicId}
                      onValueChange={(value) => setEditingUser({ ...editingUser, clinicId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditingUser(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditUser}>Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeletingUser} onOpenChange={setIsDeletingUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="py-4">
                <p>
                  Tem certeza que deseja excluir o usuário <strong>{editingUser.name}</strong>?
                </p>
                <p className="text-sm text-muted-foreground mt-2">Esta ação não pode ser desfeita.</p>

                {deleteError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeletingUser(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>

      {/* Diálogo de detalhes do usuário */}
      {viewingUser && (
        <UserDetailsDialog userId={viewingUser.id} open={isViewingUser} onOpenChange={setIsViewingUser} />
      )}
    </div>
  )
}

