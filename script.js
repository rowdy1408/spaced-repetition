document.addEventListener('DOMContentLoaded', () => {
    // --- BƯỚC QUAN TRỌNG: DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY ---
    const firebaseConfig = {
        apiKey: "AIzaSy...", // << THAY BẰNG KEY CỦA BẠN
        authDomain: "quanlylophoc-5b945.firebaseapp.com", // << THAY BẰNG DOMAIN CỦA BẠN
        projectId: "quanlylophoc-5b945", // << THAY BẰNG ID DỰ ÁN CỦA BẠN
        storageBucket: "quanlylophoc-5b945.appspot.com", // << THAY BẰNG BUCKET CỦA BẠN
        messagingSenderId: "...", // << THAY BẰNG ID CỦA BẠN
        appId: "..." // << THAY BẰNG APP ID CỦA BẠN
    };

    // --- KHỞI TẠO FIREBASE ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- KHAI BÁO BIẾN GIAO DIỆN ---
    const loginPage = document.getElementById('login-page');
    const appContent = document.getElementById('app-content');
    const userInfo = document.getElementById('user-info');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnLogout = document.getElementById('btn-logout');
    const pages = document.querySelectorAll('#app-content .page');
    const classForm = document.getElementById('class-form');
    const formTitle = document.getElementById('form-title');
    const formSubmitBtn = document.getElementById('form-submit-btn');
    const classListContainer = document.getElementById('class-list-container');
    const scheduleClassName = document.getElementById('schedule-class-name');
    const scheduleBody = document.getElementById('schedule-body');
    const lookupDateInput = document.getElementById('lookup-date');
    const lookupSummary = document.getElementById('lookup-summary');
    const deleteModal = document.getElementById('delete-confirm-modal');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    
    let allClasses = [];
    let currentScheduleData = [];
    let currentUser = null;
    let editingClassId = null;
    let deletingClassId = null;

    // --- CẤU HÌNH LỊCH HỌC ---
    const CLASS_SCHEDULE_DAYS = { '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] };
    const REVIEW_OFFSETS = [1, 3, 6, 10];

    // --- XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT ---
    btnGoogleLogin.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => console.error("Lỗi đăng nhập Google:", error));
    });

    btnLogout.addEventListener('click', () => auth.signOut());

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContent.style.display = 'block';
            userInfo.innerHTML = `Xin chào, <strong>${user.displayName}</strong>!`;
            loadClassesFromFirestore().then(() => {
                showPage('home-page');
            });
        } else {
            currentUser = null;
            loginPage.style.display = 'block';
            appContent.style.display = 'none';
        }
    });

    // --- TƯƠNG TÁC VỚI FIRESTORE ---
    const getClassesRef = () => db.collection('users').doc(currentUser.uid).collection('classes');

    const loadClassesFromFirestore = async () => {
        if (!currentUser) return;
        try {
            const snapshot = await getClassesRef().orderBy("name").get();
            allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) { console.error("Lỗi tải danh sách lớp:", error); }
    };

    // --- HIỂN THỊ DỮ LIỆU ---
    const renderClassList = () => {
        classListContainer.innerHTML = '';
        if (allClasses.length === 0) {
            classListContainer.innerHTML = '<p>Chưa có lớp nào được tạo. Hãy tạo lớp học đầu tiên của bạn!</p>';
            return;
        }
        allClasses.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.innerHTML = `
                <div class="class-info" data-id="${cls.id}">
                    <h3>${cls.name}</h3>
                    <p><strong>Số lượng:</strong> ${cls.numUnits} units</p>
                    <p><strong>Loại lớp:</strong> ${cls.type}</p>
                    <p><strong>Khai giảng:</strong> ${new Date(cls.startDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="class-item-actions">
                    <button class="edit-btn" data-id="${cls.id}">⚙️ Thiết lập</button>
                    <button class="delete-btn" data-id="${cls.id}">🗑️ Xóa</button>
                </div>
            `;
            classListContainer.appendChild(classItem);
        });
    };

    const formatDate = (date) => !date ? '' : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    
    function generateSchedule(startDateStr, classType, numUnits) {
        const LESSONS = Array.from({ length: numUnits * 2 }, (_, i) => `Unit ${Math.floor(i / 2) + 1} lesson ${i % 2 + 1}`);
        const scheduleDays = CLASS_SCHEDULE_DAYS[classType];
        let currentDate = new Date(startDateStr + 'T00:00:00');
        while (!scheduleDays.includes(currentDate.getDay())) currentDate.setDate(currentDate.getDate() + 1);
        const allSessionDates = [];
        while (allSessionDates.length < LESSONS.length + REVIEW_OFFSETS[REVIEW_OFFSETS.length - 1]) {
            if (scheduleDays.includes(currentDate.getDay())) allSessionDates.push(new Date(currentDate.getTime()));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const scheduleData = [];
        for (let i = 0; i < LESSONS.length; i++) {
            scheduleData.push({
                session: i + 1, lessonName: LESSONS[i], lessonDate: formatDate(allSessionDates[i]),
                review1: formatDate(allSessionDates[i + REVIEW_OFFSETS[0]]), review2: formatDate(allSessionDates[i + REVIEW_OFFSETS[1]]),
                review3: formatDate(allSessionDates[i + REVIEW_OFFSETS[2]]), review4: formatDate(allSessionDates[i + REVIEW_OFFSETS[3]]),
            });
        }
        return scheduleData;
    }
    
    function displaySchedule(scheduleData) {
        scheduleBody.innerHTML = '';
        const todayString = formatDate(new Date());
        scheduleData.forEach(item => {
            const row = document.createElement('tr');
            if(item.lessonDate === todayString) row.classList.add('highlight');
            row.innerHTML = `<td>${item.session}</td><td>${item.lessonName}</td><td>${item.lessonDate}</td><td>${item.review1}</td><td>${item.review2}</td><td>${item.review3}</td><td>${item.review4}</td>`;
            scheduleBody.appendChild(row);
        });
    }

    function showSummaryForDate(dateStr) {
        const lessonsForDay = []; const reviewsForDay = [];
        for (const item of currentScheduleData) {
            if (item.lessonDate === dateStr) lessonsForDay.push(item.lessonName);
            if (item.review1 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 1)`);
            if (item.review2 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 2)`);
            if (item.review3 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 3)`);
            if (item.review4 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 4)`);
        }
        let summaryHTML = '';
        if (lessonsForDay.length === 0 && reviewsForDay.length === 0) {
            summaryHTML = '<p>🎉 Không có lịch học hay ôn tập vào ngày này.</p>';
        } else {
            if (lessonsForDay.length > 0) summaryHTML += `<strong>📚 Bài học mới:</strong><ul>${lessonsForDay.map(l => `<li>${l}</li>`).join('')}</ul>`;
            if (reviewsForDay.length > 0) summaryHTML += `<strong>📝 Nội dung ôn tập:</strong><ul>${reviewsForDay.map(r => `<li>${r}</li>`).join('')}</ul>`;
        }
        lookupSummary.innerHTML = summaryHTML;
    }

    // --- ĐIỀU HƯỚNG & SỰ KIỆN ---
    const showPage = (pageId) => pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    const showDeleteModal = () => deleteModal.style.display = 'flex';
    const hideDeleteModal = () => deleteModal.style.display = 'none';

    document.getElementById('btn-show-create-form').addEventListener('click', () => {
        editingClassId = null;
        formTitle.textContent = '➕ Tạo Lớp Học Mới';
        formSubmitBtn.textContent = 'Tạo Lớp';
        classForm.reset();
        document.getElementById('num-units').value = 20;
        document.getElementById('start-date').valueAsDate = new Date();
        showPage('form-page');
    });
    
    document.getElementById('btn-show-class-list').addEventListener('click', async () => {
        await loadClassesFromFirestore();
        renderClassList();
        showPage('class-list-page');
    });

    document.querySelectorAll('.back-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetPage = e.target.dataset.target;
            if (targetPage === 'class-list-page') {
                await loadClassesFromFirestore();
                renderClassList();
            }
            showPage(targetPage);
        });
    });

    classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const classData = {
            name: document.getElementById('class-name').value,
            numUnits: document.getElementById('num-units').value,
            type: document.getElementById('class-type').value,
            startDate: document.getElementById('start-date').value,
        };

        if (!classData.name.trim() || !classData.startDate || !classData.numUnits) {
            document.getElementById('form-error-message').textContent = 'Vui lòng điền đầy đủ thông tin!';
            return;
        }

        try {
            if (editingClassId) {
                await getClassesRef().doc(editingClassId).update(classData);
            } else {
                await getClassesRef().add(classData);
            }
        } catch (error) { console.error("Lỗi lưu lớp:", error); }
        
        classForm.reset();
        editingClassId = null;
        await loadClassesFromFirestore();
        renderClassList();
        showPage('class-list-page');
    });

    classListContainer.addEventListener('click', (e) => {
        const classInfo = e.target.closest('.class-info');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {
            deletingClassId = deleteBtn.dataset.id;
            showDeleteModal();
        } else if (editBtn) {
            const classId = editBtn.dataset.id;
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if (selectedClass) {
                editingClassId = classId;
                document.getElementById('class-name').value = selectedClass.name;
                document.getElementById('num-units').value = selectedClass.numUnits;
                document.getElementById('class-type').value = selectedClass.type;
                document.getElementById('start-date').value = selectedClass.startDate;
                formTitle.textContent = '⚙️ Thiết Lập Thông Tin Lớp Học';
                formSubmitBtn.textContent = 'Lưu Thay Đổi';
                showPage('form-page');
            }
        } else if (classInfo) {
            const classId = classInfo.dataset.id;
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if (selectedClass) {
                scheduleClassName.textContent = `🗓️ Lịch Học Chi Tiết - Lớp ${selectedClass.name}`;
                currentScheduleData = generateSchedule(selectedClass.startDate, selectedClass.type, selectedClass.numUnits);
                displaySchedule(currentScheduleData);
                lookupDateInput.value = '';
                lookupSummary.innerHTML = '<p>Chọn một ngày để xem tóm tắt.</p>';
                showPage('schedule-details-page');
            }
        }
    });

    lookupDateInput.addEventListener('change', () => {
        if (!lookupDateInput.value) {
            lookupSummary.innerHTML = '<p>Chọn một ngày để xem tóm tắt.</p>';
            return;
        }
        const selectedDate = new Date(lookupDateInput.value + 'T00:00:00');
        showSummaryForDate(formatDate(selectedDate));
    });

    btnConfirmDelete.addEventListener('click', async () => {
        try {
            await getClassesRef().doc(deletingClassId).delete();
        } catch (error) { console.error("Lỗi xóa lớp:", error); }
        await loadClassesFromFirestore();
        renderClassList();
        hideDeleteModal();
    });

    btnCancelDelete.addEventListener('click', hideDeleteModal);
});
