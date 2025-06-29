// Firebase Initialization (firebaseConfig يتم جلبه من firebase-config.js)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage(); // Initialize Firebase Storage

// Global variables
let currentUser = null;
let currentUserRole = null;
let currentChatRoomId = null;
let chatRoomsListenerUnsubscribe = null;
let messagesListenerUnsubscribe = null;
let allUsers = []; // For create/manage chat modals
let currentChatParticipants = []; // For manage participants modal

// --- Utility Functions ---
function showToast(msg, color = "#333") {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.style.background = color;
  toast.className = "toast show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 2500);
}

function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.display = show ? 'block' : 'none';
  }
}

function showFileUploadSpinner(show) {
    const spinner = document.getElementById('fileUploadSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function logout() {
  // Unsubscribe from all listeners before logging out
  if (chatRoomsListenerUnsubscribe) chatRoomsListenerUnsubscribe();
  if (messagesListenerUnsubscribe) messagesListenerUnsubscribe();
  auth.signOut().then(() => {
    window.location.href = "login.html"; // Redirect to login page
  }).catch((error) => {
    console.error("Error during sign-out:", error);
    showToast("خطأ أثناء تسجيل الخروج: " + error.message, "#e63946");
  });
}

// --- Authentication State Listener ---
auth.onAuthStateChanged(function(user) {
  if (user) {
    currentUser = user;
    firestore.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        currentUserRole = doc.data().role;
        document.getElementById('currentUserInfo').innerText = `مرحباً، ${doc.data().name || user.email} (${currentUserRole === 'teacher' ? 'معلم' : 'طالب'})`;
        // If teacher, show admin buttons
        if (currentUserRole === 'teacher') {
          document.getElementById('createChatBtn').style.display = 'inline-block';
          document.getElementById('manageParticipantsBtn').style.display = 'inline-block';
        }
        loadChatRooms(); // Start loading chat rooms
        loadAllUsersForModals(); // Load all users for admin modals
      } else {
        // User exists in Auth but not in 'users' collection (shouldn't happen if login.html works correctly)
        console.warn("User data not found in Firestore 'users' collection.");
        showToast("خطأ: لم يتم العثور على بيانات المستخدم.", "#e63946");
        logout();
      }
    }).catch(err => {
      console.error("Error fetching user role:", err);
      showToast("خطأ في جلب دور المستخدم: " + err.message, "#e63946");
      logout();
    });
  } else {
    // No user is signed in.
    window.location.href = "login.html"; // Redirect to login page
  }
});

// --- Chat Room Management ---
function loadChatRooms() {
  if (chatRoomsListenerUnsubscribe) chatRoomsListenerUnsubscribe(); // Unsubscribe previous listener

  const chatRoomsListDiv = document.getElementById('chatRoomsList');
  chatRoomsListDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">جاري تحميل المحادثات...</p>';

  chatRoomsListenerUnsubscribe = firestore.collection('chatRooms')
    .where('participants', 'array-contains', currentUser.uid)
    .orderBy('lastMessageTimestamp', 'desc') // Order by latest activity
    .onSnapshot(snapshot => {
      let rooms = [];
      snapshot.forEach(doc => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      renderChatRooms(rooms);
      if (!currentChatRoomId && rooms.length > 0) {
        // Automatically select the first chat room if none is selected
        selectChatRoom(rooms[0].id);
      }
    }, error => {
      console.error("Error loading chat rooms:", error);
      showToast("خطأ في تحميل المحادثات: " + error.message, "#e63946");
      chatRoomsListDiv.innerHTML = '<p style="text-align: center; color: #e63946; padding: 20px;">خطأ في تحميل المحادثات.</p>';
    });
}

function renderChatRooms(rooms) {
  const chatRoomsListDiv = document.getElementById('chatRoomsList');
  if (rooms.length === 0) {
    chatRoomsListDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">لا توجد محادثات بعد. <br> (إذا كنت معلمًا، قم بإنشاء واحدة.)</p>';
    return;
  }
  let html = '';
  rooms.forEach(room => {
    const activeClass = room.id === currentChatRoomId ? 'active' : '';
    html += `
      <div class="chat-room-item ${activeClass}" onclick="selectChatRoom('${room.id}')">
        ${sanitizeText(room.name)}
      </div>
    `;
  });
  chatRoomsListDiv.innerHTML = html;
}

function selectChatRoom(chatRoomId) {
  if (currentChatRoomId === chatRoomId) return;

  if (messagesListenerUnsubscribe) messagesListenerUnsubscribe(); // Unsubscribe previous listener

  currentChatRoomId = chatRoomId;
  document.getElementById('messageDisplay').innerHTML = ''; // Clear previous messages
  showLoading(true); // Show main spinner

  document.getElementById('currentChatRoomName').innerText = 'جاري التحميل...';

  // Update active class in chat list
  document.querySelectorAll('.chat-room-item').forEach(item => {
    item.classList.remove('active');
  });
  const selectedRoomElement = document.querySelector(`.chat-room-item[onclick="selectChatRoom('${chatRoomId}')"]`);
  if (selectedRoomElement) {
    selectedRoomElement.classList.add('active');
  }

  firestore.collection('chatRooms').doc(chatRoomId).get().then(doc => {
    if (doc.exists) {
      document.getElementById('currentChatRoomName').innerText = sanitizeText(doc.data().name);
      loadMessages(chatRoomId); // loadMessages will handle showing/hiding spinner and rendering messages
    } else {
      console.error("Chat room not found:", chatRoomId);
      showToast("تعذر العثور على غرفة الدردشة.", "#e63946");
      document.getElementById('currentChatRoomName').innerText = 'المحادثة غير موجودة';
      document.getElementById('messageDisplay').innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">المحادثة غير موجودة.</p>';
      showLoading(false); // Hide main spinner
    }
  }).catch(error => {
    console.error("Error fetching chat room details:", error);
    showToast("خطأ في جلب تفاصيل المحادثة: " + error.message, "#e63946");
    document.getElementById('currentChatRoomName').innerText = 'خطأ في التحميل';
    document.getElementById('messageDisplay').innerHTML = '<p style="text-align: center; color: #e63946; padding: 20px;">خطأ في تحميل تفاصيل المحادثة.</p>';
    showLoading(false); // Hide main spinner
  });
}

// --- Message Management ---
function loadMessages(chatRoomId) {
  const messageDisplay = document.getElementById('messageDisplay');
  // showLoading(true) is already called in selectChatRoom

  messagesListenerUnsubscribe = firestore.collection('chatRooms').doc(chatRoomId).collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(50) // Load initial 50 messages, implement pagination for more
    .onSnapshot(snapshot => {
      showLoading(false); // Hide main spinner once initial messages are loaded

      // Clear messages and re-render only if it's the first load or a full refresh is needed
      // To prevent flickering with real-time updates, handle docChanges
      if (messageDisplay.innerHTML === '' && snapshot.size > 0) { // Check if empty for initial load
          messageDisplay.innerHTML = '';
      }
      
      // Process changes to messages
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const message = { id: change.doc.id, ...change.doc.data() };
          renderMessage(message);
        } else if (change.type === "modified") {
            // Optional: update existing message (e.g., read status)
            const updatedMessage = { id: change.doc.id, ...change.doc.data() };
            const existingBubble = messageDisplay.querySelector(`[data-message-id="${updatedMessage.id}"]`);
            if (existingBubble) {
                // Example: update readBy status visually
                // existingBubble.querySelector('.message-timestamp').innerText = `${updatedMessage.timestamp.toDate().toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })} (read by ${updatedMessage.readBy.length})`;
            }
        } else if (change.type === "removed") {
            // Optional: remove message from UI
            const removedMessageId = change.doc.id;
            const removedBubble = messageDisplay.querySelector(`[data-message-id="${removedMessageId}"]`);
            if (removedBubble) {
                removedBubble.remove();
            }
        }
      });
      messageDisplay.scrollTop = messageDisplay.scrollHeight; // Scroll to bottom
    }, error => {
      console.error("Error loading messages:", error);
      showToast("خطأ في تحميل الرسائل: " + error.message, "#e63946");
      messageDisplay.innerHTML = '<p style="text-align: center; color: #e63946; padding: 20px;">خطأ في تحميل الرسائل.</p>';
      showLoading(false);
    });
}

function renderMessage(message) {
  const messageDisplay = document.getElementById('messageDisplay');
  const isSentByMe = message.senderId === currentUser.uid;
  const isTeacher = currentUserRole === 'teacher';
  const senderName = isSentByMe ? 'أنت' : message.senderName || 'مستخدم غير معروف';
  const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' }) : '';

  const messageDiv = document.createElement('div');
  messageDiv.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
  messageDiv.dataset.messageId = message.id; // Add data attribute for easier identification
  
  let messageContentHtml = sanitizeText(message.text || '');

  if (message.type === 'file' && message.fileUrl) {
      const fileName = message.fileName || 'ملف مرفق';
      const fileIcon = getFileIcon(fileName);
      messageContentHtml += `
        <a href="${message.fileUrl}" target="_blank" class="attachment-link" download>
            <i class="${fileIcon}"></i>
            ${sanitizeText(fileName)}
        </a>
      `;
  } else if (message.type === 'image' && message.fileUrl) {
      messageContentHtml += `
        <a href="${message.fileUrl}" target="_blank">
            <img src="${message.fileUrl}" alt="صورة مرفقة" class="attachment-preview" onerror="this.onerror=null;this.src='https://placehold.co/150x100?text=صورة+غير+متوفرة';"/>
        </a>
      `;
  }

  // Add delete button if user is sender or is a teacher
  const deleteButtonHtml = (isSentByMe || isTeacher) ? `
    <button class="delete-message-btn" onclick="confirmDeleteMessage('${currentChatRoomId}', '${message.id}', '${message.fileUrl || ''}', '${message.type || 'text'}')">
        <i class="fas fa-trash-alt"></i>
    </button>
  ` : '';

  messageDiv.innerHTML = `
    <div class="message-header-line">
        <div class="message-sender">${sanitizeText(senderName)}</div>
        ${deleteButtonHtml}
    </div>
    <div class="message-text">${messageContentHtml}</div>
    <div class="message-timestamp">${timestamp}</div>
  `;
  messageDisplay.appendChild(messageDiv);
}

// New: Function to confirm and delete a message
async function confirmDeleteMessage(chatRoomId, messageId, fileUrl, messageType) {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.")) {
        return;
    }

    showToast("جاري حذف الرسالة...", "#4361ee");
    try {
        // Delete message from Firestore
        await firestore.collection('chatRooms').doc(chatRoomId).collection('messages').doc(messageId).delete();
        
        // If message has an attached file, delete it from Storage
        if (fileUrl && (messageType === 'file' || messageType === 'image')) {
            // Extract fullPath from fileUrl (this assumes standard Firebase Storage URL structure)
            // e.g., https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/path%2Fto%2Ffile?alt=media
            const urlParts = fileUrl.split('/o/');
            if (urlParts.length > 1) {
                const encodedPath = urlParts[1].split('?')[0]; // Get path, remove query params
                const fullPath = decodeURIComponent(encodedPath); // Decode URI components (%2F to /)
                
                const fileRef = storage.ref(fullPath);
                await fileRef.delete();
                console.log("File deleted from Storage:", fullPath);
            }
        }

        showToast("تم حذف الرسالة والمرفق (إن وجد) بنجاح!", "#1dad87");
        // No need to re-load messages, listener will handle it
    } catch (error) {
        console.error("Error deleting message or file:", error);
        showToast("خطأ أثناء حذف الرسالة: " + error.message, "#e63946");
    }
}


function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return 'fas fa-file-pdf';
        case 'doc':
        case 'docx': return 'fas fa-file-word';
        case 'xls':
        case 'xlsx': return 'fas fa-file-excel';
        case 'ppt':
        case 'pptx': return 'fas fa-file-powerpoint';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return 'fas fa-file-image';
        case 'mp3':
        case 'wav': return 'fas fa-file-audio';
        case 'mp4':
        case 'avi': return 'fas fa-file-video';
        default: return 'fas fa-file';
    }
}

function sendMessage(fileUrl = null, fileName = null, fileType = 'text') {
  const messageInput = document.getElementById('messageInput');
  const messageText = messageInput.value.trim();

  // Only allow sending if there's text OR a file
  if (!messageText && !fileUrl) {
    showToast("لا يمكن إرسال رسالة فارغة.", "#e63946");
    return;
  }
  if (!currentChatRoomId || !currentUser) {
    showToast("الرجاء اختيار محادثة.", "#e63946");
    return;
  }

  const messageData = {
    senderId: currentUser.uid,
    senderName: currentUser.displayName || currentUser.email,
    text: messageText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    readBy: [currentUser.uid], // Mark as read by sender immediately
    type: fileUrl ? (fileType.startsWith('image/') ? 'image' : 'file') : 'text', // Set message type
    fileUrl: fileUrl, // Include file URL if present
    fileName: fileName // Include file name if present
  };

  firestore.collection('chatRooms').doc(currentChatRoomId).collection('messages').add(messageData)
    .then(() => {
      // Update lastMessageTimestamp in chat room for sorting
      firestore.collection('chatRooms').doc(currentChatRoomId).update({
        lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageText: fileUrl ? `[ملف: ${fileName || 'مرفق'}]` : messageText, // Show file indicator in last message preview
        lastMessageSender: currentUser.displayName || currentUser.email
      });
      messageInput.value = ''; // Clear text input
      messageInput.style.height = 'auto'; // Reset textarea height
      document.getElementById('fileInput').value = ''; // Clear file input
    })
    .catch(error => {
      console.error("Error sending message:", error);
      showToast("خطأ أثناء إرسال الرسالة: " + error.message, "#e63946");
    });
}

// Adjust textarea height automatically (basic)
document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// --- File Attachment Logic ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', // Images
    'application/pdf', // Documents
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xls, .xlsx
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .ppt, .pptx
    'text/plain' // Text files
    // Removed: 'application/zip', 'application/x-rar-compressed'
];

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        showFileUploadSpinner(false); // Hide spinner if no file selected (e.g., user cancels)
        return;
    }

    // 1. Client-side Validation
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        showToast("نوع الملف غير مدعوم. أنواع الملفات المدعومة هي: صور، PDF، مستندات Word/Excel/PowerPoint، ملفات نصية.", "#e63946");
        document.getElementById('fileInput').value = ''; // Clear input
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showToast(`حجم الملف كبير جداً. الحد الأقصى المسموح به هو ${MAX_FILE_SIZE / (1024 * 1024)} ميجابايت.`, "#e63946");
        document.getElementById('fileInput').value = ''; // Clear input
        return;
    }

    if (!currentChatRoomId) {
        showToast("الرجاء اختيار محادثة قبل إرفاق ملف.", "#e63946");
        document.getElementById('fileInput').value = ''; // Clear input
        return;
    }

    showFileUploadSpinner(true);
    try {
        // 2. Upload to Firebase Storage
        const storageRef = storage.ref();
        // Path: chat_attachments/{chatRoomId}/{timestamp}_{fileName}
        const fileExtension = file.name.split('.').pop();
        const fileNameForStorage = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Sanitize file name
        const fileRef = storageRef.child(`chat_attachments/${currentChatRoomId}/${fileNameForStorage}`);

        const uploadTask = fileRef.put(file);

        // Listen for state changes, errors, and completion of the upload.
        uploadTask.on('state_changed',
            (snapshot) => {
                // Optional: Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                // You could update a progress bar here if you have one
            },
            (error) => {
                // Handle unsuccessful uploads
                console.error("Error during file upload:", error);
                showToast("خطأ أثناء رفع الملف: " + error.message, "#e63946");
                showFileUploadSpinner(false);
            },
            async () => {
                // Handle successful uploads on complete
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                // 3. Send message with file URL
                sendMessage(downloadURL, file.name, file.type);
                showToast("تم رفع الملف بنجاح وإرساله!", "#1dad87");
                showFileUploadSpinner(false);
            }
        );

    } catch (error) {
        console.error("Error initiating file upload:", error); // Error in the try block itself, not the uploadTask
        showToast("خطأ في بدء عملية رفع الملف: " + error.message, "#e63946");
        showFileUploadSpinner(false);
    } finally {
        // It's crucial to ensure spinner is hidden even if try/catch blocks don't catch everything
        // showFileUploadSpinner(false); // This is handled by uploadTask.on('state_changed', ..., error, success)
        document.getElementById('fileInput').value = ''; // Clear file input regardless of success/failure
    }
}


// --- Admin Functionality (Create/Manage Chats) ---
// Load all users for modals (teacher only)
function loadAllUsersForModals() {
  firestore.collection('users').get().then(snapshot => {
    allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }).catch(error => {
    console.error("Error loading all users:", error);
    showToast("خطأ في تحميل قائمة المستخدمين للمدير.", "#e63946");
  });
}

// Create Chat Modal Functions
function openCreateChatModal() {
  document.getElementById('createChatModal').style.display = 'flex';
  const allUsersListDiv = document.getElementById('allUsersList');
  allUsersListDiv.innerHTML = ''; // Clear previous list

  // Display all users, allowing multi-selection
  allUsers.forEach(user => {
    if (user.id === currentUser.uid) return; // Don't show current admin in list to add themselves
    const userDiv = document.createElement('div');
    userDiv.innerText = sanitizeText(user.name || user.email);
    userDiv.dataset.uid = user.id;
    userDiv.onclick = () => userDiv.classList.toggle('selected');
    allUsersListDiv.appendChild(userDiv);
  });

  // Automatically add and select the current admin
  const adminUserDiv = document.createElement('div');
  adminUserDiv.innerText = sanitizeText(currentUser.displayName || currentUser.email) + " (أنت - المدير)";
  adminUserDiv.dataset.uid = currentUser.uid;
  adminUserDiv.classList.add('selected'); // Admin is always a participant
  adminUserDiv.style.fontWeight = 'bold';
  adminUserDiv.style.backgroundColor = '#dff0d8'; // Light green background for admin
  adminUserDiv.onclick = (e) => e.stopPropagation(); // Prevent unselecting admin
  allUsersListDiv.prepend(adminUserDiv); // Add admin to the top
}

function closeCreateChatModal() {
  document.getElementById('createChatModal').style.display = 'none';
  document.getElementById('newChatName').value = '';
  document.getElementById('allUsersList').innerHTML = '<p style="text-align: center; color: #888;">جاري تحميل المستخدمين...</p>'; // Reset content
}

function createNewChatRoom() {
  const chatName = document.getElementById('newChatName').value.trim();
  if (!chatName) {
    showToast("الرجاء إدخال اسم للمحادثة.", "#e63946");
    return;
  }

  const selectedUsers = Array.from(document.querySelectorAll('#allUsersList .selected'))
    .map(div => div.dataset.uid);

  if (selectedUsers.length === 0) {
    showToast("الرجاء اختيار مشارك واحد على الأقل.", "#e63946");
    return;
  }

  showLoading(true);
  firestore.collection('chatRooms').add({
    name: chatName,
    participants: selectedUsers,
    adminId: currentUser.uid, // Admin who created the chat
    type: selectedUsers.length > 2 ? 'group' : 'private', // Simple logic for type
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp() // Initial timestamp
  }).then(() => {
    showToast("تم إنشاء المحادثة بنجاح!", "#1dad87");
    closeCreateChatModal();
    showLoading(false);
  }).catch(error => {
    console.error("Error creating chat room:", error);
    showToast("خطأ أثناء إنشاء المحادثة: " + error.message, "#e63946");
    showLoading(false);
  });
}

// Manage Participants Modal Functions
function openManageParticipantsModal() {
  if (!currentChatRoomId) {
    showToast("الرجاء اختيار محادثة لإدارة أعضائها.", "#e63946");
    return;
  }
  document.getElementById('manageParticipantsModal').style.display = 'flex';
  document.getElementById('manageChatRoomName').innerText = document.getElementById('currentChatRoomName').innerText;
  const currentParticipantsListDiv = document.getElementById('currentParticipantsList');
  currentParticipantsListDiv.innerHTML = '<p style="text-align: center; color: #888;">جاري تحميل المشاركين...</p>';

  firestore.collection('chatRooms').doc(currentChatRoomId).get().then(doc => {
    if (!doc.exists) {
      showToast("غرفة الدردشة غير موجودة.", "#e63946");
      closeManageParticipantsModal();
      return;
    }
    const roomData = doc.data();
    currentChatParticipants = roomData.participants || [];

    // Display all users, pre-selecting current participants
    currentParticipantsListDiv.innerHTML = '';
    allUsers.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.innerText = sanitizeText(user.name || user.email);
      userDiv.dataset.uid = user.id;
      if (currentChatParticipants.includes(user.id)) {
        userDiv.classList.add('selected');
      }
      userDiv.onclick = () => {
        // Prevent removing the admin who created the chat (if adminId exists)
        if (roomData.adminId && user.id === roomData.adminId) {
          showToast("لا يمكن إزالة مدير الدردشة.", "#e63946");
          return;
        }
        userDiv.classList.toggle('selected');
      };
      currentParticipantsListDiv.appendChild(userDiv);
    });

  }).catch(error => {
    console.error("Error fetching chat room participants:", error);
    showToast("خطأ في جلب المشاركين: " + error.message, "#e63946");
    closeManageParticipantsModal();
  });
}

function closeManageParticipantsModal() {
  document.getElementById('manageParticipantsModal').style.display = 'none';
  document.getElementById('currentParticipantsList').innerHTML = ''; // Reset content
}

function saveParticipantsChanges() {
  if (!currentChatRoomId) return;

  const newSelectedParticipants = Array.from(document.querySelectorAll('#currentParticipantsList .selected'))
    .map(div => div.dataset.uid);

  if (newSelectedParticipants.length === 0) {
    showToast("يجب أن يكون هناك مشارك واحد على الأقل في المحادثة.", "#e63946");
    return;
  }

  showLoading(true);
  firestore.collection('chatRooms').doc(currentChatRoomId).update({
    participants: newSelectedParticipants
  }).then(() => {
    showToast("تم تحديث المشاركين بنجاح!", "#1dad87");
    closeManageParticipantsModal();
    showLoading(false);
  }).catch(error => {
    console.error("Error updating participants:", error);
    showToast("خطأ أثناء تحديث المشاركين: " + error.message, "#e63946");
    showLoading(false);
  });
}

// --- Initial setup on page load ---
// You might want to automatically select the first chat or show a welcome message
