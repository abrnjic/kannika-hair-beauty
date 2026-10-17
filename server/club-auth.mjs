import {createHash,randomBytes} from 'node:crypto';
const projectId='kannika-4f9b6';
let services;
export async function clubAuthServices(env=process.env){
 if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)throw Error('club_auth_not_configured');
 if(services)return services;
 const account=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
 if(account.project_id!==projectId)throw Error('club_auth_wrong_project');
 const [{initializeApp,cert,getApps},{getAuth},{getFirestore}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/auth'),import('firebase-admin/firestore')]);
 const app=getApps().find(app=>app.name==='club-server')||initializeApp({credential:cert(account),projectId},'club-server');
 services={auth:getAuth(app),db:getFirestore(app)};return services;
}
const hash=value=>createHash('sha256').update(value).digest('hex');
export const accessWindow=now=>Math.floor(now.getTime()/1800000);
// Rate-limit atomically on the server, including a global daily cap. No raw IPs are stored.
export async function reserveAccess({db},email,uid,ip,now){
 const time=now.getTime(),hour=Math.floor(time/3600000),day=Math.floor(time/86400000);
 const limits=[['email/'+email+'/'+day,5,60000],['user/'+uid+'/'+hour,5,0],['ip/'+ip+'/'+hour,10,0],['global/'+day,100,0]];
 return db.runTransaction(async tx=>{
  const refs=limits.map(([key])=>db.collection('clubAccessLimits').doc(hash(key))),snapshots=await tx.getAll(...refs);
  if(snapshots.some((snap,i)=>{const data=snap.data();return (data?.count||0)>=limits[i][1]||(limits[i][2]&&data?.lastAt&&time-data.lastAt<limits[i][2])}))return false;
  refs.forEach((ref,i)=>tx.set(ref,{count:(snapshots[i].data()?.count||0)+1,lastAt:time,expiresAt:new Date(time+172800000)}));return true;
 });
}
export async function generateCardLink(email,language,{env=process.env,now=new Date(),purpose='access',name='',getServices=clubAuthServices}={}){
 const {db}=await getServices(env),id=hash([purpose,email,language,accessWindow(now)].join('/'));
 const cache=db.collection('clubAccessLinks').doc(id),token=randomBytes(32).toString('hex'),tokenId=hash(token);
 const link='https://kannika-hair-beauty.vercel.app'+(language==='th'?'/th/club':'/club')+'#access='+token;
 return db.runTransaction(async tx=>{
  const previous=(await tx.get(cache)).data();
  if(previous?.tokenId){const stored=(await tx.get(db.collection('clubAccessTokens').doc(previous.tokenId))).data();if(stored&&!stored.usedAt&&(stored.expiresAt.toMillis?.()??stored.expiresAt.getTime())>now.getTime())return previous.link}
  tx.set(db.collection('clubAccessTokens').doc(tokenId),{email,language,name,purpose,expiresAt:new Date(now.getTime()+86400000)});
  tx.set(cache,{link,tokenId,expiresAt:new Date(now.getTime()+86400000)});return link;
 });
}
export const cardTokenId=token=>hash(token);
