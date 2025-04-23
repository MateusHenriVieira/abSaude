import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Constantes exportadas para uso em outros arquivos
export const HORARIO_FUNCIONAMENTO = {
  start: "08:00",
  end: "16:00"
} as const;

export const DIAS_FUNCIONAMENTO = [
  'segunda', 'terca', 'quarta', 'quinta', 'sexta'
] as const;

export interface ClinicSchedule {
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  is24Hours?: boolean;
}

export async function getClinicSchedule(clinicId: string): Promise<ClinicSchedule> {
  try {
    const scheduleRef = doc(db, `clinics/${clinicId}/funcionamento/schedule`);
    const scheduleDoc = await getDoc(scheduleRef);
    
    // Se não existir documento ou não for 24h, retorna configuração padrão
    if (!scheduleDoc.exists() || !scheduleDoc.data().is24Hours) {
      return {
        workingDays: [...DIAS_FUNCIONAMENTO], // Converte para array mutável
        workingHours: HORARIO_FUNCIONAMENTO,
        is24Hours: false
      };
    }

    const data = scheduleDoc.data();
    return {
      workingDays: data.workingDays || [...DIAS_FUNCIONAMENTO], // Converte para array mutável
      workingHours: data.workingHours || HORARIO_FUNCIONAMENTO,
      is24Hours: true
    };
  } catch (error) {
    console.error("Erro ao carregar horário:", error);
    // Em caso de erro, retorna configuração padrão
    return {
      workingDays: [...DIAS_FUNCIONAMENTO], // Converte para array mutável
      workingHours: HORARIO_FUNCIONAMENTO,
      is24Hours: false
    };
  }
}
