# 荷序「逛逛门店」增量源码与接入说明

## 已完成
首页“进驻门店”改为“逛逛门店”。stores.html 首屏优先展示三家，卡片直接显示门头和内部环境照片、简介、特色项目；详情展示最多八张内部图。点击查看更多展开其余门店，每批读取12家。电脑三列、手机两列；详情手机单列。申请合作跳转现有 cooperation-apply.html，与服务指南共用同一表单、数据库和管理员通知。

没有导入真实门店资料。数据库为空时仅显示明确标注的布局样例和两个预留展示位，不代表已经入驻。上传真实资料后自动替换样例。

## 管理员使用
登录平台管理员账户后进入 /stores-admin.html，上传门头、内部照片（JPG/PNG/WEBP，每张最多8MB），填写简介、特色项目，确认真实资料和展示授权，再保存发布。重点排序选1、2、3，其余选普通；请维护三个重点名额。排序冲突按更新时间和编号排序。可编辑或下架，公开页面只读取已发布资料。照片公开，勿上传客户个人资料。合作协议的私有授权下载逻辑保持独立。

## 工程师接入已有门店系统
此ZIP是现有项目的增量代码，请合并后运行数据库迁移0004；不要覆盖已有积分或订单逻辑。已有0002/0003迁移不应修改。结构在db/schema.ts。需保留DB与BUCKET绑定。

推荐原程序后端在门店审核通过、资料变化、退出时调用 PUT /api/stores，发送完整资料快照。在部署平台为本服务设置至少32字符的随机 STORE_SYNC_SECRET，通过 Authorization: Bearer <密钥> 调用。密钥只放两个服务的后端，不能进入浏览器、Git或公开配置。目前未设置密钥，因此同步入口返回503，并未连接原程序。

请求示例（演示字段，替换成原程序实际资料）：
```json
{
  "id": "source-store-id",
  "name": "实际门店名称",
  "region": "省、市、区县及展示地址",
  "description": "真实门店的简介，至少十个字符。",
  "coverUrl": "https://your-cdn.example/front.jpg",
  "interiorUrls": ["https://your-cdn.example/inside.jpg"],
  "projects": [{"title":"实际特色项目", "description":"经平台审核的服务项目说明"}],
  "featuredRank": 1,
  "published": true
}
```
稳定id用于重复更新而非新增；下架同步published:false。图片使用HTTPS地址，或管理员上传产生的/api/stores?action=image&id=...地址。内部照片与项目各1至8项。请原程序按门店串行发送更新，失败重试最新快照，防止乱序旧事件覆盖新资料；建议定时对账和补偿同步。审核、展示授权和数据真实性由原程序业务流程保证。同步不涉及下单、积分或分账。

另一方案：在stores-config.js的catalogUrl指定原程序只读目录接口，由工程师实现字段适配与跨域允许。接口GET接受offset，固定12条，返回：
```json
{"stores":[],"total":0,"nextOffset":null,"isOwner":false}
```
stores使用上面的字段，按重点1/2/3优先、其余最近更新顺序排列；只返回审核发布的门店，total是发布总数。不要把私有字段放入公开响应。

## 检查
node --test integration/stores/stores.test.mjs integration/service-guide/guide.test.mjs
覆盖权限、真实资料确认、分页、排序、下架、同步密钥与重复更新、图片上传和读取，以及共用申请/协议授权回归。TypeScript类型检查通过。
