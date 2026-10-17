import {createHash} from 'node:crypto';
import {beautyClubEmail} from './beauty-club-email.mjs';
import {clubAuthServices,reserveAccess,generateCardLink,accessWindow} from './club-auth.mjs';
import {recipient} from './booking-notifications.mjs';
export function accessEmail(email,language,url,from){
 const th=language==='th',title=th?'เปิดบัตร Beauty Club ของคุณ':'Open your Beauty Club card',button=th?'เปิดบัตรของฉัน':'Open my card';
 const paragraphs=th?['เปิดลิงก์แล้วยืนยันเพื่อเปิดบัตร ทุกอีเมลใช้วิธีเดียวกัน','หากเป็นสมาชิกใหม่ ให้ยอมรับกติกาในหน้านั้น จากนั้นรอทางร้านอนุมัติสมาชิก']:['Open the link, then confirm to open your card. The same simple access works with every email address.','If you are joining for the first time, accept the programme rules on that screen. The salon will then approve your membership.'];
 const footnote=th?'ลิงก์นี้ใช้ได้ครั้งเดียว โปรดอย่าส่งต่อ หากไม่ได้ขอลิงก์นี้ สามารถละเว้นอีเมลได้':'This link is single-use. Do not forward it. If you did not request it, you can ignore this email.';
 return {from,to:[email],reply_to:recipient,subject:'Kannika — '+title,text:[title,...paragraphs,url,footnote].join('\n\n'),html:beautyClubEmail({language,title,paragraphs,url,button,footnote})};
}
export async function handleClubAccess(request,{env=process.env,fetchImpl=fetch,now=()=>new Date(),getServices=clubAuthServices,reserve=reserveAccess,generateLink=generateCardLink}={}){
 const reply=(status,body)=>({status,body});
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'].includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 if(!env.RESEND_API_KEY||!env.FIREBASE_SERVICE_ACCOUNT_JSON)return reply(503,{error:'access_not_configured'});
 let email,language;
 try{const body=typeof request.body==='string'?JSON.parse(request.body):request.body;if(JSON.stringify(body).length>1000)throw Error();email=String(body.email||'').trim().toLowerCase();language=body.language;if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['en','th'].includes(language))throw Error()}catch{return reply(400,{error:'invalid_request'})}
 let services,claims;
 try{const token=request.headers.authorization;if(!token?.startsWith('Bearer '))throw Error();services=await getServices(env);claims=await services.auth.verifyIdToken(token.slice(7));if(!claims.uid)throw Error()}catch{return reply(401,{error:'authentication_required'})}
 try{
  const date=now();if(!await reserve(services,email,claims.uid,request.ip||'unknown',date))return reply(429,{error:'too_many_requests'});
  const url=await generateLink(email,language,{env,now:date});
  const emailBody=accessEmail(email,language,url,env.BOOKING_FROM_EMAIL||'Kannika <appointments@kannikabeauty.com>');
  const key='club-access/'+createHash('sha256').update([email,language,accessWindow(date),url].join('/')).digest('hex');
  const sent=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(emailBody),signal:AbortSignal.timeout(8000)});
  if(!sent.ok||!(await sent.json()).id)return reply(503,{error:'email_not_confirmed'});
  // Never return a sign-in link or disclose whether this address already belongs to a member.
  return reply(200,{notification:'sent'});
 }catch{return reply(503,{error:'email_not_confirmed'})}
}
