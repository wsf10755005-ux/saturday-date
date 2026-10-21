// 貼到目標試算表「擴充功能 → Apps Script」的 Code.gs。
const SPREADSHEET_ID = '1GIKlAplSc1CMPoJu0AqnH4ATftgaEGqFZ10Khla2JDs';
const TAB_NAME = '週六吃飯邀約紀錄';
const HEADERS = ['送出編號', '收到時間（台北）', '約會日期', '一起吃飯選擇', '晚餐', '逛夜市', '飲料杯數', '一起吃飯：否總次數', '一起吃飯：首次是之前否次數', '逛夜市：否總次數', '逛夜市：首次是之前否次數', '同意分享'];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  // 不提供讀取任何回答的公開 API。
  return json_({ ok: true, service: 'saturday-date', version: 2 });
}

function validate_(p) {
  if (!p || p.consent !== true || !/^date-[a-f0-9-]{36}$/.test(p.id)) throw new Error('Invalid request');
  if (typeof p.date !== 'string' || !/^\d{4}\/\d{2}\/\d{2}（六）$/.test(p.date)) throw new Error('Invalid date');
  const parts = p.date.slice(0, 10).split('/').map(Number);
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (day.getUTCFullYear() !== parts[0] || day.getUTCMonth() !== parts[1] - 1 || day.getUTCDate() !== parts[2] || day.getUTCDay() !== 6) throw new Error('Invalid Saturday');
  const choices = {
    meal: ['是，一起吃飯', '這次先不要'],
    dinner: ['日料', '烤肉', '速食'],
    market: ['是，一起逛夜市', '這次先不逛夜市'],
    drinks: ['0 · 今天不喝飲料', '1 · 一杯剛剛好', '2 · 兩杯一起分享', '3 · 三杯慢慢喝', '4 · 四杯快樂滿滿']
  };
  Object.keys(choices).forEach(key => {
    if (choices[key].indexOf(p[key]) === -1) throw new Error('Invalid choice');
  });
  ['meal', 'market'].forEach(key => {
    const total = p[key + 'No'];
    const before = p[key + 'BeforeYes'];
    if (!Number.isInteger(total) || total < 0 || total > 10000) throw new Error('Invalid count');
    if (before !== null && (!Number.isInteger(before) || before < 0 || before > total)) throw new Error('Invalid first yes');
    if (p[key] === choices[key][0] && before === null) throw new Error('Missing first yes');
  });
}

function doPost(e) {
  let lock;
  try {
    if (!e || !e.parameter || typeof e.parameter.payload !== 'string' || e.parameter.payload.length > 4096) throw new Error('Invalid request');
    const p = JSON.parse(e.parameter.payload);
    validate_(p);
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    const book = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = book.getSheetByName(TAB_NAME);
    if (!sheet) sheet = book.insertSheet(TAB_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#eeeeee').setWrap(true);
      sheet.setFrozenRows(1);
      sheet.setColumnWidths(1, HEADERS.length, 180);
      sheet.setColumnWidth(1, 340);
    }
    const existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (JSON.stringify(existing) !== JSON.stringify(HEADERS)) throw new Error('Header mismatch');
    const last = sheet.getLastRow();
    if (last > 1 && sheet.getRange(2, 1, last - 1, 1).createTextFinder(p.id).matchEntireCell(true).findNext()) {
      return json_({ ok: true, id: p.id, duplicate: true });
    }
    const firstYes = value => value === null ? '尚未點是' : value;
    const row = [p.id, Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'), p.date, p.meal, p.dinner, p.market, p.drinks, p.mealNo, firstYes(p.mealBeforeYes), p.marketNo, firstYes(p.marketBeforeYes), '是'];
    sheet.getRange(last + 1, 1, 1, HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
    return json_({ ok: true, id: p.id });
  } catch (error) {
    // 不將內部資訊或試算表資料回傳到公開端點。
    return json_({ ok: false, error: '無法儲存，請確認部署權限與資料格式。' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
