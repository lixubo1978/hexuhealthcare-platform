import { env } from 'cloudflare:workers';
const reply=(d:object,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store'}});
const identity=(r:Request)=>({id:r.headers.get('oai-authenticated-user-id'),email:r.headers.get('oai-authenticated-user-email')?.toLowerCase()});
const owner=(r:Request)=>Boolean(identity(r).id)&&identity(r).email==='shanghairong8@gmail.com';
const kinds=['project','technician','advisor','article','video','scene','qr','gift'];
const giftCats=['household_wash','hygiene_care','home_textiles','appliances','daily_goods','strollers_beds','educational_toys','wellness_services'];
const clean=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);
const safeURL=(s:string)=>!s||(/^\/api\/stores\?action=image&id=[a-f0-9-]{36}$/.test(s))||(()=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})();
export async function GET(r:Request){try{
 if(!env.DB)return reply({error:'内容服务暂时不可用'},503);
 const admin=new URL(r.url).searchParams.get('admin')==='1';if(admin&&!owner(r))return reply({error:'仅平台管理员可查看'},403);
 const rows=admin?await env.DB.prepare('SELECT * FROM showcase_content ORDER BY updated_at DESC LIMIT 500').all():await env.DB.prepare('SELECT * FROM showcase_content WHERE published=1 ORDER BY kind,city,updated_at DESC LIMIT 500').all();
 return reply({items:rows.results,isOwner:owner(r)});
}catch{return reply({error:'内容暂时无法读取，请重试'},503);}}
export async function POST(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)return reply({error:'请从荷序网站提交'},403);
 if(!env.DB)return reply({error:'内容服务暂时不可用'},503);
 const action=new URL(r.url).searchParams.get('action');
 if(action==='unlock'){
  const who=identity(r);if(!who.id||!who.email)return reply({error:'请先使用已获授权的账号登录'},401);
  try{
   const configured=(env as unknown as Record<string,string>).PARTNER_ACCESS_CODE_SHA256;
   if(!configured)return reply({error:'合作解锁码尚未配置，请使用账号权限验证或联系平台开通'},503);
   const d=await r.json() as {code:string};if(typeof d.code!=='string'||d.code.length>120)return reply({error:'解锁码无效'},400);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d.code)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   let diff=hash.length^configured.length;for(let i=0;i<64;i++)diff|=(hash.charCodeAt(i)||0)^(configured.charCodeAt(i)||0);
   if(diff)return reply({error:'解锁码无效'},403);
   if(!owner(r)&&!await env.DB.prepare('SELECT id FROM guide_grants WHERE email=? LIMIT 1').bind(who.email).first())return reply({error:'此账号尚未获得资料权限，请联系平台开通'},403);
   return reply({ok:true,message:'验证成功，请查看已授权资料'});
  }catch{return reply({error:'验证暂时不可用'},503);}
 }
 if(!owner(r))return reply({error:'仅平台管理员可发布'},403);
 try{const raw=await r.text();if(raw.length>12000)return reply({error:'内容过长'},413);const d=JSON.parse(raw);
 const id=clean(d.id,100)||crypto.randomUUID(),kind=clean(d.kind,30),title=clean(d.title,101),city=clean(d.city,51),description=clean(d.description,3001),image=clean(d.image,2001),link=clean(d.link,2001),qr=clean(d.qr,2001),tags=clean(d.tags,301),sop=clean(d.sop,101);
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!kinds.includes(kind)||title.length<2||title.length>100||description.length<10||description.length>3000||city.length>50||[image,link,qr].some(x=>x.length>2000||!safeURL(x))||typeof d.published!=='boolean'||d.confirmed!==true||(kind==='project'&&(!city||!sop))||tags.length>300||sop.length>100)return reply({error:'请核对资料、链接及发布授权；项目须填写城市与SOP版本'},400);
 if(kind==='gift'&&(!giftCats.includes(tags)||!/^\d{1,7},\d{1,7}$/.test(sop)))return reply({error:'积分产品需选择有效分类，并填写积分数,库存数'},400);
 await env.DB.prepare('INSERT INTO showcase_content(id,kind,title,city,description,image,link,qr,tags,sop,published) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,city=excluded.city,description=excluded.description,image=excluded.image,link=excluded.link,qr=excluded.qr,tags=excluded.tags,sop=excluded.sop,published=excluded.published,updated_at=CURRENT_TIMESTAMP').bind(id,kind,title,city,description,image,link,qr,tags,sop,d.published?1:0).run();return reply({ok:true,id,message:d.published?'已发布，相关页面将显示此资料':'已保存草稿'},201);
 }catch{return reply({error:'保存失败，请保留填写内容后重试'},503);}}

export async function DELETE(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin||!owner(r))return reply({error:'仅平台管理员可删除'},403);if(!env.DB)return reply({error:'内容服务暂时不可用'},503);const id=new URL(r.url).searchParams.get('id')||'';if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return reply({error:'资料编号无效'},400);try{await env.DB.prepare('DELETE FROM showcase_content WHERE id=?').bind(id).run();return reply({ok:true});}catch{return reply({error:'删除失败，请重试'},503);}}
