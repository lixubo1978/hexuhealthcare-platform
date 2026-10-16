# 荷序服务指南交付与接入

## 页面

- service-guide.html：五个服务方向、合作门槛、滚动培训展示、标准流程、成果及验收、受保护协议入口。
- cooperation-apply.html：姓名、个人/个体/门店/其他（其他必填说明）、省市区县、手机、合作方向及具体内容。
- guide-admin.html：仅现有平台所有者可管理申请、发布视频/推文、上传协议和授予/撤销权限。
- 首页服务指南与我需要合作已链接新页面；联系我们显示所有者可见的服务合作待联系提示。

项目体系共建的“查看关于小荷”跳转现有about.html平台理念页。所有交付时间、数量、费用和具体投入以后续确认方案/协议为准，网页未引入新的收费门槛或收益保证。

## 已运行与待素材

合作申请保存到D1；姓名、身份其他说明、地区关系和意向校验在服务器执行。1小时内同一手机重复申请不重复新增，避免连点提交。管理员可标记联系。

视频、健康推文和真实协议文件目前未提供，因此页面保留清楚的待发布状态，不使用虚构素材。后台填有效HTTPS链接可发布视频/推文，MP4在页面播放，其他来源新窗口打开。培训区现在展示流程要点，发布培训视频后加入滚动区。

模板上传PDF/DOCX（10MB内），私有R2保存文件，D1保存元数据。PDF在线查看或下载，DOCX下载查看。不得将文件复制到public目录或生成绕过鉴权的永久公开URL。

## 后台使用

1. 网站所有者使用本站现有ChatGPT登录，进入guide-admin.html。
2. 发布对应分类的真实演示视频和已审核健康内容，随时可下架/重新上架。
3. 上传真实、审核后的合作协议模板，上传后默认受保护。
4. 合作方通过本站ChatGPT登录；管理员填写其登录邮箱，并选择具体模板开通权限。系统不发送邀请或邮件。
5. 合作方刷新指南，即可查看/下载获授权模板。撤销权限或下架模板后，直接文件链接也失效。已经合法下载到设备的文件无法通过撤销权限远程收回。

模板当前使用本站身份，而不是工程师原系统的手机号会员身份。如需原系统登录统一，应接入其验证后的服务端会话，并将guide_grants邮箱授权映射到稳定memberId；前端不能自报身份或仅隐藏按钮。

## API

GET /api/guide?action=content：公开已上架展示内容和模板元数据，按验证身份返回canAccess；不返回R2对象键。
GET /api/guide?action=file&id=模板ID：下载，view=1为PDF预览；无身份401，无授权403，未上架404；私有no-store。
GET /api/guide?action=admin：仅管理员查看申请、素材、模板、授权名单。
POST /api/guide?action=apply：公开申请提交，要求同源Origin、联系授权与真实地区关系；主体身份与具体意向校验。
POST /api/guide?action=media：仅管理员JSON发布{category,kind:video/article,title,url}。
POST /api/guide?action=template：仅管理员multipart上传{category,title,file}。
POST /api/guide?action=grant：仅管理员JSON授权{templateId,email}。
PATCH /api/guide：仅管理员{action:contacted/media/template/revoke,id,active(上/下架用)}。

categories: tools数字化运营工具、ecosystem项目体系共建、products服务产品设计、training标准化服务流程培训、education健康教育内容支持。

## 数据与部署

沿用现有project_id和DB绑定，新增BUCKET逻辑R2绑定；保留已应用的0000/0001迁移，新增0002四表与0003索引。
更新既有db/schema.ts和API代码；部署时按迁移顺序执行，并配置私有对象存储绑定。非Sites服务器可按相同接口移植至现有关系数据库与私有对象存储。

服务指南公开页面不要求登录；协议内容及管理员接口每次请求做服务端鉴权。现有合作门店表单、积分页、总部争议页继续保留。权限开通不是网站全站开放权限，也不改变公共网站当前受众。

## 验证

node --test integration/service-guide/guide.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build

权限测试覆盖匿名/未授权/获授权/管理员、直接文件链接、撤销与下架、错误文件类型；申请测试覆盖其他身份说明、地区、重复与标记联系；内容测试覆盖禁止脚本链接和下架。

本包是现有网站增量源代码，需合并至原工程；不含实际客户资料、视频文件或未经提供的协议内容。
