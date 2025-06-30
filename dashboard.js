// dashboard.js

console.log("dashboard.js started execution."); // أضف هذا السطر في أول الملف

// Toast & Loading
function showToast(msg, color="var(--primary-color)") {
  const toast = document.getElementById("toast");
  if (!toast) {
      console.error("Toast element not found!");
      return;
  }
  toast.innerText = msg;
  toast.style.background = color; // Use CSS variable
  toast.className = "toast show";
  setTimeout(()=>{ toast.className = toast.className.replace("show", ""); }, 2500);
}
function showLoading(show) {
  document.getElementById("loadingSpinner").style.display = show ? "block" : "none";
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

// Student Search Filter
function filterStudents() {
  let val = document.getElementById('studentSearch').value.trim().toLowerCase();
  let studentSelect = document.getElementById('studentSelect');
  let options = studentSelect.querySelectorAll('option');
  options.forEach((opt,i)=>{
    if(i==0){ opt.style.display=""; return; }
    let txt = opt.textContent.toLowerCase();
    let email = allStudentsData[opt.value]?.email?.toLowerCase() || '';
    opt.style.display =
      (txt.includes(val)||email.includes(val)) ? "" : "none";
  });
}

// PDF Export
function downloadStudentReport() {
  let el = document.getElementById('selectedStudentDetails');
  let studentName = document.getElementById('detailName').innerText || "student";
  let opt = {
    margin: 0.5, /* Increased margin for better print readability */
    filename: `تقرير_${studentName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  // Hide buttons and elements not needed in PDF
  const elementsToHide = el.querySelectorAll('.btn, .form-group button, .table-mark-input, .table-mark-button, .reset-summary, #summaryDetailsBox .card-actions');
  elementsToHide.forEach(el => el.classList.add('d-none'));

  html2pdf().set(opt).from(el).save().finally(() => {
    // Show hidden elements again after PDF generation
    elementsToHide.forEach(el => el.classList.remove('d-none'));
  });
}

// Firebase Initialization
console.log("Attempting Firebase initialization."); // أضف هذا السطر قبل تهيئة Firebase
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
console.log("Firebase initialization status:", firebase.apps.length > 0 ? "SUCCESS" : "FAILED"); // أضف هذا السطر بعد تهيئة Firebase

var auth = firebase.auth();
var firestore = firebase.firestore();

var editLessonId = null;
var allStudentsData = {};
window.studentSummariesMap = {}; // Global variable to store summaries by docId
window.lessonsMap = {}; // Global variable to store lesson titles by ID
window.allSummaries = []; // Global array to store all summaries for filtering
let currentStudentEmailForSummaries = '';
let teacherSummariesListenerUnsubscribe = null; // Listener for teacher's real-time summaries
let currentlyOpenSummaryDocId = null; // To track if a summary details box is open
let teacherNotificationsListenerUnsubscribe = null; // Listener for teacher notifications
let teacherNotificationsData = []; // Global array to store teacher notifications
let teacherLoggedInEmail = ''; // To store logged-in teacher's email

// NEW: Global variables for exam results management
let allExamResults = [];
let examResultsListenerUnsubscribe = null;
let currentlyOpenExamResultDocId = null;


// تعريف روابط التنقل لكل دور
const navLinks = {
    teacher: [
        { name: 'لوحة التحكم', href: 'dashboard.html' },
        { name: 'إدارة الأسئلة', href: 'questions-admin.html' },
        { name: 'الدردشة', href: 'chat.html' }
    ],
    student: [
        { name: 'لوحة الطالب', href: 'student.html' },
        { name: 'الاختبار', href: 'student-quiz.html' },
        { name: 'الدردشة', href: 'chat.html' }
    ]
};

// دالة جديدة لرسم روابط التنقل بناءً على الدور
function renderNavigation(role) {
    const navContainer = document.getElementById('main-nav-links');
    if (!navContainer) return;

    navContainer.innerHTML = ''; // مسح الروابط الحالية
    const linksToRender = navLinks[role] || []; // جلب الروابط بناءً على الدور
    const currentPath = window.location.pathname.split('/').pop(); // اسم الملف الحالي

    linksToRender.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.name;
        a.className = 'nav-link';
        if (currentPath === link.href) {
             a.classList.add('active');
        }
        navContainer.appendChild(a);
    });
}


// Get Mark from student_marks collection
function getMarkForSummary(summaryId, studentEmail) {
  return firestore.collection('student_marks')
    .where('summary_id', '==', summaryId)
    .where('student_email', '==', studentEmail)
    .limit(1)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().mark;
      } else {
        return ""; // No mark
      }
    })
    .catch((error) => {
      console.error('Error fetching mark:', error);
      return "";
    });
}

// Auth State Changed - Protection and Initial Data Load
auth.onAuthStateChanged(function(user) {
  console.log("auth.onAuthStateChanged fired in dashboard.js. User:", user); // أضف هذا السطر
  if (user) {
    firestore.collection('users').doc(user.uid).get().then(function(doc) {
      if (!doc.exists || doc.data().role !== "teacher") {
        window.location.href = "login.html";
      } else {
        teacherLoggedInEmail = user.email; // Store teacher's email
        loadStudents();
        loadLessons();
        setupTeacherNotificationsListener(); // Setup listener for teacher notifications
        renderNavigation(doc.data().role); // استدعاء دالة جديدة لرسم التنقل
        loadExamResultsDashboard(); // NEW: Load exam results for the dashboard
      }
    }).catch(function(error) {
      console.error("خطأ في جلب دور المستخدم:", error);
      window.location.href = "login.html";
    });
  } else {
    window.location.href = "login.html";
  }
});

// Toggle Sections (Add Student, Add Lesson, Send Notification)
function toggleSection(sectionId){
  var sec = document.getElementById(sectionId);
  var iconId;
  if (sectionId === 'addStudentSection') {
    iconId = 'addStudentToggleIcon';
  } else if (sectionId === 'addLessonSection') {
    iconId = 'addLessonToggleIcon';
  } else if (sectionId === 'sendNotificationSection') {
    iconId = 'sendNotificationToggleIcon';
  }

  var icon = document.getElementById(iconId);
  if (sec.style.display === "block") {
    sec.style.display = "none";
    // Reset icon based on section type
    if (sectionId === 'sendNotificationSection') {
      icon.innerText = "notifications"; // Material icon for bell
    } else {
      icon.innerText = "add"; // Material icon for add
    }
  } else {
    sec.style.display = "block";
    icon.innerText = "close"; // Material icon for close/X
  }
}
// Hide sections on initial load
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('addStudentSection').style.display = "none";
  document.getElementById('addLessonSection').style.display = "none";
  document.getElementById('sendNotificationSection').style.display = "none";
});

// Notification UI functions
function toggleTeacherNotificationPanel() {
    const panel = document.getElementById('teacherNotificationPanel');
    const bellIcon = document.querySelector('.app-bar .notification-bell');

    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        // Position the panel dynamically (fixed to right side, just under bell)
        const bellRect = bellIcon.getBoundingClientRect();
        // panel.style.right = (window.innerWidth - bellRect.right) + 'px'; // Original was complex for RTL
        panel.style.right = '16px'; // Keep it fixed at 16px from right
        panel.style.top = (bellRect.bottom + 5) + 'px'; // 5px below the bell

        panel.style.display = 'block';
        // Mark all currently displayed notifications as read when panel is opened
        const unreadItems = document.querySelectorAll('#teacherNotificationsList .notification-item.unread');
        unreadItems.forEach(item => {
            const notificationId = item.dataset.id;
            markTeacherNotificationAsRead(notificationId);
        });
    }
}

// Handle clicks outside the notification panel to close it
document.addEventListener('click', function(event) {
    const panel = document.getElementById('teacherNotificationPanel');
    const bellIcon = document.querySelector('.app-bar .notification-bell');
    const isClickInsidePanel = panel.contains(event.target);
    const isClickOnBell = bellIcon.contains(event.target);

    if (panel.style.display === 'block' && !isClickInsidePanel && !isClickOnBell) {
        panel.style.display = 'none';
    }
});

function setupTeacherNotificationsListener() {
    if (!teacherLoggedInEmail) {
        console.warn("Teacher email not available for notifications listener.");
        return;
    }

    if (teacherNotificationsListenerUnsubscribe) {
        teacherNotificationsListenerUnsubscribe();
    }

    // Listener for notifications addressed to the teacher's email or 'all'
    teacherNotificationsListenerUnsubscribe = firestore.collection('notifications')
        .where('recipient_email', 'in', [teacherLoggedInEmail, 'all', 'saad.abushendi@gmail.com']) // Added hardcoded admin email for flexibility
        .orderBy('timestamp', 'desc')
        .onSnapshot(function(snapshot) {
            teacherNotificationsData = []; // Clear and repopulate
            let unreadCount = 0;
            snapshot.forEach(doc => {
                const notification = { ...doc.data(), id: doc.id };
                teacherNotificationsData.push(notification);
                if (!notification.is_read) {
                    unreadCount++;
                }
            });
            renderTeacherNotificationsPanel(teacherNotificationsData, unreadCount);
        }, function(error) {
            console.error("Error listening to teacher notifications:", error);
            showToast("خطأ في تحميل إشعارات المعلم: " + error.message, "var(--error)");
        });
}

function renderTeacherNotificationsPanel(notifications, unreadCount) {
    const notificationsListDiv = document.getElementById('teacherNotificationsList');
    const unreadBadge = document.getElementById('unreadTeacherNotificationsBadge');

    if (unreadCount > 0) {
        unreadBadge.innerText = unreadCount;
        unreadBadge.classList.remove('d-none'); // Show the badge
    } else {
        unreadBadge.classList.add('d-none'); // Hide the badge
    }

    if (notifications.length === 0) {
        notificationsListDiv.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 16px;">لا توجد إشعارات حالياً.</p>';
        return;
    }

    let html = '';
    notifications.forEach(n => {
        let timestampText = '';
        if (n.timestamp && n.timestamp.toDate) {
            try {
                timestampText = new Date(n.timestamp.toDate()).toLocaleString('ar-EG');
            } catch (e) {
                console.error("Error parsing notification timestamp:", n.id, n.timestamp, e);
                timestampText = '(تاريخ غير صالح)';
            }
        } else if (n.timestamp) {
            try {
                timestampText = new Date(n.timestamp).toLocaleString('ar-EG');
            }
        } else {
            timestampText = '(لا يوجد تاريخ)';
        }
        
        // Construct message based on notification_type and available data
        let messageContent = n.message; // Default to generic message
        if (n.notification_type === 'summary_submitted' && n.sender_name && n.related_name) {
            messageContent = `قام الطالب ${n.sender_name} بتسليم تلخيص جديد لدرس "${n.related_name}".`;
        } else if (n.notification_type === 'student_reply' && n.sender_name && n.related_name) {
            messageContent = `قام الطالب ${n.sender_name} بالرد على تعليقك في درس "${n.related_name}".`;
        } else if (n.notification_type === 'mark_update' && n.sender_name && n.related_name) {
            messageContent = `تم وضع علامة جديدة لدرس "${n.related_name}".`;
        } else if (n.notification_type === 'level_open' && n.sender_name && n.related_name) {
            messageContent = `تم فتح ${n.related_name} للطالب ${n.sender_name}.`;
        } else if (n.sender_name && n.message) { // Generic from student
            messageContent = `إشعار من الطالب ${n.sender_name}: ${n.message}`;
        }

        html += `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
                <p style="margin: 0; word-wrap: break-word;">${messageContent}</p>
                <span class="notification-timestamp">${timestampText}</span>
                ${!n.is_read ? `<button class="mark-read-btn" onclick="markTeacherNotificationAsRead('${n.id}')">قراءة</button>` : ''}
            </div>
        `;
    });
    notificationsListDiv.innerHTML = html;
}

function markTeacherNotificationAsRead(notificationId) {
    firestore.collection('notifications').doc(notificationId).update({
        is_read: true
    }).catch(error => {
        console.error("Error marking teacher notification as read:", error);
        showToast("خطأ في تحديث حالة الإشعار: " + error.message, "var(--error)");
    });
}

// Add Student
function addStudent(e) {
  e.preventDefault();
  var email = document.getElementById('studentEmail').value.trim().toLowerCase();
  var name = document.getElementById('studentName').value.trim();
  var courseNumber = document.getElementById('courseNumber').value.trim();
  var msg = document.getElementById('addStudentMsg');
  msg.innerText = '';
  if (!validateEmail(email) || !name || !courseNumber) {
    msg.innerText = "يرجى تعبئة جميع الحقول بشكل صحيح.";
    return;
  }
  firestore.collection('lectures').where('email', '==', email).get().then(function(querySnapshot){
    if (!querySnapshot.empty) {
      msg.innerText = "هذا الطالب موجود بالفعل.";
    } else {
      let levelsObj = {};
      let examsObj = {};
      for (let i=1; i<=7; i++) {
        levelsObj["level"+i] = false;
        examsObj["exam"+i] = false;
      }
      firestore.collection('lectures').add({
        email: email,
        name: name,
        course_number: courseNumber,
        role: "student",
        diagnosis_exam: false,
        oral_exam: false,
        accepted: "pending", // Default status for new students
        teacher_notes: "", // Default empty notes
        ...levelsObj,
        ...examsObj
      }).then(function(){
        msg.style.color = "var(--secondary-color)"; // Green for success
        msg.innerText = "تمت إضافة الطالب بنجاح!";
        document.getElementById('addStudentForm').reset();
        loadStudents();
      }).catch(function(err){
        msg.innerText = "حدث خطأ أثناء الإضافة: " + err.message;
      });
    }
  }).catch(function(error) {
    console.error("خطأ في التحقق من وجود الطالب:", error);
    msg.innerText = "حدث خطأ في التحقق من وجود الطالب.";
  });
}

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

// Add Lesson
function addLesson(e) {
  e.preventDefault();
  var id = Number(document.getElementById('lessonId').value.trim());
  var title = document.getElementById('lessonTitle').value.trim();
  var url = document.getElementById('lessonUrl').value.trim();
  var voice = document.getElementById('lessonVoice').value.trim();
  var level = document.getElementById('lessonLevel').value.trim();
  var msg = document.getElementById('addLessonMsg');
  msg.innerText = '';
  if (!id || !title || !url || !level) {
    msg.innerText = "يرجى تعبئة جميع الحقول بشكل صحيح.";
    return;
  }
  firestore.collection('lessons').where('id', '==', id).get().then(function(querySnapshot){
    if (!querySnapshot.empty) {
      msg.innerText = "يوجد درس بنفس الرقم بالفعل.";
    } else {
      let lessonObj = {
        id: id,
        title: title,
        url: url,
        level: level
      };
      if (voice) lessonObj.voice = voice;
      else lessonObj.voice = firebase.firestore.FieldValue.delete(); // Delete field if empty
      firestore.collection('lessons').add(lessonObj).then(function(){
        msg.style.color = "var(--secondary-color)";
        msg.innerText = "تمت إضافة الدرس بنجاح!";
        document.getElementById('addLessonForm').reset();
        loadLessons();
      }).catch(function(err){
        msg.innerText = "حدث خطأ أثناء الإضافة: " + err.message;
      });
    }
  }).catch(function(error) {
    console.error("خطأ في التحقق من وجود الدرس:", error);
    msg.innerText = "حدث خطأ في التحقق من وجود الدرس.";
  });
}

// Load Students
function loadStudents() {
  showLoading(true);
  firestore.collection('lectures').where('role', '==', 'student').get().then(function(querySnapshot){
    let studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '<option value="">-- اختر طالباً لعرض بياناته --</option>';
    allStudentsData = {};
    querySnapshot.forEach(function(doc){
      let data = doc.data();
      allStudentsData[doc.id] = data;
      let option = document.createElement('option');
      option.value = doc.id;
      option.textContent = data.name || 'غير معروف';
      studentSelect.appendChild(option);
    });
    showLoading(false);
    const currentSelectedStudentId = studentSelect.value;
    if (currentSelectedStudentId && allStudentsData[currentSelectedStudentId]) {
        showSelectedStudentDetails(currentSelectedStudentId);
    } else {
        document.getElementById('selectedStudentDetails').style.display = 'none';
    }
    if (querySnapshot.size === 1 && !currentSelectedStudentId) {
        studentSelect.value = querySnapshot.docs[0].id;
        showSelectedStudentDetails(querySnapshot.docs[0].id);
    }
  }).catch(function(error) {
    showLoading(false);
    showToast("خطأ في تحميل الطلاب", "var(--error)");
    document.getElementById('msg').innerText = "خطأ في تحميل بيانات الطلاب.";
  });
}

// Show Selected Student Details
window.showSelectedStudentDetails = function(studentId) {
  const studentDetailsDiv = document.getElementById('selectedStudentDetails');
  const deleteStudentBtn = document.getElementById('deleteStudentBtn');
  hideSummaryDetails(); // Close any open summary details box

  // Unsubscribe from previous listener if exists (real-time summaries)
  if (teacherSummariesListenerUnsubscribe) {
      teacherSummariesListenerUnsubscribe();
      teacherSummariesListenerUnsubscribe = null;
  }

  if (!studentId) {
    studentDetailsDiv.style.display = 'none';
    document.getElementById('teacherPDFBtn').style.display = "none";
    deleteStudentBtn.style.display = "none";
    // Reset notification recipient dropdown to default if no student is selected
    document.getElementById('notificationRecipient').innerHTML = `
        <option value="selectedStudent">الطالب المحدد حالياً</option>
        <option value="allStudents">جميع الطلاب</option>
    `;
    document.getElementById('notificationRecipient').value = "selectedStudent";
    return;
  }
  const student = allStudentsData[studentId];
  if (student) {
    document.getElementById('detailName').textContent = student.name || 'غير معروف';
    document.getElementById('detailEmail').textContent = student.email || 'غير معروف';
    document.getElementById('detailCourseNumber').textContent = student.course_number || 'غير معروف';
    
    // Populate admission status
    document.getElementById('detailAcceptedStatus').value = student.accepted || "pending";
    // Populate teacher notes
    document.getElementById('detailTeacherNotes').value = student.teacher_notes || "";

    const detailLevelsDiv = document.getElementById('detailLevels');
    detailLevelsDiv.innerHTML = '';
    let exams = {};
    for (let i = 1; i <= 7; i++) {
      exams['exam' + i] = Boolean(student['exam' + i]);
    }
    for (let i = 1; i <= 7; i++) {
      const level = 'level' + i;
      const isChecked = student[level] ? 'checked' : '';
      let disabled = '';
      if (i > 1 && !exams['exam' + (i - 1)]) {
        disabled = 'disabled title="يجب اجتياز امتحان المستوى السابق أولاً"';
      }
      const levelItem = document.createElement('div');
      levelItem.className = `level-item level-color-${i}`;
      levelItem.innerHTML = `
        <input type="checkbox" class="level-checkbox" id="level-${studentId}-${i}" data-id="${studentId}" data-level="${level}" ${isChecked} ${disabled} onchange="updateLevel(this)">
        <label for="level-${studentId}-${i}">المستوى ${i}</label>
      `;
      detailLevelsDiv.appendChild(levelItem);
    }
    renderExamsTable(studentId, student);
    document.getElementById('teacherPDFBtn').style.display = "";
    deleteStudentBtn.style.display = "";
    deleteStudentBtn.dataset.studentId = studentId; // Set studentId for deletion
    currentStudentEmailForSummaries = student.email; // Set current student email for summaries listener
    loadStudentSummaries(student.email); // Load summaries for the selected student

    // Update notification recipient dropdown
    const notificationRecipientSelect = document.getElementById('notificationRecipient');
    notificationRecipientSelect.innerHTML = `
        <option value="selectedStudent">الطالب المحدد حالياً</option>
        <option value="allStudents">جميع الطلاب</option>
    `;
    notificationRecipientSelect.value = student.email; // Set current student as default recipient

    studentDetailsDiv.style.display = 'block';
  } else {
    studentDetailsDiv.style.display = 'none';
    document.getElementById('teacherPDFBtn').style.display = "none";
    deleteStudentBtn.style.display = "none";
    document.getElementById('msg').innerText = "لم يتم العثور على بيانات لهذا الطالب.";
    document.getElementById('notificationRecipient').innerHTML = `
        <option value="selectedStudent">الطالب المحدد حالياً</option>
        <option value="allStudents">جميع الطلاب</option>
    `;
    document.getElementById('notificationRecipient').value = "selectedStudent";
    setTimeout(()=>{document.getElementById('msg').innerText='';}, 2000);
  });
}

// Update Student Admission Status
window.updateStudentAdmission = function(status) {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) return;

    firestore.collection('lectures').doc(studentId).update({
        accepted: status
    }).then(() => {
        allStudentsData[studentId].accepted = status;
        showToast('تم تحديث حالة القبول بنجاح!', 'var(--secondary-color)');
    }).catch(err => {
        showToast('خطأ في تحديث حالة القبول: ' + err.message, 'var(--error)');
        console.error('Error updating admission status:', err);
    });
};

// Save Teacher Notes
window.saveTeacherNotes = function() {
    const studentId = document.getElementById('studentSelect').value;
    const notes = document.getElementById('detailTeacherNotes').value.trim();
    if (!studentId) return;

    firestore.collection('lectures').doc(studentId).update({
        teacher_notes: notes
    }).then(() => {
        allStudentsData[studentId].teacher_notes = notes;
        showToast('تم حفظ ملاحظات المعلم!', 'var(--secondary-color)');
    }).catch(err => {
        showToast('خطأ في حفظ الملاحظات: ' + err.message, 'var(--error)');
        console.error('Error saving teacher notes:', err);
    });
};

// Confirm and Delete Student
window.confirmDeleteStudent = function() {
    const studentId = document.getElementById('studentSelect').value;
    const studentName = document.getElementById('detailName').textContent;
    if (!studentId) {
        showToast('الرجاء اختيار طالب أولاً للحذف.', 'var(--error)');
        return;
    }
    if (confirm(`هل أنت متأكد من حذف الطالب ${studentName}؟ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناته الأساسية. (ملاحظة: يفضل استخدام Firebase Cloud Functions لحذف جميع البيانات المرتبطة تلقائياً).`)) {
        deleteStudent(studentId);
    }
};

async function deleteStudent(studentId) {
    showLoading(true);
    try {
        await firestore.collection('lectures').doc(studentId).delete();
        showToast('تم حذف الطالب بنجاح!', 'var(--secondary-color)');
        loadStudents();
    } catch (error) {
        showToast('خطأ في حذف الطالب: ' + error.message, 'var(--error)');
        console.error('Error deleting student:', error);
    } finally {
        showLoading(false);
    }
}

// Render Exams Table
function renderExamsTable(studentId, studentObj) {
  let html = `
    <table class="table">
      <thead>
        <tr>
          <th>المستوى</th>
          <th>حالة الامتحان</th>
          <th>إجراء</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (let i = 1; i <= 7; i++) {
    let examField = 'exam' + i;
    let passed = Boolean(studentObj[examField]);
    html += `
      <tr>
        <td>المستوى ${i}</td>
        <td style="color:${passed ? 'var(--secondary-color)' : 'var(--danger-color)'};font-weight:bold;">
          ${passed ? "مجتاز" : "غير مجتاز"}
        </td>
        <td>
          <button class="btn ${passed ? 'btn-danger' : 'btn-success'}" style="padding:4px 10px;font-size:0.95rem;"
            onclick="toggleExamStatus('${studentId}', 'exam${i}', ${passed})">
            ${passed ? "إلغاء اجتياز" : "تحديد كمجتاز"}
          </button>
        </td>
      </tr>
    `;
  }
  html += `</tbody></table>`;
  document.getElementById('examsTableWrapper').innerHTML = html;
}

// Toggle Exam Status
window.toggleExamStatus = function(studentId, examField, currentValue) {
  let updateObj = {};
  updateObj[examField] = !currentValue;
  firestore.collection('lectures').doc(studentId).update(updateObj).then(function(){
    allStudentsData[studentId][examField] = !currentValue;
    showSelectedStudentDetails(studentId);
    document.getElementById('msg').style.color = 'var(--secondary-color)';
    document.getElementById('msg').innerText = 'تم تحديث حالة الامتحان!';
    // NEW: Send notification for level exam status change
    const levelNum = examField.replace('exam', '');
    const studentEmail = allStudentsData[studentId].email;
    const studentName = allStudentsData[studentId].name || 'الطالب';
    if (studentEmail) {
        sendStudentSpecificNotification(
            studentEmail,
            `تم تحديث حالة امتحان المستوى ${levelNum} إلى: ${!currentValue ? 'اجتاز' : 'لم يجتز'}.`,
            'exam_status_update',
            `level_exam_${levelNum}`, // relatedId
            `امتحان المستوى ${levelNum}` // relatedName
        );
    }
    setTimeout(()=>{document.getElementById('msg').innerText=''; document.getElementById('msg').style.color='var(--error)';}, 1200);
  }).catch(function(err){
    document.getElementById('msg').innerText = "حدث خطأ أثناء تحديث الامتحان: " + err.message;
  });
};

// Get Level Number From Text
function getLevelNumFromText(levelText) {
  if (!levelText) return 0;
  const map = {
    "الأول": 1, "اول": 1, "1": 1,
    "الثاني": 2, "ثاني": 2, "2": 2,
    "الثالث": 3, "ثالث": 3, "3": 3,
    "الرابع": 4, "رابع": 4, "4": 4,
    "الخامس": 5, "خامس": 5, "5": 5,
    "السادس": 6, "سادس": 6, "6": 6,
    "السابع": 7, "سابع": 7, "7": 7,
  };
  let txt = levelText.trim().replace('المستوى', '').replace(/\s/g, '', 'g'); // Added global flag to replace all occurrences
  return map[txt] || 0;
}

// Load Lessons
function loadLessons() {
  firestore.collection('lessons').orderBy('id').get().then(function(querySnapshot){
    let html = '';
    window.lessonsMap = {}; // Clear and initialize global lessonsMap
    querySnapshot.forEach(function(doc){
      let data = doc.data();
      window.lessonsMap[data.id] = data.title; // Store lesson title by ID globally
      let levelNum = getLevelNumFromText(data.level);
      let rowClass = levelNum ? `level-color-${levelNum}` : '';
      if (editLessonId === doc.id) {
        html += `
          <tr class="${rowClass}">
            <td><input type="number" id="editId" value="${data.id}" style="width:70px;" class="form-control" required></td>
            <td><input type="text" id="editTitle" value="${data.title}" style="width:180px;" class="form-control" required></td>
            <td><input type="text" id="editUrl" value="${data.url}" style="width:180px;" class="form-control" required></td>
            <td>
              <input type="text" id="editVoice" value="${data.voice ? data.voice : ''}" placeholder="رابط الصوت (اختياري)" style="width:180px;" class="form-control">
            </td>
            <td><input type="text" id="editLevel" value="${data.level}" style="width:90px;" class="form-control" required></td>
            <td>
              <button class="btn btn-success" onclick="saveLesson('${doc.id}')">حفظ</button>
              <button class="btn btn-danger ml-1" onclick="cancelEditLesson()">إلغاء</button>
            </td>
            <td></td> </tr>
        `;
      } else {
        html += `<tr class="${rowClass}">
            <td>${data.id || ''}</td>
            <td>${data.title || ''}</td>
            <td>
              <a href="${data.url || ''}" target="_blank" class="btn-text">تحميل</a>
            </td>
            <td>
              ${data.voice ? `<audio controls style="width:120px;">
                <source src="${data.voice}" type="audio/mpeg">
                </audio>` : ''}
            </td>
            <td>${data.level || ''}</td>
            <td>
              <button class="btn" onclick="editLesson('${doc.id}')">تعديل</button>
            </td>
            <td>
                <button class="btn btn-danger" onclick="confirmDeleteLesson('${doc.id}', '${data.title}')">حذف</button>
            </td>
          </tr>`;
      }
    });
    document.getElementById('lessonsList').innerHTML = html || '<tr><td colspan="7" class="text-center">لا يوجد دروس بعد.</td></tr>';
  }).catch(function(error) {
    console.error("خطأ في جلب بيانات الدروس:", error);
    document.getElementById('editLessonMsg').innerText = "خطأ في تحميل بيانات الدروس.";
  });
}

// Confirm Delete Lesson
window.confirmDeleteLesson = function(docId, lessonTitle) {
    if (confirm(`هل أنت متأكد من حذف الدرس "${lessonTitle}"؟ هذا الإجراء لا يمكن التراجع عنه. (ملاحظة: التلاخيص والعلامات المرتبطة بهذا الدرس لن تُحذف تلقائياً).`)) {
        deleteLesson(docId);
    }
};

// Delete Lesson
async function deleteLesson(docId) {
    showLoading(true);
    try {
        await firestore.collection('lessons').doc(docId).delete();
        showToast('تم حذف الدرس بنجاح!', 'var(--secondary-color)');
        loadLessons();
    } catch (error) {
        showToast('خطأ في حذف الدرس: ' + error.message, 'var(--error)');
        console.error('Error deleting lesson:', error);
    } finally {
        showLoading(false);
    }
}

// Edit Lesson
window.editLesson = function(docId){
  editLessonId = docId;
  document.getElementById('editLessonMsg').innerText = '';
  loadLessons();
}

// Cancel Edit Lesson
window.cancelEditLesson = function(){
  editLessonId = null;
  document.getElementById('editLessonMsg').innerText = '';
  loadLessons();
}

// Save Lesson
window.saveLesson = function(docId){
  var id = Number(document.getElementById('editId').value.trim());
  var title = document.getElementById('editTitle').value.trim();
  var url = document.getElementById('editUrl').value.trim();
  var voice = document.getElementById('editVoice').value.trim();
  var level = document.getElementById('editLevel').value.trim();
  var msg = document.getElementById('editLessonMsg');
  msg.innerText = '';
  if (!id || !title || !url || !level) {
    msg.innerText = "يرجى تعبئة جميع الحقول بشكل صحيح.";
    return;
  }
  let lessonObj = {
    id: id,
    title: title,
    url: url,
    level: level
  };
  if (voice) lessonObj.voice = voice;
  else lessonObj.voice = firebase.firestore.FieldValue.delete();
  firestore.collection('lessons').doc(docId).update(lessonObj).then(function(){
    msg.style.color = "var(--secondary-color)";
    msg.innerText = "تم تحديث الدرس بنجاح!";
    editLessonId = null;
    loadLessons();
    setTimeout(()=>{msg.innerText='';}, 1500);
  }).catch(function(err){
    msg.innerText = "حدث خطأ أثناء التحديث: " + err.message;
  });
}

// Update Student Level
window.updateLevel = function(checkbox) {
  const docId = checkbox.getAttribute('data-id');
  const level = checkbox.getAttribute('data-level');
  const value = checkbox.checked;
  const levelNum = parseInt(level.replace('level',''));
  if (levelNum > 1) {
    const previousExam = allStudentsData[docId]['exam'+(levelNum-1)];
    if (!previousExam) {
      checkbox.checked = false;
      document.getElementById('msg').style.color = "var(--danger-color)";
      document.getElementById('msg').innerText = "لا يمكن تفعيل هذا المستوى قبل اجتياز امتحان المستوى السابق.";
      setTimeout(()=>{document.getElementById('msg').innerText='';}, 1500);
      return;
    }
  }
  firestore.collection('lectures').doc(docId).update({[level]: value}).then(function(){
    document.getElementById('msg').style.color = 'var(--secondary-color)';
    document.getElementById('msg').innerText = 'تم تحديث المستوى بنجاح!';
    if (allStudentsData[docId]) {
        allStudentsData[docId][level] = value;
        showSelectedStudentDetails(docId);
        // Send notification for level activation
        if (value === true) { // Only notify when level is turned ON
            const studentName = allStudentsData[docId].name || 'الطالب';
            const studentEmail = allStudentsData[docId].email;
            if (studentEmail) {
                sendStudentSpecificNotification(
                    studentEmail,
                    `تهانينا، تم فتح المستوى ${levelNum} لك! يمكنك الآن الوصول إلى دروسه واختباره.`,
                    'level_open',
                    levelNum, // relatedId
                    `المستوى ${levelNum}` // relatedName
                );
            }
        }
    }
    setTimeout(()=>{document.getElementById('msg').innerText=''; document.getElementById('msg').style.color='var(--error)';}, 1500);
  }).catch(function(err){
    document.getElementById('msg').innerText = "خطأ أثناء التحديث: " + err.message;
  });
};

// Load Student Summaries (with Realtime Listener)
function loadStudentSummaries(email) {
  showLoading(true);
  currentStudentEmailForSummaries = email;

  // Unsubscribe from previous listener if exists
  if (teacherSummariesListenerUnsubscribe) {
      teacherSummariesListenerUnsubscribe();
      teacherSummariesListenerUnsubscribe = null;
  }

  // Get lessons first (they don't change often)
  firestore.collection('lessons').orderBy('id').get().then(function(lessonsSnap) {
    lessonsSnap.forEach(doc=>window.lessonsMap[doc.data().id]=doc.data().title); // Populate global lessonsMap

    // Now set up a real-time listener for summaries of the CURRENTLY SELECTED student
    teacherSummariesListenerUnsubscribe = firestore.collection('summaries')
      .where('student_email', '==', currentStudentEmailForSummaries)
      .onSnapshot(function(snapshot) {
        let changes = snapshot.docChanges(); // Get changes since last snapshot
        let shouldShowToast = false;
        
        // Re-fetch all summaries for the selected student to ensure complete data
        window.allSummaries = [];
        window.studentSummariesMap = {};
        snapshot.forEach(doc => {
          let s = { ...doc.data(), docId: doc.id };
          window.allSummaries.push(s);
          window.studentSummariesMap[s.docId] = s;

          // Check for specific changes for toast notification
          if (changes.some(change => change.type === "modified" && change.doc.id === doc.id)) {
              let oldDoc = changes.find(change => change.doc.id === doc.id)?.oldDoc?.data();
              if (oldDoc) {
                  // If student_reply_comment was added/changed OR status changed to submitted
                  if (s.student_reply_comment !== oldDoc.student_reply_comment || (s.status === 'submitted' && oldDoc.status === 'draft')) {
                      shouldShowToast = true;
                  }
              }
          }
        });

        // Fetch marks for all summaries (or just the changed ones)
        let markPromises = window.allSummaries.map(s =>
            firestore.collection('student_marks')
            .where('summary_id', '==', s.docId)
            .where('student_email', '==', currentStudentEmailForSummaries)
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
            // Rebuild window.allSummaries and window.studentSummariesMap from the updated array
            window.allSummaries = updatedSummariesArray;
            window.studentSummariesMap = {};
            updatedSummariesArray.forEach(s => {
                window.studentSummariesMap[s.docId] = s;
            });

            filterSummariesTable(); // Re-render with fresh data and filter

            // Check if the currently open summary box corresponds to an updated summary
            if (currentlyOpenSummaryDocId && window.studentSummariesMap[currentlyOpenSummaryDocId]) {
                showSummaryDetails(currentlyOpenSummaryDocId); // Re-open and update content
            }

            if (shouldShowToast) {
                showToast(`لديك رد جديد أو تحديث على تلخيص من ${allStudentsData[document.getElementById('studentSelect').value]?.name || 'الطالب'}!`, "var(--primary-color)");
            }
            showLoading(false);
        }).catch(err => {
            showToast("خطأ في تحديث العلامات في الوقت الحقيقي: " + err.message, "var(--error)");
            console.error("Promise.all error in listener:", err);
            showLoading(false);
        });

      }, function(error) {
        showToast("خطأ في الاستماع لتحديثات التلاخيص: " + error.message, "var(--error)");
        console.error("Listener error:", error);
        showLoading(false);
      });
  }).catch(err => {
    showToast("خطأ في تحميل الدروس للتلاخيص: " + err.message, "var(--error)");
    showLoading(false);
    console.error("Error fetching lessons for summaries:", err);
  });
}

// Filter Summaries Table
function filterSummariesTable() {
    const filterStatus = document.getElementById('summaryFilterStatus').value;
    let filteredSummaries = window.allSummaries.filter(s => {
        if (filterStatus === 'all') return true;
        return s.status === filterStatus;
    });

    // Sort summaries by lesson_id
    filteredSummaries.sort((a, b) => a.lesson_id - b.lesson_id);

    if (!filteredSummaries.length) {
        document.getElementById('summariesTableWrapper').innerHTML = "<p class='text-center'><b>لا توجد تلاخيص مطابقة للفلتر.</b></p>";
        hideSummaryDetails();
        return;
    }

    let html = `
    <table class="table">
      <thead><tr>
        <th>الدرس</th>
        <th>الحالة</th>
        <th>العلامة</th>
        <th>تعديل العلامة</th>
        <th>عرض التلخيص</th>
        <th>إعادة التلخيص</th>
      </tr></thead><tbody>`;

    filteredSummaries.forEach(s => {
        const isSubmitted = s.status === 'submitted';
        html += `<tr>
            <td>${window.lessonsMap[s.lesson_id] || s.lesson_id}</td>
            <td><span class="summary-status ${s.status}">${s.status==='submitted' ? 'تم التسليم' : 'مسودة'}</span></td>
            <td>${s.mark_from_student_marks !== null ? s.mark_from_student_marks : "—"}</td>
            <td>
              <input class="table-mark-input" id="markinp_${s.docId}" type="number" value="${s.mark_from_student_marks !== null ? s.mark_from_student_marks : ''}" min="0" max="100">
              <button class="table-mark-button" onclick="saveSummaryMark('${s.docId}')">حفظ</button>
            </td>
            <td>
                <button class="btn btn-outlined" onclick="showSummaryDetails('${s.docId}')">عرض</button>
            </td>
            <td>
                ${isSubmitted ? `
                    <button class="btn reset-summary" onclick="resetSummary('${s.docId}', '${s.student_email}')" title="إعادة التلخيص إلى مسودة">
                        <i class="material-icons">refresh</i>
                    </button>
                ` : '—'}
            </td>
        </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById('summariesTableWrapper').innerHTML = html;
}

// Function to show and populate the inline summary details box
function showSummaryDetails(docId) {
    const summary = window.studentSummariesMap[docId];
    if (!summary) {
        showToast("تعذر العثور على التلخيص.", "var(--error)");
        return;
    }

    const lessonTitle = window.lessonsMap[summary.lesson_id] || summary.lesson_id;
    const summaryDetailsBox = document.getElementById('summaryDetailsBox');

    document.getElementById('summaryDetailsTitle').innerText = `تفاصيل تلخيص الدرس: ${lessonTitle}`;
    document.getElementById('summaryDetailsContent').innerText = summary.summary_text;
    document.getElementById('summaryDetailsComment').value = summary.teacher_comment || '';
    document.getElementById('summaryDetailsMark').value = summary.mark_from_student_marks !== null ? summary.mark_from_student_marks : '';

    // Populate student reply section
    const studentReplySection = document.getElementById('studentReplySection');
    const summaryDetailsStudentReply = document.getElementById('summaryDetailsStudentReply');
    const clearStudentReplyBtn = document.getElementById('clearStudentReplyBtn');

    if (summary.student_reply_comment) {
        summaryDetailsStudentReply.innerText = summary.student_reply_comment;
        studentReplySection.style.display = 'block';
        clearStudentReplyBtn.dataset.docId = docId; // Set docId for clearing
        clearStudentReplyBtn.onclick = () => clearStudentReply(docId); // Attach event listener
    } else {
        studentReplySection.style.display = 'none';
        summaryDetailsStudentReply.innerText = '';
    }

    // Set dataset for save buttons
    document.getElementById('saveSummaryDetailsCommentBtn').dataset.docId = docId;
    document.getElementById('saveSummaryDetailsMarkBtn').dataset.docId = docId;

    // Remove existing listeners to prevent duplicates and add new ones
    const saveCommentBtn = document.getElementById('saveSummaryDetailsCommentBtn');
    const saveMarkBtn = document.getElementById('saveSummaryDetailsMarkBtn');

    saveCommentBtn.onclick = null;
    saveMarkBtn.onclick = null;

    saveCommentBtn.onclick = () => saveSummaryComment(saveCommentBtn.dataset.docId);
    saveMarkBtn.onclick = () => saveSummaryMark(saveMarkBtn.dataset.docId);

    summaryDetailsBox.style.display = 'block';
    summaryDetailsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

    currentlyOpenSummaryDocId = docId; // Set currently open summary ID
}

// Function to hide the inline summary details box
function hideSummaryDetails() {
    document.getElementById('summaryDetailsBox').style.display = 'none';
    currentlyOpenSummaryDocId = null; // Clear currently open summary ID
}

// Function to clear student's reply
function clearStudentReply(docId) {
    if (!confirm('هل أنت متأكد من مسح رد الطالب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        return;
    }

    showLoading(true);
    firestore.collection('summaries').doc(docId).update({
        student_reply_comment: firebase.firestore.FieldValue.delete()
    }).then(() => {
        showToast('تم مسح رد الطالب بنجاح!', 'var(--secondary-color)');
        // Listener will handle refresh, no need to call loadStudentSummaries here
    }).catch(error => {
        showToast(`حدث خطأ أثناء مسح رد الطالب: ${error.message}`, 'var(--error)');
        console.error('Error clearing student reply:', error);
        showLoading(false);
    });
}

// Save Summary Mark
function saveSummaryMark(docId) {
    let val = document.getElementById('summaryDetailsMark').value; // Use the value from the detail box input
    // If coming from table row, use table-specific input (fallback/alternative)
    if (!val && document.getElementById('markinp_' + docId)) {
        val = document.getElementById('markinp_' + docId).value;
    }

    if (val === "" || isNaN(val)) {
        showToast("يرجى إدخال علامة صالحة (رقم).", "var(--error)");
        return;
    }
    val = Number(val); // Ensure it's a number

    firestore.collection('summaries').doc(docId).get().then(summaryDoc => {
        if (!summaryDoc.exists) {
            showToast("خطأ: التلخيص غير موجود.", "var(--error)");
            return;
        }

        const summaryData = summaryDoc.data();
        if (summaryData.status === "draft") {
            showToast("لا يمكن وضع علامة لتلخيص في حالة المسودة. يجب تسليمه أولاً.", "var(--error)");
            return;
        }

        const studentName = document.getElementById('detailName').textContent || '';
        const studentEmail = document.getElementById('detailEmail').textContent || '';
        const courseNumber = document.getElementById('detailCourseNumber').textContent || '';
        const lessonTitle = window.lessonsMap[summaryData.lesson_id] || summaryData.lesson_id;
        const statusText = summaryData.status === 'submitted' ? 'تم التسليم' : 'مسودة';

        const user = firebase.auth().currentUser;
        if (!user) {
            showToast("لم يتم التعرف على المستخدم الحالي! يرجى إعادة تسجيل الدخول.", "var(--error)");
            return;
        }

        firestore.collection('student_marks')
            .where('student_email', '==', studentEmail)
            .where('summary_id', '==', docId)
            .limit(1)
            .get().then(querySnapshot => {
                const dataToSave = {
                    summary_id: docId,
                    student_name: studentName,
                    student_email: studentEmail,
                    course_number: courseNumber,
                    lesson_title: lessonTitle,
                    status: statusText,
                    mark: val
                };
                if (!querySnapshot.empty) {
                    const docRef = querySnapshot.docs[0].ref;
                    docRef.update(dataToSave).then(() => {
                        showToast('تم تحديث العلامة بنجاح!', 'var(--secondary-color)');
                        sendStudentSpecificNotification(
                            studentEmail,
                            `تم وضع علامة جديدة لدرسك "${lessonTitle}": ${val} نقطة.`,
                            'mark_update',
                            summaryData.lesson_id,
                            lessonTitle
                        );
                    }).catch((err) => {
                        showToast('خطأ أثناء تحديث العلامة:\n' + err.message, 'var(--error)');
                        console.error(err);
                    });
                } else {
                    firestore.collection('student_marks').add(dataToSave).then(() => {
                        showToast('تم إضافة العلامة!', 'var(--secondary-color)');
                        sendStudentSpecificNotification(
                            studentEmail,
                            `تم وضع علامة جديدة لدرسك "${lessonTitle}": ${val} نقطة.`,
                            'mark_add',
                            summaryData.lesson_id,
                            lessonTitle
                        );
                    }).catch((err) => {
                        showToast('خطأ أثناء إضافة العلامة:\n' + err.message, 'var(--error)');
                        console.error(err);
                    });
                }
            }).catch((err) => {
                showToast('خطأ أثناء البحث عن العلامة:\n' + err.message, 'var(--error)');
                console.error(err);
            });
    }).catch(err => {
        showToast("خطأ في جلب بيانات التلخيص:\n" + err.message, 'var(--error)');
        console.error(err);
    });
}

// Save Summary Comment
function saveSummaryComment(docId) {
    const comment = document.getElementById('summaryDetailsComment').value.trim();
    const summary = window.studentSummariesMap[docId];
    const lessonTitle = window.lessonsMap[summary.lesson_id] || summary.lesson_id;
    const studentEmail = summary.student_email;

    firestore.collection('summaries').doc(docId).update({
        teacher_comment: comment
    }).then(() => {
        showToast('تم حفظ التعليق بنجاح!', 'var(--secondary-color)');
        if (studentEmail && comment) {
            sendStudentSpecificNotification(
                studentEmail,
                `لديك تعليق جديد من المعلم على تلخيص درسك "${lessonTitle}".`,
                'comment_add',
                summary.lesson_id,
                lessonTitle
            );
        }
    }).catch(err => {
        showToast('خطأ في حفظ التعليق: ' + err.message, 'var(--error)');
        console.error('Error saving summary comment:', err);
    });
}

// Reset Summary Status
window.resetSummary = function(summaryDocId, studentEmail) {
    if (!confirm('هل أنت متأكد من رغبتك في إعادة تعيين حالة هذا التلخيص إلى مسودة؟ سيتم حذف العلامة والتعليق ورد الطالب المرتبطين به.')) {
        return;
    }

    showLoading(true);
    // Update summary status to 'draft'
    firestore.collection('summaries').doc(summaryDocId).update({
        status: 'draft',
        teacher_comment: firebase.firestore.FieldValue.delete(),
        student_reply_comment: firebase.firestore.FieldValue.delete()
    }).then(() => {
        // Find and delete the corresponding mark in student_marks collection
        return firestore.collection('student_marks')
            .where('summary_id', '==', summaryDocId)
            .where('student_email', '==', studentEmail)
            .get();
    }).then(markSnapshot => {
        if (!markSnapshot.empty) {
            const deletePromises = [];
            markSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            return Promise.all(deletePromises);
        }
        return Promise.resolve();
    }).then(() => {
        showToast('تم إعادة تعيين التلخيص بنجاح إلى مسودة!', 'var(--secondary-color)');
        hideSummaryDetails();
        showLoading(false);
    }).catch(error => {
        showToast(`حدث خطأ أثناء إعادة تعيين التلخيص: ${error.message}`, 'var(--error)');
        console.error('Error resetting summary:', error);
        showLoading(false);
    });
};

// Helper function to send specific notifications to students
async function sendStudentSpecificNotification(recipientEmail, messageContent, type, relatedId = null, relatedName = null) {
    if (!recipientEmail || !messageContent) {
        console.warn("Cannot send notification: Missing recipient email or message content.");
        return;
    }
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.error("Cannot send notification: Teacher not logged in.");
            return;
        }

        await firestore.collection('notifications').add({
            message: messageContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            recipient_email: recipientEmail,
            is_read: false,
            sender_email: currentUser.email,
            sender_name: currentUser.displayName || 'المعلم',
            notification_type: type,
            related_id: relatedId,
            related_name: relatedName
        });
        console.log(`Notification sent to ${recipientEmail} for type ${type}: "${messageContent}"`);
    } catch (error) {
        console.error("Error sending student specific notification:", error);
    }
}

// Send General Notification
async function sendNotification(e) {
    e.preventDefault();
    const message = document.getElementById('notificationMessage').value.trim();
    const recipientValueFromDropdown = document.getElementById('notificationRecipient').value;
    const msgDiv = document.getElementById('addNotificationMsg');
    msgDiv.innerText = '';

    if (!message) {
        msgDiv.innerText = "الرجاء كتابة رسالة الإشعار.";
        return;
    }

    showLoading(true);

    let recipientEmailToSend = '';
    if (recipientValueFromDropdown === 'allStudents') {
        recipientEmailToSend = "all";
    } else if (recipientValueFromDropdown.includes('@')) {
        recipientEmailToSend = recipientValueFromDropdown;
    } else {
        msgDiv.innerText = "خطأ: لم يتم تحديد مستلم صحيح للإشعار.";
        showLoading(false);
        return;
    }

    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            msgDiv.innerText = "خطأ: المعلم غير مسجل الدخول.";
            showLoading(false);
            return;
        }

        await firestore.collection('notifications').add({
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            recipient_email: recipientEmailToSend,
            is_read: false,
            sender_email: currentUser.email,
            sender_name: currentUser.displayName || 'المعلم',
            notification_type: 'manual_send',
            related_id: null,
            related_name: null
        });

        msgDiv.style.color = "var(--secondary-color)";
        msgDiv.innerText = "تم إرسال الإشعار بنجاح!";
        document.getElementById('notificationMessage').value = '';
        showToast("تم إرسال الإشعار بنجاح!", "var(--secondary-color)");
        setTimeout(() => { msgDiv.innerText = ''; }, 2000);

    } catch (error) {
        msgDiv.innerText = "حدث خطأ أثناء إرسال الإشعار: " + error.message;
        showToast("خطأ أثناء إرسال الإشعار!", "var(--error)");
    } finally {
        showLoading(false);
    }
}

// Logout
function logout() {
  if (teacherSummariesListenerUnsubscribe) {
    teacherSummariesListenerUnsubscribe();
    teacherSummariesListenerUnsubscribe = null;
  }
  if (teacherNotificationsListenerUnsubscribe) {
      teacherNotificationsListenerUnsubscribe();
      teacherNotificationsListenerUnsubscribe = null;
  }
  if (studentMarksListenerUnsubscribe) {
      studentMarksListenerUnsubscribe();
      studentMarksListenerUnsubscribe = null;
  }
  auth.signOut().then(()=>{window.location.href='login.html';}).catch(function(error) {
    console.error("خطأ في تسجيل الخروج:", error);
  });
}

// أكواد JavaScript لإضافة ميزة الرأس المتحرك (Collapsing Header)
document.addEventListener('DOMContentLoaded', () => {
    const appBar = document.querySelector('.app-bar');
    if (appBar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) { // عندما يتجاوز التمرير 50 بكسل
                appBar.classList.add('scrolled');
            } else {
                appBar.classList.remove('scrolled');
            }
        });
    }
});
