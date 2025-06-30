// Firebase Config: (يتم جلبه من firebase-config.js)

// الوضع الليلي
function toggleNightMode() {
  document.body.classList.toggle('dark-mode');
  // Save user preference
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
}

// رسالة منبثقة (Toast)
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

// مؤشر تحميل
function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
      spinner.style.display = show ? 'block' : 'none';
  }
}

// فتح الدعم الفني
function openSupport() {
  window.open("mailto:support@chefa.edu.sa?subject=دعم فني للطالب", "_blank");
}

// تنزيل تقرير PDF (مكتبة jsPDF مطلوبة)
function downloadReport() {
  if (typeof html2pdf === 'undefined') {
      showToast("ميزة تحميل التقرير قيد التطوير حالياً. يرجى المحاولة لاحقاً.", "var(--info-color)");
      return;
  }
  showToast("جاري إنشاء تقرير PDF...", "var(--info-info)");
  let el = document.getElementById('studentDataForPdf');
  if (!el) {
    el = document.querySelector('.container');
  }
  let studentNameForPdf = currentStudentName || "التقرير";
  let opt = {
    margin: 0.5,
    filename: `تقرير_${studentNameForPdf}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  let clonedElement = el.cloneNode(true);
  let elementsToHideInPdf = clonedElement.querySelectorAll('.btn, .form-group button, .table-mark-input, .table-mark-button, .reset-summary, #summaryDetailsBox .card-actions, .app-bar, .spinner, #toast, .notification-bell, .notification-panel, .message-input-area, #examBox');
  elementsToHideInPdf.forEach(elem => elem.style.display = 'none');
  
  html2pdf().set(opt).from(clonedElement).save().finally(() => {
    showToast("تم إنشاء التقرير بنجاح!", "var(--success-color)");
  });
}


// فلترة النص لمنع HTML
function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// عداد الوقت للاختبار
let examTimerInterval, examTimeLeft = 0;
function startExamTimer(minutes = 20) {
  clearInterval(examTimerInterval);
  examTimeLeft = minutes * 60;
  updateExamTimer();
  examTimerInterval = setInterval(() => {
    examTimeLeft--;
    updateExamTimer();
    if (examTimeLeft <= 0) {
      clearInterval(examTimerInterval);
      showToast("انتهى وقت الاختبار! سيتم تسليم إجاباتك تلقائياً.", "var(--danger-color)");
      processExamSubmission(true);
    }
  }, 1000);
}
function updateExamTimer() {
  const el = document.getElementById('examTimer');
  if (el && examTimeLeft > 0) {
    const min = Math.floor(examTimeLeft/60);
    const sec = examTimeLeft%60;
    el.innerText = `(${min}:${sec<10?'0':''}${sec})`;

    if (examTimeLeft === 30) {
      const sound = document.getElementById('timeWarningSound');
      if (sound) {
        sound.play().catch(e => console.error("Error playing sound:", e));
      }
    }
  } else if (el) {
    el.innerText = "";
  }
}

// المتغيرات
let auth, firestore;
let currentStudentEmail = "";
let currentStudentName = "";
let currentStudentUid = "";
let lastActiveLevel = null;
let lastActiveLevelIndex = null;
let examQuestions = [];
let randomizedExamQuestions = [];
let examQuestionsLimit = null;
let currentExamLevel = null;
let studentSummaries = {};
let summariesListenerUnsubscribe = null;
let notificationsListenerUnsubscribe = null;
let studentMarksListenerUnsubscribe = null;
window.realtimeStudentMarks = {};

const TEACHER_ADMIN_EMAIL = "saad.abushendi@gmail.com";

// تعريف روابط التنقل لكل دور
const navLinks = {
    teacher: [
        { name: 'لوحة التحكم', href: 'dashboard.html', icon: 'fas fa-tachometer-alt' },
        { name: 'إدارة الأسئلة', href: 'questions-admin.html', icon: 'fas fa-question-circle' },
        { name: 'الدردشة', href: 'chat.html', icon: 'fas fa-comments' }
    ],
    student: [
        { name: 'لوحة الطالب', href: 'student.html', icon: 'fas fa-user-graduate' },
        { name: 'الدردشة', href: 'chat.html', icon: 'fas fa-comments' }
    ]
};

// دالة رسم روابط التنقل بناءً على الدور
function renderNavigation(role) {
    const navContainer = document.getElementById('main-nav-links');
    if (!navContainer) return;

    navContainer.innerHTML = '';
    const linksToRender = navLinks[role] || [];
    const currentPath = window.location.pathname.split('/').pop();

    linksToRender.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'nav-link';
        if (currentPath === link.href) {
             a.classList.add('active');
        }
        const icon = document.createElement('i');
        icon.className = link.icon;
        a.appendChild(icon);
        const textSpan = document.createElement('span');
        textSpan.textContent = link.name;
        a.appendChild(textSpan);

        navContainer.appendChild(a);
    });
}


// Firebase init
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
auth = firebase.auth();
firestore = firebase.firestore();

// تحويل رقم المستوى إلى نصه العربي
function getLevelText(index) {
  const names = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
  return names[index] || "";
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getLevelNumber(levelName) {
  switch (levelName.replace('المستوى ', '').replace('ال', '')) {
    case "أول": case "الأول": return 1;
    case "ثاني": case "الثاني": return 2;
    case "ثالث": case "الثالث": return 3;
    case "رابع": case "الرابع": return 4;
    case "خامس": case "الخامس": return 5;
    case "سادس": case "السادس": return 6;
    case "سابع": case "السابع": return 7;
    case "1": return 1; case "2": return 2; case "3": return 3; case "4": return 4; case "5": return 5; case "6": return 6; case "7": return 7;
    default: return 0;
  }
}

function getAllowedLevels(data) {
  let allowed = [];
  for(let i=1; i<=7; i++){
    if(data['level'+i]) allowed.push(i);
  }
  return allowed;
}

// مراقبة الدخول
auth.onAuthStateChanged(function(user) {
  if (user) {
    currentStudentUid = user.uid;
    console.log("معرف المستخدم الحالي (UID): ", currentStudentUid);
    firestore.collection('users').doc(user.uid).get().then(function(doc) {
      if (doc.exists) {
        if (doc.data().role !== "student") {
          window.location.href = "dashboard.html";
          return;
        }
        loadStudentData(doc.data().email, doc.data().name);
        setupNotificationsListener();
        setupRealtimeMarksListener();
      } else {
        firestore.collection('users').doc(user.uid).set({
          email: user.email, role: "student"
        }).then(function() { window.location.reload(); });
      }
    }).catch(err => { showLoading(false); showToast("خطأ في جلب بيانات المستخدم", "var(--danger-color)"); });
  } else {
    window.location.href = "login.html";
  }
});

// Helper function to send notifications to the teacher
async function sendTeacherNotification(messageContent, type, relatedId = null, relatedName = null) {
    if (!currentStudentEmail || !currentStudentName || !messageContent) {
        console.warn("Cannot send teacher notification: Missing student info or message content.");
        return;
    }
    try {
        await firestore.collection('notifications').add({
            message: messageContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            recipient_email: TEACHER_ADMIN_EMAIL,
            is_read: false,
            sender_email: currentStudentEmail,
            sender_name: currentStudentName,
            notification_type: type,
            related_id: relatedId,
            related_name: relatedName
        });
        console.log(`Notification sent to teacher: "${messageContent}"`);
    } catch (error) {
        console.error("Error sending teacher notification:", error);
    }
}


// Notification functions for student UI
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel && panel.style.display === 'block') {
        panel.style.display = 'none';
    } else if (panel) {
        panel.style.display = 'block';
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            const notificationId = item.dataset.id;
            markNotificationAsRead(notificationId);
        });
    }
}

function setupNotificationsListener() {
    if (!currentStudentEmail) {
        console.warn("currentStudentEmail not yet available for notifications listener.");
        return;
    }

    if (notificationsListenerUnsubscribe) {
        notificationsListenerUnsubscribe();
    }

    notificationsListenerUnsubscribe = firestore.collection('notifications')
        .where('recipient_email', 'in', [currentStudentEmail, 'all'])
        .orderBy('timestamp', 'desc')
        .onSnapshot(function(snapshot) {
            let notifications = [];
            let unreadCount = 0;
            snapshot.forEach(doc => {
                const notification = { ...doc.data(), id: doc.id };
                notifications.push(notification);
                if (!notification.is_read) {
                    unreadCount++;
                }
            });
            renderNotifications(notifications, unreadCount);
        }, function(error) {
            console.error("Error listening to notifications:", error);
            showToast("خطأ في تحميل الإشعارات: " + error.message, "var(--danger-color)");
        });
}

function renderNotifications(notifications, unreadCount) {
    const notificationsListDiv = document.getElementById('notificationsList');
    const unreadBadge = document.getElementById('unreadNotificationsBadge');

    if (unreadBadge) {
      if (unreadCount > 0) {
          unreadBadge.innerText = unreadCount;
          unreadBadge.style.display = 'block';
      } else {
          unreadBadge.style.display = 'none';
      }
    }


    if (notificationsListDiv) {
        if (notifications.length === 0) {
            notificationsListDiv.innerHTML = '<p style="text-align: center; color: #888;">لا توجد إشعارات حالياً.</p>';
            return;
        }

        let html = '';
        notifications.forEach(n => {
            const timestamp = n.timestamp ? new Date(n.timestamp.toDate()).toLocaleString('ar-EG') : '';
            html += `
                <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
                    ${n.message}
                    <span class="timestamp">${timestamp}</span>
                    ${!n.is_read ? `<button class="mark-read-btn" onclick="markNotificationAsRead('${n.id}')">قراءة</button>` : ''}
                </div>
            `;
        });
        notificationsListDiv.innerHTML = html;
    }
}

function markNotificationAsRead(notificationId) {
    firestore.collection('notifications').doc(notificationId).update({
        is_read: true
    }).catch(error => {
        console.error("Error marking notification as read:", error);
        showToast("خطأ في تحديث حالة الإشعار: " + error.message, "var(--danger-color)");
    });
}

// Real-time listener for student marks
function setupRealtimeMarksListener() {
    if (!currentStudentEmail) {
        console.warn("currentStudentEmail not yet available for marks listener.");
        return;
    }

    if (studentMarksListenerUnsubscribe) {
        studentMarksListenerUnsubscribe();
    }

    studentMarksListenerUnsubscribe = firestore.collection('student_marks')
        .where('student_email', '==', currentStudentEmail)
        .onSnapshot(function(snapshot) {
            window.realtimeStudentMarks = {};
            snapshot.forEach(doc => {
                const markData = doc.data();
                window.realtimeStudentMarks[markData.summary_id] = markData.mark;
            });
            console.log("Realtime marks updated:", window.realtimeStudentMarks);
            if (window.lastRenderedLessons && window.lastRenderedStudentSummaries) {
                renderSummariesLessonsUI(window.lastRenderedLessons, window.lastRenderedStudentSummaries);
            } else {
                console.warn("Cannot re-render summaries from marks listener: lessons or studentSummaries not yet available globally.");
            }

        }, function(error) {
            console.error("Error listening to student marks:", error);
            showToast("خطأ في تحميل علامات الطلاب في الوقت الحقيقي: " + error.message, "var(--danger-color)");
        });
}


// تحميل بيانات الطالب
function loadStudentData(userEmail, userNameFromUserDoc) {
  currentStudentEmail = userEmail;
  showLoading(true);
  firestore.collection('lectures').where('email', '==', userEmail).get().then(function(querySnapshot) {
    showLoading(false);
    const msgEl = document.getElementById('msg');
    if (querySnapshot.empty) {
      if (msgEl) msgEl.innerText = "لا توجد بيانات لهذا المستخدم في النظام. تواصل مع الإدارة.";
    } else {
      const data = querySnapshot.docs[0].data();
      currentStudentName = data.name || userNameFromUserDoc || "";
      const studentNameEl = document.getElementById('studentName');
      const studentNameInfoEl = document.getElementById('studentNameInfo');
      const studentEmailEl = document.getElementById('studentEmail');
      const courseNumberEl = document.getElementById('courseNumber');

      if (studentNameEl) studentNameEl.innerText = currentStudentName;
      if (studentNameInfoEl) studentNameInfoEl.innerText = currentStudentName;
      if (studentEmailEl) studentEmailEl.innerText = userEmail || "";
      if (courseNumberEl) courseNumberEl.innerText = data.course_number || "";
      if (msgEl) msgEl.innerText = "";
      
      // لا توجد حاجة للتعامل مع examsBox هنا لأنها أزيلت من HTML


      // حالة القبول
      const admissionBox = document.getElementById('admissionStatusBox');
      const status = data.accepted;
      const isAccepted = (status === true || status === "مقبول" || status === "accepted");
      const isRejected = (status === false || status === "مرفوض" || status === "rejected");

      if (admissionBox) {
        admissionBox.style.display = "block";
        if (typeof status !== "undefined") {
          if (isAccepted) {
            admissionBox.className = "admission-status-box admission-accepted";
            admissionBox.innerText = "تم قبولك في الدورة ✅";
          } else if (isRejected) {
            admissionBox.className = "admission-status-box admission-rejected";
            admissionBox.innerText = "عذراً، لم يتم قبولك في الدورة.";
          } else {
            admissionBox.className = "admission-status-box admission-pending";
            admissionBox.innerText = "طلبك قيد المراجعة...";
          }
        } else {
          admissionBox.className = "admission-status-box admission-pending";
          admissionBox.innerText = "طلبك قيد المراجعة...";
        }
      }


      // جدول المستويات/الامتحانات
      renderLevelsExamsMergedTable(data);

      // الامتحانات العامة - تم إزالة هذا الجزء بالكامل


      // تحميل الدروس والتلاخيص (مع التعديل الجديد)
      const allowedLevels = getAllowedLevels(data);
      loadActiveLessonsAndSummaries(allowedLevels);
    }
  }).catch(function(err) {
    showLoading(false);
    const msgEl = document.getElementById('msg');
    if (msgEl) msgEl.innerText = "خطأ في جلب البيانات: " + err.message;
    showToast("خطأ في تحميل بيانات الطالب!", "var(--danger-color)");
  });
}

// دالة مساعدة للتحقق من أهلية الامتحان والمتابعة
function performExamEligibilityCheckAndProceed(studentData, proceedIfEligible = false) {
  const btn = document.getElementById('goToExamBtn');
  const warn = document.getElementById('examWarnMsg');

  console.log("--- performExamEligibilityCheckAndProceed Started ---");
  console.log("lastActiveLevelIndex:", lastActiveLevelIndex);
  console.log("studentData.accepted:", studentData.accepted);

  // إذا لم يكن المستوى نشطًا أو الطالب غير مقبول
  if (!lastActiveLevelIndex || !studentData.accepted) {
    if (btn) {
      btn.style.display = "none";
      console.log("performExamEligibilityCheckAndProceed: Button 'goToExamBtn' hidden due to initial conditions.");
    }
    if (warn) {
        if (typeof lastActiveLevelIndex !== 'number' || lastActiveLevelIndex <= 0) {
            warn.innerText = 'لا يوجد مستوى نشط للطالب. يرجى تفعيل مستوى واحد على الأقل للطالب عبر لوحة تحكم المعلم.';
        } else if (studentData.accepted !== true) {
            warn.innerText = 'حالة قبول الطالب في الدورة غير "مقبول". يرجى مراجعة حالة القبول عبر لوحة تحكم المعلم.';
        } else {
            warn.innerText = 'خطأ غير معروف في التحقق الأولي. الرجاء التأكد من تفعيل مستوى الطالب وحالة القبول.';
        }
        warn.style.display = 'block';
        warn.style.color = 'var(--danger-color)';
        warn.style.fontWeight = 'bold';
        console.log("performExamEligibilityCheckAndProceed: Warning displayed due to initial conditions.");
    }
    console.log("Condition 1 (lastActiveLevelIndex or studentData.accepted) not met. Exiting.");
    return;
  }

  const levelText = getLevelText(lastActiveLevelIndex);
  showLoading(true);

  firestore.collection('lessons').where('level', '==', levelText).get().then(function(lessonQuery){
    let lessons = [];
    lessonQuery.forEach(doc => lessons.push(doc.data()));
    const lessonIds = lessons.map(l=>l.id);

    console.log("Lessons for level", levelText, ":", lessons);
    console.log("Lesson IDs:", lessonIds);

    if(!lessonIds.length) {
      if (btn) btn.style.display = "none";
      if (warn) {
        warn.innerText = 'لا توجد دروس في هذا المستوى.';
        warn.style.display = 'block';
      }
      showLoading(false);
      console.log("Condition 2 (no lessons for this level) met.");
      return;
    }

    let summaryAndMarkPromises = [];
    firestore.collection('summaries')
      .where('student_email', '==', currentStudentEmail)
      .where('lesson_id', 'in', lessonIds)
      .get()
      .then(function(summariesSnap){
        let summariesMapForExamCheck = {};
        summariesSnap.forEach(doc => {
            let s = { ...doc.data(), docId: doc.id };
            summariesMapForExamCheck[s.lesson_id] = s;
            console.log("Fetched summary for lesson_id", s.lesson_id, ":", s);
            if (s.status === 'submitted') {
                summaryAndMarkPromises.push(
                    firestore.collection('student_marks')
                    .where('summary_id', '==', s.docId)
                    .where('student_email', '==', currentStudentEmail)
                    .limit(1)
                    .get()
                    .then(markSnap => {
                        if (!markSnap.empty && markSnap.docs[0].data().mark !== null && markSnap.docs[0].data().mark > 0) {
                            s.mark_from_student_marks = markSnap.docs[0].data().mark;
                            console.log("Mark for summary", s.docId, "is valid:", s.mark_from_student_marks);
                            return true;
                        }
                        s.mark_from_student_marks = null;
                        console.log("Mark for summary", s.docId, "is NOT valid (null, 0 or less):", markSnap.empty ? "no mark doc" : markSnap.docs[0].data().mark);
                        return false;
                    }).catch(error => {
                        console.error("Error fetching mark for summary in exam check:", s.docId, error);
                        s.mark_from_student_marks = null;
                        return false;
                    })
                );
            } else {
                s.mark_from_student_marks = null;
                console.log("Summary for lesson_id", s.lesson_id, "is not submitted:", s.status);
                summaryAndMarkPromises.push(Promise.resolve(false));
            }
        });
        console.log("Number of summaries fetched:", summariesSnap.size);

        Promise.all(summaryAndMarkPromises).then(() => {
          let allRequiredSummariesPresentAndMarked = true;

          if (lessons.length === 0) {
            allRequiredSummariesPresentAndMarked = true;
            console.log("No lessons found for this level, assuming eligible.");
          } else if (Object.keys(summariesMapForExamCheck).length !== lessons.length) {
            allRequiredSummariesPresentAndMarked = false;
            console.log("Condition 3 (not all summaries fetched for all lessons) failed. Summaries fetched:", Object.keys(summariesMapForExamCheck).length, "Lessons total:", lessons.length);
          } else {
            for (let i = 0; i < lessons.length; i++) {
              const lessonId = lessons[i].id;
              const summary = summariesMapForExamCheck[lessonId];
              if (!summary || summary.status !== 'submitted' || summary.mark_from_student_marks === null || summary.mark_from_student_marks <= 0) {
                allRequiredSummariesPresentAndMarked = false;
                console.log("Condition 4 (summary not submitted or mark invalid) failed for lesson_id:", lessonId, "Summary:", summary);
                break;
              }
            }
          }
          
          console.log("Final allRequiredSummariesPresentAndMarked:", allRequiredSummariesPresentAndMarked);

          if(allRequiredSummariesPresentAndMarked){
              if (btn) {
                btn.style.display="";
                console.log("Exam button set to display: '' (visible). Button element:", btn);
              } else {
                console.warn("Exam button (goToExamBtn) not found in DOM when eligibility met!");
              }
              if (warn) {
                warn.innerText = '';
                warn.style.display = 'none';
                console.log("Warn message cleared and hidden.");
              }
              console.log("Exam button activated.");
              if (proceedIfEligible) {
                  currentExamLevel = lastActiveLevelIndex;
                  checkIfExamAlreadySubmitted(currentStudentEmail, currentExamLevel);
                  setTimeout(function(){
                      const examBoxEl = document.getElementById('examBox');
                      if (examBoxEl) examBoxEl.scrollIntoView({behavior: 'smooth'});
                  }, 300);
              }
          } else {
              if (btn) btn.style.display="none";
              if (warn) {
                warn.innerText = 'لا يمكن تقديم الاختبار إلا بعد تسليم جميع التلاخيص وتصحيحها بعلامة أكبر من صفر.';
                warn.style.display = 'block';
              }
              console.log("Exam button deactivated, warning shown.");
          }
          showLoading(false);
          console.log("--- performExamEligibilityCheckAndProceed Finished ---");
        }).catch(error => {
            console.error("Error in Promise.all for summary/mark check:", error);
            if (btn) btn.style.display="none";
            if (warn) {
              warn.innerText = 'حدث خطأ في التحقق من التلاخيص (فشل جلب العلامات).';
              warn.style.display = 'block';
            }
            showLoading(false);
        });
      }).catch(error => {
          console.error("Error fetching summaries for exam check:", error);
          if (btn) btn.style.display="none";
          if (warn) {
            warn.innerText = 'حدث خطأ في جلب التلاخيص.';
            warn.style.display = 'block';
          }
          showLoading(false);
      });
  }).catch(error => {
      console.error("Error fetching lessons for exam check:", error);
      if (btn) btn.style.display="none";
      if (warn) {
        warn.innerText = 'حدث خطأ في جلب الدروس.';
        warn.style.display = 'block';
      }
      showLoading(false);
  });
}

// المستويات + الامتحانات (مع تحسينات عرض)
function renderLevelsExamsMergedTable(data) {
  const levelsExamsTableArea = document.getElementById('levelsExamsTableArea');
  if (!levelsExamsTableArea) {
    console.error("levelsExamsTableArea element not found!");
    return;
  }

  let html = `<div class="table-container">
    <table class="levels-table" id="levelsExamsTable">
      <thead>
        <tr>
          <th>المستوى</th>
          <th>الحالة</th>
          <th>حالة الامتحان</th>
        </tr>
      </thead><tbody>`;
  lastActiveLevel = null;
  lastActiveLevelIndex = null;
  for (let i = 1; i <= 7; i++) {
    const level = data['level'+i];
    const exam = data['exam'+i];
    if(level) { lastActiveLevel = 'المستوى ' + i; lastActiveLevelIndex = i; }
    const levelStatus = level ? '<span class="level-on">مُفعل ✅</span>' : '<span class="level-off">غير مفعل ❌</span>';
    let examLabel = '';
    if (exam === true) {
      examLabel = `<span class="exam-label">✅ اجتاز الامتحان</span>`;
    } else if (exam === false) {
      examLabel = `<span class="exam-label fail">❌ لم يجتز الامتحان</span>`;
    } else if (level) {
      examLabel = `<span class="exam-label wait">لم يبدأ بعد</span>`;
    } else {
      examLabel = `<span class="exam-label wait">—</span>`;
    }
    html += `<tr>
        <td>المستوى ${i}</td>
        <td>${levelStatus}</td>
        <td>${examLabel}</td>
      </tr>`;
  }
  html += "</tbody></table></div>";

  // زر الانتقال للاختبار
  if(lastActiveLevelIndex && data.accepted === true){
    html += `<div style="text-align:center; margin:20px 0;">
      <button class="btn" id="goToExamBtn" style="display:none">
        <i class="fas fa-arrow-alt-circle-left" style="margin-left: 8px;"></i> الانتقال إلى اختبار المستوى ${getLevelText(lastActiveLevelIndex || 1)}
      </button>
    </div>`;
  } else {
     html += `<div style="text-align:center; margin:20px 0;"></div>`;
  }

  levelsExamsTableArea.innerHTML = html;

  const goToExamBtn = document.getElementById('goToExamBtn');
  if (goToExamBtn) {
      goToExamBtn.onclick = function(){
          performExamEligibilityCheckAndProceed(data, true);
      };
      console.log("Event listener attached to goToExamBtn.");
  } else {
      console.warn("goToExamBtn not found after rendering table, skipping event listener attachment.");
  }

  if(lastActiveLevelIndex && data.accepted === true){
      performExamEligibilityCheckAndProceed(data, false);
  }
}


// التحقق من الاختبار
function checkIfExamAlreadySubmitted(email, level) {
  firestore.collection('exam_results')
    .where('student_email', '==', email)
    .where('level', '==', level)
    .get()
    .then(function(querySnapshot){
      if (!querySnapshot.empty) {
        showExamResultOnly(querySnapshot.docs[0].data());
      } else {
        showExamBox(currentStudentName, currentStudentEmail, currentExamLevel);
      }
    })
    .catch(()=>{ showToast("خطأ في تحميل نتيجة الاختبار", "var(--danger-color)"); });
}

// إظهار نتيجة الاختبار فقط
function showExamResultOnly(result) {
  const examBoxEl = document.getElementById('examBox');
  const questionsAreaEl = document.getElementById('questionsArea');
  const formMsgEl = document.getElementById('formMsg');
  const examStudentInfoEl = document.getElementById('examStudentInfo');
  const examLevelInfoEl = document.getElementById('examLevelInfo');
  const resultAreaEl = document.getElementById('resultArea');
  const goToExamBtnEl = document.getElementById('goToExamBtn');
  const submitBtn = document.querySelector("#examForm button[type=submit]");
  const exitExamBtnEl = document.getElementById('exitExamBtn');

  if (examBoxEl) examBoxEl.style.display = '';
  if (questionsAreaEl) questionsAreaEl.innerHTML = '';
  if (formMsgEl) formMsgEl.innerText = '';
  if (examStudentInfoEl) examStudentInfoEl.innerHTML =
    `<b>اسم الطالب:</b> ${currentStudentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${currentStudentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${result.level}`;
  if (examLevelInfoEl) examLevelInfoEl.innerText = '';
  
  let passed = (result.score >= result.total * 0.5);
  if (resultAreaEl) resultAreaEl.className = `result ${passed ? '' : 'fail'}`;

  if (resultAreaEl) resultAreaEl.innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
    لقد سبق لك تقديم اختبار هذا المستوى.<br>درجتك: ${result.score} من ${result.total}
    </div>`;
  if (goToExamBtnEl) goToExamBtnEl.style.display = "none";
  if (submitBtn) submitBtn.style.display = "none";
  if (exitExamBtnEl) exitExamBtnEl.style.display = "none";
  clearInterval(examTimerInterval); updateExamTimer();
}

// إظهار نافذة الاختبار
function showExamBox(studentName, studentEmail, level) {
  const examBoxEl = document.getElementById('examBox');
  const examStudentInfoEl = document.getElementById('examStudentInfo');
  const examLevelInfoEl = document.getElementById('examLevelInfo');
  const formMsgEl = document.getElementById('formMsg');
  const resultAreaEl = document.getElementById('resultArea');
  const submitBtn = document.querySelector("#examForm button[type=submit]");
  const exitExamBtnEl = document.getElementById('exitExamBtn');

  if (examBoxEl) examBoxEl.style.display = '';
  if (examStudentInfoEl) examStudentInfoEl.innerHTML =
    `<b>اسم الطالب:</b> ${studentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${studentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${getLevelText(level)}`;
  firestore.collection('exam_settings').doc('level_' + level).get().then(function(settingDoc){
    if(settingDoc.exists && settingDoc.data().question_num){
      examQuestionsLimit = settingDoc.data().question_num;
      if (examLevelInfoEl) examLevelInfoEl.innerText =
        `عدد الأسئلة المخصصة لهذا المستوى: ${examQuestionsLimit}`;
    } else {
      examQuestionsLimit = null;
      if (examLevelInfoEl) examLevelInfoEl.innerText =
        'لم يتم تحديد عدد الأسئلة لهذا المستوى (سيتم عرض جميع الأسئلة).';
    }
    loadExamQuestions(level);
    startExamTimer(20);
  });
  if (formMsgEl) formMsgEl.innerText = '';
  if (resultAreaEl) resultAreaEl.innerText = '';
  if (submitBtn) submitBtn.style.display = "";
  if (exitExamBtnEl) exitExamBtnEl.style.display = "";
}

// جلب أسئلة الاختبار
function loadExamQuestions(level) {
  firestore.collection('questions').where('level', '==', level).get().then(snap=>{
    examQuestions = snap.docs.map(doc => ({...doc.data(), id: doc.id}));
    prepareRandomizedExam();
    renderQuestions();
  }).catch(()=>{ showToast("خطأ في تحميل الأسئلة", "var(--danger-color)"); });
}

// عشوائية الأسئلة والاختيارات
function prepareRandomizedExam() {
  let shuffled = shuffleArray(examQuestions.map(q => {
    let choiceObjs = (q.choices||[]).map((choice, idx) => ({
      text: choice,
      origIndex: idx
    }));
    let shuffledChoices = shuffleArray(choiceObjs);
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
  randomizedExamQuestions = examQuestionsLimit ? shuffled.slice(0, examQuestionsLimit) : shuffled;
}

// عرض الأسئلة
function renderQuestions() {
  const questionsAreaEl = document.getElementById('questionsArea');
  if (!questionsAreaEl) return;

  let html = '';
  randomizedExamQuestions.forEach((q, i) => {
    let multiNote = '';
    let scoringNote = '';
    if (q.correct.length > 1) {
      multiNote = '<span class="multi-note">(يحتمل أكثر من إجابة صحيحة)</span>';
      scoringNote = `<div class="scoring-note">
      ملاحظة: لكل إجابة صحيحة تختارها تحصل على جزء من العلامة، ولكل إجابة خاطئة تختارها يُخصم نفس الجزء من العلامة. لا يمكن أن تقل علامة السؤال عن الصفر.
      </div>`;
    }
    let markText = `<span class="question-mark">[العلامة: ${q.mark || 1}]`;
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
  questionsAreaEl.innerHTML = html || '<div class="msg">لا توجد أسئلة حالياً.</div>';
}


// منع إغلاق الصفحة أثناء الاختبار بدون تأكيد
window.onbeforeunload = function(e) {
  const examBoxEl = document.getElementById('examBox');
  if (examBoxEl && examBoxEl.style.display !== 'none') {
    return "هل أنت متأكد أنك تريد مغادرة الصفحة؟ قد تفقد إجاباتك!";
  }
};

// الدالة الموحدة لمعالجة تسليم الاختبار
function processExamSubmission(isTimerSubmission = false) {
  let totalMark = 0, gainedMark = 0, empty = 0;
  let details = [];
  randomizedExamQuestions.forEach((q, i) => {
    const nodes = document.getElementsByName('q'+i);
    let selected = [];
    nodes.forEach(input => { if(input.checked) selected.push(parseInt(input.value)); });

    let mark = parseFloat(q.mark) || 1;
    totalMark += mark;

    if (selected.length === 0) {
      if (!isTimerSubmission) {
        empty++;
      }
    }

    details.push({
      question_id: q.id,
      question_text_at_submission: q.question,
      question_mark_value: q.mark || 1,
      selected_choices: selected,
      correct_choices_at_submission: q.correct,
      mark_obtained_for_question: 0
    });

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
      details[i].mark_obtained_for_question = gained;
    }
    else {
      if(selected.length === 1 && q.correct.includes(selected[0])) {
          gainedMark += mark;
          details[i].mark_obtained_for_question = mark;
      } else {
          details[i].mark_obtained_for_question = 0;
      }
    }
  });
  const formMsgEl = document.getElementById('formMsg');
  if (!isTimerSubmission && empty > 0) {
    if (formMsgEl) formMsgEl.innerText = 'يرجى الإجابة على جميع الأسئلة!';
    showToast("يرجى الإجابة على جميع الأسئلة!", "var(--danger-color)");
    return;
  }

  gainedMark = Math.round(gainedMark * 100) / 100;

  firestore.collection('exam_results')
    .where('student_email', '==', currentStudentEmail)
    .where('level', '==', currentExamLevel)
    .get()
    .then(function(querySnapshot){
      if (!querySnapshot.empty) {
        showExamResultOnly(querySnapshot.docs[0].data());
        updateLevelExamTable(currentExamLevel, querySnapshot.docs[0].data());
        showToast("تم إرسال الإجابات مسبقاً", "var(--danger-color)");
        return;
      }
      const resultDoc = {
        student_uid: currentStudentUid,
        student_email: currentStudentEmail,
        student_name: currentStudentName,
        level: currentExamLevel,
        score: gainedMark,
        total_marks_possible: totalMark,
        submitted_at: firebase.firestore.Timestamp.now(),
        exam_duration_taken: (20 * 60) - examTimeLeft,
        teacher_reviewed: false,
        approved: null,
        teacher_comment: null,
        details: details,
      };
      firestore.collection('exam_results').add(resultDoc)
        .then(() => {
          const questionsAreaEl = document.getElementById('questionsArea');
          const resultAreaEl = document.getElementById('resultArea');
          const submitBtn = document.querySelector("#examForm button[type=submit]");
          const exitExamBtnEl = document.getElementById('exitExamBtn');
          const goToExamBtnEl = document.getElementById('goToExamBtn');

          if (questionsAreaEl) questionsAreaEl.innerHTML = '';
          if (formMsgEl) formMsgEl.innerText = '';
          let passed = (gainedMark >= totalMark * 0.5);
          if (resultAreaEl) resultAreaEl.className = `result ${passed ? '' : 'fail'}`;

          if (resultAreaEl) resultAreaEl.innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
            تم حفظ نتيجتك بنجاح! درجتك: ${gainedMark} من ${totalMark}
            </div>`;
          if (submitBtn) submitBtn.style.display = "none";
          if (exitExamBtnEl) exitExamBtnEl.style.display = "none";
          if (goToExamBtnEl) goToExamBtnEl.style.display = "none";
          updateLevelExamTable(currentExamLevel, resultDoc);
          showToast("تم إرسال الإجابات بنجاح", "var(--success-color)");
          clearInterval(examTimerInterval); updateExamTimer();
        })
        .catch((error) => {
          showResult(`درجتك: ${gainedMark} من ${totalMark}`);
          if (formMsgEl) formMsgEl.innerText = 'حدث خطأ أثناء حفظ النتيجة: ' + error.message;
          showToast("حدث خطأ أثناء حفظ النتيجة!", "var(--danger-color)");
        });
      if (formMsgEl) formMsgEl.innerText = '';
    });
}


function showFormMsg(msg) {
  const formMsgEl = document.getElementById('formMsg');
  if (formMsgEl) formMsgEl.innerText = msg;
}
function showResult(msg) {
  const resultAreaEl = document.getElementById('resultArea');
  if (resultAreaEl) resultAreaEl.innerText = msg;
}

// تحديث جدول الامتحان
function updateLevelExamTable(level, result) {
  let passed = (result.score >= result.total * 0.5);
  let label = passed
    ? `<span class="exam-label">✅ اجتاز الامتحان (${result.score} من ${result.total})</span>`
    : `<span class="exam-label fail">❌ لم يجتز (${result.score} من ${result.total})</span>`;
  let table = document.querySelectorAll(".levels-table tbody tr");
  if(table && table.length >= level) {
    let cell = table[level-1].querySelector("td:last-child");
    if(cell) cell.innerHTML = label;
  }
}

// تحميل الدروس والتلاخيص (مع التعديل الجديد)
function loadActiveLessonsAndSummaries(activeLevels) {
  // Unsubscribe from previous listener if exists
  if (summariesListenerUnsubscribe) {
    summariesListenerUnsubscribe();
    summariesListenerUnsubscribe = null;
  }

  const lessonsSummariesAreaEl = document.getElementById('lessonsSummariesArea');
  if (!activeLevels.length) {
    if (lessonsSummariesAreaEl) lessonsSummariesAreaEl.innerHTML = "<p style='text-align: center; color: var(--text-muted);'>لا توجد دروس متاحة حالياً في المستويات النشطة.</p>";
    return;
  }
  showLoading(true);

  firestore.collection('lessons').orderBy('id').get().then(function(lessonsSnap) {
    window.lessonsMap = {};
    let lessons = [];
    lessonsSnap.forEach(function(doc) {
      let lesson = doc.data();
      window.lessonsMap[lesson.id] = lesson.title;
      let levelNum = getLevelNumber(lesson.level);
      if (activeLevels.includes(levelNum)) {
        lessons.push(lesson);
      }
    });
    lessons.sort((a, b) => a.id - b.id);
    window.lastRenderedLessons = lessons;

    if (lessons.length === 0) {
      if (lessonsSummariesAreaEl) lessonsSummariesAreaEl.innerHTML = "<p style='text-align: center; color: var(--text-muted);'>لا توجد دروس متاحة حالياً في المستويات النشطة.</p>";
      showLoading(false);
      return;
    }

    let lessonIds = lessons.map(l => l.id);
    firestore.collection('summaries')
      .where('student_email', '==', currentStudentEmail)
      .where('lesson_id', 'in', lessonIds)
      .onSnapshot(function(snapshot) {
        let changes = snapshot.docChanges();
        let shouldShowToast = false;
        
        studentSummaries = {};
        snapshot.forEach(doc => {
          let s = { ...doc.data(), docId: doc.id };
          studentSummaries[s.docId] = s;
          studentSummaries[s.lesson_id] = s;

          if (changes.some(change => change.type === "modified" && change.doc.id === doc.id)) {
              let oldDoc = changes.find(change => change.doc.id === doc.id)?.oldDoc?.data();
              if (oldDoc) {
                  if (s.teacher_comment !== oldDoc.teacher_comment || s.mark_from_student_marks !== oldDoc.mark_from_student_marks) {
                      shouldShowToast = true;
                  }
              }
          }
        });

        let markPromises = Object.values(studentSummaries).map(s =>
            firestore.collection('student_marks')
            .where('summary_id', '==', s.docId)
            .where('student_email', '==', currentStudentEmail)
            .limit(1)
            .get()
            .then(markSnap => {
                if (!markSnap.empty) {
                    s.mark_from_student_marks = markSnap.docs[0].data().mark;
                } else {
                    s.mark_from_student_marks = null;
                }
                return s;
            }).catch(err => {
                console.error("Error fetching mark for summary in listener:", s.docId, err);
                s.mark_from_student_marks = null;
                return s;
            })
        );

        Promise.all(markPromises).then(updatedSummariesArray => {
            studentSummaries = {};
            updatedSummariesArray.forEach(s => {
                studentSummaries[s.docId] = s;
                studentSummaries[s.lesson_id] = s;
            });
            window.lastRenderedStudentSummaries = updatedSummariesArray;

            renderSummariesLessonsUI(lessons, studentSummaries);
            if (shouldShowToast) {
                showToast("لديك تعليق أو علامة جديدة من المعلم على أحد تلاخيصك!", "var(--primary-color)");
            }
            showLoading(false);
        }).catch(err => {
            showToast("خطأ في تحديث العلامات في الوقت الحقيقي: " + err.message, "var(--danger-color)");
            console.error("Promise.all error in listener:", err);
            showLoading(false);
        });

      }, function(error) {
        showToast("خطأ في الاستماع لتحديثات التلاخيص: " + error.message, "var(--danger-color)");
        console.error("Listener error:", error);
        showLoading(false);
      });
  }).catch(err => {
    showToast("خطأ في تحميل الدروس للتلاخيص: " + err.message, "var(--danger-color)");
    showLoading(false);
    console.error("Error fetching lessons for summaries:", err);
  });
}


// عرض التلاخيص مع العلامة والتاريخ (مُعدلة)
function renderSummariesLessonsUI(lessons, summariesMap) {
  const lessonsSummariesAreaEl = document.getElementById('lessonsSummariesArea');
  if (!lessonsSummariesAreaEl) return;

  let html = `<h3 style="color:#2260af; margin-bottom:10px;">تلخيصات دروسك</h3>`;
  lessons.forEach(function(lesson){
    let sum = summariesMap[lesson.id] || { docId: `new_draft_${lesson.id}`, summary_text: "", status: "draft", teacher_comment: "", student_reply_comment: "" };
    let submitted = sum.status === 'submitted';

    let markToDisplay = '—';
    let markBadgeClass = 'no-mark';

    const realtimeMark = window.realtimeStudentMarks[sum.docId];
    if (typeof realtimeMark !== 'undefined' && realtimeMark !== null) {
        markToDisplay = 'العلامة: ' + realtimeMark;
        if (realtimeMark > 0) {
            markBadgeClass = 'positive-mark';
        } else {
            markBadgeClass = 'zero-mark';
        }
    } else if (submitted) {
        if (typeof sum.mark_from_student_marks !== 'undefined' && sum.mark_from_student_marks !== null) {
            markToDisplay = 'العلامة: ' + sum.mark_from_student_marks;
            if (sum.mark_from_student_marks > 0) {
                markBadgeClass = 'positive-mark';
            } else {
                markBadgeClass = 'zero-mark';
            }
        }
    }

    let time = '';
    if (sum.timestamp) {
        try {
            const dateVal = sum.timestamp.toDate ? sum.timestamp.toDate() : sum.timestamp;
            const dateObj = new Date(dateVal);
            if (isNaN(dateObj.getTime())) {
                console.warn("Invalid Date for summary:", sum.docId, "Timestamp value (raw):", sum.timestamp, "Parsed Date obj:", dateObj);
                time = `<span style="color:var(--danger-color);font-size:0.97em;">(تاريخ غير صالح)</span>`;
            } else {
                time = `<span style="color:var(--text-muted);font-size:0.97em;">(${dateObj.toLocaleString('ar-EG')})</span>`;
            }
        } catch (e) {
            console.error("Error parsing timestamp for summary:", sum.docId, "Timestamp value:", sum.timestamp, "Error:", e);
            time = `<span style="color:var(--danger-color);font-size:0.97em;">(خطأ في التاريخ)</span>`;
        }
    } else {
        console.warn("Timestamp is missing for summary:", sum.docId);
        time = `<span style="color:var(--text-muted);font-size:0.97em;">(لا يوجد تاريخ)</span>`;
    }


    html += `
    <div class="lesson-summary-block">
      <div class="lesson-student-name">اسم الطالب: ${currentStudentName || ""}</div>
      <h4>
        (${lesson.id}) ${lesson.title}
        <span class="lesson-mark-badge ${markBadgeClass}">
          ${markToDisplay}
        </span>
        ${time}
      </h4>
      <div style="margin-bottom:10px;">
        <a href="${lesson.url || "#"}" class="lesson-link" download target="_blank" style="margin-left:10px;">تحميل المحاضرة 📥</a>
        ${lesson.voice ? `
        <audio controls style="width:100%;max-width:300px;vertical-align:middle;">
          <source src="${lesson.voice}" type="audio/mpeg">
          متصفحك لا يدعم تشغيل الصوت.
        </audio>
        ` : ''}
      </div>
      <div style="margin:12px 0 5px 0;">
        <textarea class="summary-text" id="sumtext_${lesson.id}" ${submitted ? 'readonly' : ''} placeholder="اكتب تلخيصك هنا...">${sum.summary_text || ''}</textarea>
      </div>
      ${submitted && sum.teacher_comment ? `
        <div class="teacher-comment-display">
            <strong>ملاحظة المعلم:</strong> ${sum.teacher_comment}
        </div>
      ` : ''}
      ${submitted ? `
        <div class="reply-area">
            <label for="studentreply_${sum.docId}">تعليقك/ردك على الدرس:</label>
            <textarea class="summary-text" id="studentreply_${sum.docId}" placeholder="اكتب ردك هنا...">${sum.student_reply_comment || ''}</textarea>
            <button class="btn" onclick="saveStudentReply('${sum.docId}')">حفظ الرد</button>
        </div>
      ` : ''}
      <div class="summary-actions">
        <span class="summary-status ${sum.status}">${sum.status === 'submitted' ? 'تم التسليم النهائي' : 'مسودة (لم يتم التسليم)'}</span>
        <button class="btn" style="margin-left:8px;" onclick="saveSummary(${lesson.id})" ${submitted ? 'disabled' : ''}>حفظ المسودة</button>
        <button class="btn submit" onclick="submitSummary(${lesson.id})">تسليم نهائي</button>
      </div>
      <div id="sum_msg_${lesson.id}" style="margin-top:5px; color:var(--danger-color); font-size:0.97rem;"></div>
    </div>
    `;
  });
  lessonsSummariesAreaEl.innerHTML = html;
}

// Function to save student reply to teacher's comment (or initiate comment)
function saveStudentReply(summaryDocId) {
    console.log("--- saveStudentReply بدأ ---");
    const replyTextarea = document.getElementById(`studentreply_${summaryDocId}`);
    if (!replyTextarea) { console.error("Reply textarea not found for", summaryDocId); return; }
    const replyText = sanitizeText(replyTextarea.value.trim());

    const summary = studentSummaries[summaryDocId];
    if (!summary) {
        console.error("Error: Summary object is undefined for summaryDocId:", summaryDocId);
        showToast("حدث خطأ: بيانات التلخيص غير موجودة. حاول تحديث الصفحة.", "var(--danger-color)");
        return;
    }
    if (typeof summary.lesson_id === 'undefined' || summary.lesson_id === null) {
        console.error("Error: summary.lesson_id is undefined or null for summaryDocId:", summaryDocId, summary);
        showToast("حدث خطأ: رقم الدرس غير موجود للتلخيص. حاول تحديث الصفحة.", "var(--danger-color)");
        return;
    }
    const lessonTitle = window.lessonsMap[summary.lesson_id];

    console.log("summaryDocId received:", summaryDocId);
    console.log("replyText:", replyText);
    console.log("Summary object from studentSummaries:", summary);
    console.log("summary.lesson_id:", summary.lesson_id);
    console.log("lessonTitle (for notification):", lessonTitle);


    if (!replyText) {
        showToast("يرجى كتابة الرد أولاً.", "var(--danger-color)");
        console.warn("Reply text is empty.");
        return;
    }

    firestore.collection('summaries').doc(summaryDocId).update({
        student_reply_comment: replyText
    }).then(() => {
        showToast("تم حفظ ردك بنجاح!", "var(--success-color)");
        console.log("Reply saved to Firestore successfully.");
        sendTeacherNotification(
            `قام الطالب ${currentStudentName} بالرد على تعليقك في درس "${lessonTitle}".`,
            'student_reply',
            summary.lesson_id,
            lessonTitle
        );
        console.log("Teacher notification sent for reply.");
    }).catch(error => {
        showToast(`حدث خطأ أثناء حفظ الرد: ${error.message}`, "var(--danger-color)");
        console.error("Error saving student reply to Firestore:", error);
    });
    console.log("--- saveStudentReply انتهى ---");
}

// حفظ المسودة
function saveSummary(lessonId) {
  console.log("--- saveSummary بدأ ---");
  const textarea = document.getElementById('sumtext_' + lessonId);
  const msg = document.getElementById('sum_msg_' + lessonId);
  if (!textarea || !msg) { console.error("Summary elements not found for", lessonId); return; }
  const text = sanitizeText(textarea.value.trim());
  msg.innerText = "";

  console.log("lessonId for draft:", lessonId);
  console.log("Text for draft:", text);
  
  let docRef;
  const existingSummary = Object.values(studentSummaries).find(s => s.lesson_id === lessonId);
  console.log("Existing summary for draft:", existingSummary);

  if (!text) {
    msg.innerText = "يرجى كتابة التلخيص أولاً.";
    showToast("يرجى كتابة التلخيص!", "var(--danger-color)");
    console.warn("Draft text is empty.");
    return;
  }
  
  if (existingSummary && existingSummary.docId && !existingSummary.docId.startsWith('new_draft_')) {
      docRef = firestore.collection('summaries').doc(existingSummary.docId);
      console.log("Existing summary docRef:", docRef.id);
      if (existingSummary.status === "submitted") {
          msg.innerText = "تم تسليم التلخيص النهائي ولا يمكن التعديل.";
          showToast("تم تسليم التلخيص النهائي ولا يمكن التعديل.", "var(--danger-color)");
          console.warn("Attempted to save draft for already submitted summary.");
          return;
      }
  } else {
      docRef = firestore.collection('summaries').doc();
      console.log("New summary docRef (draft):", docRef.id);
  }

  const summaryData = {
      student_email: currentStudentEmail,
      student_name: currentStudentName || "",
      lesson_id: lessonId,
      summary_text: text,
      status: "draft",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  console.log("Summary data to save (draft):", summaryData);

  docRef.set(summaryData, { merge: true }).then(function(){
      msg.style.color = "var(--success-color)";
      msg.innerText = "تم حفظ المسودة.";
      showToast("تم حفظ المسودة.", "var(--success-color)");
      console.log("Draft saved to Firestore successfully.");
      setTimeout(()=>{msg.innerText=''; msg.style.color="var(--danger-color)";}, 1500);
  }).catch((error)=>{ 
      showToast("خطأ أثناء الحفظ: " + error.message, "var(--danger-color)");
      console.error("Error saving draft to Firestore:", error);
  });
  console.log("--- saveSummary انتهى ---");
}

// تسليم النهائي
function submitSummary(lessonId) {
  console.log("--- submitSummary بدأ ---");
  const textarea = document.getElementById('sumtext_' + lessonId);
  const msg = document.getElementById('sum_msg_' + lessonId);
  if (!textarea || !msg) { console.error("Summary elements not found for", lessonId); return; }
  const text = sanitizeText(textarea.value.trim());
  msg.innerText = "";

  console.log("lessonId for submission:", lessonId);
  console.log("Text for submission:", text);

  if (!text) {
    msg.innerText = "يرجى كتابة التلخيص أولاً.";
    showToast("يرجى كتابة التلخيص!", "var(--danger-color)");
    console.warn("Submission text is empty.");
    return;
  }
  
  let docRef;
  const existingSummary = Object.values(studentSummaries).find(s => s.lesson_id === lessonId);
  console.log("Existing summary for submission:", existingSummary);

  if (existingSummary && existingSummary.docId && !existingSummary.docId.startsWith('new_draft_')) {
      docRef = firestore.collection('summaries').doc(existingSummary.docId);
      console.log("Existing summary docRef:", docRef.id);
      if (existingSummary.status === "submitted") {
          msg.innerText = "تم تسليم التلخيص بالفعل.";
          showToast("تم تسليم التلخيص بالفعل.", "var(--danger-color)");
          console.warn("Attempted to submit already submitted summary.");
          return;
      }
  } else {
      docRef = firestore.collection('summaries').doc();
      console.log("New summary docRef (submission):", docRef.id);
  }

  const summaryData = {
      summary_text: text,
      status: "submitted",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  console.log("Summary data to save (submission):", summaryData);
  
  if (!existingSummary || existingSummary.docId.startsWith('new_draft_')) {
      summaryData.student_email = currentStudentEmail;
      summaryData.student_name = currentStudentName || "";
      summaryData.lesson_id = lessonId;
  }

  const lessonTitle = window.lessonsMap[lessonId];
  console.log("Lesson title (for notification):", lessonTitle);

  docRef.set(summaryData, { merge: true }).then(function(){
      msg.style.color = "var(--success-color)";
      msg.innerText = "تم تسليم التلخيص بنجاح.";
      showToast("تم تسليم التلخيص بنجاح!", "var(--success-color)");
      console.log("Summary submitted to Firestore successfully.");
      sendTeacherNotification(
          `قام الطالب ${currentStudentName} بتسليم تلخيص جديد لدرس "${lessonTitle}".`,
          'summary_submitted',
          lessonId,
          lessonTitle
      );
      console.log("Teacher notification sent for submission.");
      setTimeout(()=>{msg.innerText=''; msg.style.color="var(--danger-color)";}, 1500);
  }).catch((error)=>{ 
      showToast("خطأ أثناء التسليم: " + error.message, "var(--danger-color)");
      console.error("Error submitting summary to Firestore:", error);
  });
  console.log("--- submitSummary انتهى ---");
}

// تسجيل الخروج
function logout() {
  if (summariesListenerUnsubscribe) {
    summariesListenerUnsubscribe();
    summariesListenerUnsubscribe = null;
  }
  if (notificationsListenerUnsubscribe) {
    notificationsListenerUnsubscribe();
    notificationsListenerUnsubscribe = null;
  }
  if (studentMarksListenerUnsubscribe) {
      studentMarksListenerUnsubscribe();
      studentMarksListenerUnsubscribe = null;
  }
  auth.signOut().then(()=>{window.location.href='login.html';}).catch(function(error) {
    console.error("خطأ في تسجيل الخروج:", error);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }

  const exitExamBtn = document.getElementById('exitExamBtn');
  if (exitExamBtn) {
      exitExamBtn.onclick = function(){
          if (confirm("هل أنت متأكد أنك تريد الخروج؟ لن تحفظ إجاباتك!")) {
            const examBoxEl = document.getElementById('examBox');
            const questionsAreaEl = document.getElementById('questionsArea');
            const formMsgEl = document.getElementById('formMsg');
            const resultAreaEl = document.getElementById('resultArea');

            if (examBoxEl) examBoxEl.style.display = 'none';
            if (questionsAreaEl) questionsAreaEl.innerHTML = "";
            if (formMsgEl) formMsgEl.innerText = "";
            if (resultAreaEl) resultAreaEl.innerText = "";
            clearInterval(examTimerInterval); updateExamTimer();
          }
      };
  }

  const examForm = document.getElementById('examForm');
  if (examForm) {
      examForm.onsubmit = function(e){
          e.preventDefault();
          processExamSubmission(false);
      };
  }

  const nightModeBtn = document.getElementById('nightModeBtn');
  if (nightModeBtn) nightModeBtn.onclick = toggleNightMode;

  const supportBtn = document.getElementById('supportBtn');
  if (supportBtn) supportBtn.onclick = openSupport;

  const logoutBtn = document.querySelector('header .signout');
  if (logoutBtn) logoutBtn.onclick = logout;

  const downloadReportBtn = document.getElementById('downloadReportBtn');
  if (downloadReportBtn) downloadReportBtn.onclick = downloadReport;

});
