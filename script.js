'use strict';
const form = document.querySelector('#dateForm');
const spinButton = document.querySelector('#spinButton');
const foods = ['日料', '烤肉', '速食'];
let dinner = '';
let spinning = false;
let rotation = 0;
let summaryText = '';
const now = new Date();
const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay() + 7) % 7);
const dateText = `${saturday.getFullYear()}/${String(saturday.getMonth() + 1).padStart(2, '0')}/${String(saturday.getDate()).padStart(2, '0')}（六）`;
document.querySelector('#dateLabel').textContent = `☾ ${dateText} · 我們的小約會`;
spinButton.addEventListener('click', () => {
  if (spinning) return;
  spinning = true;
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
  }, reduced ? 0 : 3700);
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (spinning || !dinner) {
    document.querySelector('#formError').textContent = spinning ? '等晚餐轉盤停下來，再送出吧 ♡' : '先轉一下轉盤，選好晚餐吧 ♡';
    spinButton.focus();
    return;
  }
  const data = new FormData(form);
  const rows = [['約會日期', dateText], ['抱抱睡', data.get('cuddle')], ['晚餐', dinner], ['睡覺方式', data.get('sleep')], ['親密心情', data.get('mood')]];
  const accepted = data.get('cuddle') === '是，一起抱抱睡';
  const title = accepted ? '你成功預約 ♡' : '你的心意已收到 ♡';
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
  summaryText = `${title}\n${rows.map(([label, value]) => `${label}：${value}`).join('\n')}\n隨時可以改變心意，當下彼此都願意才算數。`;
  form.hidden = true;
  document.querySelector('#success').hidden = false;
  document.querySelector('#successTitle').focus();
});
document.querySelector('#editButton').addEventListener('click', () => {
  document.querySelector('#success').hidden = true;
  form.hidden = false;
  document.querySelector('#copyStatus').textContent = '';
  form.querySelector('input').focus();
});
document.querySelector('#copyButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summaryText);
    document.querySelector('#copyStatus').textContent = '已複製，可以貼給另一半囉 ♡';
  } catch {
    document.querySelector('#copyStatus').textContent = '瀏覽器無法自動複製，請直接選取上面的結果分享。';
  }
});
