import {validateDecision} from '../dist/admin-policy.js';
import {t} from '../dist/i18n.js';
import {recipient} from './booking-notifications.mjs';
import salonLocation from '../salon-location.json' with {type:'json'};
const project='kannika-4f9b6';
const root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode=document=>Object.fromEntries(Object.entries(document.fields??{}).map(([key,value])=>[key,value.stringValue??value.timestampValue??value.booleanValue]));
const reply=(status,body)=>({status,body});
const salonAddress=salonLocation.address;
// Use the owner's verified place pin, not a geocoder's interpretation of the address.
const destination=encodeURIComponent(`${salonLocation.latitude},${salonLocation.longitude}`);
export const directions={address:salonAddress,google:`https://www.google.com/maps/dir/?api=1&destination=${destination}`,apple:`https://maps.apple.com/directions?destination=${destination}`};
const copy={
 en:{pending:'Your appointment request is awaiting review',confirmed:'Your appointment is confirmed',declined:'We are unable to accept your appointment request',
 pendingBody:'Your request is awaiting review by the salon. Your preferred date and time are not confirmed yet.',confirmedBody:'We look forward to welcoming you at the confirmed appointment below.',declinedBody:'We are sorry we cannot accept this request. Please contact us to arrange another appointment.',
 treatment:'Treatment',date:'Date',time:'Time',preferred:'Preferred visit',reference:'Reference',zone:'All times are in Pattaya · Asia/Bangkok (UTC+7)',contact:'Questions or changes? Contact Kannika',language:'en',directions:'Directions to the salon',googleMaps:'Open in Google Maps',appleMaps:'Open in Apple Maps'},
 th:{pending:'คำขอนัดหมายของคุณอยู่ระหว่างการพิจารณา',confirmed:'ยืนยันการนัดหมายของคุณแล้ว',declined:'ขออภัย ไม่สามารถรับคำขอนัดหมายของคุณได้',
 pendingBody:'ร้านกำลังพิจารณาคำขอนัดหมายของคุณ วันที่และเวลาที่คุณต้องการยังไม่ได้รับการยืนยัน',confirmedBody:'เรายินดีต้อนรับคุณตามวันและเวลานัดหมายที่ยืนยันด้านล่าง',declinedBody:'ขออภัย ร้านไม่สามารถรับคำขอนัดหมายนี้ได้ กรุณาติดต่อเราเพื่อนัดหมายวันและเวลาอื่น',
 treatment:'บริการ',date:'วันที่',time:'เวลา',preferred:'วันและเวลาที่ต้องการ',reference:'เลขอ้างอิง',zone:'เวลาทั้งหมดเป็นเวลาในพัทยา · Asia/Bangkok (UTC+7)',contact:'หากมีคำถามหรือต้องการเปลี่ยนแปลง กรุณาติดต่อ Kannika',language:'th',directions:'เส้นทางมาที่ร้าน',googleMaps:'ดูเส้นทางบน Google Maps',appleMaps:'ดูเส้นทางบน Apple Maps'}
};
export function statusEmail(data,id,from){
 const lang=data.language==='th'?'th':'en',c=copy[lang];
 const date=value=>new Intl.DateTimeFormat(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(value+'T12:00:00+07:00'));
 const rows=[[c.treatment,t(data.service,{},lang)],...(data.status==='confirmed'?[[c.date,date(data.confirmedDate)],[c.time,data.confirmedTime]]:[[c.preferred,`${date(data.date)} · ${t(data.time,{},lang)}`]]),[c.reference,id]];
 const message=c[data.status+'Body'];
 const confirmed=data.status==='confirmed';
 const directionsText=confirmed?['',c.directions,directions.address,`${c.googleMaps}: ${directions.google}`,`${c.appleMaps}: ${directions.apple}`]:[];
 const directionsHtml=confirmed?`<section style="margin:28px 0;padding-top:12px;border-top:1px solid #555"><h3 style="color:#cbb17c">${c.directions}</h3><p>${escape(directions.address)}</p><a href="${escape(directions.google)}" style="display:inline-block;margin:0 8px 12px 0;padding:12px 18px;background:#cbb17c;color:#151715;text-decoration:none;border-radius:4px">${c.googleMaps} ↗</a><a href="${escape(directions.apple)}" style="display:inline-block;margin:0 0 12px;padding:12px 18px;border:1px solid #cbb17c;color:#cbb17c;text-decoration:none;border-radius:4px">${c.appleMaps} ↗</a></section>`:'';
 return {from,to:[data.email],reply_to:recipient,subject:`Kannika — ${c[data.status]}`,
 text:[`KANNIKA — ${c[data.status]}`,'',data.name,message,'',...rows.map(([label,value])=>`${label}: ${value}`),'',c.zone,...directionsText,'',c.contact,recipient,'+66 81 727 4874'].join('\n'),
 html:`<!doctype html><html lang="${lang}"><body style="margin:0;background:#151715;color:#eeeade;font:16px/1.7 Arial,sans-serif"><main style="max-width:620px;padding:32px;margin:auto"><h1 style="color:#cbb17c">KANNIKA</h1><h2>${c[data.status]}</h2><p>${escape(data.name)}</p><p>${message}</p><table style="width:100%;border-collapse:collapse">${rows.map(([label,value])=>`<tr><th style="text-align:left;vertical-align:top;padding:12px 8px;border-bottom:1px solid #555">${label}</th><td style="padding:12px 8px;border-bottom:1px solid #555;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join('')}</table><p>${c.zone}</p>${directionsHtml}<p>${c.contact}<br><a style="color:#cbb17c" href="mailto:${recipient}">${recipient}</a><br><a style="color:#cbb17c" href="tel:+66817274874">+66 81 727 4874</a></p></main></body></html>`};
}
export async function handleStatus(request,{fetchImpl=fetch,env=process.env,now=()=>new Date()}={}){
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!env.RESEND_API_KEY)return reply(503,{error:'notifications_unavailable'});
 if(request.headers.origin&&!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 const authorization=request.headers.authorization;
 let claims;
 try{if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))throw Error();claims=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url'));if(claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!/^[-\w]{1,128}$/.test(claims.sub)||typeof claims.exp!=='number'||claims.exp*1000<=now().getTime())throw Error()}catch{return reply(401,{error:'authentication_required'})}
 if(claims.email_verified!==true||claims.firebase?.sign_in_provider!=='google.com')return reply(403,{error:'administrator_required'});
 let input=request.body;
 try{if(typeof input==='string')input=JSON.parse(input);if(!input||JSON.stringify(input).length>4000)throw Error()}catch{return reply(400,{error:'invalid_request'})}
 const {id,expected}=input;
 if(typeof id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id)||!expected||!['pending','confirmed','declined'].includes(expected.status)||(expected.updatedAt!==null&&!Number.isFinite(expected.updatedAt)))return reply(400,{error:'invalid_reference'});
 let decision;try{decision=validateDecision(input.decision,now())}catch{return reply(400,{error:'invalid_decision'})}
 const headers={Authorization:authorization,'Content-Type':'application/json'};
 const jsonFetch=(url,options)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
 let stored,document;
 try{
  // Claims alone grant no access: Firestore verifies the exact signed token.
  // The owner role must also be read with that token, never with server credentials.
  if(claims.email!==recipient){const role=await jsonFetch(`${root}/admins/${encodeURIComponent(claims.sub)}`,{headers});if(!role.ok)return reply([401,403].includes(role.status)?403:role.status===404?403:503,{error:'administrator_required'});if(decode(await role.json()).role!=='owner')return reply(403,{error:'administrator_required'})}
  const read=await jsonFetch(`${root}/bookings/${id}`,{headers});
  if(!read.ok)return reply(read.status===404?404:[401,403].includes(read.status)?403:503,{error:'request_unavailable'});
  document=await read.json();stored=decode(document);
  if(stored.status!==expected.status||(stored.updatedAt?Date.parse(stored.updatedAt):null)!==expected.updatedAt)return reply(409,{error:'request_changed'});
  const changed=!stored.updatedAt||Object.entries(decision).some(([key,value])=>(stored[key]??'')!==value);
  if(changed){
   const fields=Object.fromEntries(Object.entries({...decision,updatedBy:claims.sub}).map(([key,value])=>[key,{stringValue:value}]));
   const commit=await jsonFetch(`${root}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:document.name,fields},updateMask:{fieldPaths:Object.keys(fields)},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{updateTime:document.updateTime}}]})});
   if(!commit.ok)return reply([409,412].includes(commit.status)?409:[401,403].includes(commit.status)?403:503,{error:'decision_not_saved'});
   const result=await commit.json();const timestamp=result.writeResults?.[0]?.transformResults?.[0]?.timestampValue;
   if(!timestamp)return reply(503,{error:'decision_verification_failed'});
   stored={...stored,...decision,updatedAt:timestamp};
  }
 }catch{return reply(503,{error:'booking_storage_unavailable'})}
 const result={id,saved:true,updatedAt:Date.parse(stored.updatedAt),language:stored.language==='th'?'th':'en'};
 const age=now().getTime()-result.updatedAt;
 // Re-saving the same decision reuses its event timestamp and idempotency key.
 // Never replay an event after Resend's 24-hour deduplication window.
 if(!Number.isFinite(age)||age< -60000||age>23*60*60*1000)return reply(200,{...result,notification:'expired'});
 if(typeof stored.email!=='string'||!/^[^ @]+@[^ @]+[.][^ @]+$/.test(stored.email))return reply(202,{...result,notification:'pending'});
 const email=statusEmail(stored,id,env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>');
 for(let attempt=0;attempt<3;attempt++){
  try{const sent=await jsonFetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`kannika-status-v3/${id}/${stored.updatedAt}`},body:JSON.stringify(email)});if(sent.ok&&(await sent.json()).id)return reply(200,{...result,notification:'sent'});if(!sent.ok&&sent.status!==429&&sent.status<500)break}catch{}
 }
 console.error('client_status_notification_pending',{bookingId:id});
 return reply(202,{...result,notification:'pending'});
}
