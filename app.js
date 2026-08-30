const STORAGE_KEY = 'daily-planner-v1';
const $ = (selector) => document.querySelector(selector);
const els = { date: $('#dateInput'), pretty: $('#prettyDate'), planInput: $('#planInput'), planForm: $('#planForm'), list: $('#planList'), empty: $('#emptyState'), count: $('#planCount'), progress: $('#progressValue'), bar: $('#progressBar'), progressText: $('#progressText'), toggle: $('#toggleAllBtn'), summary: $('#summaryInput'), summaryCount: $('#summaryCount'), status: $('#statusMessage'), voice: $('#voiceBtn'), voiceLabel: $('#voiceLabel'), voiceIcon: $('#voiceIcon') };
let selectedDate = toDateKey(new Date());
let data = loadData();
let recognition = null;

function toDateKey(date) { const pad = value => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
function emptyDay() { return { plans: [], summary: '' }; }
function loadData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { showStatus('本地数据读取失败，将使用临时数据。'); return {}; } }
function currentDay() { return data[selectedDate] || emptyDay(); }
function saveData() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { showStatus('保存失败：浏览器存储空间可能已满。'); } }
function ensureDay() { if (!data[selectedDate]) data[selectedDate] = emptyDay(); return data[selectedDate]; }
function showStatus(message) { els.status.textContent = message; clearTimeout(showStatus.timer); if (message) showStatus.timer = setTimeout(() => { els.status.textContent = ''; }, 3000); }
function render() {
  const day = currentDay();
  els.date.value = selectedDate;
  const date = parseDate(selectedDate);
  els.pretty.textContent = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  els.summary.value = day.summary || '';
  els.summaryCount.textContent = `${els.summary.value.length} / 1000`;
  els.list.textContent = '';
  day.plans.forEach(plan => {
    const item = document.createElement('div'); item.className = `plan-item${plan.done ? ' done' : ''}`;
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = plan.done; checkbox.setAttribute('aria-label', `完成：${plan.text}`); checkbox.dataset.action = 'toggle'; checkbox.dataset.id = plan.id;
    const content = document.createElement('div'); content.className = 'plan-content'; content.textContent = plan.text;
    const actions = document.createElement('div'); actions.className = 'plan-actions';
    const edit = document.createElement('button'); edit.className = 'small-action'; edit.textContent = '编辑'; edit.dataset.action = 'edit'; edit.dataset.id = plan.id; edit.setAttribute('aria-label', `编辑：${plan.text}`);
    const remove = document.createElement('button'); remove.className = 'small-action'; remove.textContent = '删除'; remove.dataset.action = 'delete'; remove.dataset.id = plan.id; remove.setAttribute('aria-label', `删除：${plan.text}`);
    actions.append(edit, remove); item.append(checkbox, content, actions); els.list.append(item);
  });
  const total = day.plans.length; const done = day.plans.filter(p => p.done).length; const percent = total ? Math.round(done / total * 100) : 0;
  els.count.textContent = `${total} 项`; els.progress.textContent = `${percent}%`; els.bar.style.width = `${percent}%`; els.bar.parentElement.setAttribute('aria-valuenow', percent);
  els.progressText.textContent = total ? `${done} / ${total} 项已完成` : '还没有计划'; els.toggle.textContent = total && done === total ? '全部取消' : '全部完成'; els.empty.hidden = total > 0;
}
function addPlan() { const text = els.planInput.value.trim(); if (!text) { showStatus('先写下一件想完成的事吧。'); els.planInput.focus(); return; } const day = ensureDay(); day.plans.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text: text.slice(0, 200), done: false, createdAt: new Date().toISOString() }); els.planInput.value = ''; saveData(); render(); els.planInput.focus(); }
els.planForm.addEventListener('submit', event => { event.preventDefault(); addPlan(); });
els.planInput.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addPlan(); } });
els.list.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (!button) return; const day = ensureDay(); const index = day.plans.findIndex(p => p.id === button.dataset.id); if (index < 0) return; if (button.dataset.action === 'delete') { day.plans.splice(index, 1); saveData(); render(); } else if (button.dataset.action === 'edit') { const next = prompt('编辑计划内容', day.plans[index].text); if (next !== null && next.trim()) { day.plans[index].text = next.trim().slice(0, 200); saveData(); render(); } } });
els.list.addEventListener('change', event => { if (!event.target.matches('[data-action="toggle"]')) return; const plan = ensureDay().plans.find(p => p.id === event.target.dataset.id); if (plan) { plan.done = event.target.checked; saveData(); render(); } });
els.summary.addEventListener('input', () => { ensureDay().summary = els.summary.value.slice(0, 1000); els.summaryCount.textContent = `${els.summary.value.length} / 1000`; saveData(); els.saveHint?.classList.add('saving'); });
function moveDay(amount) { const next = parseDate(selectedDate); next.setDate(next.getDate() + amount); selectedDate = toDateKey(next); render(); }
$('#prevDay').addEventListener('click', () => moveDay(-1)); $('#nextDay').addEventListener('click', () => moveDay(1)); $('#todayBtn').addEventListener('click', () => { selectedDate = toDateKey(new Date()); render(); }); els.date.addEventListener('change', () => { if (els.date.value) { selectedDate = els.date.value; render(); } });
els.toggle.addEventListener('click', () => { const day = ensureDay(); const complete = day.plans.some(p => !p.done); day.plans.forEach(p => p.done = complete); saveData(); render(); });
$('#clearDayBtn').addEventListener('click', () => { if (!data[selectedDate] || (!data[selectedDate].plans.length && !data[selectedDate].summary)) return showStatus('当天还没有记录。'); if (confirm('确定清空当天的计划和小结吗？此操作无法撤销。')) { delete data[selectedDate]; saveData(); render(); showStatus('当天记录已清空。'); } });
$('#exportBtn').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), days: data }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `小日程备份-${toDateKey(new Date())}.json`; link.click(); URL.revokeObjectURL(link.href); showStatus('数据已导出。'); });
$('#importInput').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(reader.result); const incoming = parsed.days || parsed; if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error(); Object.keys(incoming).forEach(key => { if (/^\d{4}-\d{2}-\d{2}$/.test(key) && incoming[key] && Array.isArray(incoming[key].plans)) { data[key] = { summary: typeof incoming[key].summary === 'string' ? incoming[key].summary.slice(0, 1000) : '', plans: incoming[key].plans.filter(p => p && typeof p.text === 'string').map(p => ({ id: String(p.id || `${Date.now()}-${Math.random()}`), text: p.text.slice(0, 200), done: Boolean(p.done), createdAt: p.createdAt || new Date().toISOString() })) }; } }); saveData(); render(); showStatus('数据导入成功。'); } catch { showStatus('导入失败：文件格式不正确。'); } event.target.value = ''; }; reader.readAsText(file); });
function setupVoice() { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) { els.voice.hidden = true; return; } recognition = new Speech(); recognition.lang = 'zh-CN'; recognition.interimResults = true; recognition.continuous = false; recognition.onstart = () => { els.voice.classList.add('listening'); els.voiceLabel.textContent = '正在聆听…'; els.voiceIcon.textContent = '●'; }; recognition.onresult = event => { const transcript = Array.from(event.results).map(r => r[0].transcript).join(''); els.planInput.value = transcript.slice(0, 200); }; recognition.onerror = event => { if (event.error !== 'aborted') showStatus(event.error === 'not-allowed' ? '请允许麦克风权限后再试。' : '没有听清，请再说一次。'); }; recognition.onend = () => { els.voice.classList.remove('listening'); els.voiceLabel.textContent = '语音输入'; els.voiceIcon.textContent = '●'; els.planInput.focus(); }; els.voice.addEventListener('click', () => { if (els.voice.classList.contains('listening')) recognition.stop(); else { try { recognition.start(); } catch { /* already starting */ } } }); }
setupVoice(); render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
