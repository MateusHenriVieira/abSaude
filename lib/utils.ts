import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export async function getNextExamId(): Promise<string> {
  // This is a placeholder implementation.
  // In a real-world scenario, you would likely fetch the last exam ID from your database
  // and increment it.  This example just generates a random ID.
  const randomId = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")
  return `EXM-${randomId}`
}

export function formatHour(hour: any): string {
  // Handle undefined/null values
  if (hour === undefined || hour === null) {
    return "--:--"
  }

  // Convert to string if not already
  const hourStr = String(hour)

  // Handle short strings
  if (hourStr.length < 4) {
    return hourStr
  }

  try {
    return `${hourStr.substring(0, 2)}:${hourStr.substring(2, 4)}`
  } catch (error) {
    console.error("Error formatting hour:", error, "Value received:", hour)
    return String(hour)
  }
}

