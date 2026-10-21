'use strict';
(() => {
  const form = document.querySelector('#dateForm');
  form.noValidate = true;
  const questions = [...form.querySelectorAll(':scope > .card')];
  const review = document.createElement('section');
  review.className = 'card review';
  review.innerHTML = '<p class="eyebrow">ONE LAST LITTLE CHECK</p><h2 tabindex="-1">我們的週六，安排好了 ♡</h2><dl id="reviewAnswers"></dl>';
  ['.note','#formError','.data-consent','.submit','#connectionStatus'].forEach(selector => {
    review.append(form.querySelector(selector));
  });
  form.append(review);
  const pages = [...questions,review];
  const nav = document.createElement('nav');
  nav.className = 'wizard-nav';
  nav.setAttribute('aria-label','問題導覽');
  nav.innerHTML = '<button type="button" id="previousStep">← 上一題</button><button type="button" id="nextStep">下一題 →</button>';
  form.append(nav);
  const previous = nav.querySelector('#previousStep');
  const next = nav.querySelector('#nextStep');
  let step = 0;
  let dinnerDone = false;
  function answered(index) {
    if (index === 1) return dinnerDone && !document.querySelector('#spinButton').disabled;
    return Boolean(questions[index]?.querySelector('input:checked'));
  }
  function renderReview() {
    const rows = [
      ['一起吃飯',form.querySelector('input[name="meal"]:checked')?.value || '尚未選擇'],
      ['晚餐',document.querySelector('#foodResult').textContent],
      ['逛夜市',form.querySelector('input[name="market"]:checked')?.value || '尚未選擇'],
      ['飲料杯數',form.querySelector('input[name="drinks"]:checked')?.value || '尚未選擇']
    ];
    const summary = document.querySelector('#reviewAnswers');
    summary.replaceChildren();
    rows.forEach(([label,value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value;
      row.append(dt,dd); summary.append(row);
    });
  }
  function show(index, focus = true) {
    step = Math.max(0,Math.min(pages.length - 1,index));
    pages.forEach((page,i) => page.hidden = i !== step);
    document.querySelector('#stepLabel').textContent = step < 4 ? `第 ${step + 1} 題，共 4 題` : '最後確認 · 分享我們的約定';
    document.querySelector('#progressFill').style.width = `${(step + 1) / pages.length * 100}%`;
    previous.hidden = step === 0;
    next.hidden = step === pages.length - 1;
    next.disabled = !answered(step);
    next.textContent = step === 3 ? '確認我的選擇 →' : '下一題 →';
    if (step === 4) renderReview();
    if (focus) {
      const heading = pages[step].querySelector('legend,h2');
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
      form.scrollIntoView({behavior:'instant',block:'start'});
    }
  }
  function advance() {
    if (!answered(step)) return;
    show(step + 1);
  }
  previous.addEventListener('click',() => show(step - 1));
  next.addEventListener('click',advance);
  questions.forEach((page,index) => {
    page.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('click',() => {
        next.disabled = false;
        // 是否題點「否」會留在本題；點「是」或選擇飲料後前進。
        if (input.closest('.choices') && input.parentElement.classList.contains('no-choice')) return;
        if (step === index) show(index + 1);
      });
    });
  });
  [questions[0],questions[2]].forEach((page,index) => {
    const arena = page.querySelector('.choices');
    arena.classList.add('playful-choices');
    const labels = arena.querySelectorAll('label');
    labels[0].classList.add('yes-choice');
    labels[1].classList.add('no-choice');
    const message = document.createElement('p');
    message.className = 'playful-message';
    message.setAttribute('role','status');
    message.textContent = '選好就繼續我們的小約會 ♡';
    arena.after(message);
    const slogans = index === 0
      ? ['再想一下嘛，晚餐有妳才香 ♡','我的對面幫妳留位子了 🍽️','要不要給週六一個約會名額？','轉盤已經在期待妳了 🍣']
      : ['夜市的小吃正在揮手 👋','再想一下嘛，一起散步也很棒 ♡','還有好多攤想跟妳一起逛！','牽手逛一圈，快樂多一點 ✨'];
    let clicks = 0;
    labels[1].querySelector('input').addEventListener('click',() => {
      const button = labels[1];
      const maxX = Math.max(0,arena.clientWidth - button.offsetWidth);
      const maxY = Math.max(65,arena.clientHeight - button.offsetHeight);
      const oldX = parseFloat(button.style.left) || maxX;
      let x = Math.random() * maxX;
      if (Math.abs(x - oldX) < maxX * .25) x = oldX > maxX / 2 ? 0 : maxX;
      button.style.right = 'auto';
      button.style.left = `${Math.round(x)}px`;
      button.style.top = `${Math.round(65 + Math.random() * (maxY - 65))}px`;
      message.textContent = slogans[clicks++ % slogans.length];
      next.disabled = false;
    });
  });
  document.querySelector('#spinButton').addEventListener('click', () => {
    dinnerDone = false;
    next.disabled = true;
  });
  window.DATE_WIZARD = {
    show, next:advance, isReview:() => step === 4,
    dinnerReady() {
      dinnerDone = true;
      next.disabled = !answered(step);
    }
  };
  show(0,false);
})();
