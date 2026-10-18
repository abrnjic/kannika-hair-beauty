import {menuPrice, menuCategories} from './service-menu-model.js';
export const menuCopy = {
 en:{hair:'Hair',lashes:'Lashes',nails:'Nails & foot care',empty:'No services are currently listed in this category.'},
 th:{hair:'ทำผม',lashes:'ต่อขนตา',nails:'ทำเล็บและดูแลเท้า',empty:'ยังไม่มีรายการบริการในหมวดนี้'}
};
export const escapeMenuText = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function menuMarkup(menu, lang='en') {
 const esc=escapeMenuText,other=lang==='th'?'en':'th',copy=menuCopy[lang];
 const labels=value=>`<span lang="${lang}">${esc(value[lang])}</span><small lang="${other}">${esc(value[other])}</small>`;
 const tabs=menuCategories.map((category,index)=>`<button type="button" role="tab" id="price-tab-${category}" aria-controls="price-panel-${category}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-price-category="${category}">${copy[category]}</button>`).join('');
 const panels=menuCategories.map(category=>{
  const groups=menu.groups.filter(group=>group.category===category && group.services.some(item=>item.visible));
  const content=groups.map(group=>`<section class="price-group"><h3>${labels(group.name)}</h3><ul>${group.services.filter(item=>item.visible).map(item=>`<li class="price-row"><div class="price-treatment"><h4>${labels(item.name)}</h4>${item.description[lang]?`<p lang="${lang}">${esc(item.description[lang])}</p>`:''}</div><div class="price-amount"><strong>${esc(menuPrice(item,lang))}</strong>${item.unit[lang]?`<small lang="${lang}">/ ${esc(item.unit[lang])}</small>`:''}</div></li>`).join('')}</ul></section>`).join('');
  return `<div id="price-panel-${category}" class="price-category" role="tabpanel" aria-labelledby="price-tab-${category}" tabindex="0"><div class="price-groups">${content||`<p>${copy.empty}</p>`}</div></div>`;
 }).join('');
 return `<div class="price-tabs" role="tablist" aria-label="${lang==='th'?'หมวดหมู่บริการ':'Service categories'}">${tabs}</div>${panels}`;
}
export function activateMenuTabs(root,initial='hair') {
 const tabs=[...root.querySelectorAll('[data-price-category]')];
 function select(category,focus=false) {
  for(const tab of tabs) {const active=tab.dataset.priceCategory===category;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
  for(const panel of root.querySelectorAll('.price-category'))panel.hidden=panel.id!==`price-panel-${category}`;
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(tab.dataset.priceCategory));
  tab.addEventListener('keydown',event=>{
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:null;
   if(next!==null){event.preventDefault();select(tabs[next].dataset.priceCategory,true);}
  });
 });
 select(initial);
}
