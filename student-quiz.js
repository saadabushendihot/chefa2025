// جلب بيانات الطالب من localStorage
let studentName = localStorage.getItem("quiz_student_name");
let studentEmail = localStorage.getItem("quiz_student_email");
let studentLevel = parseInt(localStorage.getItem("quiz_student_level"));

// إذا لم توجد البيانات أعد الطالب للصفحة السابقة
if (!studentName || !studentEmail || !studentLevel) {
  window.location.href = "student.html";
}

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
var firestore = firebase.firestore();

let questions = [];
let randomizedQuestions = [];
let questionsLimit = null; // عدد الأسئلة المخصص للمستوى

// اظهار بيانات الطالب والمستوى في الأعلى
document.getElementById('studentInfo').innerHTML =
  `<b>اسم الطالب:</b> ${studentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${studentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${studentLevel}`;

// جلب عدد الأسئلة المخصص لهذا المستوى
firestore.collection('exam_settings').doc('level_' + studentLevel).get().then(function(settingDoc){
  if(settingDoc.exists && settingDoc.data().question_num){
    questionsLimit = settingDoc.data().question_num;
    document.getElementById('levelInfo').innerText =
      `عدد الأسئلة المخصصة لهذا المستوى: ${questionsLimit}`;
  } else {
    questionsLimit = null;
    document.getElementById('levelInfo').innerText =
      'لم يتم تحديد عدد الأسئلة لهذا المستوى (سيتم عرض جميع الأسئلة).';
  }
  loadQuestions();
});

// جلب أسئلة المستوى الحالي فقط
function loadQuestions() {
  firestore.collection('questions').where('level', '==', studentLevel).get().then(snap=>{
    questions = snap.docs.map(doc => ({...doc.data(), id: doc.id}));
    prepareRandomized();
    renderQuestions();
  });
}

// دالة خلط عشوائي لمصفوفة
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// تجهيز نسخة عشوائية من الأسئلة وترتيب الخيارات
function prepareRandomized() {
  let shuffled = shuffleArray(questions.map(q => {
    // خلط الخيارات
    let choiceObjs = (q.choices||[]).map((choice, idx) => ({
      text: choice,
      origIndex: idx
    }));
    let shuffledChoices = shuffleArray(choiceObjs);
    // تعيين correct الجديدة بحسب ترتيب الخيارات الجديد
    let newCorrect = [];
    shuffledChoices.forEach((ch, ix) => {
      if(q.correct && q.correct.includes(ch.origIndex)) newCorrect.push(ix);
    });
    return {
      ...q,
      choices: shuffledChoices.map(c => c.text),
      correct: newCorrect
    };
  }));
  // إذا كان هناك حد للأسئلة، اقتطع فقط العدد المطلوب
  randomizedQuestions = questionsLimit ? shuffled.slice(0, questionsLimit) : shuffled;
}

function renderQuestions() {
  let html = '';
  randomizedQuestions.forEach((q, i) => {
    let multiNote = '';
    let scoringNote = '';
    if (q.correct.length > 1) {
      multiNote = '<span class="multi-note">(يحتمل أكثر من إجابة صحيحة)</span>';
      scoringNote = `<div class="scoring-note">
      ملاحظة: لكل إجابة صحيحة تختارها تحصل على جزء من العلامة، ولكل إجابة خاطئة تختارها يُخصم نفس الجزء من العلامة. لا يمكن أن تقل علامة السؤال عن الصفر.
      </div>`;
    }
    let markText = `<span class="question-mark">[العلامة: ${q.mark || 1}]</span>`;
    html += `<div class="question-block">
      <div class="question-title">${i+1}. ${q.question} ${multiNote} ${markText}</div>
      <div class="choices-list">` +
      (q.choices||[]).map((choice, idx) =>
        `<div class="choice-row">
          <label>
            <input type="${q.correct.length>1?'checkbox':'radio'}" name="q${i}" value="${idx}">
            ${choice}
          </label>
        </div>`
      ).join('') +
      `</div>
      ${scoringNote}
    </div>`;
  });
  document.getElementById('questionsArea').innerHTML = html || '<div class="msg">لا توجد أسئلة حالياً.</div>';
}

// التصحيح وحساب النتيجة
document.getElementById('examForm').onsubmit = function(e){
  e.preventDefault();
  let totalMark = 0, gainedMark = 0, empty = 0;
  randomizedQuestions.forEach((q, i) => {
    let nodes = document.getElementsByName('q'+i);
    let selected = [];
    nodes.forEach(input => { if(input.checked) selected.push(parseInt(input.value)); });

    let mark = parseFloat(q.mark) || 1;
    totalMark += mark;

    if (selected.length===0) { empty++; return; }

    // التصحيح التفاضلي
    if(q.correct.length > 1) {
      let perMark = mark / q.correct.length;
      let countCorrect = 0;
      let countWrong = 0;
      selected.forEach(val => {
        if(q.correct.includes(val)) countCorrect++;
        else countWrong++;
      });
      let gained = (countCorrect - countWrong) * perMark;
      if(gained < 0) gained = 0;
      gainedMark += gained;
    }
    else {
      // سؤال بإجابة واحدة فقط: العلامة كاملة إذا كانت الإجابة صحيحة فقط
      if(selected.length === 1 && q.correct.includes(selected[0])) gainedMark += mark;
    }
  });
  if (empty>0) {
    showFormMsg('يرجى الإجابة على جميع الأسئلة!');
    return;
  }
  // تقريب العلامة النهائية إلى منزلتين
  gainedMark = Math.round(gainedMark * 100) / 100;
  showResult(`درجتك: ${gainedMark} من ${totalMark}`);
  showFormMsg('');
};

function showFormMsg(msg) {
  document.getElementById('formMsg').innerText = msg;
}
function showResult(msg) {
  document.getElementById('resultArea').innerText = msg;
}

function logout() {
  // مسح بيانات الطالب من localStorage عند تسجيل الخروج
  localStorage.removeItem("quiz_student_name");
  localStorage.removeItem("quiz_student_email");
  localStorage.removeItem("quiz_student_level");
  window.location.href='login.html';
}
