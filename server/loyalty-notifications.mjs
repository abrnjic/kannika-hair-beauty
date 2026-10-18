import {completeTreatmentReward} from '../dist/loyalty-rewards.js';
import {beautyClubEmail} from './beauty-club-email.mjs';
import {rewardSummary} from '../dist/loyalty-policy.js';
import {recipient} from './booking-notifications.mjs';
const project='kannika-4f9b6',root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const decode=d=>Object.fromEntries(Object.entries(d.fields??{}).map(([k,v])=>[k,v.stringValue??v.timestampValue??(v.integerValue!==undefined?Number(v.integerValue):v.booleanValue)]));
export function loyaltyEmail(member,event,from){
 const th=event.language==='th',s=rewardSummary(event),url='https://kannika-hair-beauty.vercel.app'+(th?'/th/club':'/club');
 const title=th?(event.type==='visit'?'ขอบคุณที่มาใช้บริการ Kannika':'อัปเดตสิทธิพิเศษ Beauty Club'):(event.type==='visit'?'Thank you for visiting Kannika':'Your Beauty Club reward update');
 const action=th?({visit:'เพิ่มตราประทับสำหรับการมาใช้บริการแล้ว',discount:'ใช้สิทธิ์ส่วนลด 10% แล้ว',gift:'ใช้สิทธิ์บริการฟรีแบบครบรายการที่เลือกแล้ว'}[event.type]):({visit:'A visit stamp has been added.',discount:'Your 10% reward has been used.',gift:'Your chosen complete treatment has been redeemed.'}[event.type]);
 const progress=th?`มาใช้บริการสะสม ${s.stamps} ครั้ง อีก ${s.next} ครั้งถึงสิทธิพิเศษถัดไป`:`${s.stamps} lifetime visits. ${s.next} more visits to your next reward.`;
 const rewards=th?`สิทธิ์ส่วนลด 10% ที่ใช้ได้: ${s.discounts} · สิทธิ์เลือกบริการฟรีแบบครบรายการที่ใช้ได้: ${s.gifts}`:`10% rewards available: ${s.discounts} · Complete treatments of your choice available: ${s.gifts}`;
 const open=th?'เปิดบัตร Beauty Club':'Open your Beauty Club card';
 return {from,to:[member.email],reply_to:recipient,subject:'Kannika — '+title,text:[title,action,event.date,progress,rewards,completeTreatmentReward[th?'th':'en'],open+': '+url,recipient].join('\n'),html:beautyClubEmail({language:event.language,title,paragraphs:[action,event.date],url,button:open,summary:[progress,rewards,completeTreatmentReward[th?'th':'en']]})};
}
export async function handleLoyaltyNotification(request,{fetchImpl=fetch,env=process.env,now=()=>new Date()}={}){
 const reply=(status,body)=>({status,body});if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!env.RESEND_API_KEY)return reply(503,{error:'notifications_unavailable'});
 if(request.headers.origin&&!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 const authorization=request.headers.authorization;let claims;
 try{if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))throw Error();claims=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url'));if(claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!/^[-\w]{1,128}$/.test(claims.sub)||typeof claims.exp!=='number'||claims.exp*1000<=now().getTime())throw Error()}catch{return reply(401,{error:'authentication_required'})}
 if(claims.email_verified!==true||claims.firebase?.sign_in_provider!=='google.com')return reply(403,{error:'administrator_required'});
 let body=request.body;try{if(typeof body==='string')body=JSON.parse(body);if(!body||JSON.stringify(body).length>1000||!/^[-\w]{1,128}$/.test(body.memberId)||!/^(booking_[a-f\d-]{36}|manual_[a-f\d]{64}|redeem_[a-f\d-]{36})$/i.test(body.eventId))throw Error()}catch{return reply(400,{error:'invalid_request'})}
 const headers={Authorization:authorization};const call=(url,options)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
 // Firestore verifies this exact signed token and the administrator rules.
 try{
  if(claims.email!==recipient){const role=await call(`${root}/admins/${claims.sub}`,{headers});if(!role.ok||decode(await role.json()).role!=='owner')return reply(403,{error:'administrator_required'})}
  const eventRead=await call(`${root}/loyaltyMembers/${body.memberId}/events/${body.eventId}`,{headers});if(!eventRead.ok)return reply([401,403].includes(eventRead.status)?403:404,{error:'event_unavailable'});
  const event=decode(await eventRead.json());if(!['visit','discount','gift'].includes(event.type))return reply(400,{error:'invalid_event'});
  const age=now().getTime()-Date.parse(event.createdAt);if(!Number.isFinite(age)||age< -60000||age>23*3600000)return reply(200,{notification:'expired'});
  const memberRead=await call(`${root}/loyaltyMembers/${body.memberId}`,{headers});if(!memberRead.ok)return reply(403,{error:'member_unavailable'});const member=decode(await memberRead.json());if(!/^[^ @]+@[^ @]+[.][^ @]+$/.test(member.email))return reply(400,{error:'invalid_recipient'});
  const email=loyaltyEmail(member,event,env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>');
  for(let attempt=0;attempt<3;attempt++){if(attempt)await new Promise(r=>setTimeout(r,attempt*500));try{const sent=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`kannika-loyalty/${body.memberId}/${body.eventId}`},body:JSON.stringify(email)});if(sent.ok&&(await sent.json()).id)return reply(200,{notification:'sent'});if(sent.status!==429&&sent.status<500)break}catch{}}
  return reply(202,{notification:'pending'});
 }catch{return reply(503,{error:'loyalty_service_unavailable'})}
}
