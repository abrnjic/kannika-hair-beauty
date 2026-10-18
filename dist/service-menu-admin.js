import {t,language,locale,localizeValidation} from './i18n.js';
import {validateMenu,menuPrice} from './service-menu-model.js';
import {menuMarkup,activateMenuTabs} from './service-menu-view.js';
export function setupMenuAdmin(getAdministrator) {
 const $=selector=>document.querySelector(selector),section=$('#price-editor'),form=$('#price-editor-form');
 let saved=null,draft=null,revision=0,generation=0,dirty=false,busy=false,groupId='',serviceId='';
 const message=(text,error=false)=>{const el=$('#price-editor-message');el.textContent=text;el.className=error?'error':'notice';el.hidden=!text;};
 const group=()=>draft?.groups.find(item=>item.id===groupId);
 const service=()=>group()?.services.find(item=>item.id===serviceId);
 function controls(){
  $('#price-fields').disabled=busy||!draft;$('#publish-price-menu').disabled=busy||!dirty;$('#discard-price-menu').disabled=busy||!dirty;$('#reload-price-menu').disabled=busy;
  $('#price-draft-state').textContent=t(dirty?'Unpublished changes':'Published version');
 }
 function mark(){dirty=true;controls();}
 function option(value,text){const el=document.createElement('option');el.value=value;el.textContent=text;return el;}
 function renderGroups(){
  $('#price-group').replaceChildren(...draft.groups.map(item=>option(item.id,item.name[language]+' · '+item.services.length)));
  if(!draft.groups.some(item=>item.id===groupId))groupId=draft.groups[0]?.id||'';
  $('#price-group').value=groupId;renderServices();
 }
 function renderServices(){
  const current=group();$('#price-group-en').value=current?.name.en||'';$('#price-group-th').value=current?.name.th||'';
  $('#price-service').replaceChildren(...(current?.services||[]).map(item=>option(item.id,(item.name[language]||t('New service'))+' · '+(Number.isFinite(item.min)?menuPrice(item,language):'…')+(!item.visible?' · '+t('Hidden'):''))));
  if(!current?.services.some(item=>item.id===serviceId))serviceId=current?.services[0]?.id||'';
  $('#price-service').value=serviceId;renderFields();
 }
 function renderFields(){
  const current=service();$('#price-service-fields').hidden=!current;
  for(const field of $('#price-service-fields').querySelectorAll('input,select,textarea'))field.disabled=!current;
  for(const lang of ['en','th'])for(const key of ['name','description','unit'])$(`#price-${key}-${lang}`).value=current?.[key][lang]||'';
  $('#price-min').value=current?.min??'';$('#price-max').value=current?.max??'';$('#price-kind').value=current?.priceKind||'range';$('#price-visible').checked=current?.visible??true;
  $('#price-max').disabled=!current||current.priceKind==='fixed';$('#price-max').required=current?.priceKind!=='fixed';
  const index=group()?.services.findIndex(item=>item.id===serviceId)??-1;
  $('#move-price-up').disabled=index<=0;$('#move-price-down').disabled=index<0||index===(group()?.services.length??0)-1;
 }
 function edit(event){
  if(!draft||busy)return;const el=event.target,id=el.id,current=service();
  if(id==='price-group-en'||id==='price-group-th')group().name[id.endsWith('en')?'en':'th']=el.value;
  else if(current){
   const match=id.match(/^price-(name|description|unit)-(en|th)$/);
   if(match)current[match[1]][match[2]]=el.value;
   else if(id==='price-min'||id==='price-max'){current[id==='price-min'?'min':'max']=el.value===''?null:Number(el.value);if(current.priceKind==='fixed'){current.max=current.min;$('#price-max').value=current.min??'';}}
   else if(id==='price-visible')current.visible=el.checked;
   else if(id==='price-kind'){current.priceKind=el.value;if(el.value==='fixed'){current.max=current.min;$('#price-max').value=current.min??'';}$('#price-max').disabled=el.value==='fixed';$('#price-max').required=el.value!=='fixed';}
   else return;
  }else return;
  mark();
 }
 form.addEventListener('input',edit);$('#price-kind').addEventListener('change',edit);
 $('#price-group').addEventListener('change',()=>{groupId=$('#price-group').value;serviceId='';renderServices();});
 $('#price-service').addEventListener('change',()=>{serviceId=$('#price-service').value;renderFields();});
 $('#add-price-service').addEventListener('click',()=>{
  const current=group();if(!current)return;
  if(draft.groups.reduce((total,item)=>total+item.services.length,0)>=200){message(t('The menu can contain up to 200 services.'),true);return;}
  const item={id:'service-'+crypto.randomUUID(),name:{en:'',th:''},description:{en:'',th:''},unit:{en:'',th:''},min:null,max:null,priceKind:'range',visible:true};
  current.services.push(item);serviceId=item.id;mark();renderServices();$('#price-name-en').focus();
 });
 $('#remove-price-service').addEventListener('click',()=>{
  if(!service()||!confirm(t('Remove this service from the draft? Publish to apply the removal.')))return;
  group().services=group().services.filter(item=>item.id!==serviceId);serviceId='';mark();renderServices();
 });
 for(const [id,offset] of [['#move-price-up',-1],['#move-price-down',1]])$(id).addEventListener('click',()=>{
  const items=group()?.services;if(!items)return;const index=items.findIndex(item=>item.id===serviceId),target=index+offset;
  if(index<0||target<0||target>=items.length)return;[items[index],items[target]]=[items[target],items[index]];mark();renderServices();
 });
 $('#discard-price-menu').addEventListener('click',()=>{if(saved&&confirm(t('Discard unpublished price changes?'))){draft=structuredClone(saved);dirty=false;renderGroups();controls();message('');}});
 async function load(){
  const administrator=getAdministrator();if(!administrator||busy)return;
  if(dirty&&!confirm(t('Discard unpublished price changes?')))return;
  const ticket=++generation;busy=true;controls();message(t('Loading price list…'));
  try{
   const token=await administrator.getIdToken();
   if(ticket!==generation||getAdministrator()!==administrator)return;
   const response=await fetch('/api/service-menu?editor=1',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)});const result=await response.json();
   if(ticket!==generation||getAdministrator()!==administrator)return;
   if(!response.ok)throw Error(t(response.status===403?'Only authorised administrators can edit prices.':'Could not load the price list. Please try again.'));
   saved=validateMenu(result.menu);draft=structuredClone(saved);revision=result.revision;dirty=false;renderGroups();message(t('Price list loaded. Changes are public only after publishing.'));
   $('#price-updated').textContent=result.updatedAt?t('Last published: {date}',{date:new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(result.updatedAt))}):t('Initial price list');
  }catch(error){if(ticket===generation)message(error.message||t('Could not load the price list. Please try again.'),true);}
  finally{if(ticket===generation){busy=false;controls();}}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();const administrator=getAdministrator();if(!administrator||busy||!dirty)return;
  let menu;try{menu=validateMenu(draft);}catch{message(t('Complete both language names and valid prices for every service. The maximum price must not be below the minimum.'),true);return;}
  const ticket=generation;busy=true;controls();message(t('Publishing price list…'));
  try{
   const token=await administrator.getIdToken();if(ticket!==generation||getAdministrator()!==administrator)return;
   const response=await fetch('/api/service-menu',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({menu,revision}),signal:AbortSignal.timeout(20000)});const result=await response.json();
   if(ticket!==generation||getAdministrator()!==administrator)return;
   if(!response.ok||!result.saved)throw Error(t(response.status===409?'Another administrator changed the price list. Reload before editing again.':response.status===403||response.status===401?'Only authorised administrators can edit prices.':'Could not publish. Your draft is preserved. Please try again.'));
   saved=validateMenu(result.menu);draft=structuredClone(saved);revision=result.revision;dirty=false;renderGroups();message(t('Price list published. Clients see the updated prices on the website.'));
   $('#price-updated').textContent=t('Last published: {date}',{date:new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(result.updatedAt))});
  }catch(error){if(ticket===generation)message(error.message||t('Could not publish. Your draft is preserved. Please try again.'),true);}
  finally{if(ticket===generation){busy=false;controls();}}
 });
 $('#preview-price-menu').addEventListener('click',()=>{
  try{const menu=validateMenu(draft);$('#price-preview-content').innerHTML=menuMarkup(menu,language);activateMenuTabs($('#price-preview-content'));$('#price-preview').showModal();}catch{message(t('Complete both language names and valid prices for every service. The maximum price must not be below the minimum.'),true);}
 });
 $('#close-price-preview').addEventListener('click',()=>$('#price-preview').close());
 $('#reload-price-menu').addEventListener('click',load);
 $('#edit-price-list').addEventListener('click',()=>{section.scrollIntoView({behavior:'smooth'});$('#price-group').focus();if(!draft)load();});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 localizeValidation(form);controls();
 return {start(){section.hidden=false;load();},reset(){++generation;saved=null;draft=null;revision=0;dirty=false;busy=false;groupId='';serviceId='';section.hidden=true;form.reset();$('#price-group').replaceChildren();$('#price-service').replaceChildren();$('#price-updated').textContent='';message('');if($('#price-preview').open)$('#price-preview').close();$('#price-preview-content').replaceChildren();controls();},isSaving:()=>busy};
}
