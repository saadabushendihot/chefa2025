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
      window.currentStudentFullData = data; // Store full student data globally

      // Calculate lastActiveLevelIndex here explicitly
      lastActiveLevelIndex = 0; // Reset
      for (let i = 1; i <= 7; i++) {
          if(data['level'+i]) {
              lastActiveLevelIndex = i;
          }
      }
      console.log("Calculated lastActiveLevelIndex on load:", lastActiveLevelIndex);

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

      // Check for existing exam result on page load BEFORE rendering levels/eligibility
      if (lastActiveLevelIndex > 0 && (data.accepted === true || data.accepted === "مقبول" || data.accepted === "accepted")) {
          currentExamLevel = lastActiveLevelIndex; // Set global currentExamLevel
          
          firestore.collection('exam_results')
              .where('student_email', '==', currentStudentEmail)
              .where('level', '==', lastActiveLevelIndex)
              .get()
              .then(function(examResultsSnap){
                  if (!examResultsSnap.empty) {
                      console.log("Existing exam result found for level", lastActiveLevelIndex, ". Displaying result.");
                      showExamResultOnly(examResultsSnap.docs[0].data());
                      // No need to call renderLevelsExamsMergedTable or loadActiveLessonsAndSummaries here,
                      // as showExamResultOnly handles the display for already submitted exams.
                  } else {
                      console.log("No existing exam result found for level", lastActiveLevelIndex, ". Proceeding with eligibility check.");
                      renderLevelsExamsMergedTable(data); // This will call performExamEligibilityCheckAndProceed(data, false)
                      loadActiveLessonsAndSummaries(getAllowedLevels(data)); // Call this after levels table render
                  }
              }).catch(err => {
                  console.error("Error checking for existing exam results on load:", err);
                  // Fallback to normal rendering even on error
                  renderLevelsExamsMergedTable(data);
                  loadActiveLessonsAndSummaries(getAllowedLevels(data));
              });
      } else {
          console.log("Initial conditions (active level or accepted status) not met. Proceeding with eligibility check.");
          renderLevelsExamsMergedTable(data);
          loadActiveLessonsAndSummaries(getAllowedLevels(data));
      }
    }
  }).catch(function(err) {
    showLoading(false);
    const msgEl = document.getElementById('msg');
    if (msgEl) msgEl.innerText = "خطأ في جلب البيانات: " + err.message;
    showToast("خطأ في تحميل بيانات الطالب!", "var(--danger-color)");
  });
}

/**
 * دالة لعرض حالة أهلية الطالب للاختبار بشكل مفصل.
 * يتم استدعاؤها من performExamEligibilityCheckAndProceed
 * @param {object} eligibilityObject - كائن يحتوي على تفاصيل الأهلية.
 * @param {boolean} eligibilityObject.overall_ready - هل الطالب جاهز لتقديم الاختبار.
 * @param {string} eligibilityObject.overall_message - رسالة الحالة العامة.
 * @param {object} eligibilityObject.checks - تفاصيل حالة كل شرط.
 * @param {object} eligibilityObject.debug_info - معلومات تصحيح إضافية عن قيم الحقول.
 */
function renderExamEligibilityStatus(eligibilityObject) {
    const examWarnMsgEl = document.getElementById('examWarnMsg');
    const startExamBtn = document.getElementById('startExamBtn');
    const examEligibilityDetailsTableArea = document.getElementById('examEligibilityDetailsTableArea');
    const eligibilityTableBody = document.getElementById('eligibilityTableBody');

    if (!examWarnMsgEl || !startExamBtn || !examEligibilityDetailsTableArea || !eligibilityTableBody) {
        console.error("renderExamEligibilityStatus: One or more required elements (examWarnMsgEl, startExamBtn, examEligibilityDetailsTableArea, eligibilityTableBody) not found!");
        return;
    }

    // عرض الرسالة العامة في examWarnMsg
    let overallStatusHtml = `<div style="padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; text-align: center; border: 1px solid;">`;

    if (eligibilityObject.overall_ready) {
        overallStatusHtml += `<p style="color: var(--success-color);">✅ ${eligibilityObject.overall_message}</p>`;
        startExamBtn.style.display = ''; // إظهار زر الاختبار
        examWarnMsgEl.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        examWarnMsgEl.style.borderColor = 'var(--success-color)';
    } else {
        overallStatusHtml += `<p style="color: var(--danger-color);">❌ ${eligibilityObject.overall_message}</p>`;
        startExamBtn.style.display = 'none'; // إخفاء زر الاختبار
        overallStatusHtml += `<button class="btn" style="margin-top: 10px; background-color: var(--danger-color);" disabled>
                                <i class="fas fa-times-circle"></i> الاختبار غير متاح
                              </button>`; // زر معطل
        examWarnMsgEl.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        examWarnMsgEl.style.borderColor = 'var(--danger-color)';
    }

    overallStatusHtml += `</div>`;
    examWarnMsgEl.innerHTML = overallStatusHtml;
    examWarnMsgEl.style.display = 'block';


    // عرض الجدول التفصيلي للأهلية
    examEligibilityDetailsTableArea.style.display = 'block';
    let tableBodyHtml = '';

    // قبول الطالب
    tableBodyHtml += `<tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);"><strong>حالة القبول:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">${eligibilityObject.checks.accepted_status.ready ? '✅ مقبول' : '❌ ' + eligibilityObject.checks.accepted_status.message}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">القيمة: ${eligibilityObject.checks.accepted_status.value} <br> <i>(حقل: lectures.accepted)</i></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">الجداول والحقول: <ul><li>lectures.accepted</li></ul></td>
    </tr>`;

    // المستوى النشط
    tableBodyHtml += `<tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);"><strong>المستوى النشط:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">${eligibilityObject.checks.level_active.ready ? '✅ مفعل: المستوى ' + eligibilityObject.checks.level_active.value : '❌ ' + eligibilityObject.checks.level_active.message}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">القيمة: ${eligibilityObject.checks.level_active.value} <br> <i>(حقل: lectures.levelX)</i></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">الجداول والحقول: <ul><li>lectures.level1, lectures.level2, ..., lectures.level7</li></ul></td>
    </tr>`;

    // توفر الدروس
    tableBodyHtml += `<tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);"><strong>توفر الدروس للمستوى:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">${eligibilityObject.checks.lessons_available.ready ? '✅ متوفرة (' + eligibilityObject.checks.lessons_available.count + ' درس)' : '❌ ' + eligibilityObject.checks.lessons_available.message}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">عدد الدروس المتاحة: ${eligibilityObject.checks.lessons_available.count} <br> <i>(حقل: lessons.level)</i></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">الجداول والحقول: <ul><li>lessons.level</li><li>lessons.id</li></ul></td>
    </tr>`;

    // تلاخيص الدروس والعلامات
    tableBodyHtml += `<tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);"><strong>حالة التلاخيص والعلامات:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">${eligibilityObject.checks.summaries_complete.ready ? '✅ مكتملة وبعلامات إيجابية (' + eligibilityObject.checks.summaries_complete.marked_positive_count + '/' + eligibilityObject.checks.summaries_complete.total_lessons + ' درس)' : '❌ ' + eligibilityObject.checks.summaries_complete.message}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">التلاخيص المسلمة: ${eligibilityObject.checks.summaries_complete.submitted_count} <br> العلامات الإيجابية: ${eligibilityObject.checks.summaries_complete.marked_positive_count} <br> <i>(حقول: summaries.status, student_marks.mark)</i></td>
        <td style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.9em; color: var(--text-muted);">الجداول والحقول: <ul><li>summaries.student_email</li><li>summaries.lesson_id</li><li>summaries.status</li><li>student_marks.summary_id</li><li>student_marks.student_email</li><li>student_marks.mark</li></ul></td>
    </tr>`;

    eligibilityTableBody.innerHTML = tableBodyHtml;
}

/**
 * دالة مساعدة للتحقق من أهلية الطالب لتقديم الاختبار.
 * @param {object} studentData - بيانات الطالب من Firestore.
 * @param {boolean} proceedIfEligible - إذا كانت true، سيتم محاولة عرض الاختبار مباشرة في حال الأهلية الكاملة.
 * @returns {Promise<object>} - يعود بكائن الأهلية المفصل.
 */
async function performExamEligibilityCheckAndProceed(studentData, proceedIfEligible = false) {
  const startExamBtn = document.getElementById('startExamBtn');
  const warn = document.getElementById('examWarnMsg');

  // تهيئة كائن الأهلية
  const eligibility = {
    overall_ready: true,
    overall_message: "جاهز لتقديم الاختبار!",
    checks: {
        accepted_status: { ready: true, value: studentData.accepted, message: "" },
        level_active: { ready: true, value: lastActiveLevelIndex, message: "" },
        lessons_available: { ready: true, count: 0, total: 0, message: "" },
        summaries_complete: { ready: true, submitted_count: 0, marked_positive_count: 0, total_lessons: 0, message: "" }
    },
    debug_info: {
        student_data: studentData,
        active_level_index: lastActiveLevelIndex,
        current_student_email: currentStudentEmail
    }
  };

  console.log("--- performExamEligibilityCheckAndProceed Started ---");
  console.log("lastActiveLevelIndex:", lastActiveLevelIndex);
  console.log("studentData.accepted:", studentData.accepted);

  // Check 1: Initial eligibility (accepted, active level)
  if (typeof lastActiveLevelIndex !== 'number' || lastActiveLevelIndex <= 0) {
      eligibility.overall_ready = false;
      eligibility.checks.level_active.ready = false;
      eligibility.checks.level_active.message = 'لا يوجد مستوى نشط للطالب.';
  }
  if (studentData.accepted !== true && studentData.accepted !== "مقبول" && studentData.accepted !== "accepted") {
      eligibility.overall_ready = false;
      eligibility.checks.accepted_status.ready = false;
      eligibility.checks.accepted_status.message = 'حالة قبول الطالب غير "مقبول".';
  }

  // إذا فشلت الشروط الأولية، نعرض الحالة ونخرج.
  if (!eligibility.checks.level_active.ready || !eligibility.checks.accepted_status.ready) {
      // بناء الرسالة العامة من الشروط الفاشلة
      let messages = [];
      if (!eligibility.checks.level_active.ready) messages.push(eligibility.checks.level_active.message);
      if (!eligibility.checks.accepted_status.ready) messages.push(eligibility.checks.accepted_status.message);
      eligibility.overall_message = 'الطالب غير جاهز: ' + messages.join(' و ');
      renderExamEligibilityStatus(eligibility);
      showLoading(false);
      console.log("Initial conditions not met. Exiting performExamEligibilityCheckAndProceed.");
      return eligibility;
  }

  // إذا كانت الشروط الأولية مستوفاة، نواصل التحققات التفصيلية
  try {
      const levelText = getLevelText(lastActiveLevelIndex);
      showLoading(true);

      const lessonQuerySnapshot = await firestore.collection('lessons').where('level', '==', levelText).get();
      const lessons = lessonQuerySnapshot.docs.map(doc => doc.data());
      
      eligibility.checks.lessons_available.count = lessons.length;
      eligibility.checks.lessons_available.total = lessons.length;

      if (lessons.length === 0) {
          eligibility.overall_ready = false;
          eligibility.checks.lessons_available.ready = false;
          eligibility.checks.lessons_available.message = 'لا توجد دروس في هذا المستوى.';
          eligibility.overall_message = 'الطالب غير جاهز: لا توجد دروس للمستوى النشط.';
          renderExamEligibilityStatus(eligibility);
          showLoading(false);
          console.log("No lessons for this level. Exiting performExamEligibilityCheckAndProceed.");
          return eligibility;
      }

      let summaryAndMarkPromises = [];
      const summariesSnap = await firestore.collection('summaries')
          .where('student_email', '==', currentStudentEmail)
          .where('lesson_id', 'in', lessons.map(l => l.id))
          .get();

      let summariesMapForExamCheck = {};
      summariesSnap.forEach(doc => {
          let s = { ...doc.data(), docId: doc.id };
          summariesMapForExamCheck[s.lesson_id] = s;
      });

      let submittedCount = 0;
      let markedPositiveCount = 0;

      for (const lesson of lessons) {
          const summary = summariesMapForExamCheck[lesson.id];
          if (summary && summary.status === 'submitted') {
              submittedCount++;
              const markSnap = await firestore.collection('student_marks')
                  .where('summary_id', '==', summary.docId)
                  .where('student_email', '==', currentStudentEmail)
                  .limit(1)
                  .get();

              if (!markSnap.empty && markSnap.docs[0].data().mark !== null && markSnap.docs[0].data().mark > 0) {
                  markedPositiveCount++;
              }
          }
      }

      eligibility.checks.summaries_complete.submitted_count = submittedCount;
      eligibility.checks.summaries_complete.marked_positive_count = markedPositiveCount;
      eligibility.checks.summaries_complete.total_lessons = lessons.length;

      if (submittedCount !== lessons.length || markedPositiveCount !== lessons.length) {
          eligibility.overall_ready = false;
          eligibility.checks.summaries_complete.ready = false;
          eligibility.checks.summaries_complete.message = 'يجب تسليم جميع التلاخيص وتصحيحها بعلامة أكبر من صفر.';
          eligibility.overall_message = 'الطالب غير جاهز: التلاخيص غير مكتملة أو لم يتم تصحيحها بشكل إيجابي.';
      } else {
          eligibility.overall_message = 'جاهز لتقديم الاختبار!'; // رسالة عامة إذا كان كل شيء جاهز
      }

      renderExamEligibilityStatus(eligibility);

      if (eligibility.overall_ready && proceedIfEligible) {
          currentExamLevel = lastActiveLevelIndex;
          checkIfExamAlreadySubmitted(currentStudentEmail, currentExamLevel);
          setTimeout(() => {
              const examBoxEl = document.getElementById('examBox');
              if (examBoxEl) examBoxEl.scrollIntoView({ behavior: 'smooth' });
          }, 300);
      }

      showLoading(false);
      console.log("--- performExamEligibilityCheckAndProceed Finished ---");
      return eligibility;

  } catch (error) {
      console.error("Error in performExamEligibilityCheckAndProceed:", error);
      eligibility.overall_ready = false;
      eligibility.overall_message = `حدث خطأ أثناء التحقق: ${error.message}`;
      renderExamEligibilityStatus(eligibility);
      showLoading(false);
      return eligibility;
  }
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

  levelsExamsTableArea.innerHTML = html;

  // عند تحميل الصفحة، يتم التحقق الأولي من الأهلية بواسطة loadStudentData التي تستدعي performExamEligibilityCheckAndProceed
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
  const submitBtn = document.querySelector("#examForm button[type=submit]");
  const exitExamBtnEl = document.getElementById('exitExamBtn');
  const startExamBtn = document.getElementById('startExamBtn');
  const examWarnMsgEl = document.getElementById('examWarnMsg');
  const examEligibilityDetailsTableArea = document.getElementById('examEligibilityDetailsTableArea');

  if (examBoxEl) examBoxEl.style.display = '';
  if (questionsAreaEl) questionsAreaEl.innerHTML = '';
  if (formMsgEl) formMsgEl.innerText = '';
  if (examStudentInfoEl) examStudentInfoEl.innerHTML =
    `<b>اسم الطالب:</b> ${currentStudentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${currentStudentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${result.level}`;
  if (examLevelInfoEl) examLevelInfoEl.innerText = '';
  
  let passed = (result.score >= result.total_marks_possible * 0.5);
  if (resultAreaEl) resultAreaEl.className = `result ${passed ? '' : 'fail'}`;

  if (resultAreaEl) resultAreaEl.innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
    درجتك: ${result.score} من ${result.total_marks_possible}
    </div>`;

  // Determine approval status message for examWarnMsg
  let approvalStatusMessage = '';
  if (result.approved === true) {
      approvalStatusMessage = 'نتيجة معتمدة.';
  } else if (result.approved === false) {
      approvalStatusMessage = 'النتيجة غير معتمدة.';
  } else { // null or undefined means pending
      approvalStatusMessage = 'لم يتم اعتماد العلامة حتى الآن.';
  }

  // Determine overall status icon and color for examWarnMsg
  const overallIcon = passed ? '✅' : '❌';
  const overallColor = passed ? 'var(--success-color)' : 'var(--danger-color)';
  const backgroundColor = passed ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
  const borderColor = passed ? 'var(--success-color)' : 'var(--danger-color)';

  // Update examWarnMsg with submission status
  if (examWarnMsgEl) {
      examWarnMsgEl.innerHTML = `
          <div style="padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; text-align: center; border: 1px solid; background-color: ${backgroundColor}; border-color: ${borderColor};">
              <p style="color: ${overallColor};">
                  ${overallIcon} تم تقديم الاختبار بنتيجة ${result.score} من ${result.total_marks_possible}.
                  <br>${approvalStatusMessage}
              </p>
          </div>
      `;
      examWarnMsgEl.style.display = 'block';
  }
  // إخفاء الجدول التفصيلي للأهلية عند عرض نتيجة الاختبار
  if(examEligibilityDetailsTableArea) {
      examEligibilityDetailsTableArea.style.display = 'none';
  }


  if (submitBtn) submitBtn.style.display = "none";
  if (exitExamBtnEl) exitExamBtnEl.style.display = "none";
  if (startExamBtn) startExamBtn.style.display = "none";

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
  const startExamBtn = document.getElementById('startExamBtn');
  const examWarnMsgEl = document.getElementById('examWarnMsg');
  const examEligibilityDetailsTableArea = document.getElementById('examEligibilityDetailsTableArea');

  if (startExamBtn) startExamBtn.style.display = "none";
  if (examWarnMsgEl) examWarnMsgEl.style.display = "none";
  if (examEligibilityDetailsTableArea) examEligibilityDetailsTableArea.style.display = 'none';


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
          const startExamBtn = document.getElementById('startExamBtn');

          if (questionsAreaEl) questionsAreaEl.innerHTML = '';
          if (formMsgEl) formMsgEl.innerText = '';
          let passed = (gainedMark >= totalMark * 0.5);
          if (resultAreaEl) resultAreaEl.className = `result ${passed ? '' : 'fail'}`;

          if (resultAreaEl) resultAreaEl.innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
            تم حفظ نتيجتك بنجاح! درجتك: ${gainedMark} من ${totalMark}
            </div>`;
          if (submitBtn) submitBtn.style.display = "none";
          if (exitExamBtnEl) exitExamBtnEl.style.display = "none";
          if (startExamBtn) startExamBtn.style.display = "none";
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
  let passed = (result.score >= result.total_marks_possible * 0.5);
  let label = passed
    ? `<span class="exam-label">✅ اجتاز الامتحان (${result.score} من ${result.total_marks_possible})</span>`
    : `<span class="exam-label fail">❌ لم يجتز (${result.score} من ${result.total_marks_possible})</span>`;
  let table = document.querySelectorAll(".levels-table tbody tr");
  if(table && table.length >= level) {
    let cell = table[level-1].querySelector("td:last-child");
    if(cell) cell.innerHTML = label;
  }
}

// تحميل الدروس والتلاخيص (مع التعديل الجديد)
function loadActiveLessonsAndSummaries(activeLevels) {
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
      showToast(`خطأ أثناء الحفظ: ${error.message}`, "var(--danger-color)");
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
      showToast(`خطأ أثناء التسليم: ${error.message}`, "var(--danger-color)");
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
    console.error("Error in تسجيل الخروج:", error);
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

  const startExamBtn = document.getElementById('startExamBtn');
  if (startExamBtn) {
      startExamBtn.style.display = "none"; 
      console.log("Initial state: startExamBtn hidden.");

      startExamBtn.onclick = function() {
          if (window.currentStudentFullData) {
              performExamEligibilityCheckAndProceed(window.currentStudentFullData, true);
          } else {
              console.error("Student data not available for exam launch!");
              showToast("بيانات الطالب غير متاحة. يرجى تحديث الصفحة.", "var(--danger-color)");
          }
      };
      console.log("Event listener attached to startExamBtn.");
  } else {
      console.error("startExamBtn element not found in DOM!");
  }

});
