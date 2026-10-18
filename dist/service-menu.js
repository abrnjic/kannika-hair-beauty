import {language,t} from './i18n.js';
import {validateMenu} from './service-menu-model.js';
import {menuMarkup,activateMenuTabs} from './service-menu-view.js';
const root=document.querySelector('#price-menu-content'),status=document.querySelector('#price-menu-status');
if(root) {
 activateMenuTabs(root);
 status.textContent=t('Loading the latest prices…');
 fetch('/api/service-menu',{cache:'no-store',signal:AbortSignal.timeout(12000)})
  .then(async response=>{if(!response.ok)throw Error();return response.json();})
  .then(result=>{
   const active=root.querySelector('[aria-selected="true"]')?.dataset.priceCategory||'hair';
   root.innerHTML=menuMarkup(validateMenu(result.menu),language);activateMenuTabs(root,active);
   status.textContent='';
  })
  .catch(()=>{status.textContent=t('Prices could not be refreshed. Please confirm current prices with the salon.');});
}
