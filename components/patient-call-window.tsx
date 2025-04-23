"use client"

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PatientCallWindowProps {
  clinicName: string
  appointment: {
    patientName: string
    doctorName: string
    room?: string
    date: Date
    type: 'consultation' | 'exam'
  }
}

export function openCallWindow(clinicName: string, appointment: any) {
  const width = 800
  const height = 600
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2

  const windowFeatures = `width=${width},height=${height},left=${left},top=${top}`
  const newWindow = window.open('', '_blank', windowFeatures)
  
  if (newWindow) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chamada de Pacientes - ${clinicName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8f9fa;
            }
            .header {
              text-align: center;
              padding: 20px;
              background: #fff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            }
            .clinic-name {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              color: #1a1a1a;
            }
            .patient-info {
              background: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .info-row {
              margin: 10px 0;
              font-size: 18px;
            }
            .label {
              font-weight: 500;
              color: #666;
            }
            .value {
              font-weight: bold;
              color: #1a1a1a;
            }
            .button {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: background 0.2s;
            }
            .button:hover {
              background: #1d4ed8;
            }
            .button svg {
              width: 20px;
              height: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="clinic-name">${clinicName}</h1>
          </div>
          <div class="patient-info">
            <div class="info-row">
              <span class="label">Paciente:</span>
              <span class="value">${appointment.patientName}</span>
            </div>
            <div class="info-row">
              <span class="label">Médico:</span>
              <span class="value">${appointment.doctorName}</span>
            </div>
            <div class="info-row">
              <span class="label">Sala:</span>
              <span class="value">${appointment.room || 'Não especificada'}</span>
            </div>
            <div class="info-row">
              <span class="label">Horário:</span>
              <span class="value">${format(new Date(appointment.date), "HH:mm", { locale: ptBR })}</span>
            </div>
            <div class="info-row">
              <span class="label">Tipo:</span>
              <span class="value">${appointment.type === 'consultation' ? 'Consulta' : 'Exame'}</span>
            </div>
            <button 
              class="button"
              onclick="speakAnnouncement()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
              Anunciar Paciente
            </button>
          </div>
          <script>
            function speakAnnouncement() {
              const msg = new SpeechSynthesisUtterance();
              msg.lang = 'pt-BR';
              msg.text = 'Atenção! ' + 
                        '${appointment.patientName}, ' +
                        'favor dirigir-se à sala ${appointment.room || "de atendimento"} ' +
                        'para ${appointment.type === 'consultation' ? 'consulta' : 'exame'} ' +
                        'com ${appointment.doctorName}';
              window.speechSynthesis.speak(msg);
            }
          </script>
        </body>
      </html>
    `)
  }
}
