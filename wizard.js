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
  let dinnerTimer;
  function answered(index) {
    if (index === 1) return dinnerDone && !document.querySelector('#spinButton').disabled;
    return Boolean(questions[index]?.querySelector('input:checked'));
  }
  function renderReview() {
    const rows = [
      ['一起抱抱睡',form.querySelector('input[name="meal"]:checked')?.value || '尚未選擇'],
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
    clearTimeout(dinnerTimer);
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
      ? ['再想一下嘛 ♡','我的手已經幫你留好位置了呢 ♡','真的不要嗎? ','再給你一次機會喔']
      : ['不要坦誠相見嗎?','再想一下嘛，很舒服耶 ♡','這樣愛愛我可以隨時讓老婆舒服，真的不要嗎?','快樂可以多一點呦 ✨'];
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
  window.DATE_WIZARD = {
    show, next:advance, isReview:() => step === 4,
    dinnerReady() {
      dinnerDone = true;
      next.disabled = false;
      if (step === 1) dinnerTimer = setTimeout(() => {if (step === 1) show(2);},1000);
    }
  };
  show(0,false);
})();
