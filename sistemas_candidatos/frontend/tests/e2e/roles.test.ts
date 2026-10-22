import { test, expect } from '@playwright/test';
const roles=['secretario','familia','ematp','estudiante','vicedirector','auxiliar','jefe_area','jefe_departamento','jefe_preceptores'];
for(const role of roles) test('Role entry and logout: '+role,async({page})=>{
  await page.goto('/');await page.getByPlaceholder('Nombre de usuario').fill('test_'+role);await page.getByPlaceholder('Tu contraseña').fill(process.env.TEST_PASS||'Synthetic!Password-4921');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await expect(page.locator('main')).toBeVisible();await expect(page.locator('aside')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Rol no reconocido');
  await page.getByRole('button',{name:/^Cerrar sesión$/i}).click();await expect(page.getByRole('button',{name:'Ingresar',exact:true})).toBeVisible();
});
