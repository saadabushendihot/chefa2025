// firebase-config.js
// هذا الملف يحتوي على إعدادات مشروع Firebase الخاص بك.
// يتم استيراده بواسطة صفحات HTML لتهيئة Firebase SDK.

var firebaseConfig = {
  apiKey: "AIzaSyCNx0wz_Xf5kXHl8kxmn7j6eH90DSMsEHw", // مفتاح API لمشروعك
  authDomain: "shefa-502fe.firebaseapp.com", // نطاق المصادقة لمشروعك
  projectId: "shefa-502fe", // معرّف المشروع الخاص بك
  storageBucket: "shefa-502fe.firebasestorage.app", // <--- هذا هو التعديل الضروري! اسم سلة التخزين الصحيح
  messagingSenderId: "639314388969", // معرّف مرسل المراسلة
  appId: "1:639314388969:web:ad5245fc2d5d9c750c4d78" // معرّف التطبيق
};
// firebase-config.js
// هذا الملف يحتوي على إعدادات مشروع Firebase الخاص بك.
// يتم استيراده بواسطة صفحات HTML لتهيئة Firebase SDK.

console.log("firebase-config.js loaded."); // أضف هذا السطر
// ... (بقية إعدادات firebaseConfig)
var firebaseConfig = {
  apiKey: "AIzaSyCNx0wz_Xf5kXHl8kxmn7j6eH90DSMsEHw", // مفتاح API لمشروعك
  authDomain: "shefa-502fe.firebaseapp.com", // نطاق المصادقة لمشروعك
  projectId: "shefa-502fe", // معرّف المشروع الخاص بك
  storageBucket: "shefa-502fe.firebasestorage.app", // <--- هذا هو التعديل الضروري! اسم سلة التخزين الصحيح
  messagingSenderId: "639314388969", // معرّف مرسل المراسلة
  appId: "1:639314388969:web:ad5245fc2d5d9c750c4d78" // معرّف التطبيق
};

console.log("firebaseConfig variable defined:", typeof firebaseConfig !== 'undefined'); // أضف هذا السطر
