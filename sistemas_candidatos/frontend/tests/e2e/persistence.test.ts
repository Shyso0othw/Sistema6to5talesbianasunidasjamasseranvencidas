import {test,expect,Page} from '@playwright/test';
async function login(page:Page,role:string){await page.goto('/');await page.getByPlaceholder('Nombre de usuario').fill('test_'+role);await page.getByPlaceholder('Tu contraseña').fill(process.env.TEST_PASS||'Synthetic!Password-4921');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await expect(page.locator('aside')).toBeVisible();}
async function nav(page:Page,name:string){await page.locator('aside').getByRole('button',{name,exact:true}).click();}
test('Attendance saves exact state and family can read it after reload',async({page})=>{
  await login(page,'preceptor');await nav(page,'Asistencia');
  await page.getByLabel('Curso',{exact:true}).selectOption({index:1});await page.getByLabel('Fecha',{exact:true}).fill('2026-10-15');
  await page.getByRole('row').nth(1).getByRole('combobox').selectOption('Media Falta');
  await page.getByRole('button',{name:'Guardar asistencia',exact:true}).click();await expect(page.getByRole('status')).toContainText('2 asistencias guardadas');
  await page.reload();await nav(page,'Asistencia');await page.getByLabel('Curso',{exact:true}).selectOption({index:1});await page.getByLabel('Fecha',{exact:true}).fill('2026-10-15');
  await expect(page.getByRole('row').nth(1).getByRole('combobox')).toHaveValue('Media Falta');
  await page.getByRole('button',{name:/^Cerrar sesión$/i}).click();await login(page,'familia');await page.locator('.fd-selector-btn').click();await page.locator('.fd-selector-option').filter({hasText:'Estudiante ficticio 1'}).click();await nav(page,'Asistencia');await expect(page.locator('main')).toContainText('Mitad de falta');
});
test('Book create and edit metadata persist after reload',async({page})=>{
  await login(page,'bibliotecario');await nav(page,'Agregar Libro');const title='E2E Libro '+Date.now();
  await page.getByPlaceholder('Título del libro').fill(title);await page.getByPlaceholder('Autor',{exact:true}).fill('Autor ficticio');await page.getByPlaceholder('Editorial',{exact:true}).fill('Editorial ficticia');
  await page.getByPlaceholder('2024').fill('2026');await page.getByPlaceholder('Ej: Estante A1').fill('Estante original');await page.getByRole('button',{name:'Guardar Libro',exact:true}).click();
  await expect(page.getByPlaceholder('Título del libro')).toHaveCount(0);await page.reload();await nav(page,'Todos los Libros');
  await page.locator('.bi-libro-completo-card').filter({hasText:title}).getByRole('button',{name:'Editar libro'}).click();
  await expect(page.getByPlaceholder('Editorial',{exact:true})).toHaveValue('Editorial ficticia');await page.getByPlaceholder('Ej: Estante A1').fill('Estante editado');await page.getByRole('button',{name:'Guardar Libro',exact:true}).click();
  await expect(page.getByPlaceholder('Título del libro')).toHaveCount(0);await page.reload();await nav(page,'Todos los Libros');await expect(page.locator('.bi-libro-completo-card').filter({hasText:title})).toContainText('Estante editado');
});
test('Notification read persists through reload and logout',async({page,request})=>{
  const auth=await request.post('/api/login/',{data:{username:'test_admin',password:process.env.TEST_PASS||'Synthetic!Password-4921'}});expect(auth.ok()).toBeTruthy();
  const token=(await auth.json()).token;const created=await request.post('/api/comunicados/',{headers:{Authorization:'Bearer '+token},data:{titulo:'E2E notificación '+Date.now(),cuerpo:'Notificación ficticia para persistencia',tipo_destinatario:'Todos',cursos_seleccionados:[]}});expect(created.ok()).toBeTruthy();
  await login(page,'ematp');await page.getByRole('button',{name:'Notificaciones',exact:true}).click();
  const readAll=page.getByRole('button',{name:'Marcar todas leídas',exact:true});
  await expect(readAll).toBeVisible();await readAll.click();await expect(readAll).toHaveCount(0);
  await page.reload();await page.getByRole('button',{name:'Notificaciones',exact:true}).click();await expect(readAll).toHaveCount(0);
  await page.getByRole('button',{name:'Notificaciones',exact:true}).click();await page.getByRole('button',{name:/^Cerrar sesión$/i}).click();await login(page,'ematp');await page.getByRole('button',{name:'Notificaciones',exact:true}).click();await expect(readAll).toHaveCount(0);
});
