(() => {
  const cfg = window.HEXU_REWARDS || {}, preview = cfg.mode !== 'live';
  const $ = id => document.getElementById(id);
  let catalog = {categories: [], items: []}, selected = '';
  const el = (tag, cls, value) => {const n=document.createElement(tag); if(cls)n.className=cls; if(value!==undefined)n.textContent=value; return n;};
  const status = msg => { $('catalogStatus').textContent=msg; };
  const available = p => !p.isPreview && Number.isFinite(p.pointsPrice) && p.pointsPrice>=0 && Number.isFinite(p.stock) && p.stock>0 && p.eligible !== false;
  async function checkout(p, button) {
    if (!cfg.checkoutIntentUrl) {status('兑换订单入口尚未接入，请稍后再试。');return;}
    button.disabled=true; status('正在进入订单确认…');
    try {
      const response=await fetch(cfg.checkoutIntentUrl,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:p.id,orderType:'REDEMPTION',kind:p.kind,source:'points_catalog',idempotencyKey:crypto.randomUUID()})});
      if(!response.ok)throw new Error();
      const data=await response.json(), url=new URL(data.checkoutUrl,location.origin);
      if(!['https:','http:'].includes(url.protocol)||url.origin!==new URL(cfg.checkoutOrigin||location.origin).origin)throw new Error();
      location.assign(url.href);
    } catch {status('暂时无法进入兑换订单，请重试；如需登录，请先登录现有会员账户。');button.disabled=false;}
  }
  function render() {
    const term=$('rewardSearch').value.trim().toLowerCase();
    const list=catalog.items.filter(p=>(!selected||p.categoryId===selected)&&p.title.toLowerCase().includes(term)&&(!$('stockOnly').checked||available(p)));
    $('catalogTitle').textContent=selected ? catalog.categories.find(c=>c.id===selected)?.name||'礼品' : '全部礼品';
    $('catalogCount').textContent=`${list.length} 件${preview?'选品示例':''}`;
    $('catalogGrid').replaceChildren();
    for(const p of list) {
      const card=el('article','card'), picture=el('div','pic');
      if(p.imageUrl){const img=el('img');img.alt=p.title;img.loading='lazy';try{const u=new URL(p.imageUrl,location.origin);if(['http:','https:'].includes(u.protocol))img.src=u.href;}catch{}picture.append(img);}
      else picture.append(el('span','sample-placeholder',p.kind==='service'?'养生服务':'礼品图片待上架'));
      card.append(picture,el('h3','',p.title));
      card.append(el('p','points',Number.isFinite(p.pointsPrice)?`${p.pointsPrice} 积分`:'积分以上架为准'));
      card.append(el('p','product-meta',p.kind==='service'?'选择服务 · 门店 · 服务人员':(p.fulfillmentModes||[]).map(v=>v==='pickup'?'服务站自取':v==='delivery'?'支持配送':'').filter(Boolean).join(' · ')));
      card.append(el('p','product-meta',p.isPreview?'选品示例':available(p)?'可兑换':p.eligible===false?'暂不可兑换':'暂时缺货，积分长期有效'));
      const button=el('button',available(p)?'redeem ready':'redeem',p.isPreview?'上架后可兑换':available(p)?p.kind==='service'?'选择服务':'查看兑换':'暂不可兑换');
      button.type='button';button.disabled=preview||!available(p);button.addEventListener('click',()=>checkout(p,button));card.append(button);$('catalogGrid').append(card);
    }
    if(!list.length)$('catalogGrid').append(el('p','empty',preview&&$('stockOnly').checked?'实际礼品上架后，这里会显示可兑换的物品。':'暂无符合条件的礼品，请试试其他品类。'));
    for(const b of $('categoryNav').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.category===selected));
  }
  async function init() {
    try {
      if(!preview&&!cfg.catalogUrl)throw new Error();
      const res=await fetch(preview?'rewards-preview.json':cfg.catalogUrl,{credentials:'include'});if(!res.ok)throw new Error();
      const data=await res.json();if(!Array.isArray(data.categories)||!Array.isArray(data.items))throw new Error();
      catalog={categories:data.categories,items:data.items.filter(p=>typeof p.id==='string'&&typeof p.title==='string')};
      for(const c of catalog.categories){const b=el('button');b.type='button';b.dataset.category=c.id;b.append(el('strong','',c.name),el('small','',c.description));b.addEventListener('click',()=>{selected=selected===c.id?'':c.id;render();});$('categoryNav').append(b);}
      $('previewNote').hidden=!preview;status('点击品类筛选，再次点击返回全部礼品。');render();
    }catch{status('礼品列表暂时无法加载，请刷新页面重试。');}
  }
  $('rewardSearch').addEventListener('input',render);$('stockOnly').addEventListener('change',render);
  $('account')?.addEventListener('click',()=>location.assign('points-account.html'));
  init();
})();
