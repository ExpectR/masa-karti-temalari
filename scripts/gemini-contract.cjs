(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.UmutGemini=factory()})(globalThis,function(){
 'use strict';
 var numbers={size:[8,90],subSize:[5,40],menuSize:[5,40],ls:[-5,20],fsize:[30,200],bgAng:[0,360],logoSize:[6,70],logoSizeB:[6,70],logoRot:[-180,180],logoOp:[15,100]};
 var colors=['color','accent','bg','bgB','bg2'];
 var bools=['italic','upper','shadow','foil','subUp','flowers','backTheme','hideBase'];
 var choices={weight:['400','700'],frame:['none','thin','double'],bgMode:['sol','lin','rad'],logoPos:['front','back','both']};
 var texts=['sub','backText','menu','menuF'],positions=['name','sub','bText','menu','menuF','fLogo','bLogo'];
 var fields=Object.keys(numbers).concat(colors,bools,Object.keys(choices),texts,['font','subFont','theme']);
 positions.forEach(function(k){fields.push('pos.'+k+'.x','pos.'+k+'.y')});
 function object(o){return o&&typeof o==='object'&&!Array.isArray(o)}
 var motifs=['rect','circle','line','diamond','frame','rose','rose2','peony','peonyw','daisy','poppy','cosmos','anem','sun','leaf','euc','lav','maple','maple2','maple3','oak','pumpkin','dahlia','mum','siklamen','cigdem','hercai','ates','asteri','kadife','aslan','petunya','begonya','sumbul','cuha','nergis','kokina','ruscus','poins','poinsw','star','bauble','snow','wheat','berry','pine','holly'];
 function validateTheme(t,context){
  var keys=['name','background','textColor','accentColor','font','decorations'];
  if(!object(t)||Object.keys(t).some(function(k){return keys.indexOf(k)<0})||typeof t.name!=='string'||!t.name.trim()||t.name.length>80||!Array.isArray(t.decorations)||!t.decorations.length||t.decorations.length>24)throw Error('Üretilen tema geçerli değil.');
  function hex(v){if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Tema rengi geçersiz.');return v}
  function num(v,a,b){if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw Error('Tema süsü sınırların dışında.');return v}
  var theme={name:t.name.replace(/[\u0000-\u001f]/g,' ').trim(),background:hex(t.background),textColor:hex(t.textColor),accentColor:hex(t.accentColor),font:value('font',t.font,context)};
  theme.decorations=t.decorations.map(function(d){if(!object(d)||Object.keys(d).some(function(k){return ['kind','x','y','size','height','rotation','opacity','color','stroke','strokeWidth','radius'].indexOf(k)<0})||motifs.indexOf(d.kind)<0)throw Error('Desteklenmeyen tema süsü.');return {kind:d.kind,x:num(d.x,0,100),y:num(d.y,0,100),size:num(d.size,2,105),height:num(d.height===undefined?d.size:d.height,2,74),rotation:num(d.rotation,-180,180),opacity:num(d.opacity,5,100),color:hex(d.color),stroke:hex(d.stroke===undefined?t.accentColor:d.stroke),strokeWidth:num(d.strokeWidth===undefined?(d.kind==='line'||d.kind==='frame'?.4:0):d.strokeWidth,0,3),radius:num(d.radius===undefined?0:d.radius,0,20)}});
  return theme;
 }
 function value(field,v,context){
  if(typeof v!=='string'||v.length>600)throw Error('Geçersiz değişiklik değeri.');
  if(numbers[field]){var n=Number(v),r=numbers[field];if(!v.trim()||!Number.isFinite(n)||n<r[0]||n>r[1])throw Error('Ayar sınırların dışında: '+field);return n}
  if(colors.indexOf(field)>=0){if(!/^#[0-9a-f]{6}$/i.test(v))throw Error('Geçersiz renk.');return v}
  if(bools.indexOf(field)>=0){if(v!=='true'&&v!=='false')throw Error('Geçersiz aç/kapat değeri.');return v==='true'}
  if(choices[field]){if(choices[field].indexOf(v)<0)throw Error('Geçersiz ayar seçeneği.');return v}
  if(texts.indexOf(field)>=0){if(v.length>500)throw Error('Metin çok uzun.');return v}
  if(field==='font'||field==='subFont'){if(!context.fonts.some(function(f){return f.value===v}))throw Error('Bilinmeyen yazı tipi.');return v}
  if(field==='theme'){if(!context.themes.some(function(t){return t.id===v}))throw Error('Bilinmeyen tema.');return v}
  if(/^pos\.(name|sub|bText|menu|menuF|fLogo|bLogo)\.(x|y)$/.test(field)){var p=Number(v);if(!v.trim()||!Number.isFinite(p)||p<0||p>100)throw Error('Konum sınırların dışında.');return p}
  throw Error('Desteklenmeyen ayar.');
 }
 function validate(plan,context){
  if(!object(plan)||Object.keys(plan).some(function(k){return k!=='message'&&k!=='changes'&&k!=='theme'})||typeof plan.message!=='string'||plan.message.length>1500||!Array.isArray(plan.changes)||plan.changes.length>24)throw Error('Gemini yanıtı geçerli bir tasarım önerisi değil.');
  var seen=new Set(),result={message:plan.message,changes:plan.changes.map(function(c){if(!object(c)||Object.keys(c).some(function(k){return k!=='field'&&k!=='value'})||fields.indexOf(c.field)<0||seen.has(c.field))throw Error('Tekrarlanan veya geçersiz değişiklik.');seen.add(c.field);return {field:c.field,value:value(c.field,c.value,context)}})};
  if(plan.theme!==undefined){if(seen.has('theme'))throw Error('Yeni tema ve hazır tema aynı anda seçilemez.');result.theme=validateTheme(plan.theme,context)}return result;
 }
 function cleanContext(input){
  if(!object(input)||!Array.isArray(input.fonts)||!Array.isArray(input.themes)||!object(input.settings))throw Error('Tasarım bağlamı eksik.');
  var fonts=input.fonts.slice(0,20).filter(function(f){return object(f)&&typeof f.value==='string'&&/^[\w ',\-]{1,60}$/.test(f.value)&&typeof f.name==='string'}).map(function(f){return {value:f.value,name:f.name.slice(0,80)}});
  var themes=input.themes.slice(0,100).filter(function(t){return object(t)&&typeof t.id==='string'&&/^[a-z0-9_-]{1,60}$/i.test(t.id)&&typeof t.name==='string'}).map(function(t){return {id:t.id,name:t.name.slice(0,80)}});
  var c={fonts:fonts,themes:themes,settings:{},hasLogo:input.hasLogo===true,hasCardOverrides:input.hasCardOverrides===true};
  // Only style and placement cross the network. No names, image bytes, or stored text.
  fields.filter(function(k){return texts.indexOf(k)<0}).forEach(function(k){if(Object.prototype.hasOwnProperty.call(input.settings,k)){try{c.settings[k]=value(k,String(input.settings[k]),c)}catch(e){}}});
  if(input.generatedTheme)c.generatedTheme=validateTheme(input.generatedTheme,c);return c;
 }
 var schema={type:'OBJECT',properties:{message:{type:'STRING'},changes:{type:'ARRAY',items:{type:'OBJECT',properties:{field:{type:'STRING',enum:fields},value:{type:'STRING'}},required:['field','value']}}},required:['message','changes']};
 var motifSchema={type:'OBJECT',properties:{kind:{type:'STRING',enum:motifs},x:{type:'NUMBER'},y:{type:'NUMBER'},size:{type:'NUMBER'},height:{type:'NUMBER'},rotation:{type:'NUMBER'},opacity:{type:'NUMBER'},color:{type:'STRING'},stroke:{type:'STRING'},strokeWidth:{type:'NUMBER'},radius:{type:'NUMBER'}},required:['kind','x','y','size','height','rotation','opacity','color']};
 var themeSchema={type:'OBJECT',properties:{message:schema.properties.message,changes:schema.properties.changes,theme:{type:'OBJECT',properties:{name:{type:'STRING'},background:{type:'STRING'},textColor:{type:'STRING'},accentColor:{type:'STRING'},font:{type:'STRING'},decorations:{type:'ARRAY',items:motifSchema}},required:['name','background','textColor','accentColor','font','decorations']}},required:['message','changes','theme']};
 return {fields:fields,positions:positions,motifs:motifs,validateTheme:validateTheme,validate:validate,cleanContext:cleanContext,schema:schema,themeSchema:themeSchema};
});
