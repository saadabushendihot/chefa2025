// Firebase Config: (يتم جلبه من firebase-config.js)

// الوضع الليلي
function toggleNightMode() {
  document.body.classList.toggle('dark-mode');
}

// رسالة منبثقة (Toast)
function showToast(msg, color="#333") {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.style.background = color;
  toast.className = "toast show";
  setTimeout(()=>{ toast.className = toast.className.replace("show", ""); }, 2500);
}

// مؤشر تحميل
function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
}

// فتح الدعم الفني
function openSupport() {
  window.open("mailto:support@chefa.edu.sa?subject=دعم فني للطالب", "_blank");
}

// تنزيل تقرير PDF (مكتبة jsPDF مطلوبة)
function downloadReport() {
  // NEW: More explicit message if jsPDF is not fully integrated client-side
  if (typeof html2pdf === 'undefined') {
      showToast("ميزة تحميل التقرير قيد التطوير حالياً. يرجى المحاولة لاحقاً.", "var(--info-color)");
      return;
  }
  showToast("جاري إنشاء تقرير PDF...", "var(--info-color)");
  let el = document.getElementById('studentDataForPdf'); // Assuming you'd wrap relevant data in an ID for PDF
  if (!el) {
    el = document.querySelector('.container'); // Fallback to entire container if specific ID not found
  }
  let studentNameForPdf = currentStudentName || "التقرير";
  let opt = {
    margin: 0.5,
    filename: `تقرير_${studentNameForPdf}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // Clone the element to hide specific buttons/inputs only for PDF generation
  let clonedElement = el.cloneNode(true);
  let elementsToHideInPdf = clonedElement.querySelectorAll('.btn, .form-group button, .table-mark-input, .table-mark-button, .reset-summary, #summaryDetailsBox .card-actions, .app-bar, .spinner, #toast, .notification-bell, .notification-panel, .message-input-area, #examBox');
  elementsToHideInPdf.forEach(elem => elem.style.display = 'none');
  
  html2pdf().set(opt).from(clonedElement).save().finally(() => {
    // No need to revert hidden elements on the actual page, as we used a clone
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
      showToast("انتهى وقت الاختبار! سيتم تسليم إجاباتك تلقائياً.", "var(--danger-color)"); // Use CSS variable
      processExamSubmission(true); // استدعاء الدالة الجديدة للتسليم التلقائي
    }
  }, 1000);
}
function updateExamTimer() {
  const el = document.getElementById('examTimer');
  if (examTimeLeft > 0) {
    const min = Math.floor(examTimeLeft/60);
    const sec = examTimeLeft%60;
    el.innerText = `(${min}:${sec<10?'0':''}${sec})`;

    // تشغيل صوت التحذير قبل 30 ثانية
    if (examTimeLeft === 30) {
      const sound = document.getElementById('timeWarningSound');
      if (sound) {
        sound.play().catch(e => console.error("Error playing sound:", e));
      }
    }
  } else {
    el.innerText = "";
  }
}

// المتغيرات
let auth, firestore;
let currentStudentEmail = "";
let currentStudentName = "";
let currentStudentUid = ""; // [NEW] To store student UID for notifications
let lastActiveLevel = null;
let lastActiveLevelIndex = null;
let examQuestions = [];
let randomizedExamQuestions = [];
let examQuestionsLimit = null;
let currentExamLevel = null;
let studentSummaries = {}; // Map to store summaries by lesson_id for quick lookup
let summariesListenerUnsubscribe = null; // To store unsubscribe function for real-time listener
let notificationsListenerUnsubscribe = null; // [NEW] To store unsubscribe function for notifications
let studentMarksListenerUnsubscribe = null; // NEW: Listener for real-time student marks
window.realtimeStudentMarks = {}; // NEW: Global map to store real-time marks

// [NEW] Hardcoded teacher email for notifications
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
        // تم إزالة رابط الاختبار هنا لأنه مدمج داخل صفحة الطالب
        { name: 'الدردشة', href: 'chat.html', icon: 'fas fa-comments' }
    ]
};

// دالة رسم روابط التنقل بناءً على الدور
function renderNavigation(role) {
    const navContainer = document.getElementById('main-nav-links');
    if (!navContainer) return;

    navContainer.innerHTML = '';
    const linksToRender = navLinks[role] || [];
    const currentPath = window.location.pathname.split('/').pop(); // اسم الملف الحالي

    linksToRender.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'nav-link';
        if (currentPath === link.href) {
             a.classList.add('active');
        }
        // Add icon
        const icon = document.createElement('i');
        icon.className = link.icon;
        a.appendChild(icon);
        // Add text
        const textSpan = document.createElement('span');
        textSpan.textContent = link.name;
        a.appendChild(textSpan);

        navContainer.appendChild(a);
    });
}


// Firebase init
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); } // firebaseConfig يتم جلبه الآن من firebase-config.js
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
    currentStudentUid = user.uid; // [NEW] Save user UID
    console.log("معرف المستخدم الحالي (UID): ", currentStudentUid);
    firestore.collection('users').doc(user.uid).get().then(function(doc) {
      if (doc.exists) {
        if (doc.data().role !== "student") {
          window.location.href = "dashboard.html";
          return;
        }
        loadStudentData(doc.data().email, doc.data().name);
        setupNotificationsListener(); // [NEW] Setup notifications listener after user data is loaded
        setupRealtimeMarksListener(); // NEW: Setup real-time marks listener
        renderNavigation(doc.data().role); // استدعاء دالة رسم التنقل
      } else {
        firestore.collection('users').doc(user.uid).set({
          email: user.email, role: "student"
        }).then(function() { window.location.reload(); });
      }
    }).catch(err => { showLoading(false); showToast("خطأ في جلب بيانات المستخدم", "var(--danger-color)"); }); // Use CSS variable
  } else {
    window.location.href = "login.html";
  }
});

// [NEW] Helper function to send notifications to the teacher
async function sendTeacherNotification(messageContent, type, relatedId = null, relatedName = null) {
    if (!currentStudentEmail || !currentStudentName || !messageContent) {
        console.warn("Cannot send teacher notification: Missing student info or message content.");
        return;
    }
    try {
        await firestore.collection('notifications').add({
            message: messageContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            recipient_email: TEACHER_ADMIN_EMAIL, // Recipient is the teacher
            is_read: false,
            sender_email: currentStudentEmail, // Sender is the student
            sender_name: currentStudentName,
            notification_type: type, // e.g., 'summary_submitted', 'student_reply'
            related_id: relatedId,
            related_name: relatedName
        });
        console.log(`Notification sent to teacher: "${messageContent}"`);
    } catch (error) {
        console.error("Error sending teacher notification:", error);
    }
}


// [NEW] Notification functions for student UI
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        // Mark all currently displayed notifications as read when panel is opened
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            const notificationId = item.dataset.id;
            markNotificationAsRead(notificationId);
        });
    }
}

function setupNotificationsListener() {
    if (!currentStudentEmail) { // Ensure currentStudentEmail is loaded
        console.warn("currentStudentEmail not yet available for notifications listener.");
        return;
    }

    // Unsubscribe from previous listener if exists
    if (notificationsListenerUnsubscribe) {
        notificationsListenerUnsubscribe();
    }

    // Corrected query to filter by recipient_email or 'all'
    notificationsListenerUnsubscribe = firestore.collection('notifications')
        .where('recipient_email', 'in', [currentStudentEmail, 'all'])
        .orderBy('timestamp', 'desc')
        .onSnapshot(function(snapshot) {
            let notifications = [];
            let unreadCount = 0;
            snapshot.forEach(doc => {
                const notification = { ...doc.data(), id: doc.id };
                notifications.push(notification);
                if (!notification.is_read) { // Use is_read as per Firestore document
                    unreadCount++;
                }
            });
            renderNotifications(notifications, unreadCount);
        }, function(error) {
            console.error("Error listening to notifications:", error);
            showToast("خطأ في تحميل الإشعارات: " + error.message, "var(--danger-color)"); // Use CSS variable
        });
}

function renderNotifications(notifications, unreadCount) {
    const notificationsListDiv = document.getElementById('notificationsList');
    const unreadBadge = document.getElementById('unreadNotificationsBadge');

    if (unreadCount > 0) {
        unreadBadge.innerText = unreadCount;
        unreadBadge.style.display = 'block';
    } else {
        unreadBadge.style.display = 'none';
    }

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

function markNotificationAsRead(notificationId) {
    firestore.collection('notifications').doc(notificationId).update({
        is_read: true // Use is_read as per Firestore document
    }).catch(error => {
        console.error("Error marking notification as read:", error);
        showToast("خطأ في تحديث حالة الإشعار: " + error.message, "var(--danger-color)"); // Use CSS variable
    });
}

// NEW: Real-time listener for student marks
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
            window.realtimeStudentMarks = {}; // Clear and repopulate
            snapshot.forEach(doc => {
                const markData = doc.data();
                window.realtimeStudentMarks[markData.summary_id] = markData.mark;
            });
            console.log("Realtime marks updated:", window.realtimeStudentMarks);
            // Trigger re-render of summaries to reflect new marks
            if (window.lastRenderedLessons && window.lastRenderedStudentSummaries) {
                renderSummariesLessonsUI(window.lastRenderedLessons, window.lastRenderedStudentSummaries);
            } else {
                // Fallback if data is not yet available, trigger full reload.
                // This might create duplicate listeners if not handled carefully.
                // A better way is to ensure loadActiveLessonsAndSummaries is always called first.
                // For now, let's just log a warning.
                console.warn("Cannot re-render summaries from marks listener: lessons or studentSummaries not yet available globally.");
            }

        }, function(error) {
            console.error("Error listening to student marks:", error);
            showToast("خطأ في تحميل علامات الطلاب في الوقت الحقيقي: " + error.message, "var(--danger-color)"); // Use CSS variable
        });
}


// تحميل بيانات الطالب
function loadStudentData(userEmail, userNameFromUserDoc) {
  currentStudentEmail = userEmail;
  showLoading(true);
  firestore.collection('lectures').where('email', '==', userEmail).get().then(function(querySnapshot) {
    showLoading(false);
    if (querySnapshot.empty) {
      document.getElementById('msg').innerText = "لا توجد بيانات لهذا المستخدم في النظام. تواصل مع الإدارة.";
    } else {
      const data = querySnapshot.docs[0].data();
      currentStudentName = data.name || userNameFromUserDoc || "";
      document.getElementById('studentName').innerText = currentStudentName;
      document.getElementById('studentNameInfo').innerText = currentStudentName;
      document.getElementById('studentEmail').innerText = userEmail || "";
      document.getElementById('courseNumber').innerText = data.course_number || "";
      document.getElementById('msg').innerText = "";
      
      // NEW: Control visibility of examsBoxWrapper
      const examsBoxWrapper = document.getElementById('examsBoxWrapper');
      examsBoxWrapper.style.display = "none"; // Hide by default

      // حالة القبول
      const admissionBox = document.getElementById('admissionStatusBox');
      const status = data.accepted;
      const isAccepted = (status === true || status === "مقبول" || status === "accepted");
      const isRejected = (status === false || status === "مرفوض" || status === "rejected");

      admissionBox.style.display = "block";
      if (typeof status !== "undefined") {
        if (isAccepted) {
          admissionBox.className = "admission-status-box admission-accepted";
          admissionBox.innerText = "تم قبولك في الدورة ✅";
          examsBoxWrapper.style.display = "block"; // Show exams box if accepted
        } else if (isRejected) {
          admissionBox.className = "admission-status-box admission-rejected";
          admissionBox.innerText = "عذراً، لم يتم قبولك في الدورة.";
          examsBoxWrapper.style.display = "none";
        } else {
          admissionBox.className = "admission-status-box admission-pending";
          admissionBox.innerText = "طلبك قيد المراجعة...";
          examsBoxWrapper.style.display = "none";
        }
      } else {
        admissionBox.className = "admission-status-box admission-pending";
        admissionBox.innerText = "طلبك قيد المراجعة...";
        examsBoxWrapper.style.display = "none";
      }

      // جدول المستويات/الامتحانات
      renderLevelsExamsMergedTable(data);

      // الامتحانات العامة
      const diagnosisMark = data.diagnosis_exam_mark || (data.diagnosis_exam ? 'مُجتاز' : 'غير مجتاز');
      const exam1Mark = data.exam1_mark || (data.exam1 ? 'مُجتاز' : 'غير مجتاز');
      const oralMark = data.oral_exam_mark || (data.oral_exam ? 'مُجتاز' : 'غير مجتاز');
      const fMark = (typeof data.f !== "undefined" && data.f !== null && data.f !== "") ? data.f : 'غير متوفر';
      document.getElementById('diagnosisExamMark').innerText = diagnosisMark;
      document.getElementById('exam1Mark').innerText = exam1Mark;
      document.getElementById('oralExamMark').innerText = oralMark;
      document.getElementById('fExam').innerText = fMark;

      // تحميل الدروس والتلاخيص (مع التعديل الجديد)
      const allowedLevels = getAllowedLevels(data);
      loadActiveLessonsAndSummaries(allowedLevels);
    }
  }).catch(function(err) {
    showLoading(false);
    document.getElementById('msg').innerText = "خطأ في جلب البيانات: " + err.message;
    showToast("خطأ في تحميل بيانات الطالب!", "var(--danger-color)"); // Use CSS variable
  });
}

// دالة مساعدة للتحقق من أهلية الامتحان والمتابعة
function performExamEligibilityCheckAndProceed(studentData, proceedIfEligible = false) {
  const btn = document.getElementById('goToExamBtn');
  const warn = document.getElementById('examWarnMsg');

  console.log("--- performExamEligibilityCheckAndProceed Started ---");
  console.log("lastActiveLevelIndex:", lastActiveLevelIndex);
  console.log("studentData.accepted:", studentData.accepted);

  if (!lastActiveLevelIndex || !studentData.accepted) {
    if (btn) btn.style.display = "none";
    if (warn) warn.innerText = ''; // مسح أي تحذيرات سابقة
    console.log("Condition 1 (lastActiveLevelIndex or studentData.accepted) not met.");
    return; // لا يوجد مستوى نشط أو الطالب غير مقبول
  }

  const levelText = getLevelText(lastActiveLevelIndex);
  showLoading(true); // إظهار مؤشر التحميل أثناء التحقق

  firestore.collection('lessons').where('level', '==', levelText).get().then(function(lessonQuery){
    let lessons = [];
    lessonQuery.forEach(doc => lessons.push(doc.data()));
    const lessonIds = lessons.map(l=>l.id);

    console.log("Lessons for level", levelText, ":", lessons);
    console.log("Lesson IDs:", lessonIds);

    if(!lessonIds.length) {
      if (btn) btn.style.display = "none";
      if (warn) warn.innerText = 'لا توجد دروس في هذا المستوى.';
      if (warn) warn.style.display = 'block'; // Show warning
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
                        // الشرط الجديد: يجب أن تكون العلامة أكبر من صفر
                        if (!markSnap.empty && markSnap.docs[0].data().mark !== null && markSnap.docs[0].data().mark > 0) {
                            s.mark_from_student_marks = markSnap.docs[0].data().mark;
                            console.log("Mark for summary", s.docId, "is valid:", s.mark_from_student_marks);
                            return true;
                        }
                        s.mark_from_student_marks = null; // العلامة غير صالحة (صفر أو أقل)
                        console.log("Mark for summary", s.docId, "is NOT valid (null, 0 or less):", markSnap.empty ? "no mark doc" : markSnap.docs[0].data().mark);
                        return false; // الملخص مسلم لكن لا يوجد علامة صالحة
                    }).catch(error => {
                        console.error("Error fetching mark for summary in exam check:", s.docId, error);
                        s.mark_from_student_marks = null;
                        return false; // اعتبارها غير صالحة في حالة الخطأ
                    })
                );
            } else {
                s.mark_from_student_marks = null; // الملخصات المسودة لا تؤهل للامتحان
                console.log("Summary for lesson_id", s.lesson_id, "is not submitted:", s.status);
                summaryAndMarkPromises.push(Promise.resolve(false));
            }
        });
        console.log("Number of summaries fetched:", summariesSnap.size);

        Promise.all(summaryAndMarkPromises).then(() => {
          let allRequiredSummariesPresentAndMarked = true;

          // إذا لم تكن هناك دروس، فليس هناك ما يجب التحقق منه، وبالتالي يعتبر مؤهلاً.
          if (lessons.length === 0) {
            allRequiredSummariesPresentAndMarked = true;
            console.log("No lessons found for this level, assuming eligible.");
          } else if (Object.keys(summariesMapForExamCheck).length !== lessons.length) { // لم يتم تقديم كل التلاخيص
            allRequiredSummariesPresentAndMarked = false;
            console.log("Condition 3 (not all summaries fetched for all lessons) failed. Summaries fetched:", Object.keys(summariesMapForExamCheck).length, "Lessons total:", lessons.length);
          } else { // تم تقديم كل التلاخيص، لكن يجب التحقق من حالتهم وعلاماتهم
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
              if (btn) btn.style.display="";
              if (warn) warn.innerText = '';
              if (warn) warn.style.display = 'none'; // Hide warning
              console.log("Exam button activated.");
              if (proceedIfEligible) { // فقط إذا كانت الدالة قد استدعيت بهدف المتابعة للامتحان
                  currentExamLevel = lastActiveLevelIndex;
                  checkIfExamAlreadySubmitted(currentStudentEmail, currentExamLevel);
                  setTimeout(function(){
                      document.getElementById('examBox').scrollIntoView({behavior: 'smooth'});
                  }, 300);
              }
          } else {
              if (btn) btn.style.display="none";
              if (warn) warn.innerText = 'لا يمكن تقديم الاختبار إلا بعد تسليم جميع التلاخيص وتصحيحها بعلامة أكبر من صفر.';
              if (warn) warn.style.display = 'block'; // Show warning
              console.log("Exam button deactivated, warning shown.");
          }
          showLoading(false); // إخفاء مؤشر التحميل بعد التحقق
          console.log("--- performExamEligibilityCheckAndProceed Finished ---");
        }).catch(error => {
            console.error("Error in Promise.all for summary/mark check:", error);
            if (btn) btn.style.display="none";
            if (warn) warn.innerText = 'حدث خطأ في التحقق من التلاخيص (فشل جلب العلامات).';
            if (warn) warn.style.display = 'block'; // Show warning
            showLoading(false);
        });
      }).catch(error => {
          console.error("Error fetching summaries for exam check:", error);
          if (btn) btn.style.display="none";
          if (warn) warn.innerText = 'حدث خطأ في جلب التلاخيص.';
          if (warn) warn.style.display = 'block'; // Show warning
          showLoading(false);
      });
  }).catch(error => {
      console.error("Error fetching lessons for exam check:", error);
      if (btn) btn.style.display="none";
      if (warn) warn.innerText = 'حدث خطأ في جلب الدروس.';
      if (warn) warn.style.display = 'block'; // Show warning
      showLoading(false);
  });
}
