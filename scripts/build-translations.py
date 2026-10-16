"""Build fully translated Thai HTML; preserve canonical form values and data keys."""
from html.parser import HTMLParser
from html import escape,unescape
from pathlib import Path
import json,re
translations=json.loads(Path('translations/th.json').read_text())
location=json.loads(Path('salon-location.json').read_text())
Path('dist/translations-th.js').write_text('export default '+json.dumps(translations,ensure_ascii=False,indent=2)+';\n')
font='<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&amp;display=swap" rel="stylesheet"><link rel="stylesheet" href="/i18n.css">'
for file,is_admin in [('index.html',False),('admin.html',True)]:
 p=Path('dist')/file;s=p.read_text()
 if not is_admin:
  # Both footer links open the owner's verified place pin, never a text search.
  s=re.sub(r'(<a class="salon-address" href=")[^"]+(")',lambda m:m[1]+escape(location['googlePlaceUrl'],quote=True)+m[2],s)
  s=re.sub(r'(<a class="text-link" href=")[^"]+("[^>]*>Find us on Google Maps ↗</a>)',lambda m:m[1]+escape(location['googlePlaceUrl'],quote=True)+m[2],s)
 # Option text may be translated, but submitted values must match deployed rules.
 s=re.sub(r'<option>([^<]+)</option>',lambda m:'<option value="'+escape(unescape(m[1]),quote=True)+'">'+m[1]+'</option>',s)
 s=re.sub(r'((?:href|src)=")(assets/[^\"]+|style.css|app.js)(")',r'\1/\2\3',s)
 if not is_admin:
  s=re.sub(r'<span class="language"[^>]*>EN</span>', '<nav class="language-switch" aria-label="Language"><a href="/" lang="en" aria-current="page">EN</a><a href="/th/" lang="th">ไทย</a></nav>',s)
 elif 'class="language-switch"' not in s:
  s=s.replace('<span class="workspace-label">SALON WORKSPACE</span>','<nav class="language-switch" aria-label="Language"><a href="/admin" lang="en" aria-current="page">EN</a><a href="/th/admin" lang="th">ไทย</a></nav><span class="workspace-label">SALON WORKSPACE</span>')
 if '/i18n.css' not in s:s=s.replace('</head>',font+'</head>')
 # Metadata links are relative to the current origin, including local preview.
 if 'hreflang=' not in s:s=s.replace('</head>',f'<link rel="alternate" hreflang="en" href="{"/admin" if is_admin else "/"}"><link rel="alternate" hreflang="th" href="{"/th/admin" if is_admin else "/th/"}"></head>')
 p.write_text(s)
 class ThaiPage(HTMLParser):
  def __init__(self):super().__init__(convert_charrefs=True);self.parts=[]
  def handle_decl(self,decl):self.parts.append('<!'+decl+'>')
  def handle_starttag(self,tag,attrs):
   result=[]
   for key,value in attrs:
    if value is None:result.append(key);continue
    if key=='lang' and tag=='html':value='th'
    elif key in ['alt','aria-label','placeholder','title','label','data-title','content']:value=translations.get(value,value)
    elif key=='href' and value in ['/','/admin']:
     # Keep language switch and alternate links pointing to the chosen language.
     if not any(k in ['lang','hreflang'] for k,v in attrs):value='/th/' if value=='/' else '/th/admin'
    if key=='aria-current':continue
    result.append(key+'="'+escape(value,quote=True)+'"')
   if tag=='a' and ('lang','th') in attrs:result.append('aria-current="page"')
   self.parts.append('<'+tag+(' '+' '.join(result) if result else '')+'>')
  def handle_endtag(self,tag):self.parts.append('</'+tag+'>')
  def handle_data(self,data):
   key=data.strip();value=data.replace(key,translations.get(key,key)) if key else data
   self.parts.append(escape(value,quote=False))
  def handle_comment(self,text):self.parts.append('<!--'+text+'-->')
 thai_source=s.replace('<h2>A little <em>inspiration.</em></h2>','<h2>เติม<em>แรงบันดาลใจ</em></h2>').replace('Your <em>privacy.</em>','ความเป็นส่วนตัว<em>ของคุณ</em>')
 parser=ThaiPage();parser.feed(thai_source)
 out=Path('dist/th')/file;out.parent.mkdir(exist_ok=True);out.write_text(''.join(parser.parts)+'\n')
