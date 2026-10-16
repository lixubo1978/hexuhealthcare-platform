# 荷序2026网站展示：工程师接入说明

## 页面与菜单

主菜单为：首页 index.html、关于小荷 about.html、服务指南 service-guide.html、查看门店 stores.html、精品项目 projects.html、技术培训 training.html、健康咨询 health.html、小荷积分 points.html、欢迎投诉 disputes.html、联系我们 contact.html。

辅助页面：cooperation-apply.html（合作申请）、join.html（社区数字门店共建）、portal-admin.html（展示内容后台）。共享样式与交互：hexu.css、hexu.js；配置：hexu-config.js。

## 当前建设边界

此版本是可点击、可发布的展示网站。网站演示环境已有D1/R2用于门店、公开内容、合作申请、投诉及受保护文件。未与原工程师的付款、订单、手机号身份或积分账本合并。所有这些接口要以正式程序为准。不要把Sites/ChatGPT身份当成顾客手机号身份，不要从浏览器接受权限或管理员邮箱声明。

## 配置与接口

`hexu-config.js` 可配置正式点单orderUrl、登录loginUrl、积分账户pointsAccountUrl、兑换目录rewardCatalogUrl、兑换确认rewardCheckoutUrl，以及展示目录contentUrl、storesUrl和解锁partnerUnlockUrl。不配置点单/兑换时不会模拟付款或积分。

公开内容 `GET /api/showcase` 返回 `{items:[{id,kind,title,city,description,image,link,qr,tags,sop,published,updated_at}],isOwner}`，kind包含project、technician、advisor、article、video。项目公开的sop仅为标准编号/版本，绝不存操作技术全文。城市从已发布项目生成，图片可上传或使用已核验HTTPS链接；文章link可链接公众号，qr为二维码图片URL。

`GET /api/showcase?admin=1` 与 `POST /api/showcase` 仅接受已认证管理员。POST同上述字段并要求布尔published和confirmed:true。管理员资料必须真实、资质已核验并获得展示授权。草稿不对外显示。图片上传沿用 `/api/stores?action=image`，R2存储。

门店沿用 `GET /api/stores` 返回stores,total,nextOffset,isOwner，原门店后台和服务端同步接口保留。最多三家优先展示，可分页查看更多。门店地区目前为region文字；正式程序可增加规范省市区县编码。

## 权限与密码

受保护资料仍沿用 `/api/guide?action=content` 和 `action=file&id=...`。实际文件在R2，按登录邮箱与模板授权表校验；未登录401，未获对应模板权限403。当前平台管理员通过guide-admin.html上传PDF/DOCX并逐份授权。账号验证不能下载未授权的资料。

合作解锁码通过 `POST /api/showcase?action=unlock` 发送到服务端，前端不包含密码。可选环境变量 `PARTNER_ACCESS_CODE_SHA256` 为合作码的SHA256十六进制摘要（不得写入源码或发给顾客）。未配置返回503；码正确仍要求该登录账号已获资料权限，文件下载仍校验单个模板授权。这个码是辅助校验，不能代替身份与项目授权。正式顾客/商家系统应替换为已认证会话、按项目的权限与限流、个人码轮换机制。当前网站不自动为任何人授权。

培训模板应选择training类别；合作指南与协议模板按对应类别授权。需要更细的城市/技师范围时，由原程序做服务端项目关系授权；不要靠隐藏按钮保护文件。

## 表单与后台提示

社区门店共建 `POST /api/leads`：name,phone,provinceCode,cityCode,countyCode,consent,website。地区沿用area-data.json，服务端核验码关系。
合作申请 `POST /api/guide?action=apply`：额外applicantType（personal/individual/store/other）、otherType、interests（tools/ecosystem/products/training/education）、message至少10字。
投诉 `POST /api/disputes`：name,phone,role（customer/referrer）,orderRef,description,consent,website。
管理员读取对应API并在contact.html查看待处理数、资料与标记联系；普通访问者无法读取提交资料。模板后台仍保留guide-admin.html。

## 积分与兑换

默认只显示原八类目录样例，不写入正式账本。各5%拟定规则按每次已核销服务的分摊实付计分金额计算，核销后7天发放，不按整个套餐重复计分。余额接口返回availablePoints,pendingPoints；兑换目录沿用rewards-preview.json结构categories/items，正式商品必须提供pointsPrice、stock、imageUrl及领取方式。
兑换确认接口接收itemId,quantity,idempotencyKey，返回checkoutUrl。必须由服务端校验身份、积分、库存、领取方式、配送费并在最终确认后事务扣减，前端不自行扣积分。接入时应验证返回URL属于允许的正式交易域名。退款、积分不足追缴、部分核销、价格折扣分摊、服务券等沿用integration/points中的方案，由正式工程师审核接入。商城开通以前不得承诺已能兑换。

## 视频与二维码

首页、关于小荷、服务指南、精品项目与积分页放置视频组件。已有35秒顾客点单演示供展示，后台可发布video类型，link填国内可访问的直接HTTPS视频地址（优先MP4/H.264）；页面入口不使用VPN二维码。
未配置真实公众号/咨询二维码时显示文字预留位，不生成虚假二维码。文章、顾问均可绑定单独二维码。国内主站部署及域名www.hexuhealthcare.com的更新由工程师处理，本次Sites演示链接不等于修改该主站。

## 部署与数据

保留原项目依赖、角色接口与所有历史工程对接目录。新增showcase_content表由db/schema.ts与追加Drizzle迁移0005管理，不修改旧迁移。迁移只创建表和索引，无样例数据。所有内容默认空；示例项目仅由用户主动切换“查看展示样例”查看，不计入已开展城市。

## 2026-10-07配色修订

按用户录屏调整为奶油白底、浅绿色导航和分区、柔金点缀；移除大块深绿。三个主入口改为水彩荷叶背景，移动端仍同排呈现。荷叶素材small-lotus-leaf.png同时用于页标题、积分专区与小装饰。目录、申请、投诉、权限与业务接入配置沿用原逻辑。

## 极简奶油黄版本

用户再次要求减少水彩与装饰。本版去掉水彩背景和荷叶形入口；全页奶油黄底、灰调浅绿，主入口为干净浅绿卡片配细线荷叶。荷叶素材为minimal-lotus-leaf.png，页首与积分区克制复用。所有栏目与接入能力保留。

## 导航与服务展示更新

顶部技术培训更名为服务展示，链接service-display.html，公开显示technician与scene类型。scene沿用showcase_content表，管理员可录入场景图片、简介、城市。原training.html保留原授权技术培训入口，不占主菜单。首页三屏自动轮播（6.5秒），荷字水印背景，支持暂停、切换、焦点暂停和减少动态偏好。三个主入口采用深绿简约荷叶图形dark-lotus-leaf.png。


## 本轮页面接入
配置 public/hexu-config.js 的 orderUrl 和 loginUrl 为真实客户端登录地址；未配置时入口说明待配置，不建立替代点单系统。
projectsUrl、techniciansUrl 配置现有系统公开目录 API，返回 {items:[]}，字段 id,title,city,description,image,link,tags,sop,published。仅返回允许公开的简介及 SOP 版本，不返回技术全文。跨域 API 需要允许网站源的 CORS，浏览器中禁止放密钥。刷新时自动拉取；项目无需在展示站再次录入。
技师 tags 可包含 priority:10，值越大越优先，按城市展示前三位。
视频内容在后台选择视频，tags 填 about 或 showcase；关于页面可替换播放内容并返回九步默认流程。
工作人员二维码选择 qr 类型，image 或 qr 填二维码图；article link 填公众号文章地址。
积分产品后台选择 gift，通过分类、积分数、库存字段编辑。published 勾选上架，取消为下架，删除为永久删除。展示持久保存，真实兑换仍须配置正式兑换接口。
图片生成提示词：三联生活方式服务场景，奶油黄和浅绿，母乳指导、放松催眠、小儿推拿，人物着装完整，不含品牌或文字。内置生成工具生成，作为 AI 场景示意。
