if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    var auth = firebase.auth();
    var firestore = firebase.firestore();

    // تسجيل الدخول بالبريد وكلمة المرور
    function login(e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim().toLowerCase();
      var password = document.getElementById('password').value;
      var msg = document.getElementById('msg');
      msg.innerText = "";

      auth.signInWithEmailAndPassword(email, password)
        .then(function(result) {
          handleUserAfterLogin(result.user);
        })
        .catch(function(error) {
          msg.innerText = "خطأ: " + (error.message || "تأكد من البيانات");
        });
    }

    // تسجيل الدخول عبر Google
    function loginWithGoogle() {
      var provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(function(result) {
          handleUserAfterLogin(result.user);
        })
        .catch(function(error) {
          document.getElementById('msg').innerText = "خطأ في تسجيل الدخول عبر Google: " + (error.message || "");
        });
    }

    // بعد نجاح الدخول: أضف المستخدم إلى users إذا لم يكن موجودًا ووجهه حسب الدور
    function handleUserAfterLogin(user) {
      if (!user) return;
      var msg = document.getElementById('msg');
      var usersRef = firestore.collection('users').doc(user.uid);

      usersRef.get().then(function(doc) {
        if (!doc.exists) {
          // إضافة المستخدم لأول مرة (طالب افتراضي)
          usersRef.set({
            email: user.email,
            role: "student"
          }).then(function() {
            // توجيه الطالب
            window.location.href = "student.html";
          }).catch(function(error){
            msg.innerText = "تعذر إضافة الحساب: " + (error.message || "");
          });
        } else {
          // المستخدم موجود مسبقًا: وجهه حسب الصلاحية
          var role = doc.data().role;
          if (role === "teacher") {
            window.location.href = "dashboard.html";
          } else if (role === "student") {
            window.location.href = "student.html";
          } else {
            msg.innerText = "حسابك لا يملك صلاحية دخول معروفة. تواصل مع الإدارة.";
            auth.signOut();
          }
        }
      }).catch(function(error){
        msg.innerText = "خطأ في التحقق من بيانات الحساب: " + (error.message || "");
      });
    }

    // الحماية: إذا المستخدم مسجل دخوله بالفعل، وجهه مباشرة حسب صلاحياته
    auth.onAuthStateChanged(function(user) {
      if (user) {
        firestore.collection('users').doc(user.uid).get().then(function(doc) {
          if (doc.exists) {
            var role = doc.data().role;
            if (role === "teacher") {
              window.location.href = "dashboard.html";
            } else if (role === "student") {
              window.location.href = "student.html";
            }
          }
        });
      }
    });
