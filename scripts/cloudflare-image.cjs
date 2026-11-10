'use strict';
const MODEL='@cf/black-forest-labs/flux-1-schnell';
function credentials(value){if(!value||!/^[-_A-Za-z0-9]{20,512}$/.test(value.apiKey||'')||!/^[a-f0-9]{32}$/i.test(value.accountId||''))throw Error('Cloudflare hesap kimliği veya API anahtarı eksik.');return {apiKey:value.apiKey,accountId:value.accountId}}
function createCloudflareHandler({config,saveCredential,fetchImpl=fetch,now=Date.now,minInterval=5000,maxDaily=80}={}){
 let current=config?credentials(config):null,busy=false,last=-Infinity,day='',used=0;
 function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
 async function body(req){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>8192)throw Error('İstek çok büyük.');parts.push(part)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}
 function failure(r){return Error(r.status===429?'Cloudflare ücretsiz kotası doldu veya servis yoğun. Daha sonra yeniden dene.':r.status===401||r.status===403?'Cloudflare anahtarının Workers AI izni doğrulanamadı. Bağlantı yardımcısından kontrol et.':'Cloudflare şu an görsel üretemiyor (HTTP '+r.status+').')}
 return async function(req,res,origin){
  if(!['/image/status','/image/generate','/configure-cloudflare'].includes(req.url))return false;
  if(req.method!=='POST'){reply(res,405,{error:'POST gerekli.'});return true}
  if(req.url==='/image/status'){reply(res,200,{configured:!!current,model:MODEL});return true}
  if(req.url==='/configure-cloudflare'&&(!saveCredential||!origin||origin==='null')){reply(res,403,{error:'Cloudflare anahtarı yalnızca yerel kurulum sayfasından kaydedilebilir.'});return true}
  if(!/^application\/json\b/i.test(req.headers['content-type']||'')){reply(res,415,{error:'JSON isteği gerekli.'});return true}
  if(busy){reply(res,429,{error:'Bir görsel hazırlanıyor. Bekleyip yeniden dene.'});return true}
  let input;try{input=await body(req)}catch(e){reply(res,400,{error:'İstek okunamadı veya çok büyük.'});return true}
  if(busy){reply(res,429,{error:'Bir görsel hazırlanıyor. Bekleyip yeniden dene.'});return true}
  busy=true;
  try{
   if(req.url==='/configure-cloudflare'){
    let next;try{next=credentials(input)}catch(e){reply(res,400,{error:e.message});return true}
    const r=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+next.accountId+'/ai/models/search?search=flux-1-schnell',{headers:{Authorization:'Bearer '+next.apiKey},signal:AbortSignal.timeout(25000)});
    if(!r.ok)throw failure(r);const d=await r.json();if(d.success!==true)throw Error('Cloudflare erişimi doğrulanamadı.');saveCredential(next.apiKey,next.accountId);current=next;reply(res,200,{ok:true});return true;
   }
   if(!current){reply(res,503,{error:'Cloudflare henüz bağlanmadı. FLUX Başlat.cmd yardımcısındaki bağlantıyı tamamla.'});return true}
   if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>1500){reply(res,400,{error:'Görselini 1–1500 karakterle tarif et.'});return true}
   const date=new Date(now()).toISOString().slice(0,10);if(date!==day){day=date;used=0}
   if(now()-last<minInterval||used>=maxDaily){reply(res,429,{error:'Görsel istek sınırına ulaşıldı. Bir süre sonra yeniden dene.'});return true}
   last=now();used++;const started=now();
   const r=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+current.accountId+'/ai/run/'+MODEL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+current.apiKey},signal:AbortSignal.timeout(90000),body:JSON.stringify({prompt:input.prompt.trim()+', high quality artwork, no text, no lettering, no watermark',steps:4})});
   if(!r.ok)throw failure(r);const d=await r.json(),img=d.result&&d.result.image;if(d.success!==true||typeof img!=='string'||img.length>8000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(img))throw Error('Cloudflare görseli güvenli biçimde okunamadı.');
   reply(res,200,{src:'data:image/jpeg;base64,'+img,model:'FLUX.1 Schnell · Cloudflare',ms:Math.max(0,now()-started)});
  }catch(e){reply(res,502,{error:e.name==='TimeoutError'?'Cloudflare zaman aşımına uğradı. Kartın değişmedi.':e instanceof TypeError?'Cloudflare bağlantısı kurulamadı. Kartın değişmedi.':e.message})}finally{busy=false}
  return true;
 };
}
module.exports={createCloudflareHandler,MODEL};
