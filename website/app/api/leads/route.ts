import { env } from "cloudflare:workers";
import { areaList } from "@vant/area-data";

const ownerEmail = "shanghairong8@gmail.com";
const response = (data: object, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const isOwner = (request: Request) => request.headers.get("oai-authenticated-user-email")?.toLowerCase() === ownerEmail;

function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}

export async function GET(request: Request) {
  if (!isOwner(request)) return response({ error: "无权查看合作意向" }, 403);
  try {
    const database = db();
    const [count, records] = await Promise.all([
      database.prepare("SELECT count(*) AS count FROM cooperation_leads WHERE status = 'new'").first<{ count: number }>(),
      database.prepare("SELECT id, name, phone, province, city, county, status, created_at AS createdAt FROM cooperation_leads ORDER BY id DESC LIMIT 100").all(),
    ]);
    return response({ pendingCount: count?.count ?? 0, leads: records.results });
  } catch { return response({ error: "暂时无法读取记录，请稍后刷新" }, 503); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return response({ error: "请从荷序网页提交" }, 403);
    const raw = await request.text();
    if (raw.length > 1500) return response({ error: "填写内容过长" }, 413);
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.website) return response({ ok: true }, 201); // hidden spam trap
    const name = String(data.name ?? "").trim();
    const phone = String(data.phone ?? "").replace(/[\s-]/g, "").trim();
    const provinceCode = String(data.provinceCode ?? "");
    const cityCode = String(data.cityCode ?? "");
    const countyCode = String(data.countyCode ?? "");
    const province = areaList.province_list[provinceCode as keyof typeof areaList.province_list];
    const city = areaList.city_list[cityCode as keyof typeof areaList.city_list];
    const county = areaList.county_list[countyCode as keyof typeof areaList.county_list];
    if (!data.consent || name.length < 2 || name.length > 40 || !/^(?:\+?86)?1[3-9]\d{9}$/.test(phone) || !province || !city || !county || cityCode.slice(0, 2) !== provinceCode.slice(0, 2) || countyCode.slice(0, 4) !== cityCode.slice(0, 4)) {
      return response({ error: "请核对姓名、手机号码和省市区县，并勾选联系授权" }, 400);
    }
    const database = db();
    const existing = await database.prepare("SELECT id FROM cooperation_leads WHERE phone = ? AND created_at > datetime('now', '-1 hour') LIMIT 1").bind(phone).first();
    if (existing) return response({ ok: true, message: "已收到你的信息，我们会尽快联系" }, 201);
    await database.prepare("INSERT INTO cooperation_leads (name, phone, province_code, province, city_code, city, county_code, county) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(name, phone, provinceCode, province, cityCode, city, countyCode, county).run();
    return response({ ok: true, message: "已收到你的合作意向，我们会尽快联系" }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "提交内容格式有误" }, 400);
    return response({ error: "提交暂时失败，请保留填写内容后重试" }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!isOwner(request)) return response({ error: "无权修改" }, 403);
  try {
    const { id } = await request.json() as { id?: number };
    if (!Number.isSafeInteger(id) || Number(id) < 1) return response({ error: "记录无效" }, 400);
    await db().prepare("UPDATE cooperation_leads SET status = 'contacted', contacted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'new'").bind(id).run();
    return response({ ok: true });
  } catch { return response({ error: "更新失败，请重试" }, 503); }
}
