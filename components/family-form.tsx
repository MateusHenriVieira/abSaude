"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"

// Schema de validação para o formulário de família
const familySchema = z.object({
  familyName: z.string().min(1, "Nome da família é obrigatório"),
  address: z.string().optional(),
  description: z.string().optional(),
  members: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Nome do membro é obrigatório"),
        age: z.number().min(0, "Idade deve ser maior ou igual a 0").optional(),
        relationship: z.string().optional(),
      }),
    )
    .optional(),
})

export function FamilyForm() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof familySchema>>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      familyName: "",
      address: "",
      description: "",
      members: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  })

  async function onSubmit(data: z.infer<typeof familySchema>) {
    try {
      // Aqui você pode adicionar a lógica para salvar os dados da família no Firebase
      console.log("Dados da família:", data)
      toast({
        title: "Família cadastrada",
        description: "A família foi cadastrada com sucesso.",
      })
      form.reset()
      setOpen(false)
    } catch (error) {
      console.error("Erro ao cadastrar família:", error)
      toast({
        title: "Erro ao cadastrar família",
        description: "Ocorreu um erro ao cadastrar a família. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Cadastrar Família</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Família</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar uma nova família e seus membros.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="familyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Família</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da família" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o endereço da família" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Digite uma descrição para a família" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Membros da Família</FormLabel>
              <ul className="space-y-2">
                {fields.map((field, index) => (
                  <li key={field.id} className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name={`members.${index}.name` as const}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do membro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`members.${index}.age` as const}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormLabel>Idade</FormLabel>
                          <FormControl>
                            <Input placeholder="Idade" type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`members.${index}.relationship` as const}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormLabel>Parentesco</FormLabel>
                          <FormControl>
                            <Input placeholder="Parentesco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ id: uuidv4(), name: "", age: 0, relationship: "" })}
              >
                Adicionar Membro
              </Button>
            </div>

            <Button type="submit" className="w-full">
              Cadastrar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

