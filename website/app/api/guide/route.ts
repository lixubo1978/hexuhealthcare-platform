import { env } from "cloudflare:workers";
import { areaList } from "@vant/area-data";
const categories=['tools','ecosystem','products','training','education'];
const reply=(d:object,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
const identity=(r:Request)=>({id:r.headers.get('oai-authenticated-user-id'),email:r.headers.get('oai-authenticated-user-email')?.toLowerCase()});
const owner=(r:Request)=>identity(r).email==='shanghairong8@gmail.com'&&Boolean(identity(r).id);
const database=()=>{if(!env.DB)throw Error('DB unavailable');return env.DB;};
const originOK=(r:Request)=>r.headers.get('origin')===new URL(r.url).origin;
const clean=(x:unknown,max:number)=>String(x??'').trim().slice(0,max);
export async function GET(r:Request){
  const u=new URL(r.url),action=u.searchParams.get('action')||'content';
  try{
    const db=database(),who=identity(r);
    if(action==='content'){
      const media=await db.prepare('SELECT id,category,kind,title,url FROM guide_media WHERE active=1 ORDER BY id DESC LIMIT 100').all();
      const templates=await db.prepare('SELECT id,category,title,filename,mime FROM guide_templates WHERE active=1 ORDER BY created_at DESC LIMIT 100').all();
      const grants=who.id&&who.email?await db.prepare('SELECT template_id FROM guide_grants WHERE email=?').bind(who.email).all<{template_id:string}>():{results:[]};
      const ids=new Set(grants.results.map(x=>x.template_id));
      return reply({media:media.results,templates:templates.results.map(t=>({...t,canAccess:owner(r)||ids.has(String(t.id))})),signedIn:Boolean(who.id&&who.email),isOwner:owner(r),email:who.id?who.email:null});
    }
    if(action==='file'){
      if(!who.id||!who.email)return reply({error:'请先登录，再由平台开通模板权限'},401);
      const id=u.searchParams.get('id')||'';
      const template=await db.prepare('SELECT * FROM guide_templates WHERE id=? AND active=1').bind(id).first<{id:string;filename:string;mime:string;object_key:string}>();
      if(!template)return reply({error:'模板不存在或已下架'},404);
      if(!owner(r)&&!await db.prepare('SELECT id FROM guide_grants WHERE template_id=? AND email=? LIMIT 1').bind(id,who.email).first())return reply({error:'此模板尚未授权给您的账户'},403);
      if(!env.BUCKET)throw Error('storage unavailable');const object=await env.BUCKET.get(template.object_key);if(!object)return reply({error:'文件暂时不可用'},404);
      const inline=template.mime==='application/pdf'&&u.searchParams.get('view')==='1';
      return new Response(object.body,{headers:{'Content-Type':template.mime,'Content-Disposition':`${inline?'inline':'attachment'}; filename="agreement.${inline?'pdf':template.mime==='application/pdf'?'pdf':'docx'}"; filename*=UTF-8''${encodeURIComponent(template.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'self'",'X-Frame-Options':'SAMEORIGIN'}});
    }
    if(action==='admin'){
      if(!owner(r))return reply({error:'仅平台管理员可查看'},403);
      const [applications,count,media,templates,grants]=await Promise.all([
        db.prepare('SELECT * FROM guide_applications ORDER BY id DESC LIMIT 100').all(),
        db.prepare("SELECT count(*) AS n FROM guide_applications WHERE status='new'").first<{n:number}>(),
        db.prepare('SELECT id,category,kind,title,url,active FROM guide_media ORDER BY id DESC LIMIT 100').all(),
        db.prepare('SELECT id,category,title,filename,mime,active FROM guide_templates ORDER BY created_at DESC LIMIT 100').all(),
        db.prepare('SELECT id,template_id,email FROM guide_grants ORDER BY created_at DESC LIMIT 200').all(),
      ]);return reply({applications:applications.results,pendingCount:count?.n||0,media:media.results,templates:templates.results,grants:grants.results});
    }
    return reply({error:'入口无效'},404);
  }catch{return reply({error:'服务暂时不可用，请稍后重试'},503);}
}
export async function POST(r:Request){
  if(!originOK(r))return reply({error:'请从荷序网站提交'},403);
  const action=new URL(r.url).searchParams.get('action')||'apply';
  if(action!=='apply'&&!owner(r))return reply({error:'仅平台管理员可操作'},403);
  try{
    const db=database();
    if(action==='template'){
      const length=Number(r.headers.get('content-length')||0);if(length>11*1024*1024)return reply({error:'文件最大10MB'},413);
      const form=await r.formData(),file=form.get('file'),category=clean(form.get('category'),30),title=clean(form.get('title'),100);
      if(!(file instanceof File)||file.size<5||file.size>10*1024*1024||!categories.includes(category)||!title)return reply({error:'请填写标题、分类并选择PDF或DOCX文件（最大10MB）'},400);
      const bytes=await file.arrayBuffer(),head=new Uint8Array(bytes).slice(0,5),pdf=file.name.toLowerCase().endsWith('.pdf')&&new TextDecoder().decode(head)==='%PDF-',docx=file.name.toLowerCase().endsWith('.docx')&&head[0]===80&&head[1]===75&&head[2]===3&&head[3]===4;
      if(!pdf&&!docx)return reply({error:'文件类型或文件内容不符合要求，仅支持PDF/DOCX'},400);
      if(!env.BUCKET)throw Error('storage unavailable');const id=crypto.randomUUID(),key=`guide-agreements/${id}`,mime=pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
      try{await db.prepare('INSERT INTO guide_templates(id,category,title,filename,mime,object_key) VALUES(?,?,?,?,?,?)').bind(id,category,title,clean(file.name,150),mime,key).run();}catch(e){await env.BUCKET.delete(key);throw e;}
      return reply({ok:true,id,message:'已上传。模板默认受保护，请另行开通查看权限。'},201);
    }
    const raw=await r.text();if(raw.length>8000)return reply({error:'填写内容过长'},413);const d=JSON.parse(raw);
    if(action==='apply'){
      if(d.website)return reply({ok:true,message:'已收到申请'},201);
      const name=clean(d.name,41),phone=clean(d.phone,25).replace(/[\s-]/g,''),type=clean(d.applicantType,30),other=clean(d.otherType,121),message=clean(d.message,1501);
      const pc=String(d.provinceCode||''),cc=String(d.cityCode||''),dc=String(d.countyCode||'');
      const p=areaList.province_list[pc as keyof typeof areaList.province_list],c=areaList.city_list[cc as keyof typeof areaList.city_list],a=areaList.county_list[dc as keyof typeof areaList.county_list];
      const interests=Array.isArray(d.interests)?[...new Set(d.interests)]:[];
      if(d.consent!==true||name.length<2||name.length>40||!/^1[3-9]\d{9}$/.test(phone)||!['personal','individual','store','other'].includes(type)||(type==='other'&&(other.length<2||other.length>120))||!p||!c||!a||cc.slice(0,2)!==pc.slice(0,2)||dc.slice(0,4)!==cc.slice(0,4)||!interests.length||interests.some(x=>!categories.includes(String(x)))||message.length<10||message.length>1500)return reply({error:'请填写身份、省市区县、合作方向与具体需求，并勾选联系授权'},400);
      const existing=await db.prepare("SELECT id FROM guide_applications WHERE phone=? AND created_at>datetime('now','-1 hour') LIMIT 1").bind(phone).first();
      if(!existing)await db.prepare('INSERT INTO guide_applications(name,phone,applicant_type,other_type,province,city,county,interests,message) VALUES(?,?,?,?,?,?,?,?,?)').bind(name,phone,type,type==='other'?other:'',p,c,a,JSON.stringify(interests),message).run();
      return reply({ok:true,message:'已收到合作申请，荷序团队会联系您沟通合作方向。'},201);
    }
    if(action==='media'){
      const category=clean(d.category,30),kind=clean(d.kind,20),title=clean(d.title,101),url=String(d.url||'');let parsed:URL;try{parsed=new URL(url);}catch{return reply({error:'链接格式有误'},400);}
      if(!categories.includes(category)||!['video','article'].includes(kind)||title.length<2||title.length>100||url.length>2000||parsed.protocol!=='https:'||parsed.username||parsed.password)return reply({error:'请填写标题、分类及有效HTTPS链接'},400);
      await db.prepare('INSERT INTO guide_media(category,kind,title,url) VALUES(?,?,?,?)').bind(category,kind,title,url).run();return reply({ok:true},201);
    }
    if(action==='grant'){
      const email=clean(d.email,255).toLowerCase(),id=String(d.templateId||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!await db.prepare('SELECT id FROM guide_templates WHERE id=? AND active=1').bind(id).first())return reply({error:'请选择有效模板并填写登录邮箱'},400);
      // Deterministic key makes repeated grant requests idempotent.
      const key=`${id}:${email}`;await db.prepare('INSERT INTO guide_grants(id,template_id,email,granted_by) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(key,id,email,identity(r).id).run();return reply({ok:true,message:'已开通该账户对此模板的查看与下载权限'});
    }
    return reply({error:'入口无效'},404);
  }catch(e){return reply({error:e instanceof SyntaxError?'提交格式有误':'保存失败，请保留填写内容并重试'},e instanceof SyntaxError?400:503);}
}
export async function PATCH(r:Request){
  if(!owner(r)||!originOK(r))return reply({error:'无权操作'},403);
  try{const d=await r.json() as {action:string;id:string|number;active:number};const db=database();
    if(d.action==='contacted'&&Number.isSafeInteger(d.id))await db.prepare("UPDATE guide_applications SET status='contacted' WHERE id=?").bind(d.id).run();
    else if(d.action==='revoke'&&typeof d.id==='string')await db.prepare('DELETE FROM guide_grants WHERE id=?').bind(d.id).run();
    else if(d.action==='template'&&typeof d.id==='string'&&[0,1].includes(d.active))await db.prepare('UPDATE guide_templates SET active=? WHERE id=?').bind(d.active,d.id).run();
    else if(d.action==='media'&&Number.isSafeInteger(d.id)&&[0,1].includes(d.active))await db.prepare('UPDATE guide_media SET active=? WHERE id=?').bind(d.active,d.id).run();
    else return reply({error:'操作无效'},400);return reply({ok:true});
  }catch{return reply({error:'更新失败'},503);}
}
