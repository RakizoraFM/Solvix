// Real Edge layout checks against the built page. External assets are blocked to also check font fallback.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../outputs/NV39-previews');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'));const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
const sizes=[[320,740],[375,812],[768,1024],[980,720],[1024,600],[1280,720],[1366,768],[1600,575],[1920,1080],[2560,1080],[3200,1440],[1440,500]];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const context=await browser.newContext();const origin='http://127.0.0.1:'+server.address().port;
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const mock=require('./mock-server')();await context.exposeFunction('__mockCall',j=>mock.handle(j));await context.addInitScript({path:path.join(__dirname,'mock-client.js')});let count=0;
 for(const mode of ['cloud','local']){await page.goto(origin+(mode==='local'?'/?local#login':'/#login'));await page.waitForSelector('.sx-card');
 for(const lang of ['ar','en'])for(const [width,height] of sizes){await page.setViewportSize({width,height});await page.evaluate(l=>{lsSet('nv_lang',l);route()},lang);await page.waitForSelector('.sx-card');
 const m=await page.evaluate(()=>{const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display}};return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,root:rect('.sx-auth'),main:rect('.sx-main'),card:rect('.sx-card'),hero:rect('.sx-hero'),input:rect('.sx-in input'),panel:rect('.sx-panel'),footer:rect('.sx-foot'),dir:document.documentElement.dir}});
 assert.ok(m.scroll<=m.viewport+1,`${lang} ${width}: horizontal overflow ${JSON.stringify(m)}`);assert.ok(m.main.w<=1441,`${width}: unbounded main`);assert.ok(Math.abs(m.main.x+m.main.w/2-m.viewport/2)<2,`${width}: main not centered`);assert.ok(m.card.x>=-1&&m.card.right<=m.viewport+1,`${width}: clipped card`);assert.ok(m.input.w>=140&&m.input.h>=48,`${width}: input too small`);assert.ok(m.panel.w>0,`${width}: invalid panel width`);
 if(width<=980){assert.ok(m.hero.y>=m.card.bottom-1,`${width}: mobile sections overlap`)}else{assert.ok(lang==='ar'?m.hero.right<=m.card.x+1:m.card.right<=m.hero.x+1,`${width}: desktop sections overlap`)}
 assert.equal(m.dir,lang==='ar'?'rtl':'ltr');count++;console.log(`PASS ${mode} ${lang} ${width}x${height}`);
 if(mode==='cloud'&&lang==='ar'&&((width===1600&&height===575)||width===375||width===2560)){await page.screenshot({path:path.join(out,`login-${mode}-${lang}-${width}.png`),fullPage:true})}
 }
 }
 assert.deepEqual(errors,[]);console.log(count+' real-browser layout checks passed; no uncaught page errors');await context.close();
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
