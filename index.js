if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    var auth = firebase.auth();
    var firestore = firebase.firestore();

    // عند الضغط على زر الدخول
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim().toLowerCase();
      var password = document.getElementById('password').value.trim();
      document.getElementById('msg').innerText = "";
      document.getElementById('student-redirect').style.display = "none";

      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          let user = userCredential.user;
          firestore.collection('users').doc(user.uid).get().then(function(doc) {
            if (doc.exists) {
              let data = doc.data();
              localStorage.setItem('user_email', user.email);
              localStorage.setItem('user_role', data.role);

              if(data.role === "teacher") {
                showNavbar(data.role, user.email, data.name);
                document.getElementById('loginBox').style.display = "none";
                document.getElementById('welcomeBox').style.display = "block";
                document.getElementById('welcomeMessage').innerText = `مرحباً ${data.name ? data.name : user.email}`;
                document.getElementById('roleMessage').innerText = `صلاحيتك: معلم`;
              } else if(data.role === "student") {
                document.getElementById('student-redirect').style.display = "block";
                document.getElementById('student-redirect').innerText = "مرحباً طالبنا العزيز، سيتم تحويلك تلقائياً إلى صفحتك...";
                setTimeout(function() {
                  window.location.href = "student.html";
                }, 2000);
                auth.signOut();
              } else {
                document.getElementById('msg').innerText = "لا توجد بيانات صلاحية لهذا الحساب.";
                auth.signOut();
              }
            } else {
              document.getElementById('msg').innerText = "لا توجد بيانات صلاحية لهذا الحساب.";
              auth.signOut();
            }
          });
        })
        .catch((error) => {
          document.getElementById('msg').innerText = "خطأ: " + error.message;
        });
    });

    // شريط تنقل للمعلم فقط
    function showNavbar(role, email, name) {
      let nav = document.getElementById('navbar');
      let links = '';
      if(role === "teacher") {
        links += `<a href="dashboard.html" target="_self">إدارة الطلاب</a>`;
        links += `<a href="student.html" target="_self">صفحة الطالب</a>`;
      }
      nav.innerHTML = links;
      nav.style.display = "flex";
    }

    // تحقق من تسجيل الدخول عند تحديث الصفحة
    window.onload = function() {
      auth.onAuthStateChanged(function(user) {
        if(user){
          firestore.collection('users').doc(user.uid).get().then(function(doc) {
            if(doc.exists && doc.data().role === "teacher"){
              let data = doc.data();
              showNavbar(data.role, user.email, data.name);
              document.getElementById('loginBox').style.display = "none";
              document.getElementById('welcomeBox').style.display = "block";
              document.getElementById('welcomeMessage').innerText = `مرحباً ${data.name ? data.name : user.email}`;
              document.getElementById('roleMessage').innerText = `صلاحيتك: معلم`;
            }
          });
        }
      });
    };

    // تسجيل الخروج
    function logout() {
      auth.signOut().then(function() {
        localStorage.clear();
        location.reload();
      });
    }
