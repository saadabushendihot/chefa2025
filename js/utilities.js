// js/utilities.js

/**
 * يعرض رسالة تنبيه باستخدام Bootstrap Toast.
 * @param {string} message - نص الرسالة.
 * @param {string} type - نوع الرسالة (success, danger, warning, info).
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // إذا لم يكن هناك container، قم بإنشائه (للتأكد من عمل التوست في أي صفحة)
        const body = document.querySelector('body');
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();

    // إزالة التوست من DOM بعد اختفائه
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * يحول كائن Timestamp من Firestore إلى سلسلة تاريخ ووقت قابلة للقراءة.
 * @param {firebase.firestore.Timestamp} timestamp - كائن Timestamp من Firestore.
 * @returns {string} - سلسلة التاريخ والوقت المنسقة.
 */
function formatFirestoreTimestamp(timestamp) {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleString('ar-EG');
    }
    return '—'; // أو أي قيمة افتراضية أخرى
}

// يمكن إضافة المزيد من الدوال المساعدة هنا في المستقبل
