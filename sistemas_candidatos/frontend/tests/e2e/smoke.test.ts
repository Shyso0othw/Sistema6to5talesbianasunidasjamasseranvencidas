import { test, expect, Page } from '@playwright/test';
const password = process.env.TEST_PASS || 'Synthetic!Password-4921';
async function login(page: Page, role='admin') {
  await page.goto('/');
  await page.getByPlaceholder('Nombre de usuario').fill('test_'+role);
  await page.getByPlaceholder('Tu contraseña').fill(password);
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await expect(page.getByRole('button',{name:/^Cerrar sesión$/i,includeHidden:true})).toBeAttached();
}
async function nav(page: Page,name: string) {await page.locator('aside').getByRole('button',{name,exact:true}).click();}
test.beforeEach(async({page})=>{page.on('pageerror',error=>{throw error;});});
test('1. Synthetic login and logout',async({page})=>{
  await login(page); await expect(page.getByRole('heading',{name:'Resumen del Sistema'})).toBeVisible();
  await page.getByRole('button',{name:'Cerrar Sesión'}).click();
  await expect(page.getByRole('button',{name:'Ingresar',exact:true})).toBeVisible();
});
test('2. Admin dashboard shows seeded counts',async({page})=>{
  await login(page); await expect(page.getByRole('heading',{name:'Resumen del Sistema'})).toBeVisible();
  await expect(page.locator('main')).toContainText('Estudiantes'); await expect(page.locator('main')).toContainText('4');
});
test('3. Student edit persists after F5',async({page})=>{
  await login(page); await page.getByRole('button',{name:'Estudiantes',exact:true}).click();
  await page.getByRole('row').filter({hasText:'98000300'}).getByRole('button',{name:'Editar estudiante'}).click();
  await page.getByPlaceholder('Nombre de calle',{exact:true}).fill('Calle Prueba');
  await page.getByPlaceholder('Opcional',{exact:true}).fill('No binario');
  await page.getByPlaceholder('Ej: +54 9 11 1234-5678 o 1112345678').first().fill('  +54 11 1234 5678  ');
  await page.getByRole('button',{name:'Guardar Cambios',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Gestión de Estudiantes'})).toBeVisible();
  await page.reload(); await page.getByRole('button',{name:'Estudiantes',exact:true}).click();
  await page.getByRole('row').filter({hasText:'98000300'}).getByRole('button',{name:'Editar estudiante'}).click();
  await expect(page.getByPlaceholder('Nombre de calle',{exact:true})).toHaveValue('Calle Prueba');
  await expect(page.getByPlaceholder('Opcional',{exact:true})).toHaveValue('No binario');
  await expect(page.getByPlaceholder('Ej: +54 9 11 1234-5678 o 1112345678').first()).toHaveValue('  +54 11 1234 5678  ');
});
test('4. Director sidebar persists across modules',async({page})=>{
  await login(page,'director');const before=await page.locator('aside nav').innerText();
  await expect(page.locator('aside')).not.toContainText('Carga Notas');await expect(page.locator('aside')).not.toContainText('Carga Asistencias');
  await nav(page,'Calendario');await expect(page.locator('aside nav')).toHaveText(before);
  await nav(page,'Comunicados');await expect(page.locator('aside nav')).toHaveText(before);
});
test('5. Professor only sees assigned courses',async({page})=>{
  await login(page,'profesor');await nav(page,'Mis Cursos');
  await expect(page.getByRole('heading',{name:'Mis Cursos'})).toBeVisible();
  await expect(page.locator('main')).toContainText('1 cursos a cargo');await expect(page.locator('main')).not.toContainText('7° A');
});
test('6. Professor selects assigned notes',async({page})=>{
  await login(page,'profesor');await nav(page,'Notas');
  await expect(page.getByRole('heading',{name:'Carga de Notas — Boletín'})).toBeVisible();
  await page.getByRole('combobox').nth(0).selectOption({index:1});await page.getByRole('combobox').nth(1).selectOption({index:1});
  await expect(page.getByRole('button',{name:'Guardar Notas',exact:true})).toBeVisible();await expect(page.locator('main')).toContainText('Estudiante ficticio');
  await page.getByRole('row').nth(1).getByTitle('Nota 1°C',{exact:true}).fill('8');await page.getByRole('button',{name:'Guardar Notas',exact:true}).click();await expect(page.locator('main')).toContainText('Calificaciones guardadas exitosamente');
  await page.reload();await nav(page,'Notas');await page.getByRole('combobox').nth(0).selectOption({index:1});await page.getByRole('combobox').nth(1).selectOption({index:1});await expect(page.getByRole('row').nth(1).getByTitle('Nota 1°C',{exact:true})).toHaveValue('8');
});
test('7. Professor calendar is read-only',async({page})=>{
  await login(page,'profesor');await nav(page,'Calendario');await expect(page.locator('main')).toContainText('Calendario');
  await expect(page.getByRole('button',{name:/Agregar Evento|Crear Evento|Editar Evento|Eliminar Evento/i})).toHaveCount(0);
});
test('8. Preceptor schedules load',async({page})=>{
  await login(page,'preceptor');await nav(page,'Horarios');await expect(page.locator('main')).toContainText('Horarios');await expect(page.locator('main')).toContainText('curso');
});
test('9. Library sidebar persists',async({page})=>{
  await login(page,'bibliotecario');const before=await page.locator('aside nav').innerText();
  await nav(page,'Comunicados');await expect(page.locator('aside nav')).toHaveText(before);
  await nav(page,'Calendario');await expect(page.locator('aside nav')).toHaveText(before);
});
test('10. EOE Buscar Cursos action works',async({page})=>{
  await login(page,'eoe');await page.getByRole('button',{name:/Buscar Cursos/}).click();await expect(page.locator('main')).toContainText('Cursos');
});
test('11. Mobile sidebar opens and closes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  await page.locator('button:has(svg.lucide-menu)').filter({visible:true}).click();await expect(page.locator('aside')).toHaveClass(/sh-sidebar--open/);
  await page.locator('.sh-sidebar-overlay').click({position:{x:380,y:300}});await expect(page.locator('aside')).not.toHaveClass(/sh-sidebar--open/);
});
test('12. Group selects three members and sends message',async({page})=>{
  await login(page);await page.getByRole('button',{name:'Abrir chat'}).click();await page.getByTitle('Nuevo grupo').click();
  await page.getByPlaceholder('Nombre del grupo...').fill('E2E grupo '+Date.now());
  for(const member of ['director','secretario','preceptor']){
    const modal=page.getByRole('dialog',{name:'Nuevo Grupo'});
    await modal.getByRole('button',{name:member==='preceptor'?'Preceptores':'Personal',exact:true}).click();
    await modal.getByPlaceholder('Buscar miembros...').fill('Ficticio '+member);await modal.getByText('Ficticio '+member,{exact:true}).click();
  }
  await expect(page.getByText('3 miembros seleccionados',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Crear Grupo',exact:true}).click();await expect(page.getByPlaceholder('Nombre del grupo...')).toHaveCount(0);
  await page.getByPlaceholder('Escribe un mensaje').fill('Mensaje E2E persistente');await page.getByPlaceholder('Escribe un mensaje').press('Enter');
  await expect(page.locator('.chat-messages-container')).toContainText('Mensaje E2E persistente');
});
test('13. Calendar rapid submit creates once',async({page})=>{
  await login(page,'director');await nav(page,'Calendario');await page.getByRole('button',{name:'Agregar Evento',exact:true}).click();
  await page.getByPlaceholder('Ej: Entrega de libretas').fill('E2E evento '+Date.now());await page.locator('input[type=date]').fill('2026-10-20');
  const requests:string[]=[];page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/api/eventos/'))requests.push(req.url());});
  await page.locator('form').filter({has:page.getByPlaceholder('Ej: Entrega de libretas')}).evaluate((form:HTMLFormElement)=>{form.requestSubmit();form.requestSubmit();form.requestSubmit();});
  await expect(page.getByPlaceholder('Ej: Entrega de libretas')).toHaveCount(0);expect(requests).toHaveLength(1);
});
