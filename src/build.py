# Builds ../index.html from the parts (run from this folder: python3 build.py).
# After changing classes in parts/field.js, rebuild the Tailwind CSS first:
#   npx tailwindcss@3.4.17 -c tailwind.config.js -i tw-in.css -o tailwind.css --minify
import os
H=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(H,f),encoding='utf-8').read()
head=r('parts/head.html').replace('__TWCSS__',r('tailwind.css')).replace('__SEED__',r('seed.json').replace('</','<\\/')).replace('__I18N__',r('i18n.json').replace('</','<\\/')).replace('__LOGO__',r('logo.b64').strip()).replace('__ICON__',r('icon.b64').strip())
out=head+r('parts/auth.css')+''.join(r('parts/'+f) for f in ['core.js','cloud.js','field.js','auth.js','admin.js','boot.js'])
open(os.path.join(H,'..','index.html'),'w',encoding='utf-8').write(out)
print(len(out.encode()),'bytes')
