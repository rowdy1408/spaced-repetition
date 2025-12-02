document.addEventListener('DOMContentLoaded', () => {
    
    /* =========================================
       1. CONFIG & CONSTANTS
       ========================================= */
    const firebaseConfig = {
        apiKey: "AIzaSyBlTjj_-WdZBpLqixox2rmt-kbHdPs8Kh8",
        authDomain: "quanlylophoc-5b945.firebaseapp.com",
        projectId: "quanlylophoc-5b945",
        storageBucket: "quanlylophoc-5b945.firebasestorage.app",
        messagingSenderId: "38123679904",
        appId: "1:38123679904:web:abe3710093b5a09643d9c5"
    };

    const CLASS_SCHEDULE_DAYS = { 
        '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], 
        '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] 
    };
    const REVIEW_OFFSETS_SMF = [1, 3, 6, 10];
    const REVIEW_OFFSETS_KET = [1, 2, 4, 8, 16];
    const VIETNAMESE_HOLIDAYS_FIXED = ['01-01', '04-30', '05-01', '09-02'];
    
    const EXP_PER_LEVEL = 60;
    const EXP_REWARD = 20;
    const USER_TITLES = [
        "Tập Sự", "Học Việc", "Lính Mới", "Thợ Lành Nghề", 
        "Chuyên Gia", "Bậc Thầy", "Đại Kiện Tướng", "Thần Đồng", "Huyền Thoại"
    ];
    
    // --- AVATAR MỚI (Style Adventurer) ---
    const AVATAR_LIST = [
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Liam",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Josh",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Nolan",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Christopher",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Sophia",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Kylie",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Mila",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Eliza",
        "https://api.dicebear.com/9.x/adventurer/svg?seed=Bella"
    ];

    /* =========================================
       1.5. LUNAR CALENDAR HELPER
       ========================================= */
    const TET_HOLIDAYS_MAP = {
        2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17',
        2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13',
        2030: '2030-02-03', 2031: '2031-01-23', 2032: '2032-02-11',
        2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08'
    };

    const isTetHoliday = (dateObj) => {
        const year = dateObj.getFullYear();
        let tetDateStr = TET_HOLIDAYS_MAP[year];
        if (!tetDateStr) return false;
        let m1Tet = new Date(tetDateStr);
        const diffTime = dateObj.getTime() - m1Tet.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays >= -3 && diffDays <= 5;
    };

    /* =========================================
       2. STATE MANAGEMENT
       ========================================= */
    let allClasses = [];
    let currentScheduleData = [];
    let currentUser = null;
    let editingClassId = null;
    let deletingClassId = null;
    let currentClassId = null;
    let uploadedLessons = [];
    let activeLessonCell = null;
    let activeLessonKey = null;
    let isGuestMode = false;
    let currentStudents = []; 
    let currentStudentIndex = null;
    let currentAttendanceDate = null; // Ngày đang điểm danh

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    /* =========================================
       3. DOM ELEMENTS
       ========================================= */
    const UI = {
        loginPage: document.getElementById('login-page'),
        appContent: document.getElementById('app-content'),
        userInfo: document.getElementById('user-info'),
        pages: document.querySelectorAll('#app-content .page'),
        
        btnGoogleLogin: document.getElementById('btn-google-login'),
        btnGuestLogin: document.getElementById('btn-guest-login'),
        btnLogout: document.getElementById('btn-logout'),
        btnShowCreateForm: document.getElementById('btn-show-create-form'),
        btnShowClassList: document.getElementById('btn-show-class-list'),
        btnConfirmDelete: document.getElementById('btn-confirm-delete'),
        btnCancelDelete: document.getElementById('btn-cancel-delete'),
        btnUndo: document.getElementById('btn-undo'),
        
        classForm: document.getElementById('class-form'),
        formTitle: document.getElementById('form-title'),
        formErrorMessage: document.getElementById('form-error-message'),
        classTypeInput: document.getElementById('class-type'),
        startDateInput: document.getElementById('start-date'),
        customDaysGroup: document.getElementById('custom-days-group'),
        weekDayCheckboxes: document.querySelectorAll('input[name="week-day"]'),
        fileInput: document.getElementById('schedule-file'),
        fileFeedback: document.getElementById('file-feedback'),
        
        classListContainer: document.getElementById('class-list-container'),
        scheduleClassName: document.getElementById('schedule-class-name'),
        scheduleHeader: document.getElementById('schedule-header'),
        scheduleBody: document.getElementById('schedule-body'),
        todaySummary: document.getElementById('today-summary'),
        lookupSummary: document.getElementById('lookup-summary'),
        
        deleteModal: document.getElementById('delete-confirm-modal'),
        csvGuideModal: document.getElementById('csv-guide-modal'),
        pencilMenu: document.getElementById('pencil-menu-modal'),
        quizletMenu: document.getElementById('quizlet-menu-modal'),
        quizletLinkModal: document.getElementById('quizlet-link-modal'),
        quizletLinkInput: document.getElementById('quizlet-link-input'),
        quizletLinkFeedback: document.getElementById('quizlet-link-feedback'),
        btnSaveQuizlet: document.getElementById('btn-save-quizlet-link'),
        btnCancelQuizlet: document.getElementById('btn-cancel-quizlet-link'),
        menuOpenQuizlet: document.getElementById('menu-open-quizlet'),
        menuAddEditQuizlet: document.getElementById('menu-add-edit-quizlet'),

        managePage: document.getElementById('manage-class-page'),
        studentGrid: document.getElementById('student-grid'),
        btnAddStudent: document.getElementById('btn-add-student'),
        btnMarkAllDone: document.getElementById('btn-mark-all-done'),
        addStudentModal: document.getElementById('add-student-modal'),
        newStudentName: document.getElementById('new-student-name'),
        avatarSelector: document.getElementById('avatar-selector'),
        selectedAvatarUrl: document.getElementById('selected-avatar-url'),
        btnSaveStudent: document.getElementById('btn-save-student'),
        btnCancelStudent: document.getElementById('btn-cancel-student'),

        studentDetailModal: document.getElementById('student-detail-modal'),
        detailAvatar: document.getElementById('detail-avatar'),
        detailName: document.getElementById('detail-name'),
        detailLevel: document.getElementById('detail-level'),
        detailTitle: document.getElementById('detail-title'),
        detailExp: document.getElementById('detail-exp'),
        expBarFill: document.getElementById('exp-bar-fill'),
        expToNext: document.getElementById('exp-to-next'),
        studentReviewSchedule: document.getElementById('student-review-schedule'),
        btnResetExp: document.getElementById('btn-reset-exp'),
        btnDeleteStudent: document.getElementById('btn-delete-student'),

        // New Modals
        attendanceModal: document.getElementById('attendance-modal'),
        attendanceTitle: document.getElementById('attendance-title'),
        attendanceList: document.getElementById('attendance-list'),
        btnSaveAttendance: document.getElementById('btn-save-attendance'),
        homeworkModal: document.getElementById('homework-modal'),
        homeworkContent: document.getElementById('homework-content'),
        homeworkQuizlet: document.getElementById('homework-quizlet'),
        btnCopyHomework: document.getElementById('btn-copy-homework')
    };

    /* =========================================
       4. UTILITY FUNCTIONS
       ========================================= */
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
        const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (VIETNAMESE_HOLIDAYS_FIXED.includes(mmdd)) return true;
        if (isTetHoliday(date)) return true;
        return false;
    };

    const findNextWorkDay = (startDate, scheduleDays, extraHolidays = []) => {
        let nextDate = new Date(startDate.getTime());
        while (true) {
            if (scheduleDays.includes(nextDate.getDay()) && !isHoliday(nextDate, extraHolidays)) break;
            nextDate.setDate(nextDate.getDate() + 1);
        }
        return nextDate;
    };

    /* =========================================
       5. DATA LOGIC & GAMIFICATION
       ========================================= */
    const getClassesRef = () => {
        if (isGuestMode || !currentUser || !currentUser.uid) return null;
        return db.collection('users').doc(currentUser.uid).collection('classes');
    };

    const loadClasses = async () => {
        if (isGuestMode) return;
        if (!currentUser) return;
        try {
            const snapshot = await getClassesRef().orderBy("name").get();
            allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) { console.error("Lỗi tải danh sách lớp:", error); }
    };

    const getLevelInfo = (exp) => {
        const level = Math.floor(exp / EXP_PER_LEVEL) + 1;
        const titleIndex = Math.min(level - 1, USER_TITLES.length - 1);
        return { level, title: USER_TITLES[titleIndex] };
    };

    const saveStudents = async (classId, students) => {
        if (isGuestMode) {
            const cls = allClasses.find(c => c.id === classId);
            if (cls) cls.students = students;
        } else {
            await getClassesRef().doc(classId).update({ students });
        }
        currentStudents = students;
        renderStudentGrid();
    };
    
    const saveAttendance = async (classId, attendanceData) => {
         const cls = allClasses.find(c => c.id === classId);
         if (!cls.attendanceLog) cls.attendanceLog = {};
         Object.assign(cls.attendanceLog, attendanceData);
         
         if (isGuestMode) {
             // Saved in memory
         } else {
             await getClassesRef().doc(classId).update({ attendanceLog: cls.attendanceLog });
         }
         // Refresh display
         displaySchedule(currentScheduleData, cls.courseType, cls.quizletLinks, cls.attendanceLog);
    };

    const calculateHomeReviews = (scheduleData, courseType) => {
        const offsets = courseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF;
        const reviewTasks = {}; 
        scheduleData.forEach(item => {
            if (!item.isLesson) return;
            const learnDate = stringToDate(item.lessonDate);
            offsets.forEach((daysToAdd, idx) => {
                const reviewDate = new Date(learnDate);
                reviewDate.setDate(reviewDate.getDate() + daysToAdd);
                const dateStr = formatDate(reviewDate);
                if (!reviewTasks[dateStr]) reviewTasks[dateStr] = [];
                reviewTasks[dateStr].push({
                    taskId: `${item.lessonKey}_review_${idx + 1}`,
                    lessonName: item.lessonName,
                    type: `Ôn tập lần ${idx + 1}`
                });
            });
        });
        return reviewTasks;
    };

    // --- Schedule Generation ---
    const generateSchedule = (classData, extraHolidays = []) => {
        const { startDate, type, numUnits, courseType, lessonsPerUnit, miniTestDates = [], customLessonNames = {}, uploadedLessons = [], customDays = [] } = classData;
        let scheduleDays = (type === 'custom') ? customDays : CLASS_SCHEDULE_DAYS[type];
        if (!scheduleDays || scheduleDays.length === 0) scheduleDays = [1, 3];

        const offsets = courseType === 'ket-pet' ? REVIEW_OFFSETS_KET : REVIEW_OFFSETS_SMF;
        let scheduleData = [];
        let currentDate;

        if (uploadedLessons && uploadedLessons.length > 0) {
            currentDate = stringToDate(uploadedLessons[0].date);
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
            const totalLessons = parseInt(numUnits) * parseInt(lessonsPerUnit);
            currentDate = new Date(startDate + 'T00:00:00');
            let lessonCounter = 0;
            let sessionCounter = 0;
            while (lessonCounter < totalLessons) {
                if (sessionCounter > totalLessons * 2) break;
                const sessionDate = findNextWorkDay(currentDate, scheduleDays, extraHolidays);
                const formattedDate = formatDate(sessionDate);
                if (miniTestDates.includes(formattedDate)) {
                    scheduleData.push({ isMiniTest: true, lessonName: 'Mini Test', lessonDate: formattedDate });
                } else {
                    const unitNumber = Math.floor(lessonCounter / lessonsPerUnit) + 1;
                    const lessonNumber = (lessonCounter % lessonsPerUnit) + 1;
                    const lessonKey = `${unitNumber}-${lessonNumber}`;
                    scheduleData.push({
                        isLesson: true,
                        lessonName: customLessonNames[lessonKey] || `Unit ${unitNumber} lesson ${lessonNumber}`,
                        lessonKey: lessonKey,
                        lessonDate: formattedDate,
                    });
                    lessonCounter++;
                }
                currentDate = new Date(sessionDate.getTime());
                currentDate.setDate(currentDate.getDate() + 1);
                sessionCounter++;
            }
        }

        const findReviewDate = (startIndex) => {
            let idx = startIndex;
            while (scheduleData[idx] && scheduleData[idx].isMiniTest) idx++;
            return scheduleData[idx]?.lessonDate || '';
        };

        scheduleData.forEach((item, index) => {
            if (!item.isLesson) return;
            item.review1 = findReviewDate(index + offsets[0]);
            item.review2 = findReviewDate(index + offsets[1]);
            item.review3 = findReviewDate(index + offsets[2]);
            item.review4 = findReviewDate(index + offsets[3]);
            if (courseType === 'ket-pet') item.review5 = findReviewDate(index + offsets[4]);
        });

        let maxDate = new Date(0);
        scheduleData.forEach(item => {
             [item.lessonDate, item.review1, item.review2, item.review3, item.review4, item.review5].forEach(d => {
                 if (d && stringToDate(d) > maxDate) maxDate = stringToDate(d);
             });
        });
        const finalTestDate = findNextWorkDay(new Date(maxDate.setDate(maxDate.getDate() + 1)), scheduleDays, extraHolidays);
        scheduleData.push({ isFinalTest: true, lessonName: "Final Test", lessonDate: formatDate(finalTestDate) });
        scheduleData.sort((a, b) => stringToDate(a.lessonDate) - stringToDate(b.lessonDate));
        return scheduleData;
    };

    /* =========================================
       6. UI RENDERING & EVENTS
       ========================================= */
    const showPage = (pageId) => {
        UI.pages.forEach(p => p.style.display = 'none');
        const target = document.getElementById(pageId);
        if(target) target.style.display = 'block';
    };

    const renderClassList = () => {
        UI.classListContainer.innerHTML = '';
        if (allClasses.length === 0) {
            UI.classListContainer.innerHTML = '<p>Chưa có lớp nào. Hãy tạo lớp học đầu tiên!</p>';
            return;
        }
        allClasses.forEach(cls => {
            const item = document.createElement('div');
            item.className = 'class-item';
            const typeName = cls.courseType === 'ket-pet' ? 'KET-PET' : 'Starters-Movers-Flyers';
            const count = cls.uploadedLessons?.length || (cls.numUnits * cls.lessonsPerUnit);
            const start = cls.startDate || (cls.uploadedLessons?.[0]?.date?.split('/').reverse().join('-')) || 'N/A'; 
            item.innerHTML = `
                <div class="class-info" data-id="${cls.id}">
                    <h3>${cls.name}</h3>
                    <p><strong>CT:</strong> ${typeName} | <strong>Số buổi:</strong> ${count}</p>
                    <p><strong>Lịch:</strong> ${cls.type === 'custom' ? 'Tự chọn' : cls.type}</p>
                    <p><strong>Khai giảng:</strong> ${new Date(start).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="class-item-actions">
                    <button class="manage-btn" data-id="${cls.id}" style="background-color: #17a2b8; color: white; padding: 8px 12px; border-radius: 6px; margin-right: 5px;">👥 Quản lý</button>
                    <button class="edit-btn" data-id="${cls.id}">⚙️ Sửa</button>
                    <button class="delete-btn" data-id="${cls.id}">🗑️ Xóa</button>
                </div>
            `;
            UI.classListContainer.appendChild(item);
        });
    };

    const displaySchedule = (scheduleData, courseType, quizletLinks = {}, attendanceLog = {}) => {
        UI.scheduleHeader.innerHTML = '';
        const headers = ['Buổi', 'Bài học', 'Ngày học', 'Ôn 1', 'Ôn 2', 'Ôn 3', 'Ôn 4'];
        if (courseType === 'ket-pet') headers.push('Ôn 5');
        UI.scheduleHeader.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        UI.scheduleBody.innerHTML = '';
        let sessionCount = 0;

        scheduleData.forEach(item => {
            const row = document.createElement('tr');
            if (item.isMiniTest) {
                sessionCount++; row.className = 'mini-test-day';
                row.innerHTML = `<td colspan="${headers.length}">(${sessionCount}) 📝 ${item.lessonName} - ${item.lessonDate}</td>`;
            } else if (item.isFinalTest) {
                row.className = 'final-test-day';
                row.innerHTML = `<td colspan="${headers.length}">🏆 ${item.lessonName} - ${item.lessonDate}</td>`;
            } else {
                sessionCount++;
                const hasLink = quizletLinks && quizletLinks[item.lessonKey];
                const isAttended = attendanceLog[item.lessonDate]; // Check if attendance taken
                
                let html = `
                    <td>${sessionCount}</td>
                    <td class="lesson-name-cell">
                        <span class="lesson-name-text" data-original-name="${item.lessonName}">${item.lessonName}</span>
                        <div class="lesson-actions" data-lesson-key="${item.lessonKey}">
                            <button class="quizlet-btn ${hasLink ? 'active' : ''}">🗂️</button>
                            <button class="edit-lesson-btn">✏️</button>
                            <button class="confirm-lesson-btn hidden">✔️</button>
                            <button class="cancel-lesson-btn hidden">❌</button>
                        </div>
                    </td>
                    <td>
                        ${item.lessonDate}
                        <button class="btn-attendance ${isAttended ? 'done' : ''}" data-date="${item.lessonDate}">
                            ${isAttended ? '✔ Đã điểm danh' : '📝 Điểm danh'}
                        </button>
                    </td>
                    <td>${item.review1 || ''}</td>
                    <td>${item.review2 || ''}</td>
                    <td>${item.review3 || ''}</td>
                    <td>${item.review4 || ''}</td>
                `;
                if (courseType === 'ket-pet') html += `<td>${item.review5 || ''}</td>`;
                row.innerHTML = html;
            }
            UI.scheduleBody.appendChild(row);
        });
    };

    const displaySummary = (scheduleData, targetDateStr = null) => {
        const dateStr = targetDateStr || formatDate(new Date());
        const lessons = [], reviews = [];
        let msg = '';
        for (const item of scheduleData) {
            if (item.lessonDate === dateStr) {
                if (item.isMiniTest) msg = '🔔 Hôm nay có Mini Test!';
                else if (item.isFinalTest) msg = '🏆 Ngày thi Final Test!';
                else if (item.isLesson) lessons.push(item.lessonName);
            }
            if (item.isLesson) {
                if ([item.review1, item.review2, item.review3, item.review4, item.review5].includes(dateStr)) {
                    reviews.push(item.lessonName);
                }
            }
        }
        let html = targetDateStr ? '' : '<h2>🗓️ Lịch Hôm Nay</h2>';
        if (msg) html += `<p>${msg}</p>`;
        else if (lessons.length === 0 && reviews.length === 0) html += '<p class="no-class-message">Không có lịch học/ôn tập.</p>';
        else {
            if (lessons.length) html += `<strong>📚 Bài mới:</strong><ul>${lessons.map(l=>`<li>${l}</li>`).join('')}</ul>`;
            if (reviews.length) html += `<strong>📝 Ôn tập:</strong><ul>${[...new Set(reviews)].map(r=>`<li>${r}</li>`).join('')}</ul>`;
        }
        if (targetDateStr) UI.lookupSummary.innerHTML = html;
        else UI.todaySummary.innerHTML = html;
    };

    const renderStudentGrid = () => {
        UI.studentGrid.innerHTML = '';
        if (!currentStudents || currentStudents.length === 0) {
            UI.studentGrid.innerHTML = '<p>Chưa có học viên nào.</p>';
            return;
        }
        currentStudents.forEach((st, index) => {
            const { level, title } = getLevelInfo(st.exp || 0);
            const card = document.createElement('div');
            card.className = 'class-item student-card';
            card.innerHTML = `
                <img src="${st.avatar}" class="student-avatar" alt="Avatar">
                <h4 class="student-name">${st.name}</h4>
                <div class="student-level">LV.${level} - ${title}</div>
            `;
            card.addEventListener('click', () => openStudentDetail(index));
            UI.studentGrid.appendChild(card);
        });
    };

    const openStudentDetail = (studentIndex) => {
        currentStudentIndex = studentIndex; 
        const student = currentStudents[studentIndex];
        const cls = allClasses.find(c => c.id === currentClassId);
        
        const { level, title } = getLevelInfo(student.exp || 0);
        UI.detailAvatar.src = student.avatar;
        UI.detailName.textContent = student.name;
        UI.detailLevel.textContent = level;
        UI.detailTitle.textContent = title;
        UI.detailExp.textContent = student.exp || 0;
        
        const expInCurrentLevel = (student.exp || 0) % EXP_PER_LEVEL;
        const percent = (expInCurrentLevel / EXP_PER_LEVEL) * 100;
        UI.expBarFill.style.width = `${percent}%`;
        UI.expToNext.textContent = `Next: ${EXP_PER_LEVEL - expInCurrentLevel} XP`;

        const schedule = generateSchedule(cls, cls.offDates || []);
        const homeReviews = calculateHomeReviews(schedule, cls.courseType);
        const sortedDates = Object.keys(homeReviews).sort((a, b) => stringToDate(a) - stringToDate(b));
        
        UI.studentReviewSchedule.innerHTML = '';
        sortedDates.forEach(dateStr => {
            const tasks = homeReviews[dateStr];
            const dateGroup = document.createElement('div');
            dateGroup.className = 'review-day-group';
            dateGroup.innerHTML = `<div class="review-date-header">${dateStr}</div>`;
            tasks.forEach(task => {
                const isCompleted = student.completedTasks && student.completedTasks.includes(task.taskId);
                const taskEl = document.createElement('div');
                taskEl.className = `review-task ${isCompleted ? 'completed' : ''}`;
                taskEl.innerHTML = `
                    <div><strong>${task.lessonName}</strong> <small>(${task.type})</small></div>
                    <button class="btn-check-task">${isCompleted ? '✔' : ''}</button>
                `;
                if (!isCompleted) {
                    taskEl.querySelector('.btn-check-task').addEventListener('click', async () => {
                         student.exp = (student.exp || 0) + EXP_REWARD;
                         if (!student.completedTasks) student.completedTasks = [];
                         student.completedTasks.push(task.taskId);
                         await saveStudents(currentClassId, currentStudents);
                         openStudentDetail(studentIndex); 
                    });
                }
                dateGroup.appendChild(taskEl);
            });
            UI.studentReviewSchedule.appendChild(dateGroup);
        });
        UI.studentDetailModal.style.display = 'flex';
    };

    // --- MAIN EVENT LISTENERS ---
    auth.onAuthStateChanged(user => {
        if (user) {
            isGuestMode = false; currentUser = user;
            UI.loginPage.style.display = 'none';
            UI.appContent.style.display = 'flex';
            UI.userInfo.innerHTML = `Xin chào, <strong>${user.displayName}</strong>!`;
            loadClasses().then(() => showPage('home-page'));
        } else if (!isGuestMode) {
            UI.loginPage.style.display = 'block';
            UI.appContent.style.display = 'none';
        }
    });

    UI.btnGoogleLogin.addEventListener('click', () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()));
    UI.btnLogout.addEventListener('click', () => {
        if(isGuestMode) { isGuestMode = false; allClasses = []; location.reload(); } 
        else auth.signOut();
    });
    UI.btnGuestLogin.addEventListener('click', () => {
        if(confirm("Chế độ Khách: Dữ liệu sẽ mất khi tải lại trang. Tiếp tục?")) {
            isGuestMode = true; currentUser = { displayName: 'Khách' };
            UI.loginPage.style.display = 'none';
            UI.appContent.style.display = 'flex';
            UI.userInfo.innerHTML = `Xin chào, <strong>Khách</strong>!`;
            allClasses = []; renderClassList(); showPage('home-page');
        }
    });

    // Navigation
    UI.btnShowCreateForm.addEventListener('click', () => {
        editingClassId = null; UI.formTitle.textContent = '➕ Tạo Lớp Học Mới';
        UI.classForm.reset(); uploadedLessons = [];
        UI.startDateInput.valueAsDate = new Date();
        UI.fileFeedback.textContent = 'Chưa có file.';
        showPage('form-page');
    });
    UI.btnShowClassList.addEventListener('click', async () => { await loadClasses(); renderClassList(); showPage('class-list-page'); });
    document.querySelectorAll('.back-link').forEach(l => l.addEventListener('click', (e) => {
        e.preventDefault(); showPage(e.target.dataset.target);
    }));

    // CSV Logic
    UI.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            let text = e.target.result;
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            const lines = text.split(/\r\n|\n/).filter(l => l.trim());
            if (lines.length < 2) { UI.fileFeedback.textContent = '❌ File lỗi.'; return; }
            const delimiter = lines[0].includes(';') ? ';' : ',';
            try {
                uploadedLessons = lines.slice(1).map(line => {
                    const parts = line.split(delimiter);
                    if (parts.length < 2) return null;
                    const dateStr = parts[1].trim().replace(/^"|"$/g, '');
                    if (!dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return null;
                    return { name: parts[0].trim().replace(/^"|"$/g, ''), date: dateStr, type: 'lesson' };
                }).filter(Boolean);
                UI.fileFeedback.textContent = `✅ Đã nhận ${uploadedLessons.length} bài.`;
                const days = [...new Set(uploadedLessons.map(l => stringToDate(l.date).getDay()))].sort();
                let detected = Object.keys(CLASS_SCHEDULE_DAYS).find(k => JSON.stringify(CLASS_SCHEDULE_DAYS[k].sort()) === JSON.stringify(days));
                if (detected) { UI.classTypeInput.value = detected; UI.customDaysGroup.classList.add('hidden'); }
                else { UI.classTypeInput.value = 'custom'; UI.customDaysGroup.classList.remove('hidden'); }
            } catch (err) { UI.fileFeedback.textContent = '❌ Lỗi đọc file.'; }
        };
        reader.readAsText(file);
    });

    UI.classTypeInput.addEventListener('change', () => {
        UI.customDaysGroup.classList.toggle('hidden', UI.classTypeInput.value !== 'custom');
    });

    UI.classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let customDays = [];
        if (UI.classTypeInput.value === 'custom') {
            UI.weekDayCheckboxes.forEach(cb => { if (cb.checked) customDays.push(parseInt(cb.value)); });
        }
        const data = {
            name: document.getElementById('class-name').value,
            courseType: document.getElementById('course-type').value,
            type: UI.classTypeInput.value,
            customDays: customDays,
            uploadedLessons: uploadedLessons,
            numUnits: document.getElementById('num-units').value,
            lessonsPerUnit: document.getElementById('lessons-per-unit').value,
            startDate: UI.startDateInput.value,
            miniTestDates: document.getElementById('mini-test-dates').value.split(',').map(d=>d.trim()).filter(Boolean),
            customLessonNames: {}, quizletLinks: {}, attendanceLog: {}
        };
        if (isGuestMode) {
            if (editingClassId) {
                const idx = allClasses.findIndex(c => c.id === editingClassId);
                if (idx > -1) allClasses[idx] = { ...allClasses[idx], ...data };
            } else { data.id = `guest_${Date.now()}`; allClasses.push(data); }
        } else {
            const ref = getClassesRef();
            editingClassId ? await ref.doc(editingClassId).update(data) : await ref.add(data);
        }
        await loadClasses(); renderClassList(); showPage('class-list-page');
    });

    // LIST ACTIONS (Manage, Edit, Delete)
    UI.classListContainer.addEventListener('click', (e) => {
        const clsId = e.target.dataset.id || e.target.closest('.class-info')?.dataset.id;
        if (!clsId) return;

        if (e.target.matches('.manage-btn')) {
            currentClassId = clsId;
            const cls = allClasses.find(c => c.id === clsId);
            currentStudents = cls.students || [];
            document.getElementById('manage-class-title').textContent = `Quản Lý: ${cls.name}`;
            renderStudentGrid();
            showPage('manage-class-page');
        } else if (e.target.closest('.edit-btn')) {
            editingClassId = clsId;
            const cls = allClasses.find(c => c.id === clsId);
            UI.classTypeInput.value = cls.type;
            if (cls.type === 'custom') UI.customDaysGroup.classList.remove('hidden');
            showPage('form-page');
        } else if (e.target.closest('.delete-btn')) {
            deletingClassId = clsId; UI.deleteModal.style.display = 'flex';
        } else if (e.target.closest('.class-info')) {
            currentClassId = clsId;
            const cls = allClasses.find(c => c.id === clsId);
            UI.scheduleClassName.textContent = `🗓️ ${cls.name}`;
            currentStudents = cls.students || []; // Load student for attendance
            currentScheduleData = generateSchedule(cls, cls.offDates || []);
            displaySchedule(currentScheduleData, cls.courseType, cls.quizletLinks, cls.attendanceLog || {});
            displaySummary(currentScheduleData);
            showPage('schedule-details-page');
        }
    });

    // ADD STUDENT LOGIC
    UI.btnAddStudent.addEventListener('click', () => {
        UI.newStudentName.value = '';
        UI.selectedAvatarUrl.value = AVATAR_LIST[0]; 
        UI.avatarSelector.innerHTML = '';
        AVATAR_LIST.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'avatar-option';
            if (url === AVATAR_LIST[0]) img.classList.add('selected');
            img.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                UI.selectedAvatarUrl.value = url;
            });
            UI.avatarSelector.appendChild(img);
        });
        UI.addStudentModal.style.display = 'flex';
    });

    UI.btnCancelStudent.addEventListener('click', () => UI.addStudentModal.style.display = 'none');
    UI.btnSaveStudent.addEventListener('click', async () => {
        const name = UI.newStudentName.value.trim();
        if (!name) return alert("Vui lòng nhập tên!");
        const newStudent = {
            id: Date.now(),
            name: name,
            avatar: UI.selectedAvatarUrl.value,
            exp: 0,
            completedTasks: []
        };
        currentStudents.push(newStudent);
        await saveStudents(currentClassId, currentStudents);
        UI.addStudentModal.style.display = 'none';
    });

    UI.btnMarkAllDone.addEventListener('click', async () => {
        if (!confirm("Xác nhận tất cả học viên đã xong bài hôm nay (+20 EXP)?")) return;
        const cls = allClasses.find(c => c.id === currentClassId);
        const schedule = generateSchedule(cls, cls.offDates || []);
        const homeReviews = calculateHomeReviews(schedule, cls.courseType);
        const todayStr = formatDate(new Date());
        const tasksToday = homeReviews[todayStr];

        if (!tasksToday || tasksToday.length === 0) return alert("Hôm nay không có bài ôn!");
        let count = 0;
        currentStudents.forEach(st => {
            if (!st.completedTasks) st.completedTasks = [];
            tasksToday.forEach(task => {
                if (!st.completedTasks.includes(task.taskId)) {
                    st.completedTasks.push(task.taskId);
                    st.exp = (st.exp || 0) + EXP_REWARD;
                    count++;
                }
            });
        });
        if (count > 0) { await saveStudents(currentClassId, currentStudents); alert("Đã cập nhật!"); }
        else alert("Đã hoàn thành trước đó rồi.");
    });

    UI.btnResetExp.addEventListener('click', async () => {
        if (currentStudentIndex === null) return;
        if (!confirm("Bạn có chắc muốn Reset điểm về 0?")) return;
        currentStudents[currentStudentIndex].exp = 0;
        currentStudents[currentStudentIndex].completedTasks = [];
        await saveStudents(currentClassId, currentStudents);
        openStudentDetail(currentStudentIndex);
    });

    UI.btnDeleteStudent.addEventListener('click', async () => {
        if (currentStudentIndex === null) return;
        if (!confirm("CẢNH BÁO: Xóa học viên này khỏi lớp?")) return;
        currentStudents.splice(currentStudentIndex, 1);
        await saveStudents(currentClassId, currentStudents);
        UI.studentDetailModal.style.display = 'none';
    });

    // --- ATTENDANCE LOGIC ---
    UI.scheduleBody.addEventListener('click', (e) => {
        if (e.target.matches('.btn-attendance')) {
            currentAttendanceDate = e.target.dataset.date;
            const cls = allClasses.find(c => c.id === currentClassId);
            const attendedList = cls.attendanceLog?.[currentAttendanceDate] || [];
            
            UI.attendanceTitle.textContent = `Điểm Danh: ${currentAttendanceDate}`;
            UI.attendanceList.innerHTML = '';
            
            if (currentStudents.length === 0) {
                UI.attendanceList.innerHTML = '<p>Lớp chưa có học viên nào.</p>';
            } else {
                currentStudents.forEach(st => {
                    const div = document.createElement('div');
                    div.className = 'attendance-item';
                    const isChecked = attendedList.includes(st.id);
                    div.innerHTML = `
                        <span>${st.name}</span>
                        <input type="checkbox" class="attendance-check" value="${st.id}" ${isChecked ? 'checked' : ''}>
                    `;
                    UI.attendanceList.appendChild(div);
                });
            }
            UI.attendanceModal.style.display = 'flex';
        }
    });

    UI.btnSaveAttendance.addEventListener('click', async () => {
        const checkedBoxes = document.querySelectorAll('.attendance-check:checked');
        const attendedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        
        await saveAttendance(currentClassId, { [currentAttendanceDate]: attendedIds });
        UI.attendanceModal.style.display = 'none';
    });

    // --- SCHEDULE MENU (PENCIL) ---
    UI.scheduleBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const actionDiv = btn.closest('.lesson-actions');
        if (btn.matches('.edit-lesson-btn')) {
            activeLessonCell = btn.closest('.lesson-name-cell');
            activeLessonKey = actionDiv.dataset.lessonKey;
            
            // Thêm mục Báo bài vào menu nếu chưa có
            const menuList = UI.pencilMenu.querySelector('ul');
            if (!document.getElementById('menu-report-homework')) {
                const li = document.createElement('li');
                li.id = 'menu-report-homework';
                li.textContent = '📢 Báo bài về nhà & Quizlet';
                li.addEventListener('click', openHomeworkModal);
                menuList.appendChild(li);
            }

            UI.pencilMenu.style.top = `${e.clientY}px`; UI.pencilMenu.style.left = `${e.clientX}px`;
            UI.pencilMenu.style.display = 'block';
        } else if (btn.matches('.quizlet-btn')) {
            activeLessonKey = actionDiv.dataset.lessonKey;
            UI.quizletMenu.style.top = `${e.clientY}px`; UI.quizletMenu.style.left = `${e.clientX}px`;
            UI.quizletMenu.style.display = 'block';
        }
    });

    // --- HOMEWORK MODAL LOGIC ---
    const openHomeworkModal = () => {
        UI.pencilMenu.style.display = 'none';
        const item = currentScheduleData.find(i => i.lessonKey === activeLessonKey);
        const cls = allClasses.find(c => c.id === currentClassId);
        const quizletLink = cls.quizletLinks?.[activeLessonKey] || '';
        
        // Auto generate content
        const template = `📢 BÁO BÀI VỀ NHÀ - LỚP ${cls.name.toUpperCase()}
📅 Ngày học: ${item.lessonDate}
📚 Nội dung: ${item.lessonName}
-------------------------
📝 BÀI TẬP VỀ NHÀ:
1. Ôn lại từ vựng và cấu trúc câu đã học.
2. Làm bài tập trong sách Workbook trang ...
3. Luyện tập trên Quizlet (link bên dưới).

Chúc các con làm bài tốt! ❤`;

        UI.homeworkContent.value = template;
        UI.homeworkQuizlet.value = quizletLink || '(Chưa có link Quizlet)';
        UI.homeworkModal.style.display = 'flex';
    };

    UI.btnCopyHomework.addEventListener('click', () => {
        let content = UI.homeworkContent.value;
        const link = UI.homeworkQuizlet.value;
        if (link && link !== '(Chưa có link Quizlet)') {
            content += `\n\n🔗 Link Quizlet: ${link}`;
        }
        navigator.clipboard.writeText(content).then(() => alert("Đã copy nội dung!"));
    });

    document.getElementById('menu-postpone-session').addEventListener('click', async () => {
        UI.pencilMenu.style.display = 'none';
        if (!currentClassId || !activeLessonKey) return;
        const lessonItem = currentScheduleData.find(item => item.lessonKey === activeLessonKey);
        if (!lessonItem) return;
        if (!confirm(`Cho lớp nghỉ buổi ngày ${lessonItem.lessonDate}? Lịch sẽ tự lùi.`)) return;

        const cls = allClasses.find(c => c.id === currentClassId);
        if (!cls.offDates) cls.offDates = [];
        if (!cls.offDates.includes(lessonItem.lessonDate)) cls.offDates.push(lessonItem.lessonDate);

        if (isGuestMode) alert("Đã cập nhật (Khách).");
        else await getClassesRef().doc(currentClassId).update({ offDates: cls.offDates });
        
        currentScheduleData = generateSchedule(cls, cls.offDates);
        displaySchedule(currentScheduleData, cls.courseType, cls.quizletLinks, cls.attendanceLog || {});
        displaySummary(currentScheduleData);
    });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.matches('button')) {
            document.querySelectorAll('.context-menu').forEach(m => m.style.display = 'none');
        }
    });
    UI.btnCancelDelete.addEventListener('click', () => UI.deleteModal.style.display = 'none');
    UI.btnConfirmDelete.addEventListener('click', async () => {
        if(isGuestMode) allClasses = allClasses.filter(c => c.id !== deletingClassId);
        else await getClassesRef().doc(deletingClassId).delete();
        UI.deleteModal.style.display = 'none'; loadClasses().then(renderClassList);
    });
    document.getElementById('show-csv-guide').addEventListener('click', () => UI.csvGuideModal.style.display = 'flex');
    document.getElementById('btn-close-guide').addEventListener('click', () => UI.csvGuideModal.style.display = 'none');
});
