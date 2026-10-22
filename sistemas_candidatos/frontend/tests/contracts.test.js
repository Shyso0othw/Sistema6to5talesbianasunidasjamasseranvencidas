import test from 'node:test'
import assert from 'node:assert/strict'
import { apiFetch } from '../src/api/http.js'
import { filterRows } from '../src/utils/tableFilters.js'

const storage = () => {
  const values = new Map()
  return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,String(value)), removeItem:key => values.delete(key)}
}
function setup() {
  globalThis.location = {origin:'http://localhost'}
  globalThis.window = new EventTarget()
  globalThis.localStorage = storage()
  globalThis.sessionStorage = storage()
}
const json = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json'}})

test('catalog loads every page, including more than 50 rows', async () => {
  setup()
  const calls=[]
  globalThis.fetch=async url => {
    calls.push(url)
    return calls.length===1 ? json({results:Array.from({length:50},(_,id)=>({id})),next:'/api/cursos/?page=2'}) : json({results:[{id:50},{id:51}],next:null})
  }
  const rows=await (await apiFetch('/api/cursos/')).json()
  assert.equal(rows.length,52)
  assert.equal(calls[1],'http://localhost/api/cursos/?page=2')
})
test('failed later page never silently returns an incomplete catalog', async () => {
  setup(); let calls=0
  globalThis.fetch=async()=> ++calls===1 ? json({results:[{id:1}],next:'/api/cursos/?page=2'}) : json({},500)
  await assert.rejects(apiFetch('/api/cursos/'), /500/)
})
test('pagination cannot forward credentials to a foreign origin', async () => {
  setup(); let calls=0
  globalThis.fetch=async()=>{calls++; return json({results:[],next:'https://foreign.invalid/api/data/'})}
  await assert.rejects(apiFetch('/api/cursos/'), /inválida/)
  assert.equal(calls,1)
})
test('expired access rotates refresh and retries the request', async () => {
  setup(); sessionStorage.setItem('token','old');sessionStorage.setItem('refresh','old-refresh')
  let requests=0, refreshes=0
  globalThis.fetch=async(url,options)=>{
    if(url==='/api/login/refresh/') {refreshes++;return json({access:'new',refresh:'new-refresh'})}
    requests++
    return options.headers.get('Authorization')==='Bearer new' ? json({id:1}) : json({},401)
  }
  assert.equal((await apiFetch('/api/perfil/')).status,200)
  assert.equal(refreshes,1);assert.equal(requests,2)
  assert.equal(sessionStorage.getItem('refresh'),'new-refresh')
})
test('combined search, multi-select, date and numeric range; reset restores data', () => {
  const rows=[{nombre:'José',cargo:'Profesor',fecha:'2026-09-13T10:00:00Z',edad:30},{nombre:'Josefina',cargo:'Preceptor',fecha:'2026-08-01',edad:50}]
  const definitions=[{key:'cargo',type:'multiSelect'},{key:'fecha',type:'dateRange'},{key:'edad',type:'range'}]
  assert.deepEqual(filterRows(rows,definitions,{cargo:['Profesor'],fecha:{from:'2026-09-01',to:'2026-09-30'},edad:{min:20,max:40}},'jose'),[rows[0]])
  assert.deepEqual(filterRows(rows,definitions,{},''),rows)
  assert.deepEqual(filterRows(rows,[{key:'fecha',type:'date'}],{fecha:'2026-08-01'}),[rows[1]])
})
