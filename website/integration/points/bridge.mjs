// 挂载在工程师现有服务器。身份认证与事件验签由现有系统提供，缺少能力时拒绝请求。
export function createPointsBridge({engine,authenticate,verifyEvent,renderQR}) {
  const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
  return async function handle(request){
    const path=new URL(request.url).pathname;
    try {
      if(request.method==='POST'&&path==='/api/points/events'){
        if(typeof verifyEvent!=='function')return json({error:'event integration unavailable'},503);
        // verifyEvent 必须验签、防重放，并返回经核实的服务端数据，不可直接返回 request.json()。
        const event=await verifyEvent(request);if(!event)return json({error:'invalid event'},401);
        const methods={'dispute.changed':'setDispute','order.paid':'createOrder','coupon.redeemed':'redeem','refund.requested':'requestRefund','refund.finished':'finishRefund','redemption.debited':'spend','redemption.returned':'returnSpend'};
        const method=methods[event.type];if(!method)return json({error:'unknown event'},400);
        // 线下退款须由总部经办与审核权限流程生成事件，不能来自消费者端。
        const result=engine[method](event.data);return json({ok:true,result});
      }
      if(request.method!=='GET'||!['/api/points/account','/api/points/coupons','/api/points/ledger'].includes(path))return json({error:'not found'},404);
      if(typeof authenticate!=='function')return json({error:'member integration unavailable'},503);
      const session=await authenticate(request);if(!session?.memberId)return json({error:'login required'},401);
      const member=session.memberId;
      if(path.endsWith('/account'))return json(engine.balance(member));
      if(path.endsWith('/ledger'))return json({records:engine.db.prepare('SELECT delta/100.0 AS points,reason,created_at AS createdAt FROM ledger WHERE member=? ORDER BY created_at DESC,id DESC LIMIT 100').all(member)});
      if(typeof renderQR!=='function')return json({error:'QR integration unavailable'},503);
      const rows=engine.db.prepare('SELECT c.*,o.id AS orderId FROM coupons c JOIN orders o ON c.order_id=o.id WHERE o.customer=? ORDER BY o.paid_at DESC,c.id LIMIT 100').all(member),coupons=[];
      for(const c of rows){const state=c.refunded>0?'refunded':c.redeemed_at!==null?'used':engine.held(c.id)?'frozen':'unused';coupons.push({id:c.id,orderId:c.orderId,status:state,redeemedAt:c.redeemed_at,qrImage:state==='unused'?await renderQR(engine.token(c.id)):null});}
      return json({coupons});
    }catch{return json({error:'request rejected; check server logs without personal data'},409);}
  };
}
