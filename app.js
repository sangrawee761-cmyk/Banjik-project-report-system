const STORAGE_KEY = 'banjik-project-reports-v1';
const form = document.querySelector('#projectForm');
const projectList = document.querySelector('#projectList');
const activitiesEl = document.querySelector('#activities');
const expensesEl = document.querySelector('#expenses');
const budgetTotalEl = document.querySelector('#budgetTotal');
const imagePreview = document.querySelector('#imagePreview');
const reportContent = document.querySelector('#reportContent');
let projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentId = crypto.randomUUID();
let images = [];

const blankActivity = () => ({ name: '', date: '', note: '' });
const blankExpense = () => ({ item: '', amount: '', source: '' });
const saveStore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
const baht = n => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rowTemplate(type, data = {}) {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  if (type === 'activity') {
    row.innerHTML = `<label>กิจกรรม<input data-field="name" value="${data.name || ''}" placeholder="ชื่อกิจกรรม"></label><label>วันที่<input data-field="date" type="date" value="${data.date || ''}"></label><label>หมายเหตุ<input data-field="note" value="${data.note || ''}" placeholder="ผู้เข้าร่วม/สถานที่"></label><button type="button" class="danger">ลบ</button>`;
  } else {
    row.innerHTML = `<label>รายการค่าใช้จ่าย<input data-field="item" value="${data.item || ''}" placeholder="เช่น วัสดุอุปกรณ์"></label><label>จำนวนเงิน<input data-field="amount" type="number" min="0" step="0.01" value="${data.amount || ''}"></label><label>แหล่งงบประมาณ<input data-field="source" value="${data.source || ''}" placeholder="เงินอุดหนุน/บริจาค"></label><button type="button" class="danger">ลบ</button>`;
  }
  row.querySelector('button').addEventListener('click', () => { row.remove(); updateReport(); });
  row.querySelectorAll('input').forEach(input => input.addEventListener('input', updateReport));
  return row;
}

function addActivity(data) { activitiesEl.appendChild(rowTemplate('activity', data)); updateReport(); }
function addExpense(data) { expensesEl.appendChild(rowTemplate('expense', data)); updateReport(); }
function collectRows(container) { return [...container.querySelectorAll('.dynamic-row')].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(i => [i.dataset.field, i.value]))); }
function getFormData() { return { id: currentId, updatedAt: new Date().toISOString(), ...Object.fromEntries(new FormData(form).entries()), activities: collectRows(activitiesEl), expenses: collectRows(expensesEl), images }; }

function loadProject(project) {
  currentId = project.id;
  form.reset();
  Object.entries(project).forEach(([key, value]) => { if (form.elements[key] && typeof value === 'string') form.elements[key].value = value; });
  activitiesEl.innerHTML = ''; expensesEl.innerHTML = ''; images = project.images || [];
  (project.activities?.length ? project.activities : [blankActivity()]).forEach(addActivity);
  (project.expenses?.length ? project.expenses : [blankExpense()]).forEach(addExpense);
  renderImages(); renderList(); updateReport();
}

function newProject() { currentId = crypto.randomUUID(); form.reset(); activitiesEl.innerHTML = ''; expensesEl.innerHTML = ''; images = []; addActivity(blankActivity()); addExpense(blankExpense()); renderImages(); renderList(); updateReport(); }
function renderList() { projectList.innerHTML = projects.length ? '' : '<p class="hint">ยังไม่มีโครงการที่บันทึก</p>'; projects.forEach(p => { const btn = document.createElement('button'); btn.className = `project-item ${p.id === currentId ? 'active' : ''}`; btn.innerHTML = `<strong>${p.projectName || 'ยังไม่ระบุชื่อโครงการ'}</strong><span>${p.academicYear || 'ไม่ระบุปีการศึกษา'}</span>`; btn.onclick = () => loadProject(p); projectList.appendChild(btn); }); }
function renderImages() { imagePreview.innerHTML = ''; images.forEach((src, index) => { const card = document.createElement('div'); card.className = 'image-card'; card.innerHTML = `<img src="${src}" alt="รูปหลักฐาน ${index + 1}"><button type="button" class="danger">ลบ</button>`; card.querySelector('button').onclick = () => { images.splice(index, 1); renderImages(); updateReport(); }; imagePreview.appendChild(card); }); }
function updateReport() { const data = getFormData(); const total = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0); budgetTotalEl.textContent = `${baht(total)} บาท`; reportContent.innerHTML = `<h1>${data.projectName || 'ชื่อโครงการ'}</h1><p><strong>ปีการศึกษา:</strong> ${data.academicYear || '-'} <strong>ผู้รับผิดชอบ:</strong> ${data.owner || '-'}</p><p><strong>หน่วยงาน:</strong> ${data.department || '-'} <strong>ระยะเวลา:</strong> ${data.startDate || '-'} ถึง ${data.endDate || '-'}</p><h3>หลักการและเหตุผล</h3><p>${data.rationale || '-'}</p><h3>วัตถุประสงค์</h3><p>${data.objectives || '-'}</p><h3>กลุ่มเป้าหมาย</h3><p>${data.targetGroup || '-'}</p><h3>กิจกรรม</h3>${table(['กิจกรรม','วันที่','หมายเหตุ'], data.activities.map(a=>[a.name,a.date,a.note]))}<h3>งบประมาณ</h3><p><strong>รวม ${baht(total)} บาท</strong></p>${table(['รายการ','จำนวนเงิน','แหล่งงบประมาณ'], data.expenses.map(e=>[e.item, baht(e.amount), e.source]))}<h3>ผลการดำเนินงานและตัวชี้วัด</h3><p>${data.results || '-'}</p><p>${data.indicators || '-'}</p><h3>ปัญหา อุปสรรค และข้อเสนอแนะ</h3><p>${data.problems || '-'}</p><p>${data.suggestions || '-'}</p><h3>รูปภาพหลักฐาน</h3><div class="report-images">${images.map((src,i)=>`<img src="${src}" alt="หลักฐาน ${i+1}">`).join('') || '-'}</div>`; }
function table(headers, rows) { return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c || '-'}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }

document.querySelector('#addActivity').onclick = () => addActivity(blankActivity());
document.querySelector('#addExpense').onclick = () => addExpense(blankExpense());
document.querySelector('#newProject').onclick = newProject;
document.querySelector('#clearForm').onclick = newProject;
document.querySelector('#printReport').onclick = () => window.print();
form.addEventListener('input', updateReport);
form.addEventListener('submit', event => { event.preventDefault(); const data = getFormData(); projects = [data, ...projects.filter(p => p.id !== data.id)]; saveStore(); renderList(); alert('บันทึกโครงการเรียบร้อยแล้ว'); });
document.querySelector('#imageInput').addEventListener('change', async event => { const files = [...event.target.files]; const readers = files.map(file => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); })); images.push(...await Promise.all(readers)); renderImages(); updateReport(); event.target.value = ''; });

if (projects[0]) loadProject(projects[0]); else newProject();
