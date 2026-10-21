'use strict';
const form = document.querySelector('#dateForm');
const spinButton = document.querySelector('#spinButton');
const foods = ['日料', '烤肉', '速食'];
let dinner = '';
let spinning = false;
let rotation = 0;
let summaryText = '';
let sending = false;
let retrySnapshot = '';
let submissionId = '';
const tracking = {
  meal: { noClicks: 0, beforeFirstYes: null },
  market: { noClicks: 0, beforeFirstYes: null }
};
const yesValues = { meal: '是，一起吃飯', market: '是，一起逛夜市' };
const countText = state => `否 ${state.noClicks} 次，首次點是之前：${state.beforeFirstYes === null ? '尚未點是' : state.beforeFirstYes + ' 次'}`;
function updatePreview() {
  document.querySelector('#clickPreview').textContent = `一起吃飯：${countText(tracking.meal)}；逛夜市：${countText(tracking.market)}。`;
}
['meal', 'market'].forEach(name => {
  form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    input.addEventListener('click', () => {
      if (sending) return;
      const state = tracking[name];
      if (input.value !== yesValues[name]) state.noClicks++;
      else if (state.beforeFirstYes === null) state.beforeFirstYes = state.noClicks;
      document.querySelector('#dataConsent').checked = false;
      updatePreview();
    });
  });
});
form.addEventListener('change', event => {
  if (event.target.id !== 'dataConsent') document.querySelector('#dataConsent').checked = false;
});
updatePreview();
document.querySelector('#connectionStatus').textContent = window.DATE_CONFIG?.endpoint
  ? '確認分享後送出，收到試算表寫入確認才會顯示成功。'
  : '資料庫尚未接通，目前不會上傳資料。';
const now = new Date();
const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay() + 7) % 7);
const dateText = `${saturday.getFullYear()}/${String(saturday.getMonth() + 1).padStart(2, '0')}/${String(saturday.getDate()).padStart(2, '0')}（六）`;
document.querySelector('#dateLabel').textContent = `☾ ${dateText} · 我們的小約會`;
spinButton.addEventListener('click', () => {
  if (spinning) return;
  spinning = true;
  document.querySelector('#dataConsent').checked = false;
  spinButton.disabled = true;
  document.querySelector('#foodResult').textContent = '正在挑選今晚的美味…';
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const chosen = Math.floor(random[0] / 4294967296 * foods.length);
  const target = (360 - (chosen * 120 + 60)) % 360;
  rotation += 1800 + (target - rotation % 360 + 360) % 360;
  document.querySelector('#wheel').style.transform = `rotate(${rotation}deg)`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    dinner = foods[chosen];
    document.querySelector('#foodResult').textContent = `今晚就吃 ${dinner} ♡ 不喜歡也可以再轉一次！`;
    spinButton.textContent = '再轉一次 ↻';
    spinning = false;
    spinButton.disabled = false;
    document.querySelector('#formError').textContent = '';
    window.DATE_WIZARD?.dinnerReady();
  }, reduced ? 0 : 3700);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (window.DATE_WIZARD && !window.DATE_WIZARD.isReview()) {
    window.DATE_WIZARD.next();
    return;
  }
  if (spinning || !dinner) {
    document.querySelector('#formError').textContent = spinning ? '等晚餐轉盤停下來，再送出吧 ♡' : '先轉一下轉盤，選好晚餐吧 ♡';
    spinButton.focus();
    return;
  }
  const data = new FormData(form);
  if (!form.reportValidity()) return;
  const endpoint = window.DATE_CONFIG?.endpoint || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
    document.querySelector('#formError').textContent = '邀請人還沒完成資料庫連線，請先告訴他；妳的選擇還在，也可以稍後再送出。';
    return;
  }
  const payload = {
    date: dateText, meal: data.get('meal'), dinner,
    market: data.get('market'), drinks: data.get('drinks'), consent: true,
    mealNo: tracking.meal.noClicks, mealBeforeYes: tracking.meal.beforeFirstYes,
    marketNo: tracking.market.noClicks, marketBeforeYes: tracking.market.beforeFirstYes
  };
  const snapshot = JSON.stringify(payload);
  if (snapshot !== retrySnapshot) {
    submissionId = 'date-' + crypto.randomUUID();
    retrySnapshot = snapshot;
  }
  sending = true;
  form.inert = true;
  const submit = form.querySelector('.submit');
  submit.disabled = true;
  document.querySelector('#formError').textContent = '正在儲存，請稍等…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const healthResponse = await fetch(endpoint, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
    if (!healthResponse.ok) throw new Error('Health check failed');
    const health = await healthResponse.json();
    if (health.service !== 'saturday-date' || health.version !== 2) {
      const error = new Error('Outdated deployment');
      error.code = 'OUTDATED_DEPLOYMENT';
      throw error;
    }
    const response = await fetch(endpoint, {
      method: 'POST', body: new URLSearchParams({ payload: JSON.stringify({ ...payload, id: submissionId }) }),
      credentials: 'omit', redirect: 'follow', signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP error');
    const result = await response.json();
    if (result.ok !== true || result.id !== submissionId) throw new Error('Write not confirmed');
  } catch (error) {
    document.querySelector('#formError').textContent = error.code === 'OUTDATED_DEPLOYMENT'
      ? '邀請人尚未更新吃飯約會版的資料庫程式，請告訴他更新 Apps Script 部署；妳的選擇會留在這一頁，目前尚未送出。'
      : '尚未取得儲存確認，請保留此頁並重試；相同內容重試不會重複新增。若持續失敗，請通知邀請人檢查部署權限。';
    return;
  } finally {
    clearTimeout(timeout);
    sending = false;
    form.inert = false;
    submit.disabled = false;
  }
  document.querySelector('#formError').textContent = '';
  const rows = [['約會日期', dateText], ['一起吃飯', data.get('meal')], ['晚餐', dinner], ['逛夜市', data.get('market')], ['飲料杯數', data.get('drinks')]];
  rows.push(['一起吃飯點選紀錄', countText(tracking.meal)], ['逛夜市點選紀錄', countText(tracking.market)], ['儲存狀態', '已收到 Google 試算表寫入確認']);
  const title = '你成功預約 ♡';
  document.querySelector('#successTitle').textContent = title;
  const summary = document.querySelector('#summary');
  summary.replaceChildren();
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    summary.append(row);
  });
  summaryText = `${title}\n${rows.map(([label, value]) => `${label}：${value}`).join('\n')}\n期待和妳一起吃吃喝喝，隨時可以調整安排。`;
  form.hidden = true;
  document.querySelector('#success').hidden = false;
  document.querySelector('#successTitle').focus();
});
document.querySelector('#editButton').addEventListener('click', () => {
  document.querySelector('#success').hidden = true;
  form.hidden = false;
  document.querySelector('#copyStatus').textContent = '';
  if (window.DATE_WIZARD) window.DATE_WIZARD.show(0);
  else form.querySelector('input').focus();
});
document.querySelector('#copyButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summaryText);
    document.querySelector('#copyStatus').textContent = '已複製，可以貼給另一半囉 ♡';
  } catch {
    document.querySelector('#copyStatus').textContent = '瀏覽器無法自動複製，請直接選取上面的結果分享。';
  }
});
