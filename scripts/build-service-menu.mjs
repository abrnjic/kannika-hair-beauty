import {readFileSync,writeFileSync} from 'node:fs';
import {validateMenu} from '../dist/service-menu-model.js';
import {menuMarkup} from '../dist/service-menu-view.js';
const menu=validateMenu(JSON.parse(readFileSync(new URL('../dist/service-menu-default.json',import.meta.url),'utf8')));
if(process.argv.includes('--thai-only')) {
 const file=new URL('../dist/th/index.html',import.meta.url);
 let source=readFileSync(file,'utf8');
 source=source.replace(/(<div id="price-menu-content">)[\s\S]*?(<\/div><div class="price-menu-footer">)/, (_,start,end)=>start+menuMarkup(menu,'th')+end);
 writeFileSync(file,source);process.exit(0);
}
const file=new URL('../dist/index.html',import.meta.url);let source=readFileSync(file,'utf8');
const section=`<section id="prices" class="section price-menu" aria-labelledby="price-menu-title"><div class="section-heading"><div><div class="eyebrow">THE KANNIKA SERVICE MENU</div><h2 id="price-menu-title">Your care.<br><em>Clearly priced.</em></h2></div><p>Explore our treatments and prices.<br>All prices are in Thai baht (THB).</p></div><p id="price-menu-status" class="price-menu-status" role="status" aria-live="polite"></p><div id="price-menu-content">${menuMarkup(menu)}</div><div class="price-menu-footer"><p>Your preferred appointment requires confirmation from the salon.</p><button type="button" class="button" data-book>Book an appointment <span>↗</span></button></div></section>`;
source=source.replace(/<!-- SERVICE_MENU_START -->[\s\S]*?<!-- SERVICE_MENU_END -->\n?/, '');
source=source.replace('<section class="journal',`<!-- SERVICE_MENU_START -->${section}<!-- SERVICE_MENU_END -->\n<section class="journal`);
// The current journal may use a different order of class/id attributes.
if(!source.includes('SERVICE_MENU_START'))source=source.replace(/(<section[^>]*id="journal"[^>]*>)/,`<!-- SERVICE_MENU_START -->${section}<!-- SERVICE_MENU_END -->\n$1`);
if(!source.includes('SERVICE_MENU_START'))throw Error('journal anchor not found');
if(!source.includes('/service-menu.css'))source=source.replace('</head>','<link rel="stylesheet" href="/service-menu.css"></head>');
if(!source.includes('src="/service-menu.js"'))source=source.replace('<script type="module" src="/app.js">','<script type="module" src="/service-menu.js"></script><script type="module" src="/app.js">');
if(!source.includes('<a href="#prices">'))source=source.replace('<a href="#journal">The journal</a>','<a href="#prices">Price list</a><a href="#journal">The journal</a>');
source=source.replace('Treatment details and prices will be added soon. Photographs are for inspiration.','Explore our full price list below. Photographs are for inspiration.');
if(!source.includes('service-price-link'))source=source.replace('</p></section>\n<!-- SERVICE_MENU_START','</p></section>\n<!-- SERVICE_MENU_START');
writeFileSync(file,source);
console.log('Built 49-service baseline markup; latest published menu loads at runtime.');
