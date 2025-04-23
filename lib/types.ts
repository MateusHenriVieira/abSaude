export interface Clinic {
  id: string
  name: string
  address: string
  workingHours?: {
    start: string
    end: string
  }
  [key: string]: any
}
