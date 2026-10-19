export function rewardSummary(member={}){
 const stamps=member.stamps??0,discountsUsed=member.discountsUsed??0,giftsUsed=member.giftsUsed??0;
 if(![stamps,discountsUsed,giftsUsed].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Invalid loyalty balance.');
 const legacyDiscountEarned=Math.floor((stamps+5)/10),giftEarned=Math.floor(stamps/10);
 if(discountsUsed>legacyDiscountEarned||giftsUsed>giftEarned)throw Error('Invalid loyalty balance.');
 return {stamps,progress:stamps%10,discounts:0,gifts:giftEarned-giftsUsed,next:10-stamps%10};
}
export function memberDetails(input){
 const name=String(input.name??'').trim();if(!name||name.length>100)throw Error('Please enter your name.');
 if(input.consent!==true)throw Error('Please agree to the Beauty Club rules.');
 return {name,language:input.language==='th'?'th':'en',consent:true,marketingConsent:input.marketingConsent===true,termsVersion:'1'};
}
export async function manualEventId(date,reference){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose a valid visit date.');
 const ref=String(reference??'').trim().toUpperCase();if(!ref||ref.length>100)throw Error('Enter a unique receipt or visit reference.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(date+'|'+ref));
 return 'manual_'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
