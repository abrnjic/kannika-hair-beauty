import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStatus,statusEmail} from '../server/booking-status.mjs';
const now=new Date('2026-10-16T03:00:00Z'),id='11111111-1111-4111-8111-111111111111';
const base={name:'ลูกค้า <img src=x>',email:'client@example.com',service:"Women's haircut",date:'2026-11-02',time:'Morning',status:'pending',language:'th'};
const decision={status:'confirmed',confirmedDate:'2026-11-02',confirmedTime:'10:30'};
const jwt=extra=>'header.'+Buffer.from(JSON.stringify({aud:'kannika-4f9b6',iss:'https://securetoken.google.com/kannika-4f9b6',sub:'admin-1',exp:now.getTime()/1000+3600,email:'kannika54932@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'},...extra})).toString('base64url')+'.signature';
const req=(extra={})=>({method:'POST',headers:{authorization:'Bearer '+jwt()},body:{id,decision,expected:{status:'pending',updatedAt:null}},...extra});
function harness({data=base,readStatus=200,commitStatus=200,mailStatus=200,role='owner'}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,...options});
  if(url.includes('resend.com'))return new Response(JSON.stringify({id:'email-1'}),{status:mailStatus});
  if(url.includes('/admins/'))return new Response(JSON.stringify({fields:{role:{stringValue:role}}}),{status:readStatus});
  if(url.endsWith(':commit'))return new Response(JSON.stringify({writeResults:[{transformResults:[{timestampValue:now.toISOString()}]}]}),{status:commitStatus});
  return new Response(JSON.stringify({name:'projects/kannika-4f9b6/databases/(default)/documents/bookings/'+id,updateTime:'2026-10-16T02:00:00.123456Z',fields:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,key==='updatedAt'?{timestampValue:value}:{stringValue:value}]))}),{status:readStatus});
 };
 return {calls,options:{fetchImpl,env:{RESEND_API_KEY:'test-only'},now:()=>now}};
}
const mail=h=>JSON.parse(h.calls.find(c=>c.url.includes('resend.com')).body);
test('saves with atomic document precondition and sends Thai confirmation to stored client email',async()=>{
 const h=harness(),r=await handleStatus(req(),h.options);assert.equal(r.body.notification,'sent');assert.equal(r.body.language,'th');const write=JSON.parse(h.calls.find(c=>c.url.endsWith(':commit')).body).writes[0];assert.equal(write.currentDocument.updateTime,'2026-10-16T02:00:00.123456Z');assert.equal(write.update.fields.updatedBy.stringValue,'admin-1');assert.ok(!write.updateMask.fieldPaths.includes('language'));assert.deepEqual(mail(h).to,['client@example.com']);assert.match(mail(h).subject,/ยืนยัน/);assert.match(mail(h).text,/10:30/);assert.match(mail(h).text,/ตัดผมผู้หญิง/);assert.ok(!mail(h).html.includes('<img src=x>'));assert.match(mail(h).html,/&lt;img/);
});
test('all statuses localise both subject and content; legacy requests use English',()=>{
 for(const language of ['en','th',undefined])for(const status of ['pending','confirmed','declined']){const email=statusEmail({...base,...decision,status,language},id,'salon');assert.match(email.html,new RegExp(`lang="${language==='th'?'th':'en'}"`));assert.match(email.text,/Asia\/Bangkok/);if(language!=='th')assert.match(email.subject,/awaiting review|confirmed|unable to accept/);else assert.match(email.subject,/[ก-๙]/)}
});
test('rejects anonymous users and wrong Google account without role',async()=>{
 for(const claims of [{email_verified:false},{firebase:{sign_in_provider:'anonymous'}},{email:'other@example.com'}]){const h=harness({role:'viewer'});assert.equal((await handleStatus(req({headers:{authorization:'Bearer '+jwt(claims)}}),h.options)).status,403);assert.ok(!h.calls.some(c=>c.url.includes('resend.com')||c.url.endsWith(':commit')))}
});
test('Firestore must verify signed token even when decoded claims name the salon administrator',async()=>{const h=harness({readStatus:401});assert.equal((await handleStatus(req(),h.options)).status,403);assert.equal(h.calls.length,1)});
test('owner access requires verified role read with same Firebase token',async()=>{const h=harness();const request=req({headers:{authorization:'Bearer '+jwt({email:'owner@example.com'})}});assert.equal((await handleStatus(request,h.options)).body.notification,'sent');assert.match(h.calls[0].url,/admins\/admin-1$/);assert.equal(h.calls[0].headers.Authorization,request.headers.authorization)});
test('stale decision and concurrent update never send client email',async()=>{for(const change of [{data:{...base,status:'declined'}},{commitStatus:412}]){const h=harness(change);assert.equal((await handleStatus(req(),h.options)).status,409);assert.ok(!h.calls.some(c=>c.url.includes('resend.com')))}});
test('mail failure saves decision and same decision retry uses original event key without rewriting',async()=>{
 const h=harness({mailStatus:503});const first=await handleStatus(req(),h.options);assert.equal(first.status,202);assert.equal(first.body.saved,true);assert.equal(h.calls.filter(c=>c.url.includes('resend.com')).length,3);
 const retry=harness({data:{...base,...decision,updatedAt:now.toISOString()}});const request=req();request.body.expected={status:'confirmed',updatedAt:now.getTime()};const result=await handleStatus(request,retry.options);assert.equal(result.body.notification,'sent');assert.ok(!retry.calls.some(c=>c.url.endsWith(':commit')));assert.equal(retry.calls.at(-1).headers['Idempotency-Key'],h.calls.at(-1).headers['Idempotency-Key']);
});
test('old unchanged event cannot replay after deduplication window',async()=>{const old='2026-10-14T00:00:00Z',h=harness({data:{...base,...decision,updatedAt:old}}),request=req();request.body.expected={status:'confirmed',updatedAt:Date.parse(old)};assert.equal((await handleStatus(request,h.options)).body.notification,'expired');assert.ok(!h.calls.some(c=>c.url.includes('resend.com')||c.url.endsWith(':commit')))});
test('request cannot override stored recipient or language',async()=>{const h=harness(),request=req();Object.assign(request.body,{email:'attacker@example.com',language:'en',to:'attacker@example.com'});await handleStatus(request,h.options);assert.deepEqual(mail(h).to,['client@example.com']);assert.match(mail(h).subject,/ยืนยัน/)});
test('rejects malformed requests, invalid decisions and foreign origins before database or mail calls',async()=>{for(const change of [{headers:{}},{headers:{origin:'https://evil.example',authorization:'Bearer '+jwt()}},{body:{id:'../x',expected:{}}},{body:{id,expected:{status:'pending',updatedAt:null},decision:{status:'unknown'}}}]){const h=harness();assert.ok((await handleStatus(req(change),h.options)).status>=400);assert.equal(h.calls.length,0)}});
