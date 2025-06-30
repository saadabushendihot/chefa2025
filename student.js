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

  // التعديل المقترح هنا: لضمان ظهور رسالة حتى لو كان الشرط الأول غير مستوفى
  if (!lastActiveLevelIndex || !studentData.accepted) {
    if (btn) btn.style.display = "none";
    if (warn) {
        // التحقق من أن lastActiveLevelIndex هو رقم صالح وأكبر من صفر
        if (typeof lastActiveLevelIndex !== 'number' || lastActiveLevelIndex <= 0) {
            warn.innerText = 'لا يوجد مستوى نشط للطالب. يرجى تفعيل مستوى واحد على الأقل للطالب عبر لوحة تحكم المعلم.';
        } else if (studentData.accepted !== true) { // التأكد من أن accepted هي true بشكل صريح
            warn.innerText = 'حالة قبول الطالب في الدورة غير "مقبول". يرجى مراجعة حالة القبول عبر لوحة تحكم المعلم.';
        } else {
            // في حالة لم يتم تفعيل الرسالة بشكل صحيح، كحل احتياطي
            warn.innerText = 'خطأ غير معروف في التحقق الأولي. الرجاء التأكد من تفعيل مستوى الطالب وحالة القبول.';
        }
        warn.style.display = 'block'; // تأكد من إظهار رسالة التحذير
        warn.style.color = 'var(--danger-color)'; // لتوضيح أنها رسالة مهمة
        warn.style.fontWeight = 'bold'; // لتكون بارزة
    }
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

// المستويات + الامتحانات (مع تحسينات عرض)
function renderLevelsExamsMergedTable(data) {
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
    // حالة التفعيل
    const levelStatus = level ? '<span class="level-on">مُفعل ✅</span>' : '<span class="level-off">غير مفعل ❌</span>';
    // حالة الامتحان
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
  html += "</tbody></table></div>"; // Close table-container

  // زر الانتقال للاختبار
  if(lastActiveLevelIndex && data.accepted === true){
    html += `<div style="text-align:center; margin:20px 0;">
      <button class="btn" id="goToExamBtn" style="display:none">
        <i class="fas fa-arrow-alt-circle-left" style="margin-left: 8px;"></i> الانتقال إلى اختبار المستوى ${getLevelText(lastActiveLevelIndex)}
      </button>
    </div>`;
  }
  document.getElementById('levelsExamsTableArea').innerHTML = html;

  // عند تحميل الصفحة، نقوم بالتحقق الأولي (لا نتقدم للامتحان تلقائياً)
  if(lastActiveLevelIndex && data.accepted === true){
      performExamEligibilityCheckAndProceed(data, false); // التحقق الأولي
      // عند الضغط على الزر، نعيد التحقق ونتقدم إذا كانت الشروط مستوفاة
      document.getElementById('goToExamBtn').onclick = function(){
          performExamEligibilityCheckAndProceed(data, true); // إعادة التحقق والتقدم عند النقر
      };
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
    .catch(()=>{ showToast("خطأ في تحميل نتيجة الاختبار", "var(--danger-color)"); }); // Use CSS variable
}

// إظهار نتيجة الاختبار فقط
function showExamResultOnly(result) {
  document.getElementById('examBox').style.display = '';
  document.getElementById('questionsArea').innerHTML = '';
  document.getElementById('formMsg').innerText = '';
  document.getElementById('examStudentInfo').innerHTML =
    `<b>اسم الطالب:</b> ${currentStudentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${currentStudentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${result.level}`;
  document.getElementById('examLevelInfo').innerText = '';
  
  // NEW: Add a class to resultArea based on pass/fail
  let passed = (result.score >= result.total * 0.5);
  document.getElementById('resultArea').className = `result ${passed ? '' : 'fail'}`;

  document.getElementById('resultArea').innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
    لقد سبق لك تقديم اختبار هذا المستوى.<br>درجتك: ${result.score} من ${result.total}
    </div>`;
  let btn = document.getElementById('goToExamBtn');
  if(btn) btn.style.display = "none";
  document.querySelector("button[type=submit]").style.display = "none";
  document.getElementById('exitExamBtn').style.display = "none";
  clearInterval(examTimerInterval); updateExamTimer();
}

// إظهار نافذة الاختبار
function showExamBox(studentName, studentEmail, level) {
  document.getElementById('examBox').style.display = '';
  document.getElementById('examStudentInfo').innerHTML =
    `<b>اسم الطالب:</b> ${studentName} &nbsp; | &nbsp; <b>الإيميل:</b> ${studentEmail} &nbsp; | &nbsp; <b>المستوى الحالي:</b> المستوى ${getLevelText(level)}`;
  firestore.collection('exam_settings').doc('level_' + level).get().then(function(settingDoc){
    if(settingDoc.exists && settingDoc.data().question_num){
      examQuestionsLimit = settingDoc.data().question_num;
      document.getElementById('examLevelInfo').innerText =
        `عدد الأسئلة المخصصة لهذا المستوى: ${examQuestionsLimit}`;
    } else {
      examQuestionsLimit = null;
      document.getElementById('examLevelInfo').innerText =
        'لم يتم تحديد عدد الأسئلة لهذا المستوى (سيتم عرض جميع الأسئلة).';
    }
    loadExamQuestions(level);
    // بدء العداد (مثال: 20 دقيقة)
    startExamTimer(20);
  });
  document.getElementById('formMsg').innerText = '';
  document.getElementById('resultArea').innerText = '';
  document.querySelector("button[type=submit]").style.display = "";
  document.getElementById('exitExamBtn').style.display = "";
}

// جلب أسئلة الاختبار
function loadExamQuestions(level) {
  firestore.collection('questions').where('level', '==', level).get().then(snap=>{
    examQuestions = snap.docs.map(doc => ({...doc.data(), id: doc.id}));
    prepareRandomizedExam();
    renderQuestions();
  }).catch(()=>{ showToast("خطأ في تحميل الأسئلة", "var(--danger-color)"); }); // Use CSS variable
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
  document.getElementById('questionsArea').innerHTML = html || '<div class="msg">لا توجد أسئلة حالياً.</div>';
}

// تأكيد قبل الخروج من الاختبار
document.getElementById('exitExamBtn').onclick = function(){
  if (confirm("هل أنت متأكد أنك تريد الخروج؟ لن تحفظ إجاباتك!")) {
    document.getElementById('examBox').style.display = 'none';
    document.getElementById('questionsArea').innerHTML = "";
    document.getElementById('formMsg').innerText = "";
    document.getElementById('resultArea').innerText = "";
    clearInterval(examTimerInterval); updateExamTimer();
  }
};

// منع إغلاق الصفحة أثناء الاختبار بدون تأكيد
window.onbeforeunload = function(e) {
  if (document.getElementById('examBox').style.display !== 'none') {
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

    // عد الأسئلة الفارغة فقط إذا لم يكن التسليم تلقائياً بسبب انتهاء الوقت
    if (selected.length === 0) {
      if (!isTimerSubmission) {
        empty++;
      }
    }

    details.push({
      question_id: q.id,
      selected: selected,
      correct: q.correct
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
    }
    else {
      if(selected.length === 1 && q.correct.includes(selected[0])) gainedMark += mark;
    }
  });
  if (!isTimerSubmission && empty > 0) {
    showFormMsg('يرجى الإجابة على جميع الأسئلة!');
    showToast("يرجى الإجابة على جميع الأسئلة!", "var(--danger-color)"); // Use CSS variable
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
        showToast("تم إرسال الإجابات مسبقاً", "var(--danger-color)"); // Use CSS variable
        return;
      }
      const resultDoc = {
        student_email: currentStudentEmail,
        student_name: currentStudentName,
        level: currentExamLevel,
        score: gainedMark,
        total: totalMark,
        details: details,
        submitted_at: firebase.firestore.Timestamp.now(),
        teacher_reviewed: false,
        approved: null
      };
      firestore.collection('exam_results').add(resultDoc)
        .then(() => {
          document.getElementById('questionsArea').innerHTML = '';
          document.getElementById('formMsg').innerText = '';
          // NEW: Add a class to resultArea based on pass/fail
          let passed = (gainedMark >= totalMark * 0.5);
          document.getElementById('resultArea').className = `result ${passed ? '' : 'fail'}`;

          document.getElementById('resultArea').innerHTML = `<div style="font-size:1.3rem;font-weight:bold;">
            تم حفظ نتيجتك بنجاح! درجتك: ${gainedMark} من ${totalMark}
            </div>`;
          document.querySelector("button[type=submit]").style.display = "none";
          document.getElementById('exitExamBtn').style.display = "none";
          let btn = document.getElementById('goToExamBtn');
          if(btn) btn.style.display = "none";
          updateLevelExamTable(currentExamLevel, resultDoc);
          showToast("تم إرسال الإجابات بنجاح", "var(--success-color)"); // Use CSS variable
          clearInterval(examTimerInterval); updateExamTimer();
        })
        .catch((error) => {
          showResult(`درجتك: ${gainedMark} من ${totalMark}`);
          showFormMsg('حدث خطأ أثناء حفظ النتيجة: ' + error.message);
          showToast("حدث خطأ أثناء حفظ النتيجة!", "var(--danger-color)"); // Use CSS variable
        });
      showFormMsg('');
    });
}

// ربط نموذج الاختبار بالدالة الجديدة
document.getElementById('examForm').onsubmit = function(e){
  e.preventDefault();
  processExamSubmission(false); // تسليم يدوي
};

function showFormMsg(msg) {
  document.getElementById('formMsg').innerText = msg;
}
function showResult(msg) {
  document.getElementById('resultArea').innerText = msg;
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

  if (!activeLevels.length) {
    document.getElementById('lessonsSummariesArea').innerHTML = "<p style='text-align: center; color: var(--text-muted);'>لا توجد دروس متاحة حالياً في المستويات النشطة.</p>";
    return;
  }
  showLoading(true);

  // Get lessons first (they don't change often)
  firestore.collection('lessons').orderBy('id').get().then(function(lessonsSnap) {
    window.lessonsMap = {}; // *** CRITICAL FIX: Initialize or clear lessonsMap here ***
    let lessons = [];
    lessonsSnap.forEach(function(doc) {
      let lesson = doc.data();
      window.lessonsMap[lesson.id] = lesson.title; // *** CRITICAL FIX: Populate window.lessonsMap ***
      let levelNum = getLevelNumber(lesson.level);
      if (activeLevels.includes(levelNum)) {
        lessons.push(lesson);
      }
    });
    lessons.sort((a, b) => a.id - b.id); // Sort lessons by ID numerically
    window.lastRenderedLessons = lessons; // Store lessons for re-rendering from marks listener

    if (lessons.length === 0) {
      document.getElementById('lessonsSummariesArea').innerHTML = "<p style='text-align: center; color: var(--text-muted);'>لا توجد دروس متاحة حالياً في المستويات النشطة.</p>";
      showLoading(false);
      return;
    }

    // Now set up a real-time listener for summaries
    summariesListenerUnsubscribe = firestore.collection('summaries')
      .where('student_email', '==', currentStudentEmail)
      .onSnapshot(function(snapshot) {
        let changes = snapshot.docChanges(); // Get changes since last snapshot
        let shouldShowToast = false;
        
        // Re-fetch all summaries to ensure complete data
        studentSummaries = {}; // Clear before repopulating
        snapshot.forEach(doc => {
          let s = { ...doc.data(), docId: doc.id };
          studentSummaries[s.docId] = s;
          studentSummaries[s.lesson_id] = s;

          // Check for specific changes for toast notification
          if (changes.some(change => change.type === "modified" && change.doc.id === doc.id)) {
              let oldDoc = changes.find(change => change.doc.id === doc.id)?.oldDoc?.data();
              if (oldDoc) {
                  // If teacher_comment was added/changed OR mark was added/changed
                  if (s.teacher_comment !== oldDoc.teacher_comment || s.mark_from_student_marks !== oldDoc.mark_from_student_marks) {
                      shouldShowToast = true;
                  }
              }
          }
        });

        // Fetch marks for all summaries (or just the changed ones)
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
                return s; // Return the updated summary object
            }).catch(err => {
                console.error("Error fetching mark for summary in listener:", s.docId, err);
                s.mark_from_student_marks = null;
                return s;
            })
        );

        Promise.all(markPromises).then(updatedSummariesArray => {
            // Rebuild studentSummaries map from the updated array
            studentSummaries = {};
            updatedSummariesArray.forEach(s => {
                studentSummaries[s.docId] = s;
                studentSummaries[s.lesson_id] = s;
            });
            window.lastRenderedStudentSummaries = updatedSummariesArray; // Store summaries for re-rendering from marks listener

            renderSummariesLessonsUI(lessons, studentSummaries); // Re-render with fresh data
            if (shouldShowToast) {
                showToast("لديك تعليق أو علامة جديدة من المعلم على أحد تلاخيصك!", "var(--primary-color)"); // Use CSS variable
            }
            showLoading(false);
        }).catch(err => {
            showToast("خطأ في تحديث العلامات في الوقت الحقيقي: " + err.message, "var(--danger-color)"); // Use CSS variable
            console.error("Promise.all error in listener:", err);
            showLoading(false);
        });

      }, function(error) {
        showToast("خطأ في الاستماع لتحديثات التلاخيص: " + error.message, "var(--danger-color)"); // Use CSS variable
        console.error("Listener error:", error);
        showLoading(false);
      });
  }).catch(err => {
    showToast("خطأ في تحميل الدروس للتلاخيص: " + err.message, "var(--danger-color)"); // Use CSS variable
    showLoading(false);
    console.error("Error fetching lessons for summaries:", err);
  });
}

// عرض التلاخيص مع العلامة والتاريخ (مُعدلة)
function renderSummariesLessonsUI(lessons, summariesMap) {
  let html = ''; // Removed h3 as it's now in card-header
  lessons.forEach(function(lesson){
    // Ensure teacher_comment and student_reply_comment are initialized even if null in DB
    let sum = summariesMap[lesson.id] || { docId: `new_draft_${lesson.id}`, summary_text: "", status: "draft", teacher_comment: "", student_reply_comment: "" };
    let submitted = sum.status === 'submitted';

    // تحديد العلامة للعرض بناءً على حالة التلخيص والعلامة المجلوبة
    let markToDisplay = '—';
    let markBadgeClass = 'no-mark';

    // Prefer real-time mark from window.realtimeStudentMarks if available
    const realtimeMark = window.realtimeStudentMarks[sum.docId]; // Use summary's docId as key for mark
    if (typeof realtimeMark !== 'undefined' && realtimeMark !== null) {
        markToDisplay = 'العلامة: ' + realtimeMark;
        if (realtimeMark > 0) {
            markBadgeClass = 'positive-mark';
        } else {
            markBadgeClass = 'zero-mark';
        }
    } else if (submitted) { // Fallback to mark_from_student_marks if no realtime mark and submitted
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
    // NEW: Debugging for Invalid Date and robust date display
    if (sum.timestamp) {
        try {
            // Firestore Timestamp objects have a .toDate() method
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
  document.getElementById('lessonsSummariesArea').innerHTML = html;
}

// Function to save student reply to teacher's comment (or initiate comment)
function saveStudentReply(summaryDocId) {
    console.log("--- saveStudentReply بدأ ---"); // Log start
    const replyTextarea = document.getElementById(`studentreply_${summaryDocId}`);
    const replyText = sanitizeText(replyTextarea.value.trim());

    // Get lessonTitle for notification message
    const summary = studentSummaries[summaryDocId];
    // Check if summary or lesson_id is undefined before accessing
    if (!summary) {
        console.error("Error: Summary object is undefined for summaryDocId:", summaryDocId);
        showToast("حدث خطأ: بيانات التلخيص غير موجودة. حاول تحديث الصفحة.", "var(--danger-color)"); // Use CSS variable
        return;
    }
    if (typeof summary.lesson_id === 'undefined' || summary.lesson_id === null) {
        console.error("Error: summary.lesson_id is undefined or null for summaryDocId:", summaryDocId, summary);
        showToast("حدث خطأ: رقم الدرس غير موجود للتلخيص. حاول تحديث الصفحة.", "var(--danger-color)"); // Use CSS variable
        return;
    }
    const lessonTitle = window.lessonsMap[summary.lesson_id];

    console.log("summaryDocId received:", summaryDocId); // Log summaryDocId
    console.log("replyText:", replyText); // Log replyText
    console.log("Summary object from studentSummaries:", summary); // Log summary object
    console.log("summary.lesson_id:", summary.lesson_id); // Log lesson_id
    console.log("lessonTitle (for notification):", lessonTitle); // Log lessonTitle


    if (!replyText) {
        showToast("يرجى كتابة الرد أولاً.", "var(--danger-color)"); // Use CSS variable
        console.warn("Reply text is empty."); // Log warning
        return;
    }

    firestore.collection('summaries').doc(summaryDocId).update({
        student_reply_comment: replyText
    }).then(() => {
        showToast("تم حفظ ردك بنجاح!", "var(--success-color)"); // Use CSS variable
        console.log("Reply saved to Firestore successfully."); // Log success
        // NEW: Send notification to teacher for student reply
        sendTeacherNotification(
            `قام الطالب ${currentStudentName} بالرد على تعليقك في درس "${lessonTitle}".`,
            'student_reply',
            summary.lesson_id, // relatedId
            lessonTitle // relatedName
        );
        console.log("Teacher notification sent for reply."); // Log notification send
        // No need to call loadStudentData here, listener will handle refresh
    }).catch(error => {
        showToast(`حدث خطأ أثناء حفظ الرد: ${error.message}`, "var(--danger-color)"); // Use CSS variable
        console.error("Error saving student reply to Firestore:", error); // Log error
    });
    console.log("--- saveStudentReply انتهى ---"); // Log end
}

// حفظ المسودة
function saveSummary(lessonId) {
  console.log("--- saveSummary بدأ ---"); // Log start
  const textarea = document.getElementById('sumtext_' + lessonId);
  const msg = document.getElementById('sum_msg_' + lessonId);
  const text = sanitizeText(textarea.value.trim());
  msg.innerText = "";

  console.log("lessonId for draft:", lessonId); // NEW LOG
  console.log("Text for draft:", text); // NEW LOG
  
  let docRef;
  const existingSummary = Object.values(studentSummaries).find(s => s.lesson_id === lessonId);
  console.log("Existing summary for draft:", existingSummary); // NEW LOG

  if (!text) {
    msg.innerText = "يرجى كتابة التلخيص أولاً.";
    showToast("يرجى كتابة التلخيص!", "var(--danger-color)"); // Use CSS variable
    console.warn("Draft text is empty."); // Log warning
    return;
  }
  
  if (existingSummary && existingSummary.docId && !existingSummary.docId.startsWith('new_draft_')) {
      docRef = firestore.collection('summaries').doc(existingSummary.docId);
      console.log("Existing summary docRef:", docRef.id); // NEW LOG
      // Check if already submitted
      if (existingSummary.status === "submitted") {
          msg.innerText = "تم تسليم التلخيص النهائي ولا يمكن التعديل.";
          showToast("تم تسليم التلخيص النهائي ولا يمكن التعديل.", "var(--danger-color)"); // Use CSS variable
          console.warn("Attempted to save draft for already submitted summary."); // NEW LOG
          return;
      }
  } else {
      docRef = firestore.collection('summaries').doc(); // Create a new doc
      console.log("New summary docRef (draft):", docRef.id); // NEW LOG
  }

  const summaryData = {
      student_email: currentStudentEmail,
      student_name: currentStudentName || "",
      lesson_id: lessonId,
      summary_text: text,
      status: "draft",
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
  };
  console.log("Summary data to save (draft):", summaryData); // NEW LOG

  docRef.set(summaryData, { merge: true }).then(function(){ // Use set with merge for both new and update
      msg.style.color = "var(--success-color)"; // Use CSS variable
      msg.innerText = "تم حفظ المسودة.";
      showToast("تم حفظ المسودة.", "var(--success-color)"); // Use CSS variable
      console.log("Draft saved to Firestore successfully."); // NEW LOG
      // No need to call loadStudentData, listener will handle refresh
      setTimeout(()=>{msg.innerText=''; msg.style.color="var(--danger-color)";}, 1500); // Use CSS variable
  }).catch((error)=>{ 
      showToast("خطأ أثناء الحفظ: " + error.message, "var(--danger-color)"); // Use CSS variable
      console.error("Error saving draft to Firestore:", error); // NEW LOG
  });
  console.log("--- saveSummary انتهى ---"); // Log end
}

// تسليم النهائي
function submitSummary(lessonId) {
  console.log("--- submitSummary بدأ ---"); // Log start
  const textarea = document.getElementById('sumtext_' + lessonId);
  const msg = document.getElementById('sum_msg_' + lessonId);
  const text = sanitizeText(textarea.value.trim());
  msg.innerText = "";

  console.log("lessonId for submission:", lessonId); // NEW LOG
  console.log("Text for submission:", text); // NEW LOG

  if (!text) {
    msg.innerText = "يرجى كتابة التلخيص أولاً.";
    showToast("يرجى كتابة التلخيص!", "var(--danger-color)"); // Use CSS variable
    console.warn("Submission text is empty."); // NEW LOG
    return;
  }
  
  let docRef;
  const existingSummary = Object.values(studentSummaries).find(s => s.lesson_id === lessonId);
  console.log("Existing summary for submission:", existingSummary); // NEW LOG

  if (existingSummary && existingSummary.docId && !existingSummary.docId.startsWith('new_draft_')) {
      docRef = firestore.collection('summaries').doc(existingSummary.docId);
      console.log("Existing summary docRef:", docRef.id); // NEW LOG
      // Check if already submitted
      if (existingSummary.status === "submitted") {
          msg.innerText = "تم تسليم التلخيص بالفعل.";
          showToast("تم تسليم التلخيص بالفعل.", "var(--danger-color)"); // Use CSS variable
          console.warn("Attempted to submit already submitted summary."); // NEW LOG
          return;
      }
  } else {
      docRef = firestore.collection('summaries').doc(); // Create a new doc
      console.log("New summary docRef (submission):", docRef.id); // NEW LOG
  }

  const summaryData = {
      summary_text: text,
      status: "submitted",
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
  };
  console.log("Summary data to save (submission):", summaryData); // NEW LOG
  
  // For new summaries being submitted
  if (!existingSummary || existingSummary.docId.startsWith('new_draft_')) {
      summaryData.student_email = currentStudentEmail;
      summaryData.student_name = currentStudentName || "";
      summaryData.lesson_id = lessonId;
  }

  const lessonTitle = window.lessonsMap[lessonId]; // Get lesson title for notification
  console.log("Lesson title (for notification):", lessonTitle); // NEW LOG

  docRef.set(summaryData, { merge: true }).then(function(){
      msg.style.color = "var(--success-color)"; // Use CSS variable
      msg.innerText = "تم تسليم التلخيص بنجاح.";
      // No need to call loadStudentData, listener will handle refresh
      showToast("تم تسليم التلخيص بنجاح!", "var(--success-color)"); // Use CSS variable
      console.log("Summary submitted to Firestore successfully."); // NEW LOG
      // NEW: Send notification to teacher for summary submission
      sendTeacherNotification(
          `قام الطالب ${currentStudentName} بتسليم تلخيص جديد لدرس "${lessonTitle}".`,
          'summary_submitted',
          lessonId,
          lessonTitle
      );
      console.log("Teacher notification sent for submission."); // NEW LOG
      setTimeout(()=>{msg.innerText=''; msg.style.color="var(--danger-color)";}, 1500); // Use CSS variable
  }).catch((error)=>{ 
      showToast("خطأ أثناء التسليم: " + error.message, "var(--danger-color)"); // Use CSS variable
      console.error("Error submitting summary to Firestore:", error); // NEW LOG
  });
  console.log("--- submitSummary انتهى ---"); // Log end
}

// تسجيل الخروج
function logout() {
  // Unsubscribe from listeners before logging out
  if (summariesListenerUnsubscribe) {
    summariesListenerUnsubscribe();
    summariesListenerUnsubscribe = null;
  }
  if (notificationsListenerUnsubscribe) {
    notificationsListenerUnsubscribe();
    notificationsListenerUnsubscribe = null;
  }
  if (studentMarksListenerUnsubscribe) { // NEW: Unsubscribe marks listener
      studentMarksListenerUnsubscribe();
      studentMarksListenerUnsubscribe = null;
  }
  auth.signOut().then(()=>{window.location.href='login.html';}).catch(function(error) {
    console.error("خطأ في تسجيل الخروج:", error);
  });
}
