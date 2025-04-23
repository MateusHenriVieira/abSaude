import ExcelJS from "exceljs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AppointmentStats {
  total: number;
  completed: number;
  canceled: number;
  rescheduled: number;
}

// Função para gerar relatório de posto em Excel
export async function generateClinicReport(
  clinicName: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  doctors: any[],
  consultations: any[],
  exams: any[],
  selectedDoctor?: string,
  reportType: "completo" | "medico" | "posto" = "completo"
) {
  const workbook = new ExcelJS.Workbook()

  // Informações do relatório
  workbook.creator = "Sistema de Saúde"
  workbook.lastModifiedBy = "Sistema de Saúde"
  workbook.created = new Date()
  workbook.modified = new Date()

  // Formatação do período para o título
  const periodText =
    startDate && endDate
      ? `${format(startDate, "dd/MM/yyyy", { locale: ptBR })} a ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`
      : "Todo o período"

  // Planilha de Resumo
  const summarySheet = workbook.addWorksheet("Resumo")

  // Título do relatório
  summarySheet.mergeCells("A1:F1")
  const titleCell = summarySheet.getCell("A1")
  titleCell.value = `Relatório do Posto: ${clinicName}`
  titleCell.font = { size: 16, bold: true }
  titleCell.alignment = { horizontal: "center" }

  // Período do relatório
  summarySheet.mergeCells("A2:F2")
  const periodCell = summarySheet.getCell("A2")
  periodCell.value = `Período: ${periodText}`
  periodCell.font = { size: 12, bold: true }
  periodCell.alignment = { horizontal: "center" }

  if (reportType === "medico") {
    const doctor = doctors.find(d => d.id === selectedDoctor);
    if (!doctor) {
      throw new Error("Médico não encontrado");
    }

    // Filtrar dados do médico
    consultations = consultations.filter(c => c.doctorId === selectedDoctor);
    exams = exams.filter(e => e.doctorId === selectedDoctor);

    // Layout específico para relatório do médico
    titleCell.value = `Relatório do Médico: ${doctor.firstName} ${doctor.lastName}`;
    summarySheet.addRow([]);
    summarySheet.addRow(["Posto de Saúde", clinicName]);
    summarySheet.addRow(["Período", periodText]);
    summarySheet.addRow([]);
    
    // Estatísticas específicas do médico
    summarySheet.addRow(["Consultas Realizadas", consultations.filter(c => c.status === 'Concluída').length]);
    summarySheet.addRow(["Exames Realizados", exams.filter(e => e.status === 'Concluído').length]);
    summarySheet.addRow(["Total de Atendimentos", consultations.length + exams.length]);
    
  } else {
    // Enriquecer dados com nomes ao invés de IDs
    consultations = consultations.map(consultation => ({
      ...consultation,
      doctorName: doctors.find(d => d.id === consultation.doctorId)
        ? `${doctors.find(d => d.id === consultation.doctorId)?.firstName} ${doctors.find(d => d.id === consultation.doctorId)?.lastName}`
        : 'N/A',
      clinicName: clinicName
    }));

    exams = exams.map(exam => ({
      ...exam,
      doctorName: doctors.find(d => d.id === exam.doctorId)
        ? `${doctors.find(d => d.id === exam.doctorId)?.firstName} ${doctors.find(d => d.id === exam.doctorId)?.lastName}`
        : 'N/A',
      clinicName: clinicName
    }));
  }

  // Espaçamento
  summarySheet.addRow([])

  // Resumo dos dados
  summarySheet.addRow(["Total de Médicos", doctors.length])
  summarySheet.addRow(["Total de Consultas", consultations.length])
  summarySheet.addRow(["Total de Exames", exams.length])

  // Estatísticas de consultas por status
  const consultationsByStatus = consultations.reduce((acc: any, consultation: any) => {
    acc[consultation.status] = (acc[consultation.status] || 0) + 1
    return acc
  }, {})

  summarySheet.addRow([])
  summarySheet.addRow(["Consultas por Status"])
  Object.entries(consultationsByStatus).forEach(([status, count]) => {
    summarySheet.addRow([status, count])
  })

  // Estatísticas de exames por status
  const examsByStatus = exams.reduce((acc: any, exam: any) => {
    acc[exam.status] = (acc[exam.status] || 0) + 1
    return acc
  }, {})

  summarySheet.addRow([])
  summarySheet.addRow(["Exames por Status"])
  Object.entries(examsByStatus).forEach(([status, count]) => {
    summarySheet.addRow([status, count])
  })

  // Estatísticas por status
  const stats = {
    consultations: {
      total: consultations.length,
      completed: consultations.filter(c => c.status === 'Concluída').length,
      canceled: consultations.filter(c => c.status === 'Cancelada').length,
      rescheduled: consultations.filter(c => c.status === 'Reagendada').length
    },
    exams: {
      total: exams.length,
      completed: exams.filter(e => e.status === 'Concluído').length,
      canceled: exams.filter(e => e.status === 'Cancelado').length,
      rescheduled: exams.filter(e => e.status === 'Reagendado').length
    }
  };

  // Adicionar estatísticas ao resumo
  summarySheet.addRow([]);
  summarySheet.addRow(["Estatísticas de Consultas"]);
  summarySheet.addRow(["Total", stats.consultations.total]);
  summarySheet.addRow(["Concluídas", stats.consultations.completed]);
  summarySheet.addRow(["Canceladas", stats.consultations.canceled]);
  summarySheet.addRow(["Reagendadas", stats.consultations.rescheduled]);

  summarySheet.addRow([]);
  summarySheet.addRow(["Estatísticas de Exames"]);
  summarySheet.addRow(["Total", stats.exams.total]);
  summarySheet.addRow(["Concluídos", stats.exams.completed]);
  summarySheet.addRow(["Cancelados", stats.exams.canceled]);
  summarySheet.addRow(["Reagendados", stats.exams.rescheduled]);

  // Ajustar largura das colunas
  summarySheet.columns.forEach((column) => {
    column.width = 20
  })

  // Planilha de Médicos
  const doctorsSheet = workbook.addWorksheet("Médicos")

  // Cabeçalho
  doctorsSheet.addRow(["Nome", "Especialidade", "Status", "Email", "Telefone"])

  // Estilo do cabeçalho
  doctorsSheet.getRow(1).font = { bold: true }
  doctorsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  }

  // Dados dos médicos
  doctors.forEach((doctor) => {
    doctorsSheet.addRow([
      `${doctor.firstName} ${doctor.lastName}`,
      doctor.specialties?.join(", ") || doctor.function || "Médico",
      doctor.status || "Ativo",
      doctor.email || "N/A",
      doctor.phone || "N/A",
    ])
  })

  // Ajustar largura das colunas
  doctorsSheet.columns.forEach((column) => {
    column.width = 20
  })

  // Planilha de Consultas
  const consultationsSheet = workbook.addWorksheet("Consultas")

  // Atualizar cabeçalhos baseado no tipo de relatório
  const consultationsHeaders = reportType === "medico"
    ? ["Paciente", "Data", "Hora", "Dia da Semana", "Tipo", "Status", "Observações"]
    : ["Paciente", "Data", "Hora", "Médico", "Posto", "Tipo", "Status", "Observações"];

  consultationsSheet.spliceRows(1, 1, consultationsHeaders);

  // Dados das consultas com formato apropriado
  consultations.forEach((consultation) => {
    const date = consultation.date;
    const rowData = reportType === "medico"
      ? [
          consultation.patientName,
          format(date, "dd/MM/yyyy", { locale: ptBR }),
          format(date, "HH:mm", { locale: ptBR }),
          format(date, "EEEE", { locale: ptBR }),
          consultation.type || "Regular",
          consultation.status || "Agendada",
          consultation.comments || ""
        ]
      : [
          consultation.patientName,
          format(date, "dd/MM/yyyy", { locale: ptBR }),
          format(date, "HH:mm", { locale: ptBR }),
          consultation.doctorName,
          consultation.clinicName,
          consultation.type || "Regular",
          consultation.status || "Agendada",
          consultation.comments || ""
        ];
    
    consultationsSheet.addRow(rowData);
  });

  // Ajustar largura das colunas
  consultationsSheet.columns.forEach((column) => {
    column.width = 20
  })

  // Planilha de Exames
  const examsSheet = workbook.addWorksheet("Exames")

  // Cabeçalho
  examsSheet.addRow([
    "Paciente",
    "Data",
    "Hora",
    "Dia da Semana",
    "Tipo de Exame",
    "Status",
    "Observações"
  ]);

  // Estilo do cabeçalho
  examsSheet.getRow(1).font = { bold: true }
  examsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  }

  // Dados dos exames
  exams.forEach((exam) => {
    const date = exam.date;
    examsSheet.addRow([
      exam.patientName,
      format(date, "dd/MM/yyyy", { locale: ptBR }),
      format(date, "HH:mm", { locale: ptBR }),
      format(date, "EEEE", { locale: ptBR }),
      exam.type || "N/A",
      exam.status || "Agendado",
      exam.comments || ""
    ]);
  });

  // Ajustar largura das colunas
  examsSheet.columns.forEach((column) => {
    column.width = 20
  })

  // Gerar o arquivo
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

  // Nome do arquivo
  const fileName = `Relatório_${clinicName.replace(/\s+/g, "_")}_${periodText.replace(/\//g, "-").replace(/\s+/g, "_")}.xlsx`

  // Salvar o arquivo usando a API do navegador
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

