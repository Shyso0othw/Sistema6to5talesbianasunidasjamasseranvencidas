export const DIAS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE']

const FRANJAS_CB = [
  { inicio: '07:45', fin: '08:45' },
  { inicio: '08:45', fin: '09:45' },
  { inicio: '09:45', fin: '10:00', tipo: 'recreo' },
  { inicio: '10:00', fin: '11:00' },
  { inicio: '11:00', fin: '12:00' },
  { inicio: '12:00', fin: '13:10', tipo: 'receso' },
  { inicio: '13:10', fin: '14:10' },
  { inicio: '14:10', fin: '15:10' },
  { inicio: '15:10', fin: '15:25', tipo: 'recreo' },
  { inicio: '15:25', fin: '16:25' },
  { inicio: '16:25', fin: '17:25' },
  { inicio: '17:25', fin: '18:25' },
  { inicio: '18:25', fin: '19:25' },
  { inicio: '19:25', fin: '20:25' },
  { inicio: '20:25', fin: '21:25' },
]

const FRANJAS_CS = [
  { inicio: '07:45', fin: '08:45' },
  { inicio: '08:45', fin: '08:55', tipo: 'recreo' },
  { inicio: '08:55', fin: '09:55' },
  { inicio: '09:55', fin: '10:55' },
  { inicio: '10:55', fin: '11:05', tipo: 'recreo' },
  { inicio: '11:05', fin: '12:05' },
  { inicio: '12:05', fin: '13:10', tipo: 'receso' },
  { inicio: '13:10', fin: '14:10' },
  { inicio: '14:10', fin: '14:20', tipo: 'recreo' },
  { inicio: '14:20', fin: '15:20' },
  { inicio: '15:20', fin: '16:20' },
  { inicio: '16:20', fin: '16:30', tipo: 'recreo' },
  { inicio: '16:30', fin: '17:30' },
  { inicio: '17:30', fin: '18:30' },
  { inicio: '18:30', fin: '18:40', tipo: 'recreo' },
  { inicio: '18:40', fin: '19:40' },
  { inicio: '19:40', fin: '20:40' },
  { inicio: '20:40', fin: '20:50', tipo: 'recreo' },
  { inicio: '20:50', fin: '21:50' },
]

export function getFranjas(ciclo) {
  return ciclo === 'superior' ? FRANJAS_CS : FRANJAS_CB
}

export function getCiclo(curso) {
  const match = curso.match(/^(\d+)/)
  if (!match) return 'basico'
  const año = parseInt(match[1], 10)
  return año >= 4 ? 'superior' : 'basico'
}
