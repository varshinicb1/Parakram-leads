/** Deletes the dogfood Indore leads so we can re-run the pipeline cleanly. */
const BASE = 'https://wintermute-api.cbvarshini1.workers.dev/api/v1';
const EMAIL = 'admin@wintermute.ai', PASS = 'test123';
let TOKEN = '';
const NAMES = ['Cafe De Casa','11:11 Coffee','Le Elementary Cafe','Mangosteen Cafe','Mr.Beans','Cafe Bake Well','Cafe @Blu','Chai Kaapi','Mocha Indore','Cafe Yolo','Shear Genius','Lakme Salon Saket',"Colors'lon Beauty",'Selfie Unisex Salon','Orchid Unisex Salon',"Gold's Gym Vijay Nagar",'Star Gym','THE LION GYM','Transform Gym','Anytime Fitness'];
const SET = new Set(NAMES);

async function login(){ const r=await fetch(`${BASE}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:EMAIL,password:PASS})}); const d=await r.json(); TOKEN=d.token; }
async function api(p,o={}){ return fetch(`${BASE}${p}`,{...o,headers:{'content-type':'application/json','authorization':`Bearer ${TOKEN}`,...(o.headers||{})}}); }

async function main(){
  await login();
  const res = await (await api('/leads?per_page=200')).json();
  const targets = (res.data||[]).filter(l=>SET.has(l.business_name));
  console.log(`Found ${targets.length} dogfood leads to delete`);
  for (const t of targets){
    const d = await api(`/leads/${t.id}`,{method:'DELETE'});
    console.log(`  deleted ${t.business_name}: ${d.status}`);
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
