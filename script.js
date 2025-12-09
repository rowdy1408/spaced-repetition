document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // 1. CẤU HÌNH FIREBASE & KHỞI TẠO
    // ============================================================
    const firebaseConfig = {
        apiKey: "AIzaSyBlTjj_-WdZBpLqixox2rmt-kbHdPs8Kh8",
        authDomain: "quanlylophoc-5b945.firebaseapp.com",
        projectId: "quanlylophoc-5b945",
        storageBucket: "quanlylophoc-5b945.firebasestorage.app",
        messagingSenderId: "38123679904",
        appId: "1:38123679904:web:abe3710093b5a09643d9c5"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ============================================================
    // 2. KHAI BÁO BIẾN GIAO DIỆN (DOM ELEMENTS)
    // ============================================================
    
    // --- Màn hình Đăng nhập & Nav ---
    const loginPage = document.getElementById('login-page');
    const appContent = document.getElementById('app-content');
    const userInfo = document.getElementById('user-info');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnLogout = document.getElementById('btn-logout');
    const pages = document.querySelectorAll('#app-content .page');

    // --- Màn hình Danh sách lớp & Form tạo lớp ---
    const classForm = document.getElementById('class-form');
    const formTitle = document.getElementById('form-title');
    const classListContainer = document.getElementById('class-list-container');
    const deleteModal = document.getElementById('delete-confirm-modal');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const classTypeInput = document.getElementById('class-type');
    const startDateInput = document.getElementById('start-date');
    const formErrorMessage = document.getElementById('form-error-message');
    const csvGuideModal = document.getElementById('csv-guide-modal');
    const showCsvGuideBtn = document.getElementById('show-csv-guide');
    const closeCsvGuideBtn = document.getElementById('btn-close-guide');
    const scheduleFileInput = document.getElementById('schedule-file');
    const fileFeedback = document.getElementById('file-feedback');
    const customDaysContainer = document.getElementById('custom-days-container');
    const customDayCheckboxes = document.getElementsByName('custom-day');

    // --- Màn hình Chi tiết Lịch học ---
    const scheduleClassName = document.getElementById('schedule-class-name');
    const scheduleHeader = document.getElementById('schedule-header');
    const scheduleBody = document.getElementById('schedule-body');
    const lookupDateInput = document.getElementById('lookup-date');
    const lookupSummary = document.getElementById('lookup-summary');
    const todaySummary = document.getElementById('today-summary');
    const btnUndo = document.getElementById('btn-undo');

    // --- Menu chuột phải & Modal Quizlet ---
    const pencilMenuModal = document.getElementById('pencil-menu-modal');
    const menuEditName = document.getElementById('menu-edit-name');
    const menuPostponeSession = document.getElementById('menu-postpone-session');
    const quizletLinkModal = document.getElementById('quizlet-link-modal');
    const quizletLinkInput = document.getElementById('quizlet-link-input');
    const quizletLinkFeedback = document.getElementById('quizlet-link-feedback');
    const btnSaveQuizletLink = document.getElementById('btn-save-quizlet-link');
    const btnCancelQuizletLink = document.getElementById('btn-cancel-quizlet-link');
    const quizletMenuModal = document.getElementById('quizlet-menu-modal');
    const menuOpenQuizlet = document.getElementById('menu-open-quizlet');
    const menuAddEditQuizlet = document.getElementById('menu-add-edit-quizlet');

    // --- Màn hình Danh sách Học viên ---
    const studentListPage = document.getElementById('student-list-page');
    const studentListContainer = document.getElementById('student-list-container');
    const btnAddStudent = document.getElementById('btn-add-student');
    const addStudentModal = document.getElementById('add-student-modal');
    const addStudentForm = document.getElementById('add-student-form');
    const btnCancelAddStudent = document.getElementById('btn-cancel-add-student');
    const newStudentAvatarInput = document.getElementById('new-student-avatar');
    const avatarPreviewImg = document.getElementById('avatar-preview-img');

    // --- Màn hình Chi tiết Học viên ---
    const studentDetailPage = document.getElementById('student-detail-page');
    const detailStudentName = document.getElementById('detail-student-name');
    const detailStudentAvatar = document.getElementById('detail-student-avatar');
    const detailStudentRank = document.getElementById('detail-student-rank');
    const detailXpBar = document.getElementById('detail-xp-bar');
    const detailXpText = document.getElementById('detail-xp-text');
    const studentProgressBody = document.getElementById('student-progress-body');

    // --- Modal Sửa Học viên ---
    const editStudentModal = document.getElementById('edit-student-modal');
    const editStudentForm = document.getElementById('edit-student-form');
    const editStudentNameInput = document.getElementById('edit-student-name');
    const editStudentIdInput = document.getElementById('edit-student-id');
    const editStudentAvatarInput = document.getElementById('edit-student-avatar');
    const editAvatarPreviewImg = document.getElementById('edit-avatar-preview-img');
    const btnCancelEditStudent = document.getElementById('btn-cancel-edit-student');

    // --- Modal Xóa Học viên ---
    const deleteStudentModal = document.getElementById('delete-student-modal');
    const btnConfirmDeleteStudent = document.getElementById('btn-confirm-delete-student');
    const btnCancelDeleteStudent = document.getElementById('btn-cancel-delete-student');
    const deleteStudentNameDisplay = document.getElementById('delete-student-name-display');

    // ============================================================
    // 3. BIẾN TRẠNG THÁI (STATE VARIABLES)
    // ============================================================
    let currentUser = null;
    let allClasses = [];
    let currentScheduleData = [];
    let currentClassStudents = [];
    
    // Các biến tạm để xử lý logic
    let editingClassId = null;
    let deletingClassId = null;
    let currentClassId = null;
    let currentStudentId = null;
    let deletingStudentId = null;

    let uploadedLessons = [];
    let tempPostponedDates = [];
    let activeLessonCell = null;
    let activeLessonKey = null;
    let scheduleHistory = [];

    // ============================================================
    // 4. CẤU HÌNH LOGIC (CONSTANTS)
    // ============================================================
    const XP_PER_LESSON = 20;
    const XP_PER_LEVEL = 80;
    const RANKS = [
        "Lính Mới", "Tập Sự", "Người Học Việc", "Thành Thạo", 
        "Chuyên Gia", "Bậc Thầy", "Đại Kiện Tướng", "Huyền Thoại", "Thần Thánh"
    ];
    const CLASS_SCHEDULE_DAYS = { '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] };
    const REVIEW_OFFSETS_SMF = [1, 3, 6, 10];
    const REVIEW_OFFSETS_KET = [1, 2, 4, 8, 16];
    const VIETNAMESE_HOLIDAYS_FIXED = ['01-01', '04-30', '05-01', '09-02'];
    const LUNAR_NEW_YEAR_DATES = [
        '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01',
        '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
    ];

    // ============================================================
    // 5. CÁC HÀM TIỆN ÍCH (HELPER FUNCTIONS)
    // ============================================================
    const formatDate = (date) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    const stringToDate = (dateStr) => new Date(dateStr.split('/').reverse().join('-'));
    const isHoliday = (date, extraHolidays = []) => {
        const formattedDate = formatDate(date);
        if (extraHolidays.includes(formattedDate)) return true;
        const yyyymmdd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (LUNAR_NEW_YEAR_DATES.includes(yyyymmdd)) return true;
        if (VIETNAMESE_HOLIDAYS_FIXED.includes(mmdd)) return true;
        return false;
    };
    const findNextWorkDay = (startDate, scheduleDays, extraHolidays = []) => {
        let nextDate = new Date(startDate.getTime());
        while (true) {
            if (scheduleDays.includes(nextDate.getDay()) && !isHoliday(nextDate, extraHolidays)) {
                break;
            }
            nextDate.setDate(nextDate.getDate() + 1);
        }
        return nextDate;
    };
    const isValidQuizletLink = (url) => {
        if (!url) return false;
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'quizlet.com';
        } catch (e) { return false; }
    };
    
    // Hàm nén ảnh trước khi upload (Tránh nặng database)
    function resizeImageToDataURL(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.8)); // Nén 80% quality
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ============================================================
    // 6. XỬ LÝ ĐĂNG NHẬP & ĐIỀU HƯỚNG
    // ============================================================
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContent.style.display = 'flex';
            userInfo.innerHTML = `Xin chào, <strong>${user.displayName}</strong>!`;
            loadClassesFromFirestore().then(() => showPage('home-page'));
        } else {
            currentUser = null;
            loginPage.style.display = 'block';
            appContent.style.display = 'none';
        }
    });

    const showPage = (pageId) => pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    
    // ============================================================
    // 7. XỬ LÝ DỮ LIỆU LỚP HỌC (ACTIONS)
    // ============================================================
    const getClassesRef = () => db.collection('users').doc(currentUser.uid).collection('classes');

    const loadClassesFromFirestore = async () => {
        if (!currentUser) return;
        try {
            const snapshot = await getClassesRef().orderBy("name").get();
            allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) { console.error("Lỗi tải danh sách lớp:", error); }
    };
    
    const renderClassList = () => {
        classListContainer.innerHTML = '';
        if (allClasses.length === 0) {
            classListContainer.innerHTML = '<p>Chưa có lớp nào được tạo.</p>';
            return;
        }
        allClasses.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            let courseTypeName = cls.courseType === 'ket-pet' ? 'KET-PET' : 'Starters-Movers-Flyers';
            const lessonCount = cls.uploadedLessons?.length > 0 ? cls.uploadedLessons.length : (cls.numUnits * cls.lessonsPerUnit);
            
            classItem.innerHTML = `
                <div class="class-info" data-id="${cls.id}">
                    <h3>${cls.name}</h3>
                    <p><strong>Loại:</strong> ${courseTypeName}</p>
                    <p><strong>Số buổi:</strong> ${lessonCount || 'N/A'}</p>
                </div>
                <div class="class-item-actions">
                    <button class="btn-attendance" data-id="${cls.id}">🎓 Ôn tập</button>
                    <button class="edit-btn" data-id="${cls.id}">⚙️ Sửa</button>
                    <button class="delete-btn" data-id="${cls.id}">🗑️ Xóa</button>
                </div>
            `;
            classListContainer.appendChild(classItem);
        });
    };

    // ============================================================
    // 8. XỬ LÝ TẠO LỊCH (CORE LOGIC)
    // ============================================================
    function generateSchedule(classData, extraHolidays = []) {
        const { startDate, type, numUnits, courseType, lessonsPerUnit, miniTestDates = [], customLessonNames = {}, uploadedLessons = [] } = classData;
        let scheduleDays;
if (type === 'custom') {
    // Nếu là custom, lấy mảng ngày từ dữ liệu lớp (nếu có)
    scheduleDays = classData.customScheduleDays || [];
} else {
    scheduleDays = CLASS_SCHEDULE_DAYS[type];
}

// Kiểm tra an toàn để tránh lỗi vòng lặp vô tận nếu không có ngày nào được chọn
if (!scheduleDays || scheduleDays.length === 0) {
    console.warn("Chưa chọn ngày học nào cho lịch Custom.");
    return []; 
};
        const offsets = courseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF;
        let scheduleData = [];

        if (uploadedLessons && uploadedLessons.length > 0) {
            let currentDate = stringToDate(uploadedLessons[0].date);
            uploadedLessons.forEach((item, index) => {
                const sessionDate = findNextWorkDay(currentDate, scheduleDays, extraHolidays);
                const lessonKey = `lesson-${index}`;
                scheduleData.push({
                    isLesson: item.type === 'lesson', 
                    isMiniTest: item.type === 'miniTest',
                    lessonName: customLessonNames[lessonKey] || item.name, 
                    lessonKey: lessonKey,
                    lessonDate: formatDate(sessionDate),
                });
                currentDate = new Date(sessionDate.getTime());
                currentDate.setDate(currentDate.getDate() + 1);
            });
        } else {
            const totalLessons = parseInt(numUnits, 10) * parseInt(lessonsPerUnit, 10);
            let currentDate = new Date(startDate + 'T00:00:00');
            let lessonCounter = 0;
            let sessionCounter = 0;
            
            while(lessonCounter < totalLessons) {
                if (sessionCounter > totalLessons * 2 && totalLessons > 0) break; 
                const sessionDate = findNextWorkDay(currentDate, scheduleDays, extraHolidays);
                const formattedDate = formatDate(sessionDate);
                
                if (miniTestDates.includes(formattedDate)) {
                    scheduleData.push({ isMiniTest: true, lessonName: 'Mini Test', lessonDate: formattedDate });
                } else {
                    const unitNumber = Math.floor(lessonCounter / lessonsPerUnit) + 1;
                    const lessonNumber = (lessonCounter % lessonsPerUnit) + 1;
                    const lessonKey = `${unitNumber}-${lessonNumber}`;
                    const lessonName = `Unit ${unitNumber} lesson ${lessonNumber}`;
                    scheduleData.push({
                        isLesson: true, lessonName: customLessonNames[lessonKey] || lessonName,
                        lessonKey: lessonKey, lessonDate: formattedDate,
                    });
                    lessonCounter++;
                }
                currentDate = new Date(sessionDate.getTime());
                currentDate.setDate(currentDate.getDate() + 1);
                sessionCounter++;
            }
        }
        
        const findNextAvailableReviewDate = (startIndex) => {
            let currentIndex = startIndex;
            while (scheduleData[currentIndex] && scheduleData[currentIndex].isMiniTest) {
                currentIndex++;
            }
            return scheduleData[currentIndex]?.lessonDate || '';
        };

        scheduleData.forEach((item, index) => {
            if (!item.isLesson) return;
            item.review1 = findNextAvailableReviewDate(index + offsets[0]);
            item.review2 = findNextAvailableReviewDate(index + offsets[1]);
            item.review3 = findNextAvailableReviewDate(index + offsets[2]);
            item.review4 = findNextAvailableReviewDate(index + offsets[3]);
            if (courseType === 'ket-pet') item.review5 = findNextAvailableReviewDate(index + offsets[4]);
        });
        
        let latestDate = new Date(0);
        scheduleData.forEach(item => {
            const allItemDates = [item.lessonDate, item.review1, item.review2, item.review3, item.review4, item.review5].filter(Boolean);
            allItemDates.forEach(dateStr => {
                const currentDate = stringToDate(dateStr);
                if (currentDate > latestDate) latestDate = currentDate;
            });
        });
        
        const dayAfterLastEvent = new Date(latestDate.getTime());
        dayAfterLastEvent.setDate(dayAfterLastEvent.getDate() + 1);
        const finalTestDate = findNextWorkDay(dayAfterLastEvent, scheduleDays || CLASS_SCHEDULE_DAYS['2-4'], extraHolidays);
        scheduleData.push({ isFinalTest: true, lessonName: "Final Test", lessonDate: formatDate(finalTestDate) });
        
        scheduleData.sort((a, b) => stringToDate(a.lessonDate) - stringToDate(b.lessonDate));
        return scheduleData;
    }
    
    function displaySchedule(scheduleData, courseType, quizletLinks = {}) {
        scheduleHeader.innerHTML = '';
        const headerRow = document.createElement('tr');
        let headers = ['Buổi', 'Bài học', 'Ngày học', 'Ôn lần 1', 'Ôn lần 2', 'Ôn lần 3', 'Ôn lần 4'];
        if (courseType === 'ket-pet') headers.push('Ôn lần 5');
        headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
        scheduleHeader.appendChild(headerRow);

        scheduleBody.innerHTML = '';
        let sessionCounter = 0;
        scheduleData.forEach(item => {
            const row = document.createElement('tr');
            if (item.isMiniTest) {
                sessionCounter++;
                row.classList.add('mini-test-day');
                row.innerHTML = `<td colspan="${headers.length}">(${sessionCounter}) 📝 ${item.lessonName} - ${item.lessonDate}</td>`;
            } else if (item.isFinalTest) {
                row.classList.add('final-test-day');
                row.innerHTML = `<td colspan="${headers.length}">🏆 ${item.lessonName} - ${item.lessonDate}</td>`;
            } else { // isLesson
                sessionCounter++;
                const hasQuizletLink = quizletLinks && quizletLinks[item.lessonKey];
                let rowHTML = `
                    <td>${sessionCounter}</td>
                    <td class="lesson-name-cell">
                        <span class="lesson-name-text" contenteditable="false" data-original-name="${item.lessonName}">${item.lessonName}</span>
                        <div class="lesson-actions" data-lesson-key="${item.lessonKey}">
                            <button class="btn-report" title="Tạo báo cáo buổi học">📢</button> 
                            
                            <button class="quizlet-btn ${hasQuizletLink ? 'active' : ''}"  title="Quản lý link Quizlet">🗂️</button>
                            <button class="edit-lesson-btn" title="Quản lý buổi học">✏️</button>
                            <button class="confirm-lesson-btn hidden" title="Xác nhận">✔️</button>
                            <button class="cancel-lesson-btn hidden" title="Hủy">❌</button>
                        </div>
                    </td>
                    <td>${item.lessonDate}</td>
                    <td>${item.review1 || ''}</td>
                    <td>${item.review2 || ''}</td>
                    <td>${item.review3 || ''}</td>
                    <td>${item.review4 || ''}</td>
                `;
                if (courseType === 'ket-pet') rowHTML += `<td>${item.review5 || ''}</td>`;
                row.innerHTML = rowHTML;
            }
            scheduleBody.appendChild(row);
        });
    }

    const displayTodaySummary = (scheduleData) => {
        const todayString = formatDate(new Date());
        const lessonsForToday = [];
        const reviewsForToday = [];
        let testMessage = '';

        for (const item of scheduleData) {
            if (item.lessonDate === todayString) {
                if(item.isMiniTest) testMessage = '🔔 Hôm nay có Mini Test nhé!';
                if(item.isFinalTest) testMessage = '🏆 Chúc các bạn thi tốt trong ngày Final Test!';
                if(item.isLesson) lessonsForToday.push(item.lessonName);
            }
            if(item.isLesson) {
                if (item.review1 === todayString) reviewsForToday.push(`"${item.lessonName}" (ôn lần 1)`);
                if (item.review2 === todayString) reviewsForToday.push(`"${item.lessonName}" (ôn lần 2)`);
                if (item.review3 === todayString) reviewsForToday.push(`"${item.lessonName}" (ôn lần 3)`);
                if (item.review4 === todayString) reviewsForToday.push(`"${item.lessonName}" (ôn lần 4)`);
                if (item.review5 === todayString) reviewsForToday.push(`"${item.lessonName}" (ôn lần 5)`);
            }
        }
        
        let summaryHTML = '<h2>🗓️ Lịch Hôm Nay</h2>';
        if (testMessage) {
             summaryHTML += `<p class="no-class-message">${testMessage}</p>`;
        } else if (lessonsForToday.length === 0 && reviewsForToday.length === 0) {
            summaryHTML += '<p class="no-class-message">Hôm nay lớp mình chưa tới ngày học nè 🎉</p>';
        } else {
            if (lessonsForToday.length > 0) summaryHTML += `<strong>📚 Bài học mới:</strong><ul>${lessonsForToday.map(l => `<li>${l}</li>`).join('')}</ul>`;
            if (reviewsForToday.length > 0) summaryHTML += `<strong>📝 Nội dung ôn tập:</strong><ul>${[...new Set(reviewsForToday)].map(r => `<li>${r}</li>`).join('')}</ul>`;
        }
        todaySummary.innerHTML = summaryHTML;
    };
    
    function showSummaryForDate(dateStr) {
        const lessonsForDay = [];
        const reviewsForDay = [];
        let testMessage = '';
        for (const item of currentScheduleData) {
            if (item.lessonDate === dateStr) {
                if (item.isMiniTest) testMessage = '🔔 Đây là ngày Mini Test của lớp.';
                if (item.isFinalTest) testMessage = '🏆 Đây là ngày Final Test của lớp.';
                if (item.isLesson) lessonsForDay.push(item.lessonName);
            }
            if(item.isLesson) {
                if (item.review1 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 1)`);
                if (item.review2 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 2)`);
                if (item.review3 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 3)`);
                if (item.review4 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 4)`);
                if (item.review5 === dateStr) reviewsForDay.push(`"${item.lessonName}" (ôn lần 5)`);
            }
        }
        let summaryHTML = '';
        if (testMessage) summaryHTML = `<p>${testMessage}</p>`;
        else if (lessonsForDay.length === 0 && reviewsForDay.length === 0) summaryHTML = '<p>🎉 Không có lịch học hay ôn tập vào ngày này.</p>';
        else {
            if (lessonsForDay.length > 0) summaryHTML += `<strong>📚 Bài học mới:</strong><ul>${lessonsForDay.map(l => `<li>${l}</li>`).join('')}</ul>`;
            if (reviewsForDay.length > 0) summaryHTML += `<strong>📝 Nội dung ôn tập:</strong><ul>${[...new Set(reviewsForDay)].map(r => `<li>${r}</li>`).join('')}</ul>`;
        }
        lookupSummary.innerHTML = summaryHTML;
    }

    // ============================================================
    // 9. XỬ LÝ HỌC VIÊN & CHI TIẾT (STUDENT LOGIC)
    // ============================================================
    const getStudentsRef = (classId) => db.collection('users').doc(currentUser.uid).collection('classes').doc(classId).collection('students');

    const loadStudents = async (classId) => {
        studentListContainer.innerHTML = '<p>Đang tải...</p>';
        try {
            const snapshot = await getStudentsRef(classId).orderBy('name').get();
            currentClassStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderStudentList();
        } catch (error) {
            console.error("Lỗi tải DS học viên:", error);
            studentListContainer.innerHTML = '<p>Lỗi tải dữ liệu.</p>';
        }
    };

    const renderStudentList = () => {
        studentListContainer.innerHTML = '';
        if (currentClassStudents.length === 0) {
            studentListContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Chưa có học viên nào. Hãy thêm học viên mới!</p>';
            return;
        }

        currentClassStudents.forEach(stu => {
            const level = Math.floor(stu.exp / XP_PER_LEVEL) + 1;
            const expInLevel = stu.exp % XP_PER_LEVEL;
            const rankName = RANKS[Math.min(level - 1, RANKS.length - 1)];
            const percent = (expInLevel / XP_PER_LEVEL) * 100;

            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <div class="student-card-actions">
                    <button class="btn-icon-small btn-edit-stu" title="Sửa thông tin">✏️</button>
                    <button class="btn-icon-small btn-delete-stu" title="Xóa học viên">🗑️</button>
                </div>
                <div class="avatar-wrapper">
                    <img src="${stu.avatar}" alt="${stu.name}">
                </div>
                <h3>${stu.name}</h3>
                <span class="level-badge">Level ${level}: ${rankName}</span>
                <div style="margin-top: 10px; text-align: left;">
                    <small>EXP: ${stu.exp}</small>
                    <div class="xp-progress-mini">
                        <div class="xp-fill-mini" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
            // Click card -> Chi tiết
            card.addEventListener('click', () => openStudentDetail(stu));

            // Click nút Sửa/Xóa -> Dừng nổi bọt (stopPropagation)
            const btnEdit = card.querySelector('.btn-edit-stu');
            const btnDelete = card.querySelector('.btn-delete-stu');
            
            btnEdit.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditStudentModal(stu);
            });
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteStudentModal(stu);
            });

            studentListContainer.appendChild(card);
        });
    };

    const openStudentDetail = (student) => {
        currentStudentId = student.id;
        detailStudentName.textContent = student.name;
        detailStudentAvatar.src = student.avatar;
        updateStudentUIStats(student);
        renderStudentProgressTable(student);
        showPage('student-detail-page');
    };

    const updateStudentUIStats = (student) => {
        const level = Math.floor(student.exp / XP_PER_LEVEL) + 1;
        const expInLevel = student.exp % XP_PER_LEVEL;
        const rankName = RANKS[Math.min(level - 1, RANKS.length - 1)];
        const percent = (expInLevel / XP_PER_LEVEL) * 100;
        detailStudentRank.textContent = `Danh hiệu: ${rankName} (Level ${level})`;
        detailXpText.textContent = `${expInLevel}/${XP_PER_LEVEL} EXP`;
        detailXpBar.style.width = `${percent}%`;
    };

    const renderStudentProgressTable = (student) => {
        studentProgressBody.innerHTML = '';
        const selectedClass = allClasses.find(c => c.id === currentClassId);
        const baseSchedule = generateSchedule(selectedClass); 
        const dailyStatus = student.dailyStatus || {}; 
        const currentReviewOffsets = selectedClass.courseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF; 
        let allTasks = [];

        baseSchedule.forEach(item => {
            if (!item.isLesson) return;
            const lessonDate = stringToDate(item.lessonDate);
            if (!lessonDate || isNaN(lessonDate.getTime())) return;

            // Bài mới
            allTasks.push({
                date: lessonDate,
                dateStr: item.lessonDate,
                content: item.lessonName,
                type: 'new',
                lessonKey: item.lessonKey
            });

            // Bài ôn
            currentReviewOffsets.forEach((offset, index) => {
                const reviewDate = new Date(lessonDate);
                reviewDate.setDate(reviewDate.getDate() + offset);
                allTasks.push({
                    date: reviewDate,
                    dateStr: formatDate(reviewDate),
                    content: item.lessonName,
                    type: 'review',
                    stage: index + 1,
                    lessonKey: item.lessonKey
                });
            });
        });

        const grouped = {};
        allTasks.forEach(task => {
            if (!grouped[task.dateStr]) {
                grouped[task.dateStr] = {
                    dateObj: task.date,
                    tasks: [],
                    newLessonKeys: []
                };
            }
            grouped[task.dateStr].tasks.push(task);
            if (task.type === 'new') grouped[task.dateStr].newLessonKeys.push(task.lessonKey);
        });

        const sortedDates = Object.keys(grouped).sort((a, b) => grouped[a].dateObj - grouped[b].dateObj);
        const today = new Date(); today.setHours(0,0,0,0);

        sortedDates.forEach(dateStr => {
            const groupData = grouped[dateStr];
            const isDone = dailyStatus[dateStr] === true;
            const isToday = groupData.dateObj.getTime() === today.getTime();
            const tr = document.createElement('tr');
            if (isDone) tr.classList.add('task-done');

            let dateHtml = `<div class="task-date ${isToday ? 'is-today' : ''}">${dateStr}`;
            if (isToday) dateHtml += `<span class="today-badge">Hôm nay</span>`;
            dateHtml += `</div>`;

            let contentHtml = `<ul class="task-list">`;
            groupData.tasks.forEach(t => {
                let badge = t.type === 'new' 
                    ? `<span class="task-badge badge-new">✨ Bài mới</span>`
                    : `<span class="task-badge badge-review">🚀 Ôn lần ${t.stage}</span>`;
                contentHtml += `<li class="task-item"><span class="task-name">${t.content}</span>${badge}</li>`;
            });
            contentHtml += `</ul>`;

            const checkboxHtml = `
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" class="daily-checkbox" 
                        data-date="${dateStr}"
                        data-new-keys='${JSON.stringify(groupData.newLessonKeys)}'
                        ${isDone ? 'checked' : ''}>
                </div>
            `;
            tr.innerHTML = `<td style="vertical-align: top;">${dateHtml}</td><td style="vertical-align: top;">${contentHtml}</td><td style="vertical-align: middle;">${checkboxHtml}</td>`;
            studentProgressBody.appendChild(tr);
        });

        document.querySelectorAll('.daily-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => handleCheckDaily(e, student));
        });
    };

    const handleCheckDaily = async (e, student) => {
        const checkbox = e.target;
        const dateStr = checkbox.dataset.date;
        const isChecked = checkbox.checked;
        const newLessonKeys = JSON.parse(checkbox.dataset.newKeys || "[]");
        
        let newExp = student.exp;
        let newCompleted = { ...student.completedLessons };
        let newDailyStatus = { ...(student.dailyStatus || {}) };

        if (isChecked) {
            newDailyStatus[dateStr] = true;
            newExp += XP_PER_LESSON;
            newLessonKeys.forEach(key => {
                if (!newCompleted[key]) newCompleted[key] = dateStr;
            });
        } else {
            delete newDailyStatus[dateStr];
            newExp = Math.max(0, newExp - XP_PER_LESSON);
            newLessonKeys.forEach(key => delete newCompleted[key]);
        }

        student.exp = newExp;
        student.completedLessons = newCompleted;
        student.dailyStatus = newDailyStatus;

        updateStudentUIStats(student);
        renderStudentProgressTable(student);

        try {
            await getStudentsRef(currentClassId).doc(student.id).update({
                exp: newExp,
                completedLessons: newCompleted,
                dailyStatus: newDailyStatus
            });
        } catch (err) {
            console.error("Lỗi lưu tiến độ:", err);
            alert("Lỗi kết nối server!");
            checkbox.checked = !isChecked; // Revert UI check
        }
    };

    // ============================================================
    // 10. SỰ KIỆN GIAO DIỆN (EVENT LISTENERS)
    // ============================================================
    btnGoogleLogin.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => console.error("Lỗi đăng nhập Google:", error));
    });
    btnLogout.addEventListener('click', () => auth.signOut());

    document.getElementById('btn-show-create-form').addEventListener('click', () => {
        editingClassId = null;
        formTitle.textContent = '➕ Tạo Lớp Học Mới';
        classForm.reset();
        customDaysContainer.style.display = 'none'; // Ẩn Custom đi khi tạo mới
        customDayCheckboxes.forEach(cb => cb.checked = false); // Bỏ tick hết
        document.getElementById('start-date').valueAsDate = new Date();
        formErrorMessage.textContent = '';
        fileFeedback.textContent = 'Chưa có file nào được chọn.';
        uploadedLessons = [];
        const manualInputs = [startDateInput, classTypeInput, document.getElementById('num-units'), document.getElementById('lessons-per-unit'), document.getElementById('mini-test-dates')];
        manualInputs.forEach(input => input.disabled = false);
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

    // Sự kiện Click trong danh sách lớp (Sửa, Xóa, Điểm danh)
    classListContainer.addEventListener('click', async (e) => {
        const classInfo = e.target.closest('.class-info');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const attendanceBtn = e.target.closest('.btn-attendance');

        if (attendanceBtn) {
            currentClassId = attendanceBtn.dataset.id;
            const selectedClass = allClasses.find(c => c.id === currentClassId);
            document.getElementById('student-class-name').textContent = `🎓 Lớp ${selectedClass.name} - Học viên`;
            await loadStudents(currentClassId);
            showPage('student-list-page');
        } else if (deleteBtn) {
            deletingClassId = deleteBtn.dataset.id;
            deleteModal.style.display = 'flex';
        } else if (editBtn) {
            const classId = editBtn.dataset.id;
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if(selectedClass){
                editingClassId = classId;
                formTitle.textContent = '⚙️ Thiết Lập Thông Tin Lớp Học';
                classForm.reset();
                formErrorMessage.textContent = '';
                fileFeedback.textContent = 'Chưa có file nào được chọn.';
                
                document.getElementById('class-name').value = selectedClass.name;
                document.getElementById('course-type').value = selectedClass.courseType;
                document.getElementById('class-type').value = selectedClass.type;

                // --- THÊM ĐOẠN NÀY ĐỂ FILL DỮ LIỆU CUSTOM ---
if (selectedClass.type === 'custom') {
    customDaysContainer.style.display = 'block';
    // Reset checkbox trước
    customDayCheckboxes.forEach(cb => cb.checked = false);
    // Tick lại các ngày đã lưu
    if (selectedClass.customScheduleDays) {
        selectedClass.customScheduleDays.forEach(day => {
            // Tìm checkbox có value == day và tick nó
            const cb = document.querySelector(`input[name="custom-day"][value="${day}"]`);
            if (cb) cb.checked = true;
        });
    }
} else {
    customDaysContainer.style.display = 'none';
}

                const isFileUploaded = selectedClass.uploadedLessons?.length > 0;
                const manualInputs = [document.getElementById('num-units'), document.getElementById('lessons-per-unit'), startDateInput, document.getElementById('mini-test-dates')];
                
                if(isFileUploaded){
                    fileFeedback.textContent = `Lớp này đang dùng ${selectedClass.uploadedLessons.length} bài học từ file. Chọn file mới để thay thế.`;
                    uploadedLessons = selectedClass.uploadedLessons || [];
                    manualInputs.forEach(input => input.disabled = true);
                } else {
                    document.getElementById('num-units').value = selectedClass.numUnits;
                    document.getElementById('lessons-per-unit').value = selectedClass.lessonsPerUnit;
                    document.getElementById('start-date').value = selectedClass.startDate;
                    document.getElementById('mini-test-dates').value = selectedClass.miniTestDates ? selectedClass.miniTestDates.join(', ') : '';
                    manualInputs.forEach(input => input.disabled = false);
                }
                showPage('form-page');
            }
        } else if (classInfo) {
            const classId = classInfo.dataset.id;
            currentClassId = classId;
            tempPostponedDates = [];
            scheduleHistory = [];
            btnUndo.classList.add('hidden');
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if (selectedClass) {
                scheduleClassName.textContent = `🗓️ Lịch Học Chi Tiết - Lớp ${selectedClass.name}`;
                currentScheduleData = generateSchedule(selectedClass);
                displaySchedule(currentScheduleData, selectedClass.courseType, selectedClass.quizletLinks);
                displayTodaySummary(currentScheduleData);
                lookupDateInput.value = '';
                lookupSummary.innerHTML = '<p>Chọn một ngày để xem tóm tắt.</p>';
                showPage('schedule-details-page');
            }
        }
    });

    // Form Tạo/Sửa Lớp
    classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (formErrorMessage.textContent && !formErrorMessage.textContent.startsWith('⚠️')) return;
        
        const isFileUploaded = uploadedLessons.length > 0;
        const miniTestDatesRaw = document.getElementById('mini-test-dates').value;
        const parseAndFormatDates = (datesRaw) => {
            if (!datesRaw) return [];
            return datesRaw.split(',').map(d => {
                const parts = d.trim().split('/');
                if (parts.length !== 3) return null;
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }).filter(Boolean);
        };

        // --- THÊM ĐOẠN NÀY ---
let selectedCustomDays = [];
if (document.getElementById('class-type').value === 'custom') {
    customDayCheckboxes.forEach(cb => {
        if (cb.checked) selectedCustomDays.push(parseInt(cb.value));
    });
    
    // Validate: Bắt buộc chọn ít nhất 1 ngày
    if (selectedCustomDays.length === 0 && !isFileUploaded) {
        formErrorMessage.textContent = '⚠️ Vui lòng tick chọn ít nhất một ngày học!';
        return;
    }
}
        
        let classData = {
    name: document.getElementById('class-name').value,
    courseType: document.getElementById('course-type').value,
    type: document.getElementById('class-type').value,
    customScheduleDays: selectedCustomDays, // <--- THÊM DÒNG NÀY VÀO OBJECT
    uploadedLessons: uploadedLessons,
    numUnits: isFileUploaded ? 0 : document.getElementById('num-units').value,
    lessonsPerUnit: isFileUploaded ? 0 : document.getElementById('lessons-per-unit').value,
    startDate: isFileUploaded ? '' : document.getElementById('start-date').value,
    miniTestDates: isFileUploaded ? [] : parseAndFormatDates(miniTestDatesRaw),
};

        try {
            if (editingClassId) {
                const existingClass = allClasses.find(c => c.id === editingClassId);
                classData.customLessonNames = existingClass.customLessonNames || {};
                classData.quizletLinks = existingClass.quizletLinks || {};
                await getClassesRef().doc(editingClassId).update(classData);
            } else {
                classData.customLessonNames = {};
                classData.quizletLinks = {};
                await getClassesRef().add(classData);
            }
            await loadClassesFromFirestore();
            renderClassList();
            showPage('class-list-page');
        } catch (error) { console.error("Lỗi lưu lớp:", error); }
    });

    // Xử lý File Upload CSV
    scheduleFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        formErrorMessage.innerHTML = '';
        fileFeedback.textContent = 'Chưa có file nào được chọn.';
        uploadedLessons = []; 
        const manualInputs = [startDateInput, document.getElementById('num-units'), document.getElementById('lessons-per-unit'), document.getElementById('mini-test-dates')];

        if (!file) { manualInputs.forEach(input => input.disabled = false); return; }

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("File CSV cần ít nhất 2 dòng.");
                const delimiter = lines[0].includes(';') ? ';' : ',';
                const header = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
                const lessonCol = header.findIndex(h => h.includes('bài học') || h.includes('bai hoc'));
                const dateCol = header.findIndex(h => h.includes('ngày học') || h.includes('ngay hoc'));

                if (lessonCol === -1 || dateCol === -1) throw new Error("Thiếu cột 'Bài học' hoặc 'Ngày học'.");

                const dataLines = lines.slice(1);
                const parsedLessons = dataLines.map(line => {
                    const parts = line.split(delimiter);
                    const name = (parts[lessonCol] || '').trim().replace(/"/g, '');
                    const dateRaw = (parts[dateCol] || '').trim().replace(/"/g, '');
                    if (!name || !dateRaw || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) return null;
                    const dateParts = dateRaw.split('/');
                    const date = `${dateParts[0].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[2]}`;
                    const type = (name.toLowerCase().includes('mini test') || name.toLowerCase().includes('project')) ? 'miniTest' : 'lesson';
                    return { name, date, type };
                }).filter(Boolean);

                if (parsedLessons.length === 0) throw new Error('Không tìm thấy dữ liệu hợp lệ.');
                uploadedLessons = parsedLessons;
                fileFeedback.textContent = `✅ Đã chọn file: ${file.name} (${uploadedLessons.length} buổi học).`;
                fileFeedback.style.color = 'green';
                manualInputs.forEach(input => input.disabled = true);
                
                const isKetPet = uploadedLessons.some(item => item.name.toUpperCase().includes('KET') || item.name.toUpperCase().includes('PET'));
                document.getElementById('course-type').value = isKetPet ? 'ket-pet' : 'starters-movers-flyers';

                const uniqueDays = [...new Set(parsedLessons.map(lesson => stringToDate(lesson.date).getDay()))].sort();
                let detectedType = '';
                for (const [key, value] of Object.entries(CLASS_SCHEDULE_DAYS)) {
                    if (JSON.stringify(value.sort()) === JSON.stringify(uniqueDays)) { detectedType = key; break; }
                }
                if (detectedType) classTypeInput.value = detectedType;

            } catch (error) {
                formErrorMessage.textContent = `❌ ${error.message}`; 
                fileFeedback.textContent = 'Chưa có file nào được chọn.';
                fileFeedback.style.color = '#dc3545';
                uploadedLessons = [];
                manualInputs.forEach(input => input.disabled = false);
            }
        };
        reader.readAsText(file);
    });

    // Sự kiện Thêm Học Viên Mới
    btnAddStudent.addEventListener('click', () => {
        addStudentForm.reset();
        avatarPreviewImg.src = "https://via.placeholder.com/100";
        addStudentModal.style.display = 'flex';
    });
    btnCancelAddStudent.addEventListener('click', () => addStudentModal.style.display = 'none');
    newStudentAvatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => avatarPreviewImg.src = ev.target.result;
            reader.readAsDataURL(file);
        }
    });
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-student-name').value;
        const file = newStudentAvatarInput.files[0];
        if (!file) { alert("Vui lòng chọn ảnh đại diện!"); return; }
        const submitBtn = addStudentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true; submitBtn.textContent = "Đang xử lý...";

        resizeImageToDataURL(file, 200, 200, async (base64Img) => {
            try {
                await getStudentsRef(currentClassId).add({ name: name, avatar: base64Img, exp: 0, completedLessons: {} });
                addStudentModal.style.display = 'none';
                loadStudents(currentClassId);
            } catch (err) { console.error(err); alert("Lỗi thêm học viên"); } 
            finally { submitBtn.disabled = false; submitBtn.textContent = "Lưu"; }
        });
    });

    // Sự kiện Sửa Học Viên
    editStudentAvatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => editAvatarPreviewImg.src = ev.target.result;
            reader.readAsDataURL(file);
        }
    });
    btnCancelEditStudent.addEventListener('click', () => editStudentModal.style.display = 'none');

    // Hàm mở modal sửa
    const openEditStudentModal = (student) => {
        editStudentIdInput.value = student.id;
        editStudentNameInput.value = student.name;
        editAvatarPreviewImg.src = student.avatar;
        editStudentAvatarInput.value = '';
        editStudentModal.style.display = 'flex';
    };

    editStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = editStudentIdInput.value;
        const newName = editStudentNameInput.value;
        const file = editStudentAvatarInput.files[0];
        const submitBtn = editStudentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true; submitBtn.textContent = "Đang lưu...";

        const updateData = { name: newName };
        const save = async (data) => {
            try {
                await getStudentsRef(currentClassId).doc(studentId).update(data);
                editStudentModal.style.display = 'none';
                loadStudents(currentClassId);
            } catch (err) { console.error(err); alert("Lỗi cập nhật!"); } 
            finally { submitBtn.disabled = false; submitBtn.textContent = "Lưu Thay Đổi"; }
        };

        if (file) {
            resizeImageToDataURL(file, 200, 200, (base64Img) => {
                updateData.avatar = base64Img;
                save(updateData);
            });
        } else { save(updateData); }
    });

    // Sự kiện Xóa Học Viên
    btnCancelDeleteStudent.addEventListener('click', () => deleteStudentModal.style.display = 'none');
    
    const openDeleteStudentModal = (student) => {
        deletingStudentId = student.id;
        deleteStudentNameDisplay.textContent = student.name;
        deleteStudentModal.style.display = 'flex';
    };

    btnConfirmDeleteStudent.addEventListener('click', async () => {
        if (!deletingStudentId) return;
        const btn = btnConfirmDeleteStudent;
        btn.disabled = true; btn.textContent = "Đang xóa...";
        try {
            await getStudentsRef(currentClassId).doc(deletingStudentId).delete();
            deleteStudentModal.style.display = 'none';
            loadStudents(currentClassId);
        } catch (error) { console.error(error); alert("Lỗi xóa!"); } 
        finally { btn.disabled = false; btn.textContent = "Xóa luôn"; deletingStudentId = null; }
    });

    // Các sự kiện khác (Menu Lịch, Quizlet...)
    scheduleBody.addEventListener('click', async (e) => {
        const target = e.target;
        const button = target.closest('button');
        if (!button) return;
        const actionsDiv = button.closest('.lesson-actions');
        if (!actionsDiv) return;
        const lessonKey = actionsDiv.dataset.lessonKey;

        if (button.matches('.confirm-lesson-btn') || button.matches('.cancel-lesson-btn')) {
            const lessonCell = actionsDiv.closest('.lesson-name-cell');
            const lessonTextSpan = lessonCell.querySelector('.lesson-name-text');
            const editBtn = actionsDiv.querySelector('.edit-lesson-btn');
            const confirmBtn = actionsDiv.querySelector('.confirm-lesson-btn');
            const cancelBtn = actionsDiv.querySelector('.cancel-lesson-btn');
            lessonTextSpan.setAttribute('contenteditable', 'false');
            editBtn.classList.remove('hidden');
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');

            if (button.matches('.confirm-lesson-btn')) {
                const newName = lessonTextSpan.textContent.trim();
                if (currentClassId && lessonKey && newName && newName !== lessonTextSpan.dataset.originalName) {
                    try {
                        await getClassesRef().doc(currentClassId).update({ [`customLessonNames.${lessonKey}`]: newName });
                        const localClass = allClasses.find(c => c.id === currentClassId);
                        if (!localClass.customLessonNames) localClass.customLessonNames = {};
                        localClass.customLessonNames[lessonKey] = newName;
                        const localItem = currentScheduleData.find(item => item.lessonKey === lessonKey);
                        if (localItem) localItem.lessonName = newName;
                        displayTodaySummary(currentScheduleData);
                        lessonTextSpan.dataset.originalName = newName;
                    } catch (error) { lessonTextSpan.textContent = lessonTextSpan.dataset.originalName; }
                } else { lessonTextSpan.textContent = lessonTextSpan.dataset.originalName; }
            } else { lessonTextSpan.textContent = lessonTextSpan.dataset.originalName; }
        } else if (button.matches('.edit-lesson-btn')) {
            activeLessonCell = button.closest('.lesson-name-cell');
            pencilMenuModal.style.top = `${e.clientY + 5}px`;
            pencilMenuModal.style.left = `${e.clientX - 100}px`;
            pencilMenuModal.style.display = 'block';
            quizletMenuModal.style.display = 'none';
        } else if (button.matches('.quizlet-btn')) {
            activeLessonKey = lessonKey;
            const selectedClass = allClasses.find(c => c.id === currentClassId);
            const hasLink = selectedClass && selectedClass.quizletLinks && selectedClass.quizletLinks[activeLessonKey];
            menuOpenQuizlet.style.display = hasLink ? 'block' : 'none';
            menuAddEditQuizlet.textContent = hasLink ? '✏️ Sửa/Xóa Link Quizlet' : '➕ Thêm Link Quizlet';
            quizletMenuModal.style.top = `${e.clientY + 5}px`;
            quizletMenuModal.style.left = `${e.clientX - 100}px`;
            quizletMenuModal.style.display = 'block';
            pencilMenuModal.style.display = 'none';
        }
    });

    menuEditName.addEventListener('click', () => {
        pencilMenuModal.style.display = 'none';
        if (!activeLessonCell) return;
        const lessonTextSpan = activeLessonCell.querySelector('.lesson-name-text');
        const actionsDiv = activeLessonCell.querySelector('.lesson-actions');
        lessonTextSpan.setAttribute('contenteditable', 'true');
        lessonTextSpan.focus();
        document.execCommand('selectAll', false, null);
        actionsDiv.querySelector('.edit-lesson-btn').classList.add('hidden');
        actionsDiv.querySelector('.confirm-lesson-btn').classList.remove('hidden');
        actionsDiv.querySelector('.cancel-lesson-btn').classList.remove('hidden');
    });

    menuPostponeSession.addEventListener('click', () => {
        pencilMenuModal.style.display = 'none';
        if (!activeLessonCell) return;
        scheduleHistory.push(JSON.parse(JSON.stringify(currentScheduleData)));
        const row = activeLessonCell.parentElement;
        const lessonDateStr = row.cells[2]?.textContent || row.cells[0].textContent.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)[0];
        if (lessonDateStr && !tempPostponedDates.includes(lessonDateStr)) tempPostponedDates.push(lessonDateStr);
        const selectedClass = allClasses.find(cls => cls.id === currentClassId);
        if (selectedClass) {
            currentScheduleData = generateSchedule(selectedClass, tempPostponedDates);
            displaySchedule(currentScheduleData, selectedClass.courseType, selectedClass.quizletLinks);
            displayTodaySummary(currentScheduleData);
            btnUndo.classList.remove('hidden');
        }
    });

    menuOpenQuizlet.addEventListener('click', () => {
        quizletMenuModal.style.display = 'none';
        const selectedClass = allClasses.find(c => c.id === currentClassId);
        const url = selectedClass.quizletLinks[activeLessonKey];
        if (url) window.open(url, '_blank');
    });

    menuAddEditQuizlet.addEventListener('click', () => {
        quizletMenuModal.style.display = 'none';
        const selectedClass = allClasses.find(c => c.id === currentClassId);
        const currentLink = selectedClass.quizletLinks?.[activeLessonKey] || '';
        quizletLinkInput.value = currentLink;
        quizletLinkInput.dispatchEvent(new Event('input'));
        quizletLinkModal.style.display = 'flex';
    });

    btnUndo.addEventListener('click', () => {
        if (scheduleHistory.length > 0) {
            currentScheduleData = scheduleHistory.pop();
            tempPostponedDates.pop();
            const selectedClass = allClasses.find(cls => cls.id === currentClassId);
            displaySchedule(currentScheduleData, selectedClass.courseType, selectedClass.quizletLinks);
            displayTodaySummary(currentScheduleData);
            if (scheduleHistory.length === 0) btnUndo.classList.add('hidden');
        }
    });

    quizletLinkInput.addEventListener('input', () => {
        const link = quizletLinkInput.value.trim();
        if (link === '') {
            quizletLinkFeedback.textContent = 'Để trống và Lưu để xóa link.';
            quizletLinkFeedback.className = '';
            btnSaveQuizletLink.disabled = false;
        } else if (isValidQuizletLink(link)) {
            quizletLinkFeedback.textContent = '✅ Link hợp lệ.';
            quizletLinkFeedback.className = 'valid';
            btnSaveQuizletLink.disabled = false;
        } else {
            quizletLinkFeedback.textContent = '❌ Link phải bắt đầu bằng https://quizlet.com/';
            quizletLinkFeedback.className = 'invalid';
            btnSaveQuizletLink.disabled = true;
        }
    });

    btnSaveQuizletLink.addEventListener('click', async () => {
        const newLink = quizletLinkInput.value.trim();
        const selectedClass = allClasses.find(c => c.id === currentClassId);
        try {
            if (newLink === '') {
                await getClassesRef().doc(currentClassId).update({ [`quizletLinks.${activeLessonKey}`]: firebase.firestore.FieldValue.delete() });
                if (selectedClass.quizletLinks) delete selectedClass.quizletLinks[activeLessonKey];
            } else {
                await getClassesRef().doc(currentClassId).update({ [`quizletLinks.${activeLessonKey}`]: newLink });
                if (!selectedClass.quizletLinks) selectedClass.quizletLinks = {};
                selectedClass.quizletLinks[activeLessonKey] = newLink;
            }
            displaySchedule(currentScheduleData, selectedClass.courseType, selectedClass.quizletLinks);
        } catch (error) { console.error(error); alert('Lỗi lưu link.'); }
        quizletLinkModal.style.display = 'none';
    });
    btnCancelQuizletLink.addEventListener('click', () => quizletLinkModal.style.display = 'none');

    document.addEventListener('click', (e) => {
        if (pencilMenuModal && !pencilMenuModal.contains(e.target) && !e.target.matches('.edit-lesson-btn')) pencilMenuModal.style.display = 'none';
        if (quizletMenuModal && !quizletMenuModal.contains(e.target) && !e.target.matches('.quizlet-btn')) quizletMenuModal.style.display = 'none';
    });

    lookupDateInput.addEventListener('change', () => {
        if (!lookupDateInput.value) { lookupSummary.innerHTML = '<p>Chọn một ngày để xem tóm tắt.</p>'; return; }
        showSummaryForDate(formatDate(new Date(lookupDateInput.value + 'T00:00:00')));
    });

    btnConfirmDelete.addEventListener('click', async () => {
        if (!deletingClassId) return;
        try { await getClassesRef().doc(deletingClassId).delete(); } catch (error) { console.error(error); }
        await loadClassesFromFirestore(); renderClassList(); deleteModal.style.display = 'none';
    });
    btnCancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');

    classTypeInput.addEventListener('change', () => {
    // 1. Logic hiện/ẩn Custom Days
    if (classTypeInput.value === 'custom') {
        customDaysContainer.style.display = 'block';
        formErrorMessage.textContent = ''; // Reset lỗi khi chuyển sang custom
    } else {
        customDaysContainer.style.display = 'none';
        
        // 2. Logic kiểm tra ngày khai giảng cho các lớp Cố định (Logic cũ)
        const allowedDays = CLASS_SCHEDULE_DAYS[classTypeInput.value];
        if (startDateInput.value) {
            const selectedDate = new Date(startDateInput.value + 'T00:00:00');
            if (!allowedDays.includes(selectedDate.getDay())) {
                formErrorMessage.textContent = 'Lưu ý: Ngày khai giảng không trùng với lịch học cố định (nhưng hệ thống vẫn sẽ tìm ngày học gần nhất).';
            } else {
                formErrorMessage.textContent = '';
            }
        }
    }
});
    startDateInput.addEventListener('change', () => classTypeInput.dispatchEvent(new Event('change')));

    showCsvGuideBtn.addEventListener('click', () => csvGuideModal.style.display = 'flex');
    closeCsvGuideBtn.addEventListener('click', () => csvGuideModal.style.display = 'none');
    csvGuideModal.addEventListener('click', (e) => { if (e.target === csvGuideModal) csvGuideModal.style.display = 'none'; });

// --- LOGIC BÁO BÀI (CLASS REPORT) ---
    const reportModal = document.getElementById('report-modal');
    const reportContentTextarea = document.getElementById('report-content');
    const btnCopyReport = document.getElementById('btn-copy-report');
    const btnCloseReport = document.getElementById('btn-close-report');
    const copyStatus = document.getElementById('copy-status');

    // Hàm tạo nội dung báo cáo
    const generateReportContent = (currentLessonKey) => {
        // 1. Tìm thông tin buổi học hiện tại
        const currentIndex = currentScheduleData.findIndex(item => item.lessonKey === currentLessonKey);
        if (currentIndex === -1) return '';
        
        const currentItem = currentScheduleData[currentIndex];
        const currentDateStr = currentItem.lessonDate; // DD/MM/YYYY
        const currentDateObj = stringToDate(currentDateStr);

        // 2. Tìm bài cũ đã ôn hôm nay (Review Today)
        const reviewTodayList = [];
        currentScheduleData.forEach(item => {
            if (!item.isLesson) return;
            // Kiểm tra xem bài này có lịch ôn rơi vào hôm nay không
            if ([item.review1, item.review2, item.review3, item.review4, item.review5].includes(currentDateStr)) {
                reviewTodayList.push(item.lessonName);
            }
        });

        // 3. Xác định buổi học tiếp theo
        let nextSessionItem = null;
        for (let i = currentIndex + 1; i < currentScheduleData.length; i++) {
            if (currentScheduleData[i].isLesson || currentScheduleData[i].isMiniTest || currentScheduleData[i].isFinalTest) {
                nextSessionItem = currentScheduleData[i];
                break;
            }
        }

        // 4. Tìm các bài cần ôn TẠI NHÀ (Logic Mới: Tính theo ngày thực tế)
        let tasksInRange = [];
        let nextDateStr = "Chưa xác định";

        if (nextSessionItem) {
            nextDateStr = nextSessionItem.lessonDate;
            const nextDateObj = stringToDate(nextDateStr);

            // Lấy cấu hình ngày ôn dựa trên loại lớp (KET/PET hay SMF)
            const selectedClass = allClasses.find(c => c.id === currentClassId);
            const offsets = (selectedClass && selectedClass.courseType === 'ket-pet') 
                            ? REVIEW_OFFSETS_KET  // [1, 2, 4, 8, 16]
                            : REVIEW_OFFSETS_SMF; // [1, 3, 6, 10]

            // Quét tất cả các bài đã học để tính ngày rơi điểm rơi phong độ
            currentScheduleData.forEach(item => {
                if (!item.isLesson) return;
                
                const itemDateObj = stringToDate(item.lessonDate);
                
                // Tính toán lại ngày ôn theo công thức: Ngày học + Offset (ngày)
                offsets.forEach((daysToAdd, index) => {
                    // Tạo ngày ôn dự kiến
                    const reviewDate = new Date(itemDateObj.getTime());
                    reviewDate.setDate(reviewDate.getDate() + daysToAdd);
                    
                    // KIỂM TRA: Ngày ôn có nằm lọt thỏm giữa "Hôm nay" và "Buổi tới" không?
                    // Logic: Hôm nay < Ngày ôn < Buổi tới
                    if (reviewDate.getTime() > currentDateObj.getTime() && reviewDate.getTime() < nextDateObj.getTime()) {
                        
                        tasksInRange.push({
                            dateObj: reviewDate,
                            dateStr: formatDate(reviewDate).substring(0, 5), // Lấy dd/mm
                            name: item.lessonName,
                            type: `Ôn lần ${index + 1}`
                        });
                    }
                });
            });

            // Sắp xếp danh sách task theo thứ tự ngày tăng dần
            tasksInRange.sort((a, b) => a.dateObj - b.dateObj);
        }

        // 5. Tạo mẫu văn bản
        let report = `📅 *BÁO CÁO HỌC TẬP - ${currentDateStr}*\n`;
        report += `--------------------------------\n`;
        
        // Phần 1: Hôm nay học gì
        report += `✅ *Hôm nay lớp đã học:*\n`;
        report += `   • Bài mới: ${currentItem.lessonName}\n`;
        if (reviewTodayList.length > 0) {
            reviewTodayList.forEach(name => report += `   • Ôn tập: ${name}\n`);
        } else {
            report += `   • (Không có bài cũ cần ôn hôm nay)\n`;
        }

        // Phần 2: Nhiệm vụ về nhà
        report += `\n🏠 *Nhiệm vụ ôn tập tại nhà:*\n`;
        report += `(Từ nay đến trước buổi học tới)\n`;
        
        if (tasksInRange.length > 0) {
            tasksInRange.forEach(task => {
                // Ví dụ: ▫ 30/09: Greetings (Ôn lần 1)
                report += `   ▫ ${task.dateStr}: ${task.name} (${task.type})\n`;
            });
        } else {
            report += `   ▫ Các con nghỉ ngơi, không có lịch ôn xen kẽ.\n`;
        }

        // Phần 3: Buổi sau
        if (nextSessionItem) {
            report += `\n🔜 *Buổi học tiếp theo (${nextDateStr}):*\n`;
            report += `   • Chuẩn bị: ${nextSessionItem.lessonName}\n`;
            if (nextSessionItem.isMiniTest) report += `   🔔 LƯU Ý: CÓ BÀI KIỂM TRA MINI TEST!\n`;
        }

        report += `\n👩‍🏫 *Nhận xét giáo viên:* \n`;
        report += `   ........................................`;

        return report;
    };

    // Sự kiện Click nút Báo bài trong bảng
    scheduleBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-report');
        if (btn) {
            const actionsDiv = btn.closest('.lesson-actions');
            const lessonKey = actionsDiv.dataset.lessonKey;
            
            const content = generateReportContent(lessonKey);
            reportContentTextarea.value = content;
            copyStatus.style.display = 'none';
            reportModal.style.display = 'flex';
        }
    });

    // Sự kiện nút Copy
    btnCopyReport.addEventListener('click', () => {
        reportContentTextarea.select();
        reportContentTextarea.setSelectionRange(0, 99999); // Cho mobile
        navigator.clipboard.writeText(reportContentTextarea.value).then(() => {
            copyStatus.style.display = 'block';
            setTimeout(() => copyStatus.style.display = 'none', 3000);
        });
    });

    // Sự kiện đóng modal
    btnCloseReport.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });

    // Click ra ngoài để đóng
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) reportModal.style.display = 'none';
    });    

});

