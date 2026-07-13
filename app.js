const STORAGE_KEY = 'banjik-project-reports-v1';

const blankActivity = () => ({ name: '', date: '', note: '' });
const blankExpense = () => ({ item: '', amount: '', source: '' });
const baht = n => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `project-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn('ไม่สามารถอ่านข้อมูลโครงการจาก Local Storage ได้', error);
    return [];
  }
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c || '-')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function initApp() {
  const form = document.querySelector('#projectForm');
  const projectList = document.querySelector('#projectList');
  const activitiesEl = document.querySelector('#activities');
  const expensesEl = document.querySelector('#expenses');
  const budgetTotalEl = document.querySelector('#budgetTotal');
  const imagePreview = document.querySelector('#imagePreview');
  const reportContent = document.querySelector('#reportContent');
  const addActivityButton = document.querySelector('#addActivity');
  const addExpenseButton = document.querySelector('#addExpense');
  const newProjectButton = document.querySelector('#newProject');
  const clearFormButton = document.querySelector('#clearForm');
  const printReportButton = document.querySelector('#printReport');
  const imageInput = document.querySelector('#imageInput');

  if (!form || !projectList || !activitiesEl || !expensesEl || !budgetTotalEl || !imagePreview || !reportContent || !newProjectButton) {
    console.error('ไม่พบองค์ประกอบหลักของเว็บแอปรายงานโครงการ กรุณาตรวจสอบ index.html');
    return;
  }

  let projects = readStore();
  let currentId = uid();
  let images = [];

  const saveStore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

  function rowTemplate(type, data = {}) {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    if (type === 'activity') {
      row.innerHTML = `<label>กิจกรรม<input data-field="name" placeholder="ชื่อกิจกรรม"></label><label>วันที่<input data-field="date" type="date"></label><label>หมายเหตุ<input data-field="note" placeholder="ผู้เข้าร่วม/สถานที่"></label><button type="button" class="danger">ลบ</button>`;
    } else {
      row.innerHTML = `<label>รายการค่าใช้จ่าย<input data-field="item" placeholder="เช่น วัสดุอุปกรณ์"></label><label>จำนวนเงิน<input data-field="amount" type="number" min="0" step="0.01"></label><label>แหล่งงบประมาณ<input data-field="source" placeholder="เงินอุดหนุน/บริจาค"></label><button type="button" class="danger">ลบ</button>`;
    }
    row.querySelectorAll('[data-field]').forEach(input => {
      input.value = data[input.dataset.field] || '';
      input.addEventListener('input', updateReport);
    });
    row.querySelector('button').addEventListener('click', () => { row.remove(); updateReport(); });
    return row;
  }

  function addActivity(data = blankActivity()) { activitiesEl.appendChild(rowTemplate('activity', data)); updateReport(); }
  function addExpense(data = blankExpense()) { expensesEl.appendChild(rowTemplate('expense', data)); updateReport(); }
  function collectRows(container) { return [...container.querySelectorAll('.dynamic-row')].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(i => [i.dataset.field, i.value]))); }
  function getFormData() { return { id: currentId, updatedAt: new Date().toISOString(), ...Object.fromEntries(new FormData(form).entries()), activities: collectRows(activitiesEl), expenses: collectRows(expensesEl), images: [...images] }; }

  function loadProject(project) {
    currentId = project.id || uid();
    form.reset();
    Object.entries(project).forEach(([key, value]) => { if (form.elements[key] && typeof value === 'string') form.elements[key].value = value; });
    activitiesEl.innerHTML = '';
    expensesEl.innerHTML = '';
    images = Array.isArray(project.images) ? [...project.images] : [];
    (project.activities?.length ? project.activities : [blankActivity()]).forEach(addActivity);
    (project.expenses?.length ? project.expenses : [blankExpense()]).forEach(addExpense);
    renderImages();
    renderList();
    updateReport();
  }

  function newProject() {
    currentId = uid();
    form.reset();
    activitiesEl.innerHTML = '';
    expensesEl.innerHTML = '';
    images = [];
    addActivity();
    addExpense();
    renderImages();
    renderList();
    updateReport();
    form.querySelector('[name="projectName"]')?.focus();
  }

  function deleteProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project || !confirm(`ต้องการลบโครงการ "${project.projectName || 'ยังไม่ระบุชื่อโครงการ'}" ใช่หรือไม่`)) return;
    projects = projects.filter(p => p.id !== id);
    saveStore();
    projects[0] ? loadProject(projects[0]) : newProject();
  }

  function renderList() {
    projectList.innerHTML = projects.length ? '' : '<p class="hint">ยังไม่มีโครงการที่บันทึก</p>';
    projects.forEach(p => {
      const item = document.createElement('div');
      item.className = `project-item ${p.id === currentId ? 'active' : ''}`;
      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'project-open';
      openButton.innerHTML = `<strong>${escapeHtml(p.projectName || 'ยังไม่ระบุชื่อโครงการ')}</strong><span>${escapeHtml(p.academicYear || 'ไม่ระบุปีการศึกษา')}</span>`;
      openButton.addEventListener('click', () => loadProject(p));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger project-delete';
      deleteButton.textContent = 'ลบ';
      deleteButton.addEventListener('click', () => deleteProject(p.id));
      item.append(openButton, deleteButton);
      projectList.appendChild(item);
    });
  }

  function renderImages() {
    imagePreview.innerHTML = '';
    images.forEach((src, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `<img src="${escapeHtml(src)}" alt="รูปหลักฐาน ${index + 1}"><button type="button" class="danger">ลบ</button>`;
      card.querySelector('button').addEventListener('click', () => { images.splice(index, 1); renderImages(); updateReport(); });
      imagePreview.appendChild(card);
    });
  }

  function updateReport() {
    const data = getFormData();
    const total = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    budgetTotalEl.textContent = `${baht(total)} บาท`;
    reportContent.innerHTML = `<h1>${escapeHtml(data.projectName || 'ชื่อโครงการ')}</h1><p><strong>ปีการศึกษา:</strong> ${escapeHtml(data.academicYear || '-')} <strong>ผู้รับผิดชอบ:</strong> ${escapeHtml(data.owner || '-')}</p><p><strong>หน่วยงาน:</strong> ${escapeHtml(data.department || '-')} <strong>ระยะเวลา:</strong> ${escapeHtml(data.startDate || '-')} ถึง ${escapeHtml(data.endDate || '-')}</p><h3>หลักการและเหตุผล</h3><p>${escapeHtml(data.rationale || '-')}</p><h3>วัตถุประสงค์</h3><p>${escapeHtml(data.objectives || '-')}</p><h3>กลุ่มเป้าหมาย</h3><p>${escapeHtml(data.targetGroup || '-')}</p><h3>กิจกรรม</h3>${table(['กิจกรรม','วันที่','หมายเหตุ'], data.activities.map(a => [a.name, a.date, a.note]))}<h3>งบประมาณ</h3><p><strong>รวม ${baht(total)} บาท</strong></p>${table(['รายการ','จำนวนเงิน','แหล่งงบประมาณ'], data.expenses.map(e => [e.item, baht(e.amount), e.source]))}<h3>ผลการดำเนินงานและตัวชี้วัด</h3><p>${escapeHtml(data.results || '-')}</p><p>${escapeHtml(data.indicators || '-')}</p><h3>ปัญหา อุปสรรค และข้อเสนอแนะ</h3><p>${escapeHtml(data.problems || '-')}</p><p>${escapeHtml(data.suggestions || '-')}</p><h3>รูปภาพหลักฐาน</h3><div class="report-images">${images.map((src, i) => `<img src="${escapeHtml(src)}" alt="หลักฐาน ${i + 1}">`).join('') || '-'}</div>`;
  }

  addActivityButton?.addEventListener('click', () => addActivity());
  addExpenseButton?.addEventListener('click', () => addExpense());
  newProjectButton.addEventListener('click', newProject);
  clearFormButton?.addEventListener('click', newProject);
  printReportButton?.addEventListener('click', () => window.print());
  form.addEventListener('input', updateReport);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = getFormData();
    projects = [data, ...projects.filter(p => p.id !== data.id)];
    saveStore();
    renderList();
    alert('บันทึกโครงการเรียบร้อยแล้ว');
  });
  imageInput?.addEventListener('change', async event => {
    const files = [...event.target.files];
    const readers = files.map(file => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }));
    images.push(...await Promise.all(readers));
    renderImages();
    updateReport();
    event.target.value = '';
  });

  projects[0] ? loadProject(projects[0]) : newProject();
}

document.addEventListener('DOMContentLoaded', initApp);
