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
    
    let allClasses = [];
    let currentScheduleData = [];
    let currentUser = null;
    let editingClassId = null;
    let deletingClassId = null;
    let currentClassId = null; 

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
    const formatDate = (date) => !date ? '' : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    const stringToDate = (dateStr) => new Date(dateStr.split('/').reverse().join('-'));

    const isHoliday = (date) => {
        const yyyymmdd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (LUNAR_NEW_YEAR_DATES.includes(yyyymmdd)) return true;
        if (VIETNAMESE_HOLIDAYS_FIXED.includes(mmdd)) return true;
        return false;
    };
    const findNextWorkDay = (startDate, scheduleDays) => {
        let nextDate = new Date(startDate.getTime());
        while (true) {
            if (scheduleDays.includes(nextDate.getDay()) && !isHoliday(nextDate)) {
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

    function generateSchedule(classData) {
        const { startDate, type, numUnits, courseType, lessonsPerUnit, miniTestDates = [], customLessonNames = {} } = classData;
        const totalLessons = parseInt(numUnits, 10) * parseInt(lessonsPerUnit, 10);
        const scheduleDays = CLASS_SCHEDULE_DAYS[type];
        const offsets = courseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF;
        
        let scheduleData = [];
        let lessonCounter = 0;
        let currentDate = new Date(startDate + 'T00:00:00');
        
        let tempScheduleDates = [];
        let tempDate = new Date(currentDate.getTime());
        while(tempScheduleDates.length < totalLessons + miniTestDates.length) {
            let sessionDate = findNextWorkDay(tempDate, scheduleDays);
            tempScheduleDates.push(sessionDate);
            tempDate = new Date(sessionDate.getTime());
            tempDate.setDate(tempDate.getDate() + 1);
        }

        let sessionIndex = 0;
        while(lessonCounter < totalLessons) {
            const sessionDate = tempScheduleDates[sessionIndex];
            const formattedSessionDate = formatDate(sessionDate);

            if (miniTestDates.includes(formattedSessionDate)) {
                scheduleData.push({ isMiniTest: true, lessonName: "Mini Test", lessonDate: formattedSessionDate });
            } else {
                const unitNumber = Math.floor(lessonCounter / lessonsPerUnit) + 1;
                const lessonNumber = (lessonCounter % lessonsPerUnit) + 1;
                const lessonKey = `${unitNumber}-${lessonNumber}`;
                const defaultName = `Unit ${unitNumber} lesson ${lessonNumber}`;
                
                scheduleData.push({
                    isLesson: true,
                    lessonName: customLessonNames[lessonKey] || defaultName,
                    lessonKey: lessonKey,
                    lessonDate: formattedSessionDate,
                });
                lessonCounter++;
            }
            sessionIndex++;
        }
        
        let lessonItems = scheduleData.filter(item => item.isLesson);
        lessonItems.forEach((lesson, lessonIndex) => {
            const reviewSessionDateIndex = scheduleData.findIndex(d => d.lessonDate === lesson.lessonDate);
            lesson.review1 = scheduleData[reviewSessionDateIndex + offsets[0]]?.lessonDate || '';
            lesson.review2 = scheduleData[reviewSessionDateIndex + offsets[1]]?.lessonDate || '';
            lesson.review3 = scheduleData[reviewSessionDateIndex + offsets[2]]?.lessonDate || '';
            lesson.review4 = scheduleData[reviewSessionDateIndex + offsets[3]]?.lessonDate || '';
            if (courseType === 'ket-pet') {
                lesson.review5 = scheduleData[reviewSessionDateIndex + offsets[4]]?.lessonDate || '';
            }
        });

        // Tự động thêm Final Test vào cuối
        let latestDate = stringToDate(startDate);
        scheduleData.forEach(item => {
            const allItemDates = [item.lessonDate, item.review1, item.review2, item.review3, item.review4, item.review5].filter(Boolean);
            allItemDates.forEach(dateStr => {
                const currentDate = stringToDate(dateStr);
                if (currentDate > latestDate) {
                    latestDate = currentDate;
                }
            });
        });
        
        const dayAfterLastEvent = new Date(latestDate.getTime());
        dayAfterLastEvent.setDate(dayAfterLastEvent.getDate() + 1);
        const finalTestDate = findNextWorkDay(dayAfterLastEvent, scheduleDays);
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
            }
            else { // isLesson
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
        if (formErrorMessage.textContent) return;
        
        const miniTestDatesRaw = document.getElementById('mini-test-dates').value;

        let classData = {
            name: document.getElementById('class-name').value,
            numUnits: document.getElementById('num-units').value,
            type: document.getElementById('class-type').value,
            startDate: document.getElementById('start-date').value,
            courseType: document.getElementById('course-type').value,
            lessonsPerUnit: document.getElementById('lessons-per-unit').value,
            miniTestDates: miniTestDatesRaw ? miniTestDatesRaw.split(',').map(d => d.trim()).filter(d => d) : [],
        };

        try {
            if (editingClassId) {
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
                document.getElementById('class-name').value = selectedClass.name;
                document.getElementById('num-units').value = selectedClass.numUnits;
                document.getElementById('class-type').value = selectedClass.type;
                document.getElementById('start-date').value = selectedClass.startDate;
                document.getElementById('course-type').value = selectedClass.courseType;
                document.getElementById('lessons-per-unit').value = selectedClass.lessonsPerUnit;
                document.getElementById('mini-test-dates').value = selectedClass.miniTestDates ? selectedClass.miniTestDates.join(', ') : '';
                showPage('form-page');
            }
        } else if (classInfo) {
            const classId = classInfo.dataset.id;
            currentClassId = classId;
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
        const target = e.target.closest('button');
        if (!target) return;

        const actionsDiv = target.closest('.lesson-actions');
        if (!actionsDiv) return;

        const lessonCell = actionsDiv.closest('.lesson-name-cell');
        const lessonTextSpan = lessonCell.querySelector('.lesson-name-text');
        const editBtn = actionsDiv.querySelector('.edit-lesson-btn');
        const confirmBtn = actionsDiv.querySelector('.confirm-lesson-btn');
        const cancelBtn = actionsDiv.querySelector('.cancel-lesson-btn');

        if (target.matches('.edit-lesson-btn')) {
            lessonTextSpan.setAttribute('contenteditable', 'true');
            lessonTextSpan.focus();
            document.execCommand('selectAll', false, null);
            editBtn.classList.add('hidden');
            confirmBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');
        } 
        else if (target.matches('.confirm-lesson-btn')) {
            lessonTextSpan.setAttribute('contenteditable', 'false');
            const newName = lessonTextSpan.textContent.trim();
            const lessonKey = actionsDiv.dataset.lessonKey;
            lessonTextSpan.dataset.originalName = newName;

            if (currentClassId && lessonKey && newName) {
                const classRef = getClassesRef().doc(currentClassId);
                try {
                    await classRef.update({ [`customLessonNames.${lessonKey}`]: newName });
                    const localClass = allClasses.find(c => c.id === currentClassId);
                    if (!localClass.customLessonNames) localClass.customLessonNames = {};
                    localClass.customLessonNames[lessonKey] = newName;
                } catch (error) {
                    console.error("Lỗi cập nhật tên bài học:", error);
                    lessonTextSpan.textContent = "Lỗi!";
                }
            }
            editBtn.classList.remove('hidden');
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
        } 
        else if (target.matches('.cancel-lesson-btn')) {
            lessonTextSpan.setAttribute('contenteditable', 'false');
            lessonTextSpan.textContent = lessonTextSpan.dataset.originalName;
            editBtn.classList.remove('hidden');
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
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
});
