# Builds ../index.html from the parts (run from this folder: python3 build.py).
# After changing classes in parts/field.js, rebuild the Tailwind CSS first:
#   npx tailwindcss@3.4.17 -c tailwind.config.js -i tw-in.css -o tailwind.css --minify
import os,json,re,sys
H=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(H,f),encoding='utf-8').read()
head=r('parts/head.html').replace('__TWCSS__',r('tailwind.css')).replace('__SEED__',r('seed.json').replace('</','<\\/')).replace('__I18N__',r('i18n.json').replace('</','<\\/')).replace('__LOGO__',r('logo.b64').strip()).replace('__ICON__',r('icon.b64').strip())
guide=json.loads(r('platform-guide.json'))
releases=json.loads(r('releases.json'))
version=re.search(r"version:'(NV\d+)'",r('parts/core.js')).group(1)
if guide['version']!=version or releases['version']!=version or releases['releases'][0]['version']!=version:
    raise ValueError('Update the platform guide and release history for '+version)
ids=set()
for feature in guide['features']:
    if feature['id'] in ids or feature['reviewed_in']!=version or not all(feature.get(k) for k in ['id','name','what','where','steps','who','route']):
        raise ValueError('Incomplete or stale guide entry: '+feature.get('id','?'))
    ids.add(feature['id'])
if '--release' in sys.argv and any(c['status']=='pending' for c in releases['releases'][0]['checks']):
    raise ValueError('Complete release verification before packaging')
payload=lambda value:json.dumps(value,ensure_ascii=False).replace('<','\\u003c')
system=r('parts/system.js').replace('__PLATFORM_GUIDE__',payload(guide)).replace('__PLATFORM_RELEASES__',payload(releases))
out=head+r('parts/auth.css')+r('parts/operations.css')+''.join(r('parts/'+f) for f in ['core.js','cloud.js','field.js','auth.js','admin.js','clients.js','operations.js'])+system+r('parts/productivity.js')+r('parts/boot.js')
open(os.path.join(H,'..','index.html'),'w',encoding='utf-8').write(out)
manual=['# دليل منصة Solvix — '+version,'','آخر مراجعة: '+guide['updated_at'],'']
for f in guide['features']:
    manual+=['## '+f['name'],'','**ما هي؟** '+f['what'],'','**أين تجدها؟** '+f['where'],'','**كيف تستخدمها؟**','']+[str(i+1)+'. '+s for i,s in enumerate(f['steps'])]+['','**من يستخدمها؟** '+f['who'],'']
open(os.path.join(H,'..','PLATFORM_GUIDE_AR.md'),'w',encoding='utf-8').write('\n'.join(manual))
print(len(out.encode()),'bytes')
