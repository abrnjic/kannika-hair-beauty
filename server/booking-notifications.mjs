import {validateBooking} from '../dist/booking-validation.js';
import {t} from '../dist/i18n.js';
const project='kannika-4f9b6';
const database=`projects/${project}/databases/(default)`;
const endpoint=`https://firestore.googleapis.com/v1/${database}/documents`;
export const recipient='kannika54932@gmail.com';
const keys=['service','date','time','name','email','notes'];
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode=document=>Object.fromEntries(Object.entries(document.fields??{}).map(([key,value])=>[key,value.stringValue??value.timestampValue??value.booleanValue]));
const reply=(status,body)=>({status,body});
export function notificationEmail(data,id,from) {
 const labels={service:'Treatment',date:'Preferred date',time:'Preferred time',name:'Your name',email:'Your email',notes:'Client notes'};
 const rows=keys.map(key=>{
  const value=data[key]||'—';const display=['service','time'].includes(key)?`${t(value,{},'th')} / ${value}`:value;
  return {label:`${t(labels[key],{},'th')} / ${labels[key]}`,value:display};
 });
 return {from,to:[recipient],reply_to:data.email,
  subject:'Kannika — คำขอนัดหมายใหม่ / New appointment request',
  text:['KANNIKA — คำขอนัดหมายใหม่ / New appointment request','',...rows.map(row=>`${row.label}: ${row.value}`),'',`เลขอ้างอิง / Reference: ${id}`,'เวลาในพัทยา / All times: Asia/Bangkok (UTC+7)','คำขอนี้ยังไม่ใช่การยืนยันนัดหมาย / This is an appointment request, not a confirmed appointment.','จัดการคำขอ / Review: https://kannika-hair-beauty.vercel.app/th/admin','English admin: https://kannika-hair-beauty.vercel.app/admin'].join('\n'),
  html:`<!doctype html><html><body style="margin:0;background:#151715;color:#eeeade;font:15px/1.7 Arial,sans-serif"><main style="max-width:620px;padding:32px;margin:auto"><h1 style="color:#cbb17c;font-size:28px">KANNIKA</h1><h2>คำขอนัดหมายใหม่<br>New appointment request</h2><table style="width:100%;border-collapse:collapse">${rows.map(row=>`<tr><th style="text-align:left;vertical-align:top;padding:12px 8px;border-bottom:1px solid #555;font-size:12px">${escape(row.label)}</th><td style="padding:12px 8px;border-bottom:1px solid #555;white-space:pre-wrap;overflow-wrap:anywhere">${escape(row.value)}</td></tr>`).join('')}</table><p>เลขอ้างอิง / Reference: ${escape(id)}<br>เวลาในพัทยา / Asia/Bangkok (UTC+7)</p><p>คำขอนี้ยังไม่ใช่การยืนยันนัดหมาย<br>This request requires salon confirmation.</p><p><a style="color:#cbb17c" href="https://kannika-hair-beauty.vercel.app/th/admin">จัดการคำขอ ↗</a> · <a style="color:#cbb17c" href="https://kannika-hair-beauty.vercel.app/admin">English admin ↗</a></p></main></body></html>`};
}
export function receiptEmail(data,id,from) {
 const lang=data.language==='th'?'th':'en';
 const c=lang==='th'?{
  title:'เราได้รับคำขอนัดหมายของคุณแล้ว',
  message:'ขอบคุณที่เลือก Kannika เราได้รับคำขอของคุณแล้ว และกำลังรอการพิจารณาจากทางร้าน วันและเวลาที่คุณเลือกยังไม่ได้รับการยืนยัน เมื่อร้านอนุมัติแล้ว คุณจะได้รับอีเมลอีกฉบับพร้อมวันและเวลานัดหมายที่ยืนยัน',
  service:'บริการ',visit:'วันและเวลาที่ต้องการ',reference:'เลขอ้างอิง',zone:'เวลาทั้งหมดเป็นเวลาในพัทยา · Asia/Bangkok (UTC+7)',contact:'หากมีคำถาม กรุณาติดต่อ Kannika'
 }:{
  title:'Your appointment request has been received',
  message:'Thank you for choosing Kannika. We have received your request and it is awaiting review by the salon. Your preferred date and time are not confirmed yet. Once the salon approves your appointment, you will receive another email with the confirmed date and time.',
  service:'Treatment',visit:'Preferred visit',reference:'Reference',zone:'All times are in Pattaya · Asia/Bangkok (UTC+7)',contact:'Questions? Contact Kannika'
 };
 const date=new Intl.DateTimeFormat(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(data.date+'T12:00:00+07:00'));
 const rows=[[c.service,t(data.service,{},lang)],[c.visit,`${date} · ${t(data.time,{},lang)}`],[c.reference,id]];
 return {from,to:[data.email],reply_to:recipient,subject:`Kannika — ${c.title}`,
  text:['KANNIKA — '+c.title,'',data.name,c.message,'',...rows.map(([label,value])=>`${label}: ${value}`),'',c.zone,c.contact,recipient,'+66 81 727 4874'].join('\n'),
  html:`<!doctype html><html lang="${lang}"><body style="margin:0;background:#151715;color:#eeeade;font:16px/1.7 Arial,sans-serif"><main style="max-width:620px;padding:32px;margin:auto"><h1 style="color:#cbb17c">KANNIKA</h1><h2>${c.title}</h2><p>${escape(data.name)}</p><p>${c.message}</p><table style="width:100%;border-collapse:collapse">${rows.map(([label,value])=>`<tr><th style="text-align:left;vertical-align:top;padding:12px 8px;border-bottom:1px solid #555">${label}</th><td style="padding:12px 8px;border-bottom:1px solid #555;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join('')}</table><p>${c.zone}</p><p>${c.contact}<br><a style="color:#cbb17c" href="mailto:${recipient}">${recipient}</a><br><a style="color:#cbb17c" href="tel:+66817274874">+66 81 727 4874</a></p></main></body></html>`};
}
export async function handleBooking(request,{fetchImpl=fetch,env=process.env,now=()=>new Date()}={}) {
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!env.RESEND_API_KEY)return reply(503,{error:'notifications_unavailable'});
 const origin=request.headers.origin;
 if(origin&&!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(origin))return reply(403,{error:'origin_not_allowed'});
 const authorization=request.headers.authorization;
 if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))return reply(401,{error:'authentication_required'});
 let uid;
 // Decoding supplies the UID only. Firestore verifies the signed token and
 // deployed rules authorise every write/read; this decoded claim grants no access.
 try {const token=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url'));if(token.aud!==project||token.iss!==`https://securetoken.google.com/${project}`||typeof token.sub!=='string'||!token.sub||token.sub.length>128||typeof token.exp!=='number'||token.exp*1000<=now().getTime())return reply(401,{error:'invalid_authentication'});uid=token.sub;}catch{return reply(401,{error:'invalid_authentication'})}
 let input=request.body;
 if(typeof input==='string'){try{input=JSON.parse(input)}catch{return reply(400,{error:'invalid_request'})}}
 if(!input||typeof input!=='object'||JSON.stringify(input).length>8000)return reply(400,{error:'invalid_request'});
 const {id,booking}=input;
 const language=input.language??'en';
 if(!['en','th'].includes(language))return reply(400,{error:'invalid_language'});
 if(typeof id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id))return reply(400,{error:'invalid_reference'});
 let data;
 try{data=validateBooking(booking,now())}catch(error){return reply(400,{error:'invalid_booking',message:error.message})}
 const headers={Authorization:authorization,'Content-Type':'application/json'};
 const documentName=`${database}/documents/bookings/${id}`;
 const jsonFetch=(url,options)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
 let stored;
 try {
  const fields=Object.fromEntries(Object.entries({...data,language,customerId:uid,timezone:'Asia/Bangkok',status:'pending'}).map(([key,value])=>[key,{stringValue:value}]));fields.consent={booleanValue:true};
  let read=await jsonFetch(`${endpoint}/bookings/${id}`,{headers});
  if(read.status===404) {
   const create=await jsonFetch(`${endpoint}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:documentName,fields},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:false}}]})});
   if(!create.ok&&![401,403,409].includes(create.status))return reply(503,{error:'booking_storage_unavailable'});
   // Also covers a concurrent create or a lost acknowledgement of our own write.
   read=await jsonFetch(`${endpoint}/bookings/${id}`,{headers});
  }
  if(!read.ok)return reply([401,403].includes(read.status)?401:503,{error:'booking_verification_failed'});
  stored=decode(await read.json());
  if(stored.customerId!==uid||(stored.language??'en')!==language||keys.some(key=>stored[key]!==data[key]))return reply(409,{error:'reference_conflict'});
 }catch{return reply(503,{error:'booking_storage_unavailable'})}
 const age=now().getTime()-Date.parse(stored.createdAt);
 // Resend remembers keys for 24h. Stop before expiry so old replays cannot
 // send a second notification after the provider's deduplication window.
 if(!Number.isFinite(age)||age< -60000||age>23*60*60*1000)return reply(200,{id,saved:true,notification:'expired',clientNotification:'expired'});
 const from=env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>';
 async function send(email,key){
  for(let attempt=0;attempt<3;attempt++) {
   if(attempt)await new Promise(resolve=>setTimeout(resolve,attempt*500));
   try {
    const sent=await jsonFetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(email)});
    if(sent.ok&&(await sent.json()).id)return 'sent';
    if(!sent.ok&&sent.status!==429&&sent.status<500)break;
   }catch{}
  }
  return 'pending';
 }
 // Separate keys let either recipient be retried without resending to the other.
 // Do not send an outdated awaiting-review receipt after a decision was made.
 const [notification,clientNotification]=await Promise.all([
  send(notificationEmail(stored,id,from),`kannika-booking/${id}`),
  stored.status!=='pending'?Promise.resolve('superseded'):send(receiptEmail(stored,id,from),`kannika-receipt/${id}`)
 ]);
 if(notification==='pending'||clientNotification==='pending')console.error('booking_email_notification_pending',{bookingId:id,salon:notification,client:clientNotification});
 return reply(notification==='pending'||clientNotification==='pending'?202:200,{id,saved:true,notification,clientNotification});
}
