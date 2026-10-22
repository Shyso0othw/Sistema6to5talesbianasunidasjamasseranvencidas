export function exportHorariosCSV(horarios, franjas, DIAS_COMPLETO, filename = 'horarios.csv') {
  if (!horarios || horarios.length === 0) {
    alert('No hay horarios para exportar.');
    return;
  }

  const header = ['Curso', 'Materia', 'Profesor', 'Día', 'Inicio', 'Fin', 'Aula'];
  
  const rows = horarios.map(h => {
    const dia = DIAS_COMPLETO[h.dia] || h.dia;
    const franjaObj = franjas[h.franja] || {};
    const inicio = franjaObj.inicio || '-';
    const fin = franjaObj.fin || '-';
    
    return [
      h.curso || '',
      h.materia || '',
      h.profesor || '',
      dia,
      inicio,
      fin,
      h.aula || ''
    ].map(v => `"${v}"`);
  });

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
