import {clubAuthServices,cardTokenId} from './club-auth.mjs';
const origins=['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'];
const timestamp=value=>value?.toMillis?.()??value?.getTime?.()??0;
const failure=status=>Object.assign(Error('Link unavailable'),{status});
function valid(data,attemptId,now){if(!data||timestamp(data.expiresAt)<=now)throw failure(410);if(data.usedAt&&(data.attemptId!==attemptId||timestamp(data.receiptExpiresAt)<=now))throw failure(410)}
async function findUser(auth,email){try{return await auth.getUserByEmail(email)}catch(error){if(error.code==='auth/user-not-found')return null;throw error}}
export async function handleClubEntry(request,{env=process.env,now=()=>new Date(),getServices=clubAuthServices}={}){
 const reply=(status,body)=>({status,body});
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!origins.includes(request.headers.origin))return reply(403,{error:'origin_not_allowed'});
 if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)return reply(503,{error:'access_not_configured'});
 let input;
 try{input=typeof request.body==='string'?JSON.parse(request.body):request.body;if(JSON.stringify(input).length>1000||!['preview','open'].includes(input.action)||!/^[-a-f0-9]{36}$/.test(input.attemptId)||!/^[a-f0-9]{64}$/.test(input.token))throw Error()}catch{return reply(400,{error:'invalid_request'})}
 try{
  const date=now(),time=date.getTime(),{auth,db}=await getServices(env),ref=db.collection('clubAccessTokens').doc(cardTokenId(input.token));
  const data=(await ref.get()).data();valid(data,input.attemptId,time);
  if(input.action==='preview'){
   const user=await findUser(auth,data.email);if(user?.disabled)throw failure(403);
   const member=user?(await db.collection('loyaltyMembers').doc(user.uid).get()).data():null;
   // Preview never signs in, creates a user, records consent or consumes the link.
   return reply(200,{email:data.email,name:member?.name||data.name||'',language:data.language,enrolled:!!member});
  }
  if(input.confirm!==true)return reply(400,{error:'confirmation_required'});
  const state=await db.runTransaction(async tx=>{
   const latest=(await tx.get(ref)).data();valid(latest,input.attemptId,time);
   if(latest.usedAt)return {sessionToken:latest.sessionToken};
   if(latest.attemptId&&latest.attemptId!==input.attemptId&&timestamp(latest.leaseUntil)>time)throw failure(409);
   tx.update(ref,{attemptId:input.attemptId,leaseUntil:new Date(time+30000)});return {};
  });
  if(state.sessionToken)return reply(200,{sessionToken:state.sessionToken});
  let user=await findUser(auth,data.email);
  if(!user){try{user=await auth.createUser({email:data.email,emailVerified:true})}catch(error){if(error.code!=='auth/email-already-exists')throw error;user=await auth.getUserByEmail(data.email)}}
  if(user.disabled)throw failure(403);
  // Possession of the high-entropy email link plus explicit confirmation proves this mailbox.
  if(!user.emailVerified)user=await auth.updateUser(user.uid,{emailVerified:true});
  const sessionToken=await auth.createCustomToken(user.uid);
  const result=await db.runTransaction(async tx=>{
   const latest=(await tx.get(ref)).data();valid(latest,input.attemptId,time);
   if(latest.usedAt)return latest.sessionToken;
   if(latest.attemptId!==input.attemptId)throw failure(409);
   tx.update(ref,{usedAt:date,sessionToken,receiptExpiresAt:new Date(time+300000)});return sessionToken;
  });
  return reply(200,{sessionToken:result});
 }catch(error){return reply(error.status||503,{error:error.status?'link_unavailable':'access_unavailable'})}
}
