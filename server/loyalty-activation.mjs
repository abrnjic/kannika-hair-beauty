import {completeTreatmentReward} from '../dist/loyalty-rewards.js';
import {beautyClubEmail} from './beauty-club-email.mjs';
import {recipient} from './booking-notifications.mjs';
const project='kannika-4f9b6',root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const decode=d=>Object.fromEntries(Object.entries(d.fields??{}).map(([key,value])=>[key,value.stringValue??value.timestampValue??value.booleanValue]));
export function activationEmail(member,from){
 const th=member.language==='th',url='https://kannika-hair-beauty.vercel.app'+(th?'/th/club':'/club');
 const title=th?'สมาชิก Beauty Club ของคุณได้รับการอนุมัติแล้ว':'Your Beauty Club membership is approved';
 const greeting=th?`สวัสดี ${member.name}`:`Hello ${member.name},`;
 const message=th?'Kannika อนุมัติและเปิดใช้งานสมาชิกของคุณแล้ว บัตรสะสมแสตมป์พร้อมใช้งาน คุณเริ่มสะสมแสตมป์ได้หลังรับบริการและชำระเงินแต่ละครั้ง':'Kannika has approved and activated your membership. Your digital card is ready, and you can now earn a stamp after each completed, paid visit.';
 const instructions=th?'เปิดบัตรและลงชื่อเข้าใช้ด้วยอีเมลเดียวกับที่ใช้สมัคร แสดงบัตรให้ทีมงานที่ร้านเมื่อมาใช้บริการ':'Open your card and sign in with the same email you used to join. Show your card to the salon team when you visit.';
 const button=th?'เปิดบัตร Beauty Club':'Open your Beauty Club card';
 return {from,to:[member.email],reply_to:recipient,subject:'Kannika — '+title,text:[title,greeting,message,completeTreatmentReward[th?'th':'en'],instructions,button+': '+url,recipient,'+66 81 727 4874'].join('\n\n'),html:beautyClubEmail({language:member.language,title,paragraphs:[greeting,message,completeTreatmentReward[th?'th':'en'],instructions],url,button})};
}
export async function handleLoyaltyActivation(request,{fetchImpl=fetch,env=process.env,now=()=>new Date()}={}){
 const reply=(status,body)=>({status,body});
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!env.RESEND_API_KEY)return reply(503,{error:'notifications_unavailable'});
 if(request.headers.origin&&!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 const authorization=request.headers.authorization;let claims;
 try{if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))throw Error();claims=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url'));if(claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!/^[-\w]{1,128}$/.test(claims.sub)||typeof claims.exp!=='number'||claims.exp*1000<=now().getTime())throw Error()}catch{return reply(401,{error:'authentication_required'})}
 if(claims.email_verified!==true||claims.firebase?.sign_in_provider!=='google.com')return reply(403,{error:'administrator_required'});
 let body;try{body=typeof request.body==='string'?JSON.parse(request.body):request.body;if(!body||JSON.stringify(body).length>1000||typeof body.memberId!=='string'||!/^[-\w]{1,128}$/.test(body.memberId))throw Error()}catch{return reply(400,{error:'invalid_request'})}
 const headers={Authorization:authorization,'Content-Type':'application/json'},call=(url,options)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
 try{
  // Firestore validates this signed token and role; decoded claims alone grant no access.
  if(claims.email!==recipient){const role=await call(`${root}/admins/${claims.sub}`,{headers});if(!role.ok||decode(await role.json()).role!=='owner')return reply(403,{error:'administrator_required'})}
  const read=await call(`${root}/loyaltyMembers/${body.memberId}`,{headers});if(!read.ok)return reply(read.status===404?404:[401,403].includes(read.status)?403:503,{error:'membership_unavailable'});
  const document=await read.json();let member=decode(document);
  if(member.consent!==true||!['pending','active'].includes(member.membershipStatus??'active'))return reply(409,{error:'membership_not_ready'});
  if(typeof member.email!=='string'||member.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email))return reply(400,{error:'invalid_recipient'});
  if(member.membershipStatus==='pending'){
   const commit=await call(`${root}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:document.name,fields:{membershipStatus:{stringValue:'active'},approvedBy:{stringValue:claims.sub}}},updateMask:{fieldPaths:['membershipStatus','approvedBy']},updateTransforms:[{fieldPath:'approvedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{updateTime:document.updateTime}}]})});
   if(!commit.ok)return reply([409,412].includes(commit.status)?409:[401,403].includes(commit.status)?403:503,{error:'activation_not_saved'});
   const result=await commit.json(),approvedAt=result.writeResults?.[0]?.transformResults?.[0]?.timestampValue;if(!approvedAt)return reply(503,{error:'activation_verification_failed'});
   member={...member,membershipStatus:'active',approvedAt,approvedBy:claims.sub};
  }
  // Legacy active cards have no approval event; never fabricate one or resend old confirmations.
  if(!member.approvedAt)return reply(200,{active:true,notification:'not_applicable'});
  const result={active:true,approvedAt:member.approvedAt};
  const age=now().getTime()-Date.parse(member.approvedAt);if(!Number.isFinite(age)||age< -60000||age>23*3600000)return reply(200,{...result,notification:'expired'});
  const email=activationEmail(member,env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>');
  for(let attempt=0;attempt<3;attempt++){if(attempt)await new Promise(r=>setTimeout(r,attempt*500));try{const sent=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`kannika-activation/${body.memberId}/${member.approvedAt}`},body:JSON.stringify(email)});if(sent.ok&&(await sent.json()).id)return reply(200,{...result,notification:'sent'});if(sent.status!==429&&sent.status<500)break}catch{}}
  return reply(202,{...result,notification:'pending'});
 }catch{return reply(503,{error:'activation_service_unavailable'})}
}
