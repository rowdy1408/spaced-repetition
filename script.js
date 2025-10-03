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
    const classListContainer = document.getElementById('class-list-container');
    const scheduleClassName = document.getElementById('schedule-class-name');
    const scheduleHeader = document.getElementById('schedule-header');
    const scheduleBody = document.getElementById('schedule-body');
    const lookupDateInput = document.getElementById('lookup-date');
    const lookupSummary = document.getElementById('lookup-summary');
    const todaySummary = document.getElementById('today-summary');
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
    const pencilMenuModal = document.getElementById('pencil-menu-modal');
    const menuEditName = document.getElementById('menu-edit-name');
    const menuPostponeSession = document.getElementById('menu-postpone-session');
    const btnUndo = document.getElementById('btn-undo');
    
    // --- BIẾN TRẠNG THÁI ---
    let allClasses = [];
    let currentScheduleData = [];
    let currentUser = null;
    let editingClassId = null;
    let deletingClassId = null;
    let currentClassId = null;
    let uploadedLessons = [];
    let tempPostponedDates = [];
    let activeLessonCell = null;
    let lastScheduleState = null;
    let lastPostponedDate = null;

    // --- CẤU HÌNH LỊCH HỌC & NGÀY LỄ ---
    const CLASS_SCHEDULE_DAYS = { '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] };
    const REVIEW_OFFSETS_SMF = [1, 3, 6, 10];
    const REVIEW_OFFSETS_KET = [1, 2, 4, 8, 16];
    const VIETNAMESE_HOLIDAYS_FIXED = ['01-01', '04-30', '05-01', '09-02'];
    const LUNAR_NEW_YEAR_DATES = [
        '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01',
        '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
    ];

    // --- HÀM TRỢ GIÚP ---
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
    
    // --- CÁC HÀM CHÍNH ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContent.style.display = 'block';
            userInfo.innerHTML = `Xin chào, <strong>${user.displayName}</strong>!`;
            loadClassesFromFirestore().then(() => showPage('home-page'));
        } else {
            currentUser = null;
            loginPage.style.display = 'block';
            appContent.style.display = 'none';
        }
    });

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
            classListContainer.innerHTML = '<p>Chưa có lớp nào được tạo. Hãy tạo lớp học đầu tiên của bạn!</p>';
            return;
        }
        allClasses.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            let courseTypeName = cls.courseType === 'ket-pet' ? 'KET-PET' : 'Starters-Movers-Flyers';
            const lessonCount = cls.uploadedLessons?.length > 0 ? cls.uploadedLessons.length : (cls.numUnits * cls.lessonsPerUnit);
            const startDateString = cls.startDate || cls.uploadedLessons[0]?.date?.split('/').reverse().join('-') || new Date().toISOString().split('T')[0];

            classItem.innerHTML = `
                <div class="class-info" data-id="${cls.id}">
                    <h3>${cls.name}</h3>
                    <p><strong>Loại chương trình:</strong> ${courseTypeName}</p>
                    <p><strong>Cấu trúc:</strong> ${lessonCount || 'N/A'} buổi học</p>
                    <p><strong>Lịch học:</strong> ${cls.type || 'Theo file'}</p>
                    <p><strong>Khai giảng:</strong> ${new Date(startDateString + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="class-item-actions">
                    <button class="edit-btn" data-id="${cls.id}">⚙️ Thiết lập</button>
                    <button class="delete-btn" data-id="${cls.id}">🗑️ Xóa</button>
                </div>
            `;
            classListContainer.appendChild(classItem);
        });
    };

    function generateSchedule(classData, extraHolidays = []) {
        const { startDate, type, numUnits, courseType, lessonsPerUnit, miniTestDates = [], customLessonNames = {}, uploadedLessons = [] } = classData;
        const scheduleDays = CLASS_SCHEDULE_DAYS[type];
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
            if (courseType === 'ket-pet') {
                item.review5 = findNextAvailableReviewDate(index + offsets[4]);
            }
        });
        
        let latestDate = new Date(0);
        scheduleData.forEach(item => {
            const allItemDates = [item.lessonDate, item.review1, item.review2, item.review3, item.review4, item.review5].filter(Boolean);
            allItemDates.forEach(dateStr => {
                if (dateStr) {
                    const currentDate = stringToDate(dateStr);
                    if (currentDate > latestDate) {
                        latestDate = currentDate;
                    }
                }
            });
        });
        
        const dayAfterLastEvent = new Date(latestDate.getTime());
        dayAfterLastEvent.setDate(dayAfterLastEvent.getDate() + 1);
        const finalTestDate = findNextWorkDay(dayAfterLastEvent, scheduleDays || CLASS_SCHEDULE_DAYS['2-4'], extraHolidays);
        scheduleData.push({ isFinalTest: true, lessonName: "Final Test", lessonDate: formatDate(finalTestDate) });
        
        scheduleData.sort((a, b) => stringToDate(a.lessonDate) - stringToDate(b.lessonDate));
        
        return scheduleData;
    }
    
    function displaySchedule(scheduleData, courseType) {
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
                let rowHTML = `
                    <td>${sessionCounter}</td>
                    <td class="lesson-name-cell">
                        <span class="lesson-name-text" contenteditable="false" data-original-name="${item.lessonName}">${item.lessonName}</span>
                        <div class="lesson-actions" data-lesson-key="${item.lessonKey}">
                            <button class="edit-lesson-btn" title="Sửa tên">✏️</button>
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
                if (courseType === 'ket-pet') {
                    rowHTML += `<td>${item.review5 || ''}</td>`;
                }
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
            if (lessonsForToday.length > 0) {
                 summaryHTML += `<strong>📚 Bài học mới:</strong><ul>${lessonsForToday.map(l => `<li>${l}</li>`).join('')}</ul>`;
            }
            if (reviewsForToday.length > 0) {
                 summaryHTML += `<strong>📝 Nội dung ôn tập:</strong><ul>${[...new Set(reviewsForToday)].map(r => `<li>${r}</li>`).join('')}</ul>`;
            }
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
        if (testMessage) {
            summaryHTML = `<p>${testMessage}</p>`;
        } else if (lessonsForDay.length === 0 && reviewsForDay.length === 0) {
            summaryHTML = '<p>🎉 Không có lịch học hay ôn tập vào ngày này.</p>';
        } else {
            if (lessonsForDay.length > 0) summaryHTML += `<strong>📚 Bài học mới:</strong><ul>${lessonsForDay.map(l => `<li>${l}</li>`).join('')}</ul>`;
            if (reviewsForDay.length > 0) summaryHTML += `<strong>📝 Nội dung ôn tập:</strong><ul>${[...new Set(reviewsForDay)].map(r => `<li>${r}</li>`).join('')}</ul>`;
        }
        lookupSummary.innerHTML = summaryHTML;
    }
    
    const validateStartDate = () => {
        const selectedDaysKey = classTypeInput.value;
        const startDateValue = startDateInput.value;
        if (!startDateValue) { formErrorMessage.textContent = ''; return; }
        const allowedDays = CLASS_SCHEDULE_DAYS[selectedDaysKey];
        const selectedDate = new Date(startDateValue + 'T00:00:00');
        if (!allowedDays.includes(selectedDate.getDay())) {
            formErrorMessage.textContent = 'Ngày khai giảng không khớp với mô hình lớp học.';
        } else {
            formErrorMessage.textContent = '';
        }
    };

    const showPage = (pageId) => pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    const showDeleteModal = () => deleteModal.style.display = 'flex';
    const hideDeleteModal = () => deleteModal.style.display = 'none';

    // --- SỰ KIỆN ---
    btnGoogleLogin.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => console.error("Lỗi đăng nhập Google:", error));
    });
    btnLogout.addEventListener('click', () => auth.signOut());

    document.getElementById('btn-show-create-form').addEventListener('click', () => {
        editingClassId = null;
        formTitle.textContent = '➕ Tạo Lớp Học Mới';
        classForm.reset();
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
    
    classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (formErrorMessage.textContent && !formErrorMessage.textContent.startsWith('⚠️')) {
             return;
        }
        
        const isFileUploaded = uploadedLessons.length > 0;
        const miniTestDatesRaw = document.getElementById('mini-test-dates').value;

        let classData = {
            name: document.getElementById('class-name').value,
            courseType: document.getElementById('course-type').value,
            type: document.getElementById('class-type').value,
            uploadedLessons: uploadedLessons,
            numUnits: isFileUploaded ? 0 : document.getElementById('num-units').value,
            lessonsPerUnit: isFileUploaded ? 0 : document.getElementById('lessons-per-unit').value,
            startDate: isFileUploaded ? '' : document.getElementById('start-date').value,
            miniTestDates: isFileUploaded ? [] : (miniTestDatesRaw ? miniTestDatesRaw.split(',').map(d => d.trim()).filter(d => d) : []),
        };

        try {
            if (editingClassId) {
                const existingClass = allClasses.find(c => c.id === editingClassId);
                classData.customLessonNames = existingClass.customLessonNames || {};
                await getClassesRef().doc(editingClassId).update(classData);
            } else {
                classData.customLessonNames = {};
                await getClassesRef().add(classData);
            }
        } catch (error) { console.error("Lỗi lưu lớp:", error); }
        
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
            if(selectedClass){
                editingClassId = classId;
                formTitle.textContent = '⚙️ Thiết Lập Thông Tin Lớp Học';
                classForm.reset();
                formErrorMessage.textContent = '';
                fileFeedback.textContent = 'Chưa có file nào được chọn.';
                
                document.getElementById('class-name').value = selectedClass.name;
                document.getElementById('course-type').value = selectedClass.courseType;
                document.getElementById('class-type').value = selectedClass.type;

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
            btnUndo.classList.add('hidden');
            const selectedClass = allClasses.find(cls => cls.id === classId);
            if (selectedClass) {
                scheduleClassName.textContent = `🗓️ Lịch Học Chi Tiết - Lớp ${selectedClass.name}`;
                currentScheduleData = generateSchedule(selectedClass);
                displaySchedule(currentScheduleData, selectedClass.courseType);
                displayTodaySummary(currentScheduleData);
                lookupDateInput.value = '';
                lookupSummary.innerHTML = '<p>Chọn một ngày để xem tóm tắt.</p>';
                showPage('schedule-details-page');
            }
        }
    });

    scheduleBody.addEventListener('click', async (e) => {
        const target = e.target;
        const button = target.closest('button');

        if (!button) return;

        if (button.matches('.confirm-lesson-btn') || button.matches('.cancel-lesson-btn')) {
            const actionsDiv = button.closest('.lesson-actions');
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
                const lessonKey = actionsDiv.dataset.lessonKey;

                if (currentClassId && lessonKey && newName && newName !== lessonTextSpan.dataset.originalName) {
                    const classRef = getClassesRef().doc(currentClassId);
                    try {
                        await classRef.update({ [`customLessonNames.${lessonKey}`]: newName });
                        const localClass = allClasses.find(c => c.id === currentClassId);
                        if (!localClass.customLessonNames) localClass.customLessonNames = {};
                        localClass.customLessonNames[lessonKey] = newName;
                        const localScheduleItem = currentScheduleData.find(item => item.lessonKey === lessonKey);
                        if (localScheduleItem) localScheduleItem.lessonName = newName;

                        displayTodaySummary(currentScheduleData);
                        if (lookupDateInput.value) {
                           showSummaryForDate(formatDate(new Date(lookupDateInput.value + 'T00:00:00')));
                        }
                        lessonTextSpan.dataset.originalName = newName;
                    } catch (error) {
                        console.error("Lỗi cập nhật tên bài học:", error);
                        lessonTextSpan.textContent = lessonTextSpan.dataset.originalName; // Revert on error
                    }
                } else {
                     lessonTextSpan.textContent = lessonTextSpan.dataset.originalName;
                }
            } else { // Cancel button
                lessonTextSpan.textContent = lessonTextSpan.dataset.originalName;
            }
        } else if (target.matches('.edit-lesson-btn')) {
            activeLessonCell = target.closest('.lesson-name-cell');
            pencilMenuModal.style.top = `${e.clientY + 5}px`;
            pencilMenuModal.style.left = `${e.clientX - 100}px`;
            pencilMenuModal.style.display = 'block';
        }
    });
    
    menuEditName.addEventListener('click', () => {
        pencilMenuModal.style.display = 'none';
        if (!activeLessonCell) return;
        
        const lessonTextSpan = activeLessonCell.querySelector('.lesson-name-text');
        const actionsDiv = activeLessonCell.querySelector('.lesson-actions');
        const editBtn = actionsDiv.querySelector('.edit-lesson-btn');
        const confirmBtn = actionsDiv.querySelector('.confirm-lesson-btn');
        const cancelBtn = actionsDiv.querySelector('.cancel-lesson-btn');

        lessonTextSpan.setAttribute('contenteditable', 'true');
        lessonTextSpan.focus();
        document.execCommand('selectAll', false, null);
        editBtn.classList.add('hidden');
        confirmBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    });

    menuPostponeSession.addEventListener('click', () => {
        pencilMenuModal.style.display = 'none';
        if (!activeLessonCell) return;
        
        lastScheduleState = JSON.parse(JSON.stringify(currentScheduleData));

        const row = activeLessonCell.parentElement;
        const lessonDateStr = row.cells[2]?.textContent || 
                              row.cells[0].textContent.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)[0];
        
        if (lessonDateStr && !tempPostponedDates.includes(lessonDateStr)) {
            tempPostponedDates.push(lessonDateStr);
            lastPostponedDate = lessonDateStr;
        }

        const selectedClass = allClasses.find(cls => cls.id === currentClassId);
        if (selectedClass) {
            currentScheduleData = generateSchedule(selectedClass, tempPostponedDates);
            displaySchedule(currentScheduleData, selectedClass.courseType);
            displayTodaySummary(currentScheduleData);
            btnUndo.classList.remove('hidden');
        }
    });

    btnUndo.addEventListener('click', () => {
        if (lastScheduleState) {
            currentScheduleData = lastScheduleState;
            if (lastPostponedDate) {
                tempPostponedDates = tempPostponedDates.filter(d => d !== lastPostponedDate);
            }
            
            const selectedClass = allClasses.find(cls => cls.id === currentClassId);
            displaySchedule(currentScheduleData, selectedClass.courseType);
            displayTodaySummary(currentScheduleData);
            
            lastScheduleState = null;
            lastPostponedDate = null;
            btnUndo.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!pencilMenuModal.contains(e.target) && !e.target.matches('.edit-lesson-btn')) {
            pencilMenuModal.style.display = 'none';
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
        if (!deletingClassId) return;
        try {
            await getClassesRef().doc(deletingClassId).delete();
        } catch (error) { console.error("Lỗi xóa lớp:", error); }
        await loadClassesFromFirestore();
        renderClassList();
        hideDeleteModal();
    });

    btnCancelDelete.addEventListener('click', hideDeleteModal);

    classTypeInput.addEventListener('change', validateStartDate);
    startDateInput.addEventListener('change', validateStartDate);

    showCsvGuideBtn.addEventListener('click', () => {
        csvGuideModal.style.display = 'flex';
    });
    closeCsvGuideBtn.addEventListener('click', () => {
        csvGuideModal.style.display = 'none';
    });
    csvGuideModal.addEventListener('click', (e) => {
        if (e.target === csvGuideModal) {
            csvGuideModal.style.display = 'none';
        }
    });
    
    scheduleFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        formErrorMessage.innerHTML = '';
        fileFeedback.textContent = 'Chưa có file nào được chọn.';
        uploadedLessons = []; 
        const manualInputs = [startDateInput, document.getElementById('num-units'), document.getElementById('lessons-per-unit'), document.getElementById('mini-test-dates')];

        if (!file) {
            manualInputs.forEach(input => input.disabled = false);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("File CSV cần ít nhất 2 dòng (tiêu đề và dữ liệu).");

                const delimiter = lines[0].includes(';') ? ';' : ',';
                const header = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
                const lessonCol = header.findIndex(h => h.includes('bài học') || h.includes('bai hoc'));
                const dateCol = header.findIndex(h => h.includes('ngày học') || h.includes('ngay hoc'));

                if (lessonCol === -1 || dateCol === -1) {
                    throw new Error("File phải có cột 'Bài học' và 'Ngày học'.");
                }

                const dataLines = lines.slice(1);
                const parsedLessons = dataLines.map(line => {
                    const parts = line.split(delimiter);
                    const name = (parts[lessonCol] || '').trim().replace(/"/g, '');
                    const dateRaw = (parts[dateCol] || '').trim().replace(/"/g, '');
                    if (!name || !dateRaw || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) return null;
                    
                    const dateParts = dateRaw.split('/');
                    const date = `${dateParts[0].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[2]}`;

                    const lowerCaseName = name.toLowerCase();
                    let type = 'lesson';
                    if (lowerCaseName.includes('mini test') || lowerCaseName.includes('project')) {
                        type = 'miniTest';
                    }
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
                    if (JSON.stringify(value.sort()) === JSON.stringify(uniqueDays)) {
                        detectedType = key;
                        break;
                    }
                }
                if (detectedType) {
                    classTypeInput.value = detectedType;
                }

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
});
