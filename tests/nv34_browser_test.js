// Playwright smoke test with a local HTTP server and the Supabase stand-in.
// No live Supabase project or external service is contacted.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),mock=require('./mock-server')();
const server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.setHeader('Content-Type',target.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(target))}catch{res.writeHead(404);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/index.html';
 const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
 const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
 try{const context=await browser.newContext();await context.route('**/*',r=>r.request().url().startsWith(url.split('/index.html')[0])?r.continue():r.abort());
 await context.exposeFunction('__mockCall',j=>mock.handle(j));await context.addInitScript({path:path.join(__dirname,'mock-client.js')});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'#login');await page.waitForSelector('#em');assert.equal(await page.locator('#pw').getAttribute('type'),'password');console.log('PASS cloud login renders');
 await page.fill('#em','admin@x.com');await page.fill('#pw','wrong');await page.click('button[type=submit]');await page.waitForSelector('.sx-err');console.log('PASS invalid sign-in rejected');
 await page.fill('#pw','adminpass');await page.click('button[type=submit]');await page.waitForSelector('#initCloud');console.log('PASS signed-in dashboard renders with NV34 settings RPC');
 assert.equal(await page.evaluate(()=>Cloud.role),'admin');
 assert.equal(await page.evaluate(async()=>await Cloud.signOut()),true);assert.equal(await page.evaluate(()=>S.collections.length),0);console.log('PASS logout clears cached records');
 await page.goto(url+'?local#login');await page.waitForSelector('#employee-id');console.log('PASS standalone local mode still renders');
 assert.deepEqual(errors,[]);console.log('PASS no uncaught browser errors');await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
