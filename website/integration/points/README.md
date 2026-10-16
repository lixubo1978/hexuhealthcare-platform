# 荷序积分新版接入包

## 交付与实际接通状态

网站已更新5%规则、我的积分/服务券页、总部协调表单及首页总部待联系提示。
总部表单使用网站D1数据库保存；只有网站所有者能读取/标记联系，不自动批准或支付退款。
工程师真实会员、订单、支付、核销与礼品库存接口尚未提供，因此账户和真实兑换保持待接入状态。engine.mjs是可运行的Node/SQLite后端参考，不在网站D1中另开真实积分账本；不能把测试余额当作消费者余额。

现有后端若已有积分账本，应将本模块的规则、事务及事件映射到原账本，不直接启动第二套数据库。若此前无账本，可部署本模块并做正式数据库持久化、备份与身份/订单接入。SQLite实现用于单数据库部署；MySQL/PostgreSQL需改写事务/锁，Cloudflare D1不能直接运行node:sqlite。不能使用临时磁盘保存生产账本。

## 确定规则

- 单次/三次/五次：付款生成1/3/5张独立服务券，每张独立二维码，服务完成后核销。
- 顾客与每张订单锁定的合资格分享人各5%；没有分享人只发本人积分，不允许自我分享。
- 基数仅为符合规则的服务现金实付（扣除优惠、积分支付、配送费等不计分费用）。订单金额由原后台传入。
- 按每次核销现金金额计分，满7×24小时后到账；未核销不发，退款或争议处理中暂停。
- 积分1分按1元指定兑换/抵扣、无有效期、不提现。
- 未使用套餐付款后7天内无理由全额退款；其他情况保留人工售后，不自动拒绝。
- 退款按对应券分摊金额，未到账取消、到账冲回、不足记待冲回，后续收益抵扣。
- 确认线下退款须记录凭证、经办和不同审核人；事件只登记已完成退款，不会自动支付现金。
- 新版规则只适用于新订单，旧订单按其下单时规则执行。不可把旧10%积分直接按5%重算。

金额以整数“分”保存，积分以整数“百分之一积分”保存。10000现金分→500积分单位→5积分。参考实现每张券有效计分金额除20向下取整，最多有不足0.01积分舍入差；该口径需在正式规则中公布。若需订单累计分配精确到0.01积分，可替换舍入算法，不能用二进制浮点计算流水。订单按次数均分现金分，余分依次分配；混合不同价值项目须替换createOrder分摊算法并从原订单明细接入。

## 运行与测试

Node >=22.13（node:sqlite支持版本），在本目录运行：

```sh
npm install
npm test
```

qrcode只用于服务端输出真实二维码；engine测试不需要依赖。qr.mjs使用qrcode生成PNG。生产部署应生成并保留依赖锁文件。

## 如何挂载现有服务器

```js
import { PointsEngine } from './engine.mjs';
import { createPointsBridge } from './bridge.mjs';
import { renderQR } from './qr.mjs';
const engine = new PointsEngine(process.env.POINTS_DB_PATH, process.env.COUPON_SIGNING_SECRET);
const handle = createPointsBridge({engine, authenticate: existingMemberSession, verifyEvent: existingVerifiedOrderEvents, renderQR});
// 将下列路径挂载到现有服务器；两个existing函数必须由工程师实现。
// 定时任务每分钟调用engine.release(Date.now())，另做重启补跑与告警。
```

COUPON_SIGNING_SECRET为至少32字符服务端秘密，由部署系统配置，禁止写进前端或Git。二维码本身不代表核销权限：门店登录、券所属门店/项目验证、真实服务完成及顾客确认须由原系统完成后，签发可信coupon.redeemed事件。静态二维码需保密；需要防截图转用时改为短期动态码。

`authenticate(request)`仅从已验证的会员会话返回memberId；不能取URL或浏览器自报会员id。GET接口仅返回本人余额/券/流水。
`verifyEvent(request)`必须验证消息签名、来源、事件类型权限、事件时间及原订单真实性；不能直接返回request.json。线下事件须绑定总部人员角色与审核结果；不能允许支付回调身份发起线下退款或兑换扣减等其他事件。接口失败默认拒绝，不开放测试身份。

### 页面接口

|路径|响应|
|---|---|
|GET /api/points/account|availablePoints,pendingPoints,frozenPoints,recoveryPoints|
|GET /api/points/coupons|coupons列表，qrImage为data:image/png;base64字符串|
|GET /api/points/ledger|records列表，points,reason,createdAt（毫秒）|
|POST /api/points/events|仅受信任后台事件，消费者不可直调|

配置public/rewards-config.js的账户、服务券、流水、目录及订单确认接口。全部连通后mode改live；同源网关优先。会员认证不同于网站所有者ChatGPT登录，不能把所有者登录当作消费者会员登录。

### 可信事件与字段

所有eventId在积分模块全局唯一，建议前缀包含来源和类型；重试必须复用完全相同的内容及时间。

|type|data必填|
|---|---|
|dispute.changed|eventId,disputeId,couponIds:[券id],active(布尔值),actorId,now；仅总部售后授权事件|
|order.paid|eventId,orderId,customerId,referrerId或null,cashCents,count(1/3/5),paidAt|
|coupon.redeemed|eventId,couponId,token,storeId,technicianId,now|
|refund.requested|eventId,refundId,orderId,allocations:[{couponId,cashCents}],channel(online/offline),requesterId,now|
|refund.finished|eventId,refundId,success,actorId,proof(线下成功必填),now|
|redemption.debited|eventId,memberId,pointUnits,redemptionOrderId,now|
|redemption.returned|eventId,memberId,pointUnits,redemptionOrderId,now|

时间由可信服务器生成并随事件重试保持不变，不能每次重试重新填Date.now。积分兑换订单不得发order.paid奖励事件。复购单独生成订单并再次确定合资格分享人，不能模块自行永久绑定。

## 退款与争议集成顺序

原订单先批准退款申请并锁定涉及券→发refund.requested冻结相关奖励→向支付渠道发起退款→核实成功通知/主动查单→发refund.finished(success=true)。失败/撤销发false释放冻结，不能仅因申请就扣回。退款通知验签、重复通知和主动对账由原支付系统负责。

总部核实有效争议后，发送dispute.changed事件冻结涉及券和相关积分，防止核销/到账/兑换。审核不成立或处理结束后active=false解除。网站表单只是申请，不能直接冻结他人账户；须核实订单关系和售后权限。退款成功后如果争议已解决也要解除对应冻结。

线下：总部核实→记录协商结果→经办发requested→实际付款并留凭证→不同审核人确认完成→发finished。请求/结果事件的权限必须按来源限定；同一订单已退金额在原支付/订单后台及本账本共同校验，线上线下使用统一退款编号与累计金额，避免重复退钱。

积分扣减需与实物库存/服务预约/兑换订单处于同一业务事务；若跨系统，以可靠outbox、库存预留、幂等、失败补偿及对账实现。参考模块的spend只处理积分，不处理库存和预约。不得先扣积分后丢失订单；超时取消调用returnSpend，累计退回不能超过原扣减。

服务券核销后如果人工撤销，应由原订单系统冻结，取消奖励并恢复服务资格；参考模块没有独立“撤销后恢复券”方法，应补充经审批的撤销事件及新券生成，不能直接修改redeemed_at清空而保留旧奖励。退款后券不可继续用。

## 上线前必要连接

现有会员会话和权限、支付成功事件、门店核销确认、支付退款通知、定时任务、原订单分摊、礼品库存与预约事务、线下审核凭证、旧规则订单隔离、对账备份。前端接通不能替代这些能力。

测试覆盖积分交易与身份、争议冻结情形，包含1/3/5券、幂等、7天边界、部分退款、待冲回抵扣、线下不同审核人、伪码及超额退回。还需工程师在其环境完成真实支付沙箱与并发库存/预约集成验收。现金分账仍使用原系统，积分模块不自动改变门店/技师分账。
