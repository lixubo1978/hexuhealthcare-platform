import { env } from "cloudflare:workers";
const database = () => { if (!env.DB) throw new Error("Database unavailable"); return env.DB; };
const reply = (data: object, status = 200) => Response.json(data, {status,headers:{"Cache-Control":"no-store"}});
const owner = (r: Request) => r.headers.get("oai-authenticated-user-email")?.toLowerCase()==="shanghairong8@gmail.com";
export async function GET(r: Request) {
  if(!owner(r))return reply({error:"无权查看"},403);
  try {
    const data=await database().prepare("SELECT id,order_ref AS orderRef,name,phone,role,description,status,created_at AS createdAt FROM service_disputes ORDER BY id DESC LIMIT 100").all();
    const count=await database().prepare("SELECT count(*) AS count FROM service_disputes WHERE status='new'").first<{count:number}>();
    return reply({records:data.results,pendingCount:count?.count||0});
  }catch{return reply({error:"暂时无法读取"},503);}
}
export async function POST(r: Request) {
  const origin=r.headers.get("origin");
  if(!origin||origin!==new URL(r.url).origin)return reply({error:"请从荷序网页提交"},403);
  try {
    const raw=await r.text();if(raw.length>5000)return reply({error:"内容过长"},413);
    const d=JSON.parse(raw);if(d.website)return reply({ok:true},201);
    const name=String(d.name||'').trim(),phone=String(d.phone||'').replace(/[\s-]/g,''),orderRef=String(d.orderRef||'').trim(),description=String(d.description||'').trim();
    if(d.consent!==true||name.length<2||name.length>40||!/^1[3-9]\d{9}$/.test(phone)||orderRef.length<1||orderRef.length>80||description.length<10||description.length>1500||!['customer','referrer'].includes(d.role))return reply({error:"请核对订单、联系方式、说明及联系授权"},400);
    const recent=await database().prepare("SELECT id FROM service_disputes WHERE phone=? AND order_ref=? AND created_at>datetime('now','-1 hour') LIMIT 1").bind(phone,orderRef).first();
    if(!recent)await database().prepare("INSERT INTO service_disputes(order_ref,name,phone,role,description) VALUES(?,?,?,?,?)").bind(orderRef,name,phone,d.role,description).run();
    return reply({ok:true,message:"已提交总部，请保留订单及付款凭证，等待平台联系。"},201);
  }catch(e){return reply({error:e instanceof SyntaxError?"格式有误":"提交失败，请稍后重试"},e instanceof SyntaxError?400:503);}
}
export async function PATCH(r: Request) {
  if(!owner(r))return reply({error:"无权操作"},403);
  if(r.headers.get('origin')!==new URL(r.url).origin)return reply({error:"无效来源"},403);
  try{const d=await r.json() as {id:number};if(!Number.isSafeInteger(d.id)||d.id<1)return reply({error:"编号无效"},400);await database().prepare("UPDATE service_disputes SET status='contacted',contacted_at=CURRENT_TIMESTAMP WHERE id=? AND status='new'").bind(d.id).run();return reply({ok:true});}catch{return reply({error:"处理失败"},503);}
}
