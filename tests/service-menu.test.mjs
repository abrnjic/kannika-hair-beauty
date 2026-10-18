import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMenu,menuPrice,publicMenu} from '../dist/service-menu-model.js';
import {menuMarkup} from '../dist/service-menu-view.js';
import {handleServiceMenu} from '../server/service-menu.mjs';
const seed=JSON.parse(readFileSync(new URL('../dist/service-menu-default.json',import.meta.url)));
const menu=()=>structuredClone(seed);
function harness({user={uid:'owner',email:'kannika54932@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'}},role,invalidToken=false,existing}={}) {
 let stored=existing?structuredClone(existing):null,writes=0,verified=0;
 const doc={get:async()=>({data:()=>stored})};
 const db={collection:name=>({doc:id=>name==='salonContent'?doc:{get:async()=>({data:()=>role})}}),runTransaction:async fn=>fn({get:async()=>({data:()=>stored}),set:(ref,value)=>{stored=value;writes++;}})};
 const auth={verifyIdToken:async(token,revoked)=>{verified++;assert.equal(revoked,true);if(invalidToken||token!=='valid')throw Error();return user;}};
 return {deps:{getServices:async()=>({auth,db}),env:{VERCEL_ENV:'production'},now:()=>new Date('2026-10-18T10:00:00+07:00')},get stored(){return stored;},get writes(){return writes;},get verified(){return verified;}};
}
const put=(overrides={})=>({method:'PUT',headers:{authorization:'Bearer valid',origin:'https://kannika-hair-beauty.vercel.app'},body:{menu:menu(),revision:0},...overrides});
test('baseline contains all 49 bilingual services and exact supplied price ranges',()=>{
 const validated=validateMenu(seed),rows=validated.groups.flatMap(g=>g.services);
 assert.equal(rows.length,49);assert.equal(rows.filter(r=>r.priceKind==='starting').length,8);
 assert.deepEqual(rows.map(r=>[r.min,r.max]),[[150,250],[250,350],[350,500],[200,350],[250,450],[300,600],[500,1200],[300,700],[400,900],[500,1200],[1000,2500],[200,500],[200,350],[200,300],[1200,2500],[1500,3000],[2000,3500],[1200,2000],[2000,3500],[1200,2000],[500,1000],[800,1800],[500,1200],[800,1500],[1200,2500],[2000,4500],[399,499],[450,590],[499,599],[599,699],[599,799],[799,999],[599,899],[899,1299],[150,150],[150,150],[200,400],[500,900],[600,1200],[250,400],[250,350],[250,350],[250,350],[250,500],[50,150],[100,300],[250,450],[150,250],[300,450]]);
 assert.equal(rows.find(r=>r.name.en==='Hair bleaching').unit.en,'session');
 assert.equal(menuPrice(rows[26]),'From 399–499');assert.equal(menuPrice(rows[34]),'150');assert.match(menuPrice(rows[26],'th'),/^เริ่มต้น /);
});
test('menu schema rejects negative/non-numeric/reversed prices, duplicates and missing translations',()=>{
 for(const mutate of [m=>m.groups[0].services[0].min=-1,m=>m.groups[0].services[0].min='150',m=>m.groups[0].services[0].max=1,m=>m.groups[0].services[0].name.th='',m=>m.groups[0].services[0].visible='true',m=>m.groups[0].services[0].priceKind='free',m=>m.groups[0].services.push(m.groups[0].services[0]),m=>m.groups[0].services[0].extra='bad']){const m=menu();mutate(m);assert.throws(()=>validateMenu(m));}
});
test('public markup escapes administrator text and localises price and primary language',()=>{
 const m=menu();m.groups[0].services[0].name.en='<img src=x onerror=alert(1)>';m.groups[0].services[0].description.en='<script>alert(1)</script>';
 const text=menuMarkup(m);assert.ok(!text.includes('<img src=x'));assert.ok(!text.includes('<script>'));assert.match(text,/&lt;img/);
 const thai=menuMarkup(m,'th');assert.match(thai,/เริ่มต้น 399–499/);assert.match(thai,/lang="th">สระไดร์/);
 m.groups.forEach(g=>g.services.forEach(s=>s.visible=false));assert.equal(publicMenu(m).groups.length,0);assert.doesNotThrow(()=>validateMenu(publicMenu(m)));
});
test('public GET seeds from defaults without writes, and never leaks hidden rows or audit identity',async()=>{
 const h=harness();const result=await handleServiceMenu({method:'GET',headers:{}},h.deps);assert.equal(result.status,200);assert.equal(result.body.revision,0);assert.equal(h.writes,0);
 const m=menu();m.groups[0].services[0].visible=false;const saved=harness({existing:{menu:m,revision:2,updatedAt:'2026-10-18',updatedBy:'owner-secret'}});
 const publicResult=await handleServiceMenu({method:'GET',headers:{}},saved.deps);assert.equal(publicResult.body.menu.groups[0].services.length,4);assert.ok(!JSON.stringify(publicResult.body).includes('owner-secret'));
 assert.equal((await handleServiceMenu({method:'GET',headers:{},query:{editor:'1'}},saved.deps)).status,403);
 const editor=await handleServiceMenu({method:'GET',headers:{authorization:'Bearer valid'},query:{editor:'1'}},saved.deps);assert.equal(editor.body.menu.groups[0].services.length,5);
});
test('writes require a verified Google administrator and signed non-revoked Firebase token',async()=>{
 const users=[{uid:'client',email:'guest@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}},{uid:'owner',email:'kannika54932@gmail.com',email_verified:false,firebase:{sign_in_provider:'google.com'}},{uid:'owner',email:'kannika54932@gmail.com',email_verified:true,firebase:{sign_in_provider:'custom'}}];
 for(const user of users){const h=harness({user});assert.equal((await handleServiceMenu(put(),h.deps)).status,403);assert.equal(h.writes,0);}
 const forged=harness({invalidToken:true});assert.equal((await handleServiceMenu(put(),forged.deps)).status,403);assert.equal(forged.writes,0);
 const noToken=harness();assert.equal((await handleServiceMenu(put({headers:{}}),noToken.deps)).status,401);assert.equal(noToken.writes,0);
});
test('salon account and existing owner role can publish; stale changes cannot overwrite',async()=>{
 for(const h of [harness(),harness({user:{uid:'other-owner',email:'other@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}},role:{role:'owner'}})]){
  const input=put();input.body.menu.groups[0].services[0].min=175;
  const result=await handleServiceMenu(input,h.deps);assert.equal(result.status,200);assert.equal(result.body.saved,true);assert.equal(result.body.revision,1);assert.equal(h.stored.menu.groups[0].services[0].min,175);assert.equal(h.verified,1);
  assert.equal((await handleServiceMenu(input,h.deps)).status,409);assert.equal(h.writes,1);
 }
});
test('invalid payload, foreign origin, unsupported method and database failure do not save',async()=>{
 const h=harness();assert.equal((await handleServiceMenu(put({headers:{authorization:'Bearer valid',origin:'https://evil.example'}}),h.deps)).status,403);
 assert.equal((await handleServiceMenu(put({body:{menu:menu(),revision:-1}}),h.deps)).status,400);
 assert.equal((await handleServiceMenu(put({body:'{'}),h.deps)).status,400);
 assert.equal((await handleServiceMenu({method:'DELETE',headers:{}},h.deps)).status,405);
 assert.equal((await handleServiceMenu(put(),{getServices:async()=>{throw Error('database secret');}})).status,503);assert.equal(h.writes,0);
});
test('English and Thai baseline pages include the price list and editor only inside protected workspace',()=>{
 for(const path of ['index.html','th/index.html']){const s=readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');assert.match(s,/id="prices"/);assert.match(s,/href="#prices"/);assert.equal((s.match(/class="price-row"/g)||[]).length,49);assert.ok(!s.includes('Treatment details and prices will be added soon.'));}
 const th=readFileSync(new URL('../dist/th/index.html',import.meta.url),'utf8');assert.match(th,/id="price-menu-content"><div class="price-tabs"[\s\S]*?lang="th">สระไดร์/);
 for(const path of ['admin.html','th/admin.html']){const s=readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');assert.match(s,/id="edit-price-list"/);assert.match(s,/id="price-editor"[^>]*hidden/);assert.match(s,/id="publish-price-menu"/);}
});
