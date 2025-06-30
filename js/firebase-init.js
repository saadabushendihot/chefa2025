// js/firebase-init.js

// إعدادات مشروع Firebase الخاص بك
var firebaseConfig = {
  apiKey: "AIzaSyCNx0wz_Xf5kXHl8kxmn7j6eH90DSMsEHw", // مفتاح API الخاص بك من firebase-config.js
  authDomain: "shefa-502fe.firebaseapp.com", // نطاق المصادقة الخاص بك من firebase-config.js
  projectId: "shefa-502fe", // معرّف المشروع الخاص بك من firebase-config.js
  storageBucket: "shefa-502fe.firebasestorage.app", // اسم سلة التخزين الصحيح من firebase-config.js
  messagingSenderId: "639314388969", // معرّف مرسل المراسلة الخاص بك من firebase-config.js
  appId: "1:639314388969:web:ad5245fc2d5d9c750c4d78" // معرّف التطبيق الخاص بك من firebase-config.js
};

// تهيئة Firebase SDK (يجب أن يتم ذلك مرة واحدة فقط)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
