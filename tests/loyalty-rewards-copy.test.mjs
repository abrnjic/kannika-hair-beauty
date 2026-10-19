import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeTreatmentReward} from '../dist/loyalty-rewards.js';
import {loyaltyEmail} from '../server/loyalty-notifications.mjs';
import {invitationEmail} from '../server/loyalty-invitations.mjs';
import {activationEmail} from '../server/loyalty-activation.mjs';
import {rewardSummary} from '../dist/loyalty-policy.js';
test('wash and flat-iron reward and follow condition are consistent on English and Thai pages',()=>{
 for(const lang of ['en','th']){
  for(const page of ['index.html','club.html']){
   const source=readFileSync(new URL('../dist/'+(lang==='th'?'th/':'')+page,import.meta.url),'utf8');
   assert.ok(source.includes(completeTreatmentReward[lang]));
   assert.ok(!source.includes('A selected complimentary care treatment'));
   if(page==='club.html'){assert.match(source,/id="club-rules"><details open>/);assert.ok(!source.includes('10%'));assert.ok(!source.includes('no value limit'));assert.match(source,/Instagram, Facebook/);}
  }
 }
});
test('invitation, approval and progress emails share the restricted ten-service reward in both languages',()=>{
 for(const language of ['en','th']){
  const member={name:'Client',email:'client@example.com',language};
  const event={type:'visit',language,stamps:10,discountsUsed:0,giftsUsed:0,date:'2026-10-18'};
  for(const email of [invitationEmail(member,'salon','https://example.com/club'),activationEmail(member,'salon'),loyaltyEmail(member,event,'salon')]){
   assert.ok(email.text.includes(completeTreatmentReward[language]));assert.ok(email.html.includes(completeTreatmentReward[language]));
   assert.ok(!email.text.includes('10%'));assert.ok(!email.text.includes('no value limit'));
  }
 }
 assert.equal(rewardSummary({stamps:10}).gifts,1);
 assert.equal(rewardSummary({stamps:10,giftsUsed:1}).gifts,0);
 assert.equal(rewardSummary({stamps:20,giftsUsed:1}).gifts,1);
});
