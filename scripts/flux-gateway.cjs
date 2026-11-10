'use strict';
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {windowsSecretStore}=require('./windows-secret.cjs'),{createCloudflareHandler}=require('./cloudflare-image.cjs');
function createGateway({token,port=8766,cloudflare,saveCloudflareCredential,fetchImpl=fetch}={}){
 if(!/^[-_a-zA-Z0-9]{32,100}$/.test(token||''))throw Error('FLUX bağlantı kodu eksik.');
 const imageHandler=createCloudflareHandler({config:cloudflare,saveCredential:saveCloudflareCredential,fetchImpl});
 function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
 const origins=new Set(['null','http://127.0.0.1:'+port,'http://localhost:'+port]);
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)||origin&&!origins.has(origin)){reply(res,403,{error:'Bu adresten bağlantıya izin verilmiyor.'});return}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.writeHead(204);res.end();return}
  if(req.url==='/health'&&req.method==='GET'){reply(res,200,{ok:true,app:'umutcan-flux'});return}
  if(req.url.split('?')[0]==='/setup'&&req.method==='GET'){
   const html=fs.readFileSync(path.join(__dirname,'flux-setup.html'),'utf8').replace(/\r\n/g,'\n'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'sha256-"+crypto.createHash('sha256').update(script).digest('base64')+"'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(html);return;
  }
  const a=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,'')),b=Buffer.from(token);if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){reply(res,401,{error:'Bağlantı kodu geçersiz. FLUX yardımcısındaki kodu kullan.'});return}
  if(req.url==='/stop'&&req.method==='POST'){reply(res,200,{ok:true});server.close();return}
  // Old installed apps use /connect before /image/generate. No old AI routes are retained.
  if(req.url==='/connect'&&req.method==='POST'){reply(res,200,{ok:true,model:'FLUX.1 Schnell'});return}
  if(await imageHandler(req,res,origin))return;reply(res,404,{error:'İşlem bulunamadı.'});
 });return server;
}
function startStandalone(){
 const dir=path.resolve(__dirname,'../.local');fs.mkdirSync(dir,{recursive:true});
 const store=windowsSecretStore(path.join(dir,'cloudflare-credential.xml'));let cloudflare=null;try{const saved=store.load();if(saved)cloudflare={apiKey:saved.apiKey,accountId:saved.token}}catch(e){}
 let token='';for(const file of ['flux-link.json','gemini-link.json']){try{const candidate=new URL(JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')).url).hash.slice(1);if(/^[a-f0-9]{64}$/.test(candidate)){token=candidate;break}}catch(e){}}
 if(!token)token=crypto.randomBytes(32).toString('hex');
 const server=createGateway({token,cloudflare,saveCloudflareCredential:(key,account)=>store.save(key,account)});
 server.on('error',()=>{console.error('FLUX yardımcısı başlatılamadı. Port kullanımda olabilir.');process.exitCode=1});
 server.listen(8766,'127.0.0.1',()=>{fs.writeFileSync(path.join(dir,'flux-link.json'),JSON.stringify({url:'http://127.0.0.1:8766/setup#'+token}));console.log('FLUX yerel bağlantısı hazır.');});
}
if(require.main===module)startStandalone();
module.exports={createGateway,startStandalone};
