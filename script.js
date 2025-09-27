document.addEventListener('DOMContentLoaded', () => {
    // --- BƯỚC QUAN TRỌNG: DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY ---
    const firebaseConfig = {
        apiKey: "AIzaSyBlTjj_-WdZBpLqixox2rmt-kbHdPs8Kh8",
        authDomain: "quanlylophoc-5b945.firebaseapp.com",
        projectId: "quanlylophoc-5b945",
        storageBucket: "quanlylophoc-5b945.firebasestorage.app",
        messagingSenderId: "38123679904",
        appId: "1:38123679904:web:abe3710093b5a09643d9c5"
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
    const scheduleHeader = document.getElementById('schedule-header');
    const scheduleBody = document.getElementById('schedule-body');
    const lookupDateInput = document.getElementById('lookup-date');
    const lookupSummary = document.getElementById('lookup-summary');
    const deleteModal = document.getElementById('delete-confirm-modal');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    
    // **Thêm các biến cho form để kiểm tra ngày**
    const classTypeInput = document.getElementById('class-type');
    const startDateInput = document.getElementById('start-date');
    const formErrorMessage = document.getElementById('form-error-message');
    
    let allClasses = [];
    let currentScheduleData = [];
    let currentUser = null;
    let editingClassId = null;
    let deletingClassId = null;

    // --- CẤU HÌNH LỊCH HỌC ---
    const CLASS_SCHEDULE_DAYS = { '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] };
    const REVIEW_OFFSETS_SMF = [1, 3, 6, 10];
    const REVIEW_OFFSETS_KET = [1, 2, 4, 8, 16];

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
            let courseTypeName = cls.courseType === 'ket-pet' ? 'KET-PET' : 'Starters-Movers-Flyers';
            classItem.innerHTML = `
                <div class="class-info" data-id="${cls.id}">
                    <h3>${cls.name}</h3>
                    <p><strong>Loại chương trình:</strong> ${courseTypeName}</p>
                    <p><strong>Cấu trúc:</strong> ${cls.numUnits} units / ${cls.lessonsPerUnit || 2} lessons</p>
                    <p><strong>Lịch học:</strong> ${cls.type}</p>
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

    const findNextClassDate = (startDate, scheduleDays) => {
        let nextDate = new Date(startDate.getTime());
        while (!scheduleDays.includes(nextDate.getDay())) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
        return nextDate;
    };
    
    function generateSchedule(startDateStr, classType, numUnits, courseType, lessonsPerUnit) {
        const realCourseType = courseType || 'starters-movers-flyers';
        const realLessonsPerUnit = lessonsPerUnit || 2;
        const totalLessons = numUnits * realLessonsPerUnit;

        const LESSONS = Array.from({ length: totalLessons }, (_, i) => {
            const unitNumber = Math.floor(i / realLessonsPerUnit) + 1;
            const lessonNumber = (i % realLessonsPerUnit) + 1;
            return `Unit ${unitNumber} lesson ${lessonNumber}`;
        });

        const scheduleDays = CLASS_SCHEDULE_DAYS[classType];
        const firstClassDate = findNextClassDate(new Date(startDateStr + 'T00:00:00'), scheduleDays);

        const offsets = realCourseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF;
        const maxOffset = offsets[offsets.length - 1];
        const datesToGenerate = totalLessons + maxOffset;

        const allPossibleDates = [];
        let tempDate = new Date(firstClassDate.getTime());
        while (allPossibleDates.length < datesToGenerate) {
            allPossibleDates.push(new Date(tempDate.getTime()));
            tempDate.setDate(tempDate.getDate() + 1);
            tempDate = findNextClassDate(tempDate, scheduleDays);
        }
        
        const scheduleData = [];
        for (let i = 0; i < totalLessons; i++) {
            const lessonData = {
                session: i + 1,
                lessonName: LESSONS[i],
                lessonDate: formatDate(allPossibleDates[i]),
                review1: formatDate(allPossibleDates[i + offsets[0]]),
                review2: formatDate(allPossibleDates[i + offsets[1]]),
                review3: formatDate(allPossibleDates[i + offsets[2]]),
                review4: formatDate(allPossibleDates[i + offsets[3]]),
            };

            if (realCourseType === 'ket-pet') {
                lessonData.review5 = formatDate(allPossibleDates[i + offsets[4]]);
            }

            scheduleData.push(lessonData);
        }
        return scheduleData;
    }
    
    function displaySchedule(scheduleData, courseType) {
        scheduleHeader.innerHTML = '';
        const headerRow = document.createElement('tr');
        let headers = ['Buổi', 'Bài học', 'Ngày học', 'Ôn lần 1', 'Ôn lần 2', 'Ôn lần 3', 'Ôn lần 4'];
        if (courseType === 'ket-pet') {
            headers.push('Ôn lần 5');
        }
        headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
        scheduleHeader.appendChild(headerRow);

        scheduleBody.innerHTML = '';
        const todayString = formatDate(new Date());
        scheduleData.forEach(item => {
            const row = document.createElement('tr');
            if(item.lessonDate === todayString) row.classList.add('highlight');
            
            let rowContent = `
                <td>${item.session}</td>
                <td>${item.lessonName}</td>
                <td>${item.lessonDate}</td>
                <td>${item.review1 || ''}</td>
                <td>${item.review2 || ''}</td>
                <td>${item.review3 || ''}</td>
                <td>${item.review4 || ''}</td>
            `;
            if (courseType === 'ket-pet') {
                rowContent += `<td>${item.review5 || ''}</td>`;
            }
            row.innerHTML = rowContent;
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
            if (item.review5 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 5)`);
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

    // **HÀM MỚI: Kiểm tra ngày khai giảng có hợp lệ không**
    const validateStartDate = () => {
        const selectedDaysKey = classTypeInput.value;
        const startDateValue = startDateInput.value;

        // Nếu chưa chọn ngày thì không báo lỗi
        if (!startDateValue) {
            formErrorMessage.textContent = '';
            return;
        }

        const allowedDays = CLASS_SCHEDULE_DAYS[selectedDaysKey];
        // Thêm 'T00:00:00' để tránh lỗi múi giờ
        const selectedDate = new Date(startDateValue + 'T00:00:00');
        const selectedDay = selectedDate.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2,...

        // Nếu ngày được chọn không nằm trong danh sách ngày hợp lệ
        if (!allowedDays.includes(selectedDay)) {
            formErrorMessage.textContent = 'Ngày khai giảng không khớp với mô hình lớp học.';
        } else {
            formErrorMessage.textContent = ''; // Xóa thông báo lỗi nếu ngày hợp lệ
        }
    };

    const showPage = (pageId) => pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    const showDeleteModal = () => deleteModal.style.display = 'flex';
    const hideDeleteModal = () => deleteModal.style.display = 'none';

    document.getElementById('btn-show-create-form').addEventListener('click', () => {
        editingClassId = null;
        formTitle.textContent = '➕ Tạo Lớp Học Mới';
        formSubmitBtn.textContent = 'Tạo Lớp';
        classForm.reset();
        document.getElementById('num-units').value = 20;
        document.getElementById('lessons-per-unit').value = 2;
        document.getElementById('start-date').valueAsDate = new Date();
        formErrorMessage.textContent = ''; // Xóa thông báo lỗi cũ khi mở form
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
        
        // Chặn submit nếu vẫn còn báo lỗi ngày tháng
        if (formErrorMessage.textContent) {
            return; 
        }

        const classData = {
            name: document.getElementById('class-name').value,
            numUnits: parseInt(document.getElementById('num-units').value, 10),
            type: document.getElementById('class-type').value,
            startDate: document.getElementById('start-date').value,
            courseType: document.getElementById('course-type').value,
            lessonsPerUnit: parseInt(document.getElementById('lessons-per-unit').value, 10),
        };

        if (!classData.name.trim() || !classData.startDate || !classData.numUnits || !classData.lessonsPerUnit) {
            formErrorMessage.textContent = 'Vui lòng điền đầy đủ thông tin!';
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
                document.getElementById('course-type').value = selectedClass.courseType || 'starters-movers-flyers';
                document.getElementById('lessons-per-unit').value = selectedClass.lessonsPerUnit || 2;
                formTitle.textContent = '⚙️ Thiết Lập Thông Tin Lớp Học';
                formSubmitBtn.textContent = 'Lưu Thay Đổi';
                formErrorMessage.textContent = ''; // Xóa lỗi cũ khi edit
                showPage('form-page');
            }
        } else if (classInfo) {
            const classId = classInfo.dataset.id;
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if (selectedClass) {
                scheduleClassName.textContent = `🗓️ Lịch Học Chi Tiết - Lớp ${selectedClass.name}`;
                currentScheduleData = generateSchedule(
                    selectedClass.startDate, 
                    selectedClass.type, 
                    selectedClass.numUnits, 
                    selectedClass.courseType, 
                    selectedClass.lessonsPerUnit
                );
                displaySchedule(currentScheduleData, selectedClass.courseType || 'starters-movers-flyers');
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

    // **SỰ KIỆN MỚI: Kích hoạt hàm kiểm tra khi người dùng thay đổi lựa chọn**
    classTypeInput.addEventListener('change', validateStartDate);
    startDateInput.addEventListener('change', validateStartDate);
});
