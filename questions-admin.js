// Toast & Loading Functions
function showToast(msg, color="var(--primary-color)") {
  const toast = document.getElementById("toast");
  if (!toast) {
      console.error("Toast element not found!");
      return;
  }
  toast.innerText = msg;
  toast.style.background = color;
  toast.className = "toast show";
  setTimeout(()=>{ toast.className = toast.className.replace("show", ""); }, 2500);
}
function showLoading(show) {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) {
      spinner.style.display = show ? "block" : "none";
  }
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  // Save user preference
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
}
// Apply saved theme preference on load
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
});


if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
var auth = firebase.auth();
var firestore = firebase.firestore();

let questions = [];
const LEVELS = [1,2,3,4,5,6,7];

// حماية الصفحة - فقط للمعلمين
auth.onAuthStateChanged(function(user) {
  if (user) {
    firestore.collection('users').doc(user.uid).get().then(function(doc) {
      if (!doc.exists || doc.data().role !== "teacher") {
        window.location.href = "login.html";
      } else {
        startQuestionsAdmin();
        loadSettingsTable();
      }
    }).catch(function(error) {
      window.location.href = "login.html";
    });
  } else {
    window.location.href = "login.html";
  }
});

function logout() {
  auth.signOut().then(()=>{window.location.href='login.html';});
}

// إعدادات عدد الأسئلة لكل مستوى
function loadSettingsTable() {
  showLoading(true);
  const tbody = document.getElementById('settingsTbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-secondary)">جاري التحميل...</td></tr>';
  firestore.collection('exam_settings').get().then(snapshot => {
    let data = {};
    snapshot.forEach(doc => {
      data[doc.id] = doc.data(); // Get all data for the level (question_num, total_marks, exam_duration)
    });
    let rows = '';
    LEVELS.forEach(lvl => {
      let questionNum = data[`level_${lvl}`]?.question_num !== undefined ? data[`level_${lvl}`].question_num : '';
      let totalMarks = data[`level_${lvl}`]?.total_marks !== undefined ? data[`level_${lvl}`].total_marks : ''; // New field
      let examDuration = data[`level_${lvl}`]?.exam_duration !== undefined ? data[`level_${lvl}`].exam_duration : ''; // New field

      rows += `
        <tr>
          <td>المستوى ${lvl}</td>
          <td>
            <input type="number" min="1" id="input_qnum_${lvl}" value="${questionNum}" placeholder="عدد الأسئلة" class="form-control" required>
          </td>
          <td>
            <input type="number" min="1" id="input_tmarks_${lvl}" value="${totalMarks}" placeholder="عدد العلامات" class="form-control" required>
          </td>
          <td>
            <input type="number" min="1" id="input_duration_${lvl}" value="${examDuration}" placeholder="الوقت (دقيقة)" class="form-control" required>
          </td>
          <td class="text-center">
            <button type="button" class="btn btn-success" onclick="saveLevel(${lvl})">
                <i class="material-icons">save</i>
            </button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;
    showLoading(false);
  }).catch(error => {
      showToast(`خطأ في تحميل الإعدادات: ${error.message}`, 'var(--error)');
      showLoading(false);
  });
}

function saveLevel(lvl) {
  let inputQNum = document.getElementById(`input_qnum_${lvl}`);
  let inputTMarks = document.getElementById(`input_tmarks_${lvl}`);
  let inputDuration = document.getElementById(`input_duration_${lvl}`);

  let qNum = parseInt(inputQNum.value);
  let tMarks = parseInt(inputTMarks.value);
  let duration = parseInt(inputDuration.value);

  if (!qNum || qNum < 1) {
    showToast(`يرجى إدخال عدد صحيح أكبر من صفر لعدد الأسئلة للمستوى ${lvl}`, 'var(--error)');
    inputQNum.focus();
    return;
  }
  if (!tMarks || tMarks < 1) {
    showToast(`يرجى إدخال عدد صحيح أكبر من صفر لعدد العلامات للمستوى ${lvl}`, 'var(--error)');
    inputTMarks.focus();
    return;
  }
  if (!duration || duration < 1) {
    showToast(`يرجى إدخال عدد صحيح أكبر من صفر للوقت المخصص للمستوى ${lvl}`, 'var(--error)');
    inputDuration.focus();
    return;
  }

  firestore.collection('exam_settings').doc(`level_${lvl}`).set({
    question_num: qNum,
    total_marks: tMarks,
    exam_duration: duration
  }).then(()=>{
    showToast(`تم حفظ إعدادات المستوى ${lvl} بنجاح`, 'var(--secondary-color)');
  }).catch((error)=>{
    showToast(`حدث خطأ أثناء الحفظ! ${error.message}`, 'var(--error)');
    console.error("Error saving level settings:", error);
  });
}

// الكود الأصلي لإضافة الأسئلة وإدارتها
function startQuestionsAdmin() {
  resetForm();
  loadQuestions();
}

function addChoice(text = '', checked = false) {
  let idx = document.querySelectorAll('.choice-row').length;
  let div = document.createElement('div');
  div.className = 'choice-row d-flex align-items-center mb-1';
  div.innerHTML = `
    <input type="checkbox" class="correctChoice" name="correct${idx}" ${checked ? 'checked' : ''} title="صحيح" style="width:24px; height:24px; margin-left:8px; accent-color: var(--primary-color);">
    <input type="text" class="choiceText form-control" value="${text}" required placeholder="الخيار ${idx+1}" style="flex-grow:1; margin-bottom:0;">
    <button type="button" class="btn btn-danger ml-2" onclick="this.parentNode.remove()" style="padding: 6px 12px; height: auto;">
        <i class="material-icons" style="font-size:18px;">delete</i>
    </button>
  `;
  document.getElementById('choicesArea').appendChild(div);
}

function resetForm() {
  document.getElementById('questionForm').reset();
  document.getElementById('choicesArea').innerHTML = '';
  addChoice();
  addChoice();
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').innerText = 'إضافة سؤال جديد';
  document.getElementById('formMsg').innerText = '';
  document.getElementById('qMark').value = 1;
}

function loadQuestions() {
  showLoading(true);
  firestore.collection('questions').orderBy('level').get().then(snap => {
    questions = snap.docs.map(doc => ({...doc.data(), id: doc.id}));
    renderQuestionsTable();
    showLoading(false);
  }).catch(error => {
      showToast(`خطأ في تحميل الأسئلة: ${error.message}`, 'var(--error)');
      showLoading(false);
  });
}

function renderQuestionsTable() {
  let level = document.getElementById('filterLevel').value;
  let rows = '';
  let filtered = level ? questions.filter(q => q.level == level) : questions;
  filtered.forEach((q, i) => {
    let chs = q.choices.map((c, idx) =>
      `<span class="choice-item${q.correct && q.correct.includes(idx) ? ' correct' : ''}">${c}</span>`
    ).join('');
    rows += `<tr>
      <td class="text-center">${i+1}</td>
      <td class="text-right">${q.question}</td>
      <td class="text-center">${q.level}</td>
      <td class="text-center">${q.mark || 1}</td>
      <td><div class="choices-list d-flex justify-content-end">${chs}</div></td>
      <td class="text-center">${q.correct ? q.correct.length : 0}</td>
      <td class="text-center">
        <button class="btn" onclick="editQuestion('${q.id}')" style="padding: 6px 12px; height: auto;">
            <i class="material-icons" style="font-size:18px;">edit</i>
        </button>
      </td>
      <td class="text-center">
        <button class="btn btn-danger" onclick="deleteQuestion('${q.id}')" style="padding: 6px 12px; height: auto;">
            <i class="material-icons" style="font-size:18px;">delete</i>
        </button>
      </td>
    </tr>`;
  });
  document.getElementById('questionsTbody').innerHTML = rows || `<tr><td colspan="8" class="text-center" style="color:var(--text-secondary)">لا توجد أسئلة</td></tr>`;
}

function editQuestion(id) {
  let q = questions.find(x => x.id === id);
  if (!q) return;
  document.getElementById('qText').value = q.question;
  document.getElementById('qLevel').value = q.level;
  document.getElementById('qMark').value = q.mark || 1;
  document.getElementById('choicesArea').innerHTML = '';
  q.choices.forEach((choice, i) => {
    addChoice(choice, q.correct && q.correct.includes(i));
  });
  document.getElementById('editId').value = id;
  document.getElementById('formTitle').innerText = 'تعديل سؤال';
  window.scrollTo({top:0,behavior:'smooth'});
}

function deleteQuestion(id) {
  if (!confirm('هل أنت متأكد من حذف السؤال؟')) return;
  firestore.collection('questions').doc(id).delete().then(()=>{
      loadQuestions();
      showToast('تم حذف السؤال بنجاح!', 'var(--secondary-color)');
  }).catch(error => {
      showToast(`خطأ في حذف السؤال: ${error.message}`, 'var(--error)');
      console.error("Error deleting question:", error);
  });
}

document.getElementById('questionForm').onsubmit = function(e){
  e.preventDefault();
  let question = document.getElementById('qText').value.trim();
  let level = parseInt(document.getElementById('qLevel').value);
  let mark = parseFloat(document.getElementById('qMark').value) || 1;
  let choiceNodes = document.querySelectorAll('.choice-row');
  let choices = [];
  let correct = [];
  choiceNodes.forEach((row, i) => {
    let text = row.querySelector('.choiceText').value.trim();
    if (text) {
      choices.push(text);
      if (row.querySelector('.correctChoice').checked) correct.push(i);
    }
  });
  if (choices.length < 2) { showFormMsg('يجب إدخال خيارين على الأقل!'); return; }
  if (correct.length === 0) { showFormMsg('حدد إجابة صحيحة واحدة على الأقل!'); return; }
  if (mark <= 0) { showFormMsg('يجب أن تكون العلامة أكبر من صفر!'); return; }
  let qObj = {
    question,
    choices,
    correct,
    level,
    mark
  };
  let editId = document.getElementById('editId').value;
  if (editId) {
    firestore.collection('questions').doc(editId).set(qObj).then(()=>{
      resetForm();
      loadQuestions();
      showFormMsg('تم تحديث السؤال بنجاح', true);
      showToast('تم تحديث السؤال بنجاح!', 'var(--secondary-color)');
    }).catch(error => {
        showFormMsg(`خطأ في تحديث السؤال: ${error.message}`, false);
        showToast(`خطأ في تحديث السؤال: ${error.message}`, 'var(--error)');
        console.error("Error updating question:", error);
    });
  } else {
    firestore.collection('questions').add(qObj).then(()=>{
      resetForm();
      loadQuestions();
      showFormMsg('تمت إضافة السؤال بنجاح', true);
      showToast('تمت إضافة السؤال بنجاح!', 'var(--secondary-color)');
    }).catch(error => {
        showFormMsg(`خطأ في إضافة السؤال: ${error.message}`, false);
        showToast(`خطأ في إضافة السؤال: ${error.message}`, 'var(--error)');
        console.error("Error adding question:", error);
    });
  }
};

function showFormMsg(msg, success=false) {
  let el = document.getElementById('formMsg');
  el.innerText = msg;
  el.style.color = success ? 'var(--secondary-color)' : 'var(--error)';
  setTimeout(()=>{el.innerText='';}, 2500);
}
