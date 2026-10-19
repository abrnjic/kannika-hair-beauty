import {completeTreatmentReward} from '../dist/loyalty-rewards.js';
import {generateCardLink,accessWindow} from './club-auth.mjs';
import {beautyClubEmail} from './beauty-club-email.mjs';
import {createHash} from 'node:crypto';
import {recipient} from './booking-notifications.mjs';
const project='kannika-4f9b6',root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
export function invitationEmail(client,from,signInLink){
 const th=client.language==='th',url=signInLink||'https://kannika-hair-beauty.vercel.app'+(th?'/th/club':'/club');
 const title=th?'ขอเชิญเข้าร่วม Kannika Beauty Club':'You’re invited to Kannika Beauty Club';
 const greeting=th?`สวัสดี ${client.name}`:`Hello ${client.name},`;
 const intro=(th?'สะสมแสตมป์ 1 ดวงต่อบริการที่เสร็จและชำระเงินแล้ว 1 รายการ':'Earn one stamp for each completed, paid service.')+' '+completeTreatmentReward[th?'th':'en'];
 const instructions=signInLink?(th?'เปิดคำเชิญแล้วกดยอมรับและเปิดบัตรของฉัน ไม่ต้องขออีเมลฉบับที่สอง ตั้งรหัสผ่าน หรือเข้าสู่ระบบแยกต่างหาก ทางร้านจะตรวจสอบและอนุมัติสมาชิก':'Open your invitation, then tap Accept & open my card. No second email, password, or separate sign-in is needed. The salon will review and approve your membership.'):(th?'เปิดลิงก์ด้านล่างและลงชื่อเข้าใช้ด้วยอีเมลที่ได้รับคำเชิญนี้ผ่าน Google หรือลิงก์ทางอีเมล จากนั้นกรอกชื่อและยอมรับกติกา ร้านจะตรวจสอบคำขอและเปิดใช้งานสมาชิกให้คุณ':'Open the link below and sign in with the email that received this invitation, using Google or an email sign-in link. Then enter your name and accept the programme rules. The salon will review your request and activate your membership.');
 const privacy=th?'คำเชิญนี้ยังไม่ได้สมัครสมาชิกให้คุณ การเข้าร่วมเป็นทางเลือก และการรับข่าวสารโปรโมชั่นต้องให้ความยินยอมแยกต่างหาก หากคุณไม่ได้ขอคำเชิญนี้ สามารถละเว้นอีเมลนี้ได้':'This invitation has not enrolled you. Joining is optional, and promotional messages require separate consent. If you did not request this invitation, you can ignore this email.';
 const button=th?'เข้าร่วม Beauty Club':'Join Beauty Club';
 return {from,to:[client.email],reply_to:recipient,subject:'Kannika — '+title,text:[greeting,title,intro,instructions,button+': '+url,privacy,recipient].join('\n\n'),html:beautyClubEmail({language:client.language,title,paragraphs:[greeting,intro,instructions],url,button,footnote:privacy})};
}
export async function handleLoyaltyInvitation(request,{fetchImpl=fetch,env=process.env,now=()=>new Date(),generateLink=generateCardLink}={}){
 const reply=(status,body)=>({status,body});
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!env.RESEND_API_KEY)return reply(503,{error:'notifications_unavailable'});
 if(request.headers.origin&&!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 const authorization=request.headers.authorization;let claims;
 try{if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))throw Error();claims=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url'));if(claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!/^[-\w]{1,128}$/.test(claims.sub)||typeof claims.exp!=='number'||claims.exp*1000<=now().getTime())throw Error()}catch{return reply(401,{error:'authentication_required'})}
 if(claims.email_verified!==true||claims.firebase?.sign_in_provider!=='google.com')return reply(403,{error:'administrator_required'});
 let client;
 try{const body=typeof request.body==='string'?JSON.parse(request.body):request.body;if(!body||JSON.stringify(body).length>1500)throw Error();client={name:String(body.name??'').trim(),email:String(body.email??'').trim().toLowerCase(),language:body.language};if(!client.name||client.name.length>100||client.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)||!['en','th'].includes(client.language))throw Error()}catch{return reply(400,{error:'invalid_request'})}
 const call=(url,options)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
 try{
  // This protected query verifies the actual signed token and administrator role,
  // including the salon email allowlist. Empty results still require admin access.
  const access=await call(`${root}:runQuery`,{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'loyaltyMembers'}],limit:1}})});
  if(!access.ok)return reply([401,403].includes(access.status)?403:503,{error:'administrator_required'});
  const invitationId=createHash('sha256').update(client.email).digest('hex'),invitationPath=`projects/${project}/databases/(default)/documents/loyaltyInvitations/${invitationId}`;
  const headers={Authorization:authorization,'Content-Type':'application/json'};
  const previous=await call(`${root}/loyaltyInvitations/${invitationId}`,{headers});
  if(!previous.ok&&previous.status!==404)return reply(503,{error:'invitation_tracking_unavailable'});
  const stored=previous.ok?await previous.json():null;
  const fields={name:{stringValue:client.name},language:{stringValue:client.language},deliveryStatus:{stringValue:stored?.fields?.lastSentAt?'sent':'pending'},updatedBy:{stringValue:claims.sub}};
  if(!stored){fields.email={stringValue:client.email};fields.createdBy={stringValue:claims.sub}}
  const write={update:{name:invitationPath,fields},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'},...(!stored?[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]:[])],currentDocument:stored?{updateTime:stored.updateTime}:{exists:false}};
  if(stored)write.updateMask={fieldPaths:Object.keys(fields)};
  const recorded=await call(`${root}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[write]})});
  if(!recorded.ok)return reply(503,{error:'invitation_tracking_unavailable'});
  async function markSent(){const saved=await call(`${root}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:invitationPath,fields:{deliveryStatus:{stringValue:'sent'},updatedBy:{stringValue:claims.sub}}},updateMask:{fieldPaths:['deliveryStatus','updatedBy']},updateTransforms:[{fieldPath:'lastSentAt',setToServerValue:'REQUEST_TIME'},{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:true}}]})});return saved.ok}
  const signInLink=env.FIREBASE_SERVICE_ACCOUNT_JSON?await generateLink(client.email,client.language,{env,now:now(),purpose:'invitation',name:client.name}):null;
  const email=invitationEmail(client,env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>',signInLink);
  const key='kannika-invite/'+(signInLink?accessWindow(now()):now().toISOString().slice(0,10))+'/'+createHash('sha256').update(JSON.stringify({client,template:signInLink?'two-click-v3':'approval-v1',link:signInLink})).digest('hex');
  for(let attempt=0;attempt<3;attempt++){if(attempt)await new Promise(r=>setTimeout(r,attempt*500));try{const sent=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(email)});if(sent.ok&&(await sent.json()).id){if(await markSent())return reply(200,{notification:'sent',invitationId});return reply(202,{notification:'pending',invitationId})}if(sent.status!==429&&sent.status<500)break}catch{}}
  return reply(202,{notification:'pending'});
 }catch{return reply(503,{error:'invitation_service_unavailable'})}
}
