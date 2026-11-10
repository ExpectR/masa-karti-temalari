(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.UmutHorde=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 var BASE='https://aihorde.net/api/v2',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 function client(fetcher){
  async function request(path,method,body,signal){
   var r=await fetcher(BASE+path,{method:method||'GET',headers:{'Content-Type':'application/json',apikey:'0000000000','Client-Agent':'MasaKartiAtolyesi:2.2.12:github.com/ExpectR/masa-karti-temalari'},body:body?JSON.stringify(body):undefined,signal:signal||AbortSignal.timeout(30000)});
   if(!r.ok)throw Error(r.status===429?'Ücretsiz servis yoğun veya anonim kota dolu. Bir süre sonra yeniden dene.':r.status===404?'Üretim sırası sona ermiş. Yeni görsel üretebilirsin.':r.status===400?'Servis bu isteği kabul etmedi. Tarifini değiştirip yeniden dene.':'Görsel servisine bağlanılamadı (HTTP '+r.status+').');
   return r.json();
  }
  function path(id,type){if(!ID.test(id))throw Error('Geçersiz üretim kaydı.');return '/generate/'+type+'/'+id}
  return {
   start:async function(prompt,landscape,signal){
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1500)throw Error('Görselini 1–1500 karakterle tarif et.');
    var d=await request('/generate/async','POST',{prompt:prompt.trim()+', high quality artwork###text, letters, typography, watermark, signature, blurry, low quality',params:{width:landscape?640:512,height:landscape?448:640,steps:20,n:1,sampler_name:'k_euler',cfg_scale:7},models:['Dreamshaper'],nsfw:false,censor_nsfw:true,trusted_workers:true,r2:false,shared:true,allow_downgrade:true},signal);
    if(!ID.test(d.id))throw Error('Servis geçerli bir üretim kaydı döndürmedi.');return d.id;
   },
   check:function(id,signal){return request(path(id,'check'),'GET',null,signal)},
   result:async function(id,signal){var d=await request(path(id,'status'),'GET',null,signal),g=d.generations&&d.generations[0];if(!g||g.censored||g.state==='censored')throw Error('Servis kullanılabilir bir görsel döndürmedi. Farklı bir tarif deneyebilirsin.');if(typeof g.img!=='string'||g.img.length>8000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(g.img))throw Error('Görsel güvenli biçimde okunamadı.');return {src:'data:image/webp;base64,'+g.img,model:String(g.model||'Dreamshaper').slice(0,100)}},
   cancel:function(id){return request(path(id,'status'),'DELETE')}
  };
 }
 return {client:client,validId:function(id){return typeof id==='string'&&ID.test(id)}};
});
