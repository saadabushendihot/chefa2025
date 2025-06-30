// js/dashboard.js

// Firebase references
// Ensure firebase-init.js is loaded BEFORE this script and initializes `firebase`
const auth = firebase.auth();
const db = firebase.firestore();

// --- Main execution wrapped in DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => { 

    // DOM Elements
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.list-group-item');
    const teacherNameSpan = document.getElementById('teacherName');

    // Dashboard elements
    const totalStudentsCount = document.getElementById('totalStudentsCount');
    const acceptedStudentsCount = document.getElementById('acceptedStudentsCount');
    const pendingStudentsCount = document.getElementById('pendingStudentsCount');

    // Students Section elements
    const studentsTbody = document.getElementById('studentsTbody');
    const studentSearchInput = document.getElementById('studentSearchInput');
    const studentDetailsModal = new bootstrap.Modal(document.getElementById('studentDetailsModal'));
    let allStudentsData = []; // To store all students for filtering

    // Lessons Section elements
    const lessonsTbody = document.getElementById('lessonsTbody');
    const addLessonModal = new bootstrap.Modal(document.getElementById('addLessonModal'));
    const lessonForm = document.getElementById('lessonForm');
    const lessonIdInput = document.getElementById('lessonId');
    const lessonLevelInput = document.getElementById('lessonLevel');
    const lessonNumberInput = document.getElementById('lessonNumber');
    const lessonTitleInput = document.getElementById('lessonTitle');
    const lessonDescriptionInput = document.getElementById('lessonDescription');
    const lessonVideoUrlInput = document.getElementById('lessonVideoUrl');
    let allLessonsData = []; // To store all lessons for filtering

    // Summaries Section elements
    const summariesTbody = document.getElementById('summariesTbody');
    const summarySearchInput = document.getElementById('summarySearchInput');
    const newSummariesBadge = document.getElementById('newSummariesBadge');
    const summaryDetailsModal = new bootstrap.Modal(document.getElementById('summaryDetailsModal'));
    const modalSummaryStudentName = document.getElementById('modalSummaryStudentName');
    const modalSummaryStudentEmail = document.getElementById('modalSummaryStudentEmail');
    const modalSummaryLessonLevel = document.getElementById('modalSummaryLessonLevel');
    const modalSummaryLessonNumber = document.getElementById('modalSummaryLessonNumber');
    const modalSummaryLessonTitle = document.getElementById('modalSummaryLessonTitle');
    const modalSummarySubmittedAt = document.getElementById('modalSummarySubmittedAt');
    const modalSummaryStatus = document.getElementById('modalSummaryStatus');
    const modalSummaryText = document.getElementById('modalSummaryText');
    const modalSummaryTeacherNotes = document.getElementById('modalSummaryTeacherNotes');
    const modalSummaryMark = document.getElementById('modalSummaryMark');
    const saveSummaryReviewBtn = document.getElementById('saveSummaryReviewBtn');
    let allSummariesData = []; // To store all summaries for filtering
    let currentSummaryDocId = null; // To store the ID of the summary being reviewed

    // Exams Section elements
    const examResultsTbody = document.getElementById('examResultsTbody');
    const examResultSearchInput = document.getElementById('examResultSearchInput');
    const examResultDetailsBox = document.getElementById('examResultDetailsBox');
    const examResultDetailsStudentName = document.getElementById('examResultDetailsStudentName');
    const examResultDetailsLevel = document.getElementById('examResultDetailsLevel');
    const examResultDetailsScore = document.getElementById('examResultDetailsScore');
    const examResultDetailsTotalMarks = document.getElementById('examResultDetailsTotalMarks');
    const examResultDetailsSubmittedAt = document.getElementById('examResultDetailsSubmittedAt');
    const examResultDetailsApprovalStatus = document.getElementById('examResultDetailsApprovalStatus');
    const examResultDetailsDuration = document.getElementById('examResultDetailsDuration');
    const examResultAnswersContainer = document.getElementById('examResultAnswersContainer');
    const approveExamBtn = document.getElementById('approveExamBtn');
    const unapproveExamBtn = document.getElementById('unapproveExamBtn');
    const resetExamBtn = document.getElementById('resetExamBtn');
    let allExamResultsData = []; // To store all exam results for filtering
    let currentlyOpenExamResultDocId = null; // To store the ID of the exam result being viewed

    // Questions Admin elements
    const questionsTbody = document.getElementById('questionsTbody');
    const addQuestionModal = new bootstrap.Modal(document.getElementById('addQuestionModal'));
    const questionForm = document.getElementById('questionForm');
    const questionIdInput = document.getElementById('questionId');
    const questionLevelInput = document.getElementById('questionLevel');
    const questionTextInput = document.getElementById('questionText');
    const questionTypeInput = document.getElementById('questionType');
    const optionsContainer = document.getElementById('optionsContainer');
    const trueFalseAnswerContainer = document.getElementById('trueFalseAnswerContainer');
    const addOptionBtn = document.getElementById('addOptionBtn');
    let allQuestionsData = []; // To store all questions for filtering


    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            db.collection('teachers').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    teacherNameSpan.textContent = doc.data().name || 'المعلم';
                    loadDashboardData();
                    setupRealtimeListeners();
                    showSection('dashboardSection'); // Default section
                } else {
                    console.error("Teacher data not found for UID:", user.uid);
                    alert("بيانات المعلم غير موجودة. يرجى الاتصال بالدعم.");
                    auth.signOut();
                }
            }).catch(error => {
                console.error("Error getting teacher data:", error);
                alert("حدث خطأ أثناء جلب بيانات المعلم.");
                auth.signOut();
            });
        } else {
            // User is signed out. Redirect to login.
            window.location.href = 'index.html';
        }
    });

    // --- Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const sectionId = this.id.replace('Link', 'Section');
            showSection(sectionId);
        });
    });

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(sectionId).classList.remove('d-none');

        // Load data specific to the section
        if (sectionId === 'studentsSection') {
            loadStudents();
        } else if (sectionId === 'lessonsSection') {
            loadLessons();
        } else if (sectionId === 'summariesSection') {
            loadSummaries();
        } else if (sectionId === 'examsSection') {
            loadExamResultsDashboard();
        } else if (sectionId === 'questionsSection') {
            loadQuestions();
        }
    }

    // --- Realtime Listeners ---
    function setupRealtimeListeners() {
        // Listen for new summaries for badge
        db.collection('student_summaries')
            .where('status', '==', 'submitted')
            .where('mark', '==', null) // Assuming null mark means not reviewed
            .onSnapshot(snapshot => {
                const newSummariesCount = snapshot.size;
                if (newSummariesCount > 0) {
                    newSummariesBadge.classList.remove('d-none');
                    newSummariesBadge.textContent = newSummariesCount;
                } else {
                    newSummariesBadge.classList.add('d-none');
                }
            }, error => {
                console.error("Error listening to new summaries:", error);
            });

        // Listen for changes in students collection for dashboard counts
        db.collection('lectures').onSnapshot(snapshot => {
            let total = 0;
            let accepted = 0;
            let pending = 0;
            snapshot.forEach(doc => {
                total++;
                const student = doc.data();
                if (student.accepted === true || student.accepted === "مقبول" || student.accepted === "accepted") {
                    accepted++;
                } else {
                    pending++;
                }
            });
            totalStudentsCount.textContent = total;
            acceptedStudentsCount.textContent = accepted;
            pendingStudentsCount.textContent = pending;
        }, error => {
            console.error("Error listening to students for dashboard counts:", error);
        });
    }

    // --- Dashboard Data ---
    function loadDashboardData() {
        // Dashboard counts are handled by realtime listener
    }

    // --- Students Management ---
    function loadStudents() {
        db.collection('lectures').get().then(snapshot => {
            allStudentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterStudents(); // Initial render
        }).catch(error => {
            console.error("Error loading students:", error);
            showToast('خطأ في تحميل بيانات الطلاب.', 'danger');
        });
    }

    studentSearchInput.addEventListener('input', filterStudents);

    function filterStudents() {
        const searchTerm = studentSearchInput.value.toLowerCase();
        const filteredStudents = allStudentsData.filter(student => {
            const name = student.name ? student.name.toLowerCase() : '';
            const email = student.email ? student.email.toLowerCase() : '';
            return name.includes(searchTerm) || email.includes(searchTerm);
        });
        renderStudentsTable(filteredStudents);
    }

    function renderStudentsTable(students) {
        studentsTbody.innerHTML = '';
        if (students.length === 0) {
            studentsTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">لا توجد نتائج مطابقة للفلتر.</td></tr>`;
            return;
        }
        students.forEach(student => {
            const tr = document.createElement('tr');
            const acceptedStatus = (student.accepted === true || student.accepted === "مقبول" || student.accepted === "accepted") ? 'مقبول ✅' : 'معلق 🟡';
            const activeLevel = student.lastActiveLevelIndex ? `المستوى ${student.lastActiveLevelIndex}` : 'لا يوجد';

            tr.innerHTML = `
                <td>${student.name || 'غير معروف'}</td>
                <td>${student.email || 'غير معروف'}</td>
                <td>${acceptedStatus}</td>
                <td>${activeLevel}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showStudentDetails('${student.id}')">
                        <i class="material-icons">visibility</i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="toggleStudentAcceptance('${student.id}', ${student.accepted})">
                        <i class="material-icons">${(student.accepted === true || student.accepted === "مقبول" || student.accepted === "accepted") ? 'block' : 'check_circle'}</i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteStudent('${student.id}', '${student.name || 'هذا الطالب'}')">
                        <i class="material-icons">delete</i>
                    </button>
                </td>
            `;
            studentsTbody.appendChild(tr);
        });
    }

    function showStudentDetails(studentId) {
        const student = allStudentsData.find(s => s.id === studentId);
        if (student) {
            document.getElementById('modalStudentName').textContent = student.name || 'غير معروف';
            document.getElementById('modalStudentEmail').textContent = student.email || 'غير معروف';
            document.getElementById('modalStudentAccepted').textContent = (student.accepted === true || student.accepted === "مقبول" || student.accepted === "accepted") ? 'مقبول' : 'معلق';
            document.getElementById('modalStudentActiveLevel').textContent = student.lastActiveLevelIndex ? `المستوى ${student.lastActiveLevelIndex}` : 'لا يوجد';

            const levelsList = document.getElementById('modalStudentLevelsList');
            levelsList.innerHTML = '';
            for (let i = 1; i <= 7; i++) {
                const li = document.createElement('li');
                const levelStatus = student[`level${i}`] ? 'مفعل ✅' : 'غير مفعل ❌';
                const examStatus = student[`exam${i}`] ? 'اجتاز الامتحان ✅' : 'لم يجتز الامتحان ❌';
                li.textContent = `المستوى ${i}: ${levelStatus}, حالة الامتحان: ${examStatus}`;
                levelsList.appendChild(li);
            }
            studentDetailsModal.show();
        }
    }

    function toggleStudentAcceptance(studentId, currentAcceptedStatus) {
        const newStatus = !(currentAcceptedStatus === true || currentAcceptedStatus === "مقبول" || currentAcceptedStatus === "accepted");
        const statusText = newStatus ? 'قبول' : 'تعليق';
        if (confirm(`هل أنت متأكد أنك تريد ${statusText} حالة الطالب؟`)) {
            db.collection('lectures').doc(studentId).update({
                accepted: newStatus
            }).then(() => {
                showToast(`تم ${statusText} حالة الطالب بنجاح.`, 'success');
                loadStudents(); // Reload to update UI
            }).catch(error => {
                console.error("Error updating student acceptance:", error);
                showToast('خطأ في تحديث حالة الطالب.', 'danger');
            });
        }
    }

    function confirmDeleteStudent(studentId, studentName) {
        if (confirm(`هل أنت متأكد أنك تريد حذف الطالب ${studentName}؟ سيتم حذف جميع بياناته.`)) {
            db.collection('lectures').doc(studentId).delete().then(() => {
                showToast(`تم حذف الطالب ${studentName} بنجاح.`, 'success');
                loadStudents(); // Reload to update UI
            }).catch(error => {
                console.error("Error deleting student:", error);
                showToast('خطأ في حذف الطالب.', 'danger');
            });
        }
    }

    // --- Lessons Management ---
    function loadLessons() {
        db.collection('lessons').orderBy('level').orderBy('lesson_number').get().then(snapshot => {
            allLessonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLessonsTable(allLessonsData);
        }).catch(error => {
            console.error("Error loading lessons:", error);
            showToast('خطأ في تحميل بيانات الدروس.', 'danger');
        });
    }

    function renderLessonsTable(lessons) {
        lessonsTbody.innerHTML = '';
        if (lessons.length === 0) {
            lessonsTbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">لا توجد دروس حاليًا.</td></tr>`;
            return;
        }
        lessons.forEach(lesson => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${lesson.level || '—'}</td>
                <td>${lesson.lesson_number || '—'}</td>
                <td>${lesson.title || '—'}</td>
                <td>${lesson.description ? lesson.description.substring(0, 50) + '...' : '—'}</td>
                <td><a href="${lesson.video_url}" target="_blank">${lesson.video_url ? 'مشاهدة' : '—'}</a></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editLesson('${lesson.id}')">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteLesson('${lesson.id}', '${lesson.title || 'هذا الدرس'}')">
                        <i class="material-icons">delete</i>
                    </button>
                </td>
            `;
            lessonsTbody.appendChild(tr);
        });
    }

    lessonForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const lessonId = lessonIdInput.value;
        const lessonData = {
            level: parseInt(lessonLevelInput.value),
            lesson_number: parseInt(lessonNumberInput.value),
            title: lessonTitleInput.value,
            description: lessonDescriptionInput.value,
            video_url: lessonVideoUrlInput.value
        };

        if (lessonId) {
            // Update existing lesson
            db.collection('lessons').doc(lessonId).update(lessonData)
                .then(() => {
                    showToast('تم تحديث الدرس بنجاح!', 'success');
                    addLessonModal.hide();
                    loadLessons();
                })
                .catch(error => {
                    console.error("Error updating lesson:", error);
                    showToast('خطأ في تحديث الدرس.', 'danger');
                });
        } else {
            // Add new lesson
            db.collection('lessons').add(lessonData)
                .then(() => {
                    showToast('تم إضافة الدرس بنجاح!', 'success');
                    addLessonModal.hide();
                    lessonForm.reset();
                    loadLessons();
                })
                .catch(error => {
                    console.error("Error adding lesson:", error);
                    showToast('خطأ في إضافة الدرس.', 'danger');
                });
        }
    });

    function editLesson(lessonId) {
        const lesson = allLessonsData.find(l => l.id === lessonId);
        if (lesson) {
            lessonIdInput.value = lesson.id;
            lessonLevelInput.value = lesson.level;
            lessonNumberInput.value = lesson.lesson_number;
            lessonTitleInput.value = lesson.title;
            lessonDescriptionInput.value = lesson.description;
            lessonVideoUrlInput.value = lesson.video_url;
            document.getElementById('addLessonModalLabel').textContent = 'تعديل درس';
            addLessonModal.show();
        }
    }

    function confirmDeleteLesson(lessonId, lessonTitle) {
        if (confirm(`هل أنت متأكد أنك تريد حذف الدرس "${lessonTitle}"؟`)) {
            db.collection('lessons').doc(lessonId).delete().then(() => {
                showToast(`تم حذف الدرس "${lessonTitle}" بنجاح.`, 'success');
                loadLessons();
            }).catch(error => {
                console.error("Error deleting lesson:", error);
                showToast('خطأ في حذف الدرس.', 'danger');
            });
        }
    }

    // --- Summaries Management ---
    function loadSummaries() {
        db.collection('student_summaries').get().then(snapshot => {
            allSummariesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterSummaries(); // Initial render
        }).catch(error => {
            console.error("Error loading summaries:", error);
            showToast('خطأ في تحميل بيانات التلاخيص.', 'danger');
        });
    }

    summarySearchInput.addEventListener('input', filterSummaries);

    function filterSummaries() {
        const searchTerm = summarySearchInput.value.toLowerCase();
        const filteredSummaries = allSummariesData.filter(summary => {
            const studentName = summary.student_name ? summary.student_name.toLowerCase() : '';
            const lessonTitle = summary.lesson_title ? summary.lesson_title.toLowerCase() : '';
            return studentName.includes(searchTerm) || lessonTitle.includes(searchTerm);
        });
        renderSummariesTable(filteredSummaries);
    }

    function renderSummariesTable(summaries) {
        summariesTbody.innerHTML = '';
        if (summaries.length === 0) {
            summariesTbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:var(--text-muted)">لا توجد تلاخيص مطابقة للفلتر.</td></tr>`;
            return;
        }
        summaries.forEach(summary => {
            const tr = document.createElement('tr');
            const statusText = summary.status === 'submitted' ? 'تم التسليم' : 'مسودة';
            const markText = summary.mark !== null ? summary.mark : 'لم يتم التصحيح';
            const submittedAt = summary.submitted_at ? new Date(summary.submitted_at.toDate()).toLocaleString('ar-EG') : '—';

            tr.innerHTML = `
                <td>${summary.student_name || 'غير معروف'}</td>
                <td>${summary.student_email || 'غير معروف'}</td>
                <td>${summary.lesson_level || '—'}</td>
                <td>${summary.lesson_number || '—'}</td>
                <td>${summary.lesson_title || '—'}</td>
                <td>${statusText}</td>
                <td>${markText}</td>
                <td>${submittedAt}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showSummaryDetails('${summary.id}')">
                        <i class="material-icons">visibility</i>
                    </button>
                </td>
            `;
            summariesTbody.appendChild(tr);
        });
    }

    function showSummaryDetails(summaryId) {
        const summary = allSummariesData.find(s => s.id === summaryId);
        if (summary) {
            currentSummaryDocId = summaryId; // Store for saving review

            modalSummaryStudentName.textContent = summary.student_name || 'غير معروف';
            modalSummaryStudentEmail.textContent = summary.student_email || 'غير معروف';
            modalSummaryLessonLevel.textContent = summary.lesson_level || '—';
            modalSummaryLessonNumber.textContent = summary.lesson_number || '—';
            modalSummaryLessonTitle.textContent = summary.lesson_title || '—';
            modalSummarySubmittedAt.textContent = summary.submitted_at ? new Date(summary.submitted_at.toDate()).toLocaleString('ar-EG') : '—';
            modalSummaryStatus.textContent = summary.status === 'submitted' ? 'تم التسليم' : 'مسودة';
            modalSummaryText.textContent = summary.summary_text || 'لا يوجد نص تلخيص.';
            modalSummaryTeacherNotes.value = summary.teacher_notes || '';
            modalSummaryMark.value = summary.mark !== null ? summary.mark : '';

            summaryDetailsModal.show();
        }
    }

    saveSummaryReviewBtn.addEventListener('click', function() {
        if (!currentSummaryDocId) return;

        const teacherNotes = modalSummaryTeacherNotes.value;
        const mark = modalSummaryMark.value ? parseInt(modalSummaryMark.value) : null;

        if (mark !== null && (mark < 0 || mark > 100)) {
            showToast('الرجاء إدخال علامة بين 0 و 100.', 'danger');
            return;
        }

        db.collection('student_summaries').doc(currentSummaryDocId).update({
            teacher_notes: teacherNotes,
            mark: mark
        }).then(() => {
            showToast('تم حفظ مراجعة التلخيص بنجاح!', 'success');
            summaryDetailsModal.hide();
            loadSummaries(); // Reload to update UI
        }).catch(error => {
            console.error("Error saving summary review:", error);
            showToast('خطأ في حفظ مراجعة التلخيص.', 'danger');
        });
    });


    // --- Exams Management ---
    function loadExamResultsDashboard() {
        db.collection('exam_results').get().then(snapshot => {
            allExamResultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterExamResults(); // Initial render
        }).catch(error => {
            console.error("Error loading exam results:", error);
            showToast('خطأ في تحميل نتائج الاختبارات.', 'danger');
        });
    }

    examResultSearchInput.addEventListener('input', filterExamResults);

    function filterExamResults() {
        const searchTerm = examResultSearchInput.value.toLowerCase();
        const filteredResults = allExamResultsData.filter(result => {
            const studentName = result.student_name ? result.student_name.toLowerCase() : '';
            const level = result.level ? result.level.toString() : '';
            return studentName.includes(searchTerm) || level.includes(searchTerm);
        });
        renderExamResultsTable(filteredResults);
    }

    // NEW: Function to create a single exam result table row
    function createExamResultRow(result) {
        const tr = document.createElement('tr');
        tr.dataset.id = result.id; // To easily reference the document in DOM

        const submittedAt = result.submitted_at ? new Date(result.submitted_at.toDate()).toLocaleString('ar-EG') : '—';
        let approvalStatusText = '';
        let approvalStatusClass = '';
        if (result.approved === true) {
            approvalStatusText = 'معتمدة ✅';
            approvalStatusClass = 'text-success';
        } else if (result.approved === false) {
            approvalStatusText = 'غير معتمدة ❌';
            approvalStatusClass = 'text-danger';
        } else {
            approvalStatusText = 'في انتظار المراجعة 🟡';
            approvalStatusClass = 'text-warning';
        }

        tr.innerHTML = `
            <td>${result.student_name || 'غير معروف'}</td>
            <td>المستوى ${result.level || '—'}</td>
            <td>${result.score !== undefined ? `${result.score} / ${result.total_marks_possible || '—'}` : '—'}</td>
            <td>${submittedAt}</td>
            <td class="${approvalStatusClass}">${approvalStatusText}</td>
            <td>
                <button class="btn btn-info" onclick="showExamResultDetails('${result.id}')">
                    <i class="material-icons">visibility</i>
                </button>
            </td>
            <td>
                <button class="btn btn-danger" onclick="confirmDeleteExamResult('${result.id}', '${result.student_name || 'هذا الطالب'}')">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
        return tr;
    }

    // MODIFIED: renderExamResultsTable to use createExamResultRow
    function renderExamResultsTable(results) {
        const tbody = document.getElementById('examResultsTbody');
        if (!tbody) {
            console.error("Exam results tbody not found!");
            return;
        }

        tbody.innerHTML = ''; // Clear old content

        if (!results || results.length === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = `<td colspan="7" class="text-center" style="color:var(--text-muted)">لا توجد نتائج مطابقة للفلتر.</td></tr>`;
            tbody.appendChild(noResultsRow);
            hideExamResultDetails(); // Hide details box if no results
            return;
        }

        results.forEach(result => {
            const row = createExamResultRow(result); // Use the new function
            tbody.appendChild(row);
        });

        // If the details box is open and the result it's showing is no longer in the filtered results, hide it
        if (currentlyOpenExamResultDocId && !results.some(r => r.id === currentlyOpenExamResultDocId)) {
            hideExamResultDetails();
        }
    }

    function showExamResultDetails(examResultId) {
        const result = allExamResultsData.find(r => r.id === examResultId);
        if (result) {
            currentlyOpenExamResultDocId = examResultId;

            examResultDetailsStudentName.textContent = result.student_name || 'غير معروف';
            examResultDetailsLevel.textContent = result.level || '—';
            examResultDetailsScore.textContent = result.score !== undefined ? result.score : '—';
            examResultDetailsTotalMarks.textContent = result.total_marks_possible || '—';
            examResultDetailsSubmittedAt.textContent = result.submitted_at ? new Date(result.submitted_at.toDate()).toLocaleString('ar-EG') : '—';
            examResultDetailsDuration.textContent = result.duration_minutes ? `${result.duration_minutes} دقيقة` : '—';

            let approvalStatusText = '';
            let approvalStatusClass = '';
            if (result.approved === true) {
                approvalStatusText = 'معتمدة ✅';
                approvalStatusClass = 'text-success';
                approveExamBtn.classList.add('d-none');
                unapproveExamBtn.classList.remove('d-none');
            } else if (result.approved === false) {
                approvalStatusText = 'غير معتمدة ❌';
                approvalStatusClass = 'text-danger';
                approveExamBtn.classList.remove('d-none');
                unapproveExamBtn.classList.add('d-none');
            } else {
                approvalStatusText = 'في انتظار المراجعة 🟡';
                approvalStatusClass = 'text-warning';
                approveExamBtn.classList.remove('d-none');
                unapproveExamBtn.classList.add('d-none');
            }
            examResultDetailsApprovalStatus.innerHTML = `<span class="${approvalStatusClass}">${approvalStatusText}</span>`;

            // Display student answers
            examResultAnswersContainer.innerHTML = '';
            if (result.answers && result.answers.length > 0) {
                result.answers.forEach((answer, index) => {
                    const qDiv = document.createElement('div');
                    qDiv.classList.add('mb-3', 'p-2', 'border', 'rounded');
                    const isCorrect = answer.is_correct ? 'صحيحة ✅' : 'خاطئة ❌';
                    const answerClass = answer.is_correct ? 'text-success' : 'text-danger';
                    qDiv.innerHTML = `
                        <p><strong>السؤال ${index + 1}:</strong> ${answer.question_text || '—'}</p>
                        <p><strong>إجابة الطالب:</strong> ${answer.student_answer || '—'}</p>
                        <p><strong>الإجابة الصحيحة:</strong> ${answer.correct_answer || '—'}</p>
                        <p class="${answerClass}"><strong>الحالة:</strong> ${isCorrect}</p>
                    `;
                    examResultAnswersContainer.appendChild(qDiv);
                });
            } else {
                examResultAnswersContainer.innerHTML = `<p class="text-muted">لا توجد تفاصيل إجابات لهذا الاختبار.</p>`;
            }

            examResultDetailsBox.classList.remove('d-none');
        }
    }

    function hideExamResultDetails() {
        examResultDetailsBox.classList.add('d-none');
        currentlyOpenExamResultDocId = null;
    }

    approveExamBtn.addEventListener('click', () => updateExamApproval(true));
    unapproveExamBtn.addEventListener('click', () => updateExamApproval(false));
    resetExamBtn.addEventListener('click', confirmResetExam);

    function updateExamApproval(approved) {
        if (!currentlyOpenExamResultDocId) return;

        const result = allExamResultsData.find(r => r.id === currentlyOpenExamResultDocId);
        if (!result) return;

        db.collection('exam_results').doc(currentlyOpenExamResultDocId).update({
            approved: approved
        }).then(() => {
            // Also update the student's exam status in lectures collection
            db.collection('lectures').doc(result.student_id).update({
                [`exam${result.level}`]: approved // Update examX field for the specific level
            }).then(() => {
                showToast(`تم ${approved ? 'اعتماد' : 'إلغاء اعتماد'} نتيجة الاختبار بنجاح!`, 'success');
                loadExamResultsDashboard(); // Reload to update UI
                hideExamResultDetails(); // Hide details box after action
            }).catch(error => {
                console.error("Error updating student's level exam status:", error);
                showToast('خطأ في تحديث حالة امتحان الطالب.', 'danger');
            });
        }).catch(error => {
            console.error("Error updating exam result approval:", error);
            showToast('خطأ في تحديث اعتماد نتيجة الاختبار.', 'danger');
        });
    }

    function confirmResetExam() {
        if (!currentlyOpenExamResultDocId) return;

        const result = allExamResultsData.find(r => r.id === currentlyOpenExamResultDocId);
        if (!result) return;

        if (confirm(`هل أنت متأكد أنك تريد إعادة تعيين اختبار المستوى ${result.level} للطالب ${result.student_name}؟ هذا سيحذف النتيجة الحالية ويسمح للطالب بإعادة الاختبار.`)) {
            // 1. Delete the exam result from exam_results collection
            db.collection('exam_results').doc(currentlyOpenExamResultDocId).delete()
                .then(() => {
                    // 2. Update the student's exam status in lectures collection to false
                    return db.collection('lectures').doc(result.student_id).update({
                        [`exam${result.level}`]: false // Set examX to false
                    });
                })
                .then(() => {
                    showToast('تم إعادة تعيين الاختبار بنجاح! يمكن للطالب الآن إعادة الاختبار لهذا المستوى.', 'success');
                    loadExamResultsDashboard(); // Reload to update UI
                    hideExamResultDetails(); // Hide details box after action
                })
                .catch(error => {
                    console.error("Error resetting exam:", error);
                    showToast('خطأ في إعادة تعيين الاختبار.', 'danger');
                });
        }
    }


    // --- Questions Admin ---
    function loadQuestions() {
        db.collection('exams_questions').orderBy('level').get().then(snapshot => {
            allQuestionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderQuestionsTable(allQuestionsData);
        }).catch(error => {
            console.error("Error loading questions:", error);
            showToast('خطأ في تحميل بيانات الأسئلة.', 'danger');
        });
    }

    function renderQuestionsTable(questions) {
        questionsTbody.innerHTML = '';
        if (questions.length === 0) {
            questionsTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-muted)">لا توجد أسئلة حاليًا.</td></tr>`;
            return;
        }
        questions.forEach(question => {
            const tr = document.createElement('tr');
            const questionTypeText = question.type === 'multiple-choice' ? 'اختيار من متعدد' : 'صح/خطأ';
            tr.innerHTML = `
                <td>${question.level || '—'}</td>
                <td>${question.question_text ? question.question_text.substring(0, 70) + '...' : '—'}</td>
                <td>${questionTypeText}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editQuestion('${question.id}')">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteQuestion('${question.id}', '${question.question_text ? question.question_text.substring(0, 30) + '...' : 'هذا السؤال'}')">
                        <i class="material-icons">delete</i>
                    </button>
                </td>
            `;
            questionsTbody.appendChild(tr);
        });
    }

    questionTypeInput.addEventListener('change', toggleQuestionOptions);
    addOptionBtn.addEventListener('click', addQuestionOption);

    function toggleQuestionOptions() {
        if (questionTypeInput.value === 'multiple-choice') {
            optionsContainer.classList.remove('d-none');
            trueFalseAnswerContainer.classList.add('d-none');
            // Ensure at least 2 options are present for multiple-choice
            if (optionsContainer.querySelectorAll('.question-option').length < 2) {
                addQuestionOption(); // Add a second option if only one exists
            }
        } else {
            optionsContainer.classList.add('d-none');
            trueFalseAnswerContainer.classList.remove('d-none');
        }
    }

    function addQuestionOption() {
        const optionCount = optionsContainer.querySelectorAll('.question-option').length;
        const newOptionDiv = document.createElement('div');
        newOptionDiv.classList.add('input-group', 'mb-2');
        newOptionDiv.innerHTML = `
            <input type="text" class="form-control question-option" placeholder="الخيار ${optionCount + 1}" required>
            <div class="input-group-text">
                <input type="radio" name="correctOption" class="form-check-input mt-0" value="${optionCount}">
            </div>
            <button type="button" class="btn btn-outline-danger remove-option-btn">
                <i class="material-icons">close</i>
            </button>
        `;
        optionsContainer.insertBefore(newOptionDiv, addOptionBtn);

        // Add event listener for the new remove button
        newOptionDiv.querySelector('.remove-option-btn').addEventListener('click', function() {
            newOptionDiv.remove();
            // Re-index radio button values after removal
            optionsContainer.querySelectorAll('.input-group.mb-2').forEach((group, idx) => {
                group.querySelector('input[type="radio"]').value = idx;
            });
        });
    }

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const questionId = questionIdInput.value;
        const questionType = questionTypeInput.value;
        const questionData = {
            level: parseInt(questionLevelInput.value),
            question_text: questionTextInput.value,
            type: questionType
        };

        if (questionType === 'multiple-choice') {
            const options = [];
            let correctOptionIndex = -1;
            optionsContainer.querySelectorAll('.question-option').forEach((input, index) => {
                options.push(input.value);
                if (input.parentNode.nextElementSibling && input.parentNode.nextElementSibling.querySelector('input[name="correctOption"]').checked) {
                    correctOptionIndex = index;
                }
            });
            if (correctOptionIndex === -1) {
                showToast('الرجاء تحديد الإجابة الصحيحة.', 'danger');
                return;
            }
            questionData.options = options;
            questionData.correct_answer_index = correctOptionIndex;
        } else { // true-false
            const trueFalseAnswer = document.querySelector('input[name="trueFalseAnswer"]:checked');
            if (!trueFalseAnswer) {
                showToast('الرجاء تحديد الإجابة الصحيحة (صح/خطأ).', 'danger');
                return;
            }
            questionData.correct_answer = trueFalseAnswer.value === 'true';
        }

        if (questionId) {
            // Update existing question
            db.collection('exams_questions').doc(questionId).update(questionData)
                .then(() => {
                    showToast('تم تحديث السؤال بنجاح!', 'success');
                    addQuestionModal.hide();
                    loadQuestions();
                })
                .catch(error => {
                    console.error("Error updating question:", error);
                    showToast('خطأ في تحديث السؤال.', 'danger');
                });
        } else {
            // Add new question
            db.collection('exams_questions').add(questionData)
                .then(() => {
                    showToast('تم إضافة السؤال بنجاح!', 'success');
                    addQuestionModal.hide();
                    questionForm.reset();
                    // Reset options/true-false containers for next add
                    resetQuestionFormUI();
                    loadQuestions();
                })
                .catch(error => {
                    console.error("Error adding question:", error);
                    showToast('خطأ في إضافة السؤال.', 'danger');
                });
        }
    });

    function editQuestion(questionId) {
        const question = allQuestionsData.find(q => q.id === questionId);
        if (question) {
            questionIdInput.value = question.id;
            questionLevelInput.value = question.level;
            questionTextInput.value = question.question_text;
            questionTypeInput.value = question.type;

            resetQuestionFormUI(); // Clear previous options/answers

            if (question.type === 'multiple-choice') {
                optionsContainer.classList.remove('d-none');
                trueFalseAnswerContainer.classList.add('d-none');
                // Clear existing options and add from question data
                optionsContainer.querySelectorAll('.input-group.mb-2').forEach(el => el.remove());
                question.options.forEach((optionText, index) => {
                    addQuestionOption(); // This adds a new empty option
                    const newOptionInput = optionsContainer.querySelectorAll('.question-option')[index];
                    newOptionInput.value = optionText;
                    if (index === question.correct_answer_index) {
                        newOptionInput.parentNode.nextElementSibling.querySelector('input[type="radio"]').checked = true;
                    }
                });
            } else { // true-false
                optionsContainer.classList.add('d-none');
                trueFalseAnswerContainer.classList.remove('d-none');
                if (question.correct_answer === true) {
                    document.getElementById('trueAnswer').checked = true;
                } else {
                    document.getElementById('falseAnswer').checked = true;
                }
            }
            document.getElementById('addQuestionModalLabel').textContent = 'تعديل سؤال';
            addQuestionModal.show();
        }
    }

    function resetQuestionFormUI() {
        // Clear all dynamically added options
        optionsContainer.querySelectorAll('.input-group.mb-2').forEach(el => el.remove());
        // Add back initial two options for multiple-choice
        for(let i=0; i<2; i++) {
            addQuestionOption();
        }
        // Reset radio buttons for true/false
        document.querySelector('input[name="trueFalseAnswer"]:checked')?.checked = false;
        // Hide both containers initially, toggleQuestionOptions will show correct one
        optionsContainer.classList.add('d-none');
        trueFalseAnswerContainer.classList.add('d-none');
        questionTypeInput.value = 'multiple-choice'; // Default back to multiple-choice
    }

    function confirmDeleteQuestion(questionId, questionText) {
        if (confirm(`هل أنت متأكد أنك تريد حذف السؤال "${questionText}"؟`)) {
            db.collection('exams_questions').doc(questionId).delete().then(() => {
                showToast(`تم حذف السؤال بنجاح.`, 'success');
                loadQuestions();
            }).catch(error => {
                console.error("Error deleting question:", error);
                showToast('خطأ في حذف السؤال.', 'danger');
            });
        }
    }

    // Initial call to reset form UI on page load
    resetQuestionFormUI(); 

    // Logout
    document.getElementById('logoutLink').addEventListener('click', function(e) {
        e.preventDefault();
        auth.signOut().then(() => {
            showToast('تم تسجيل الخروج بنجاح.', 'info');
            window.location.href = 'index.html';
        }).catch(error => {
            console.error("Error signing out:", error);
            showToast('خطأ في تسجيل الخروج.', 'danger');
        });
    });

}); // END OF DOMContentLoaded LISTENER
