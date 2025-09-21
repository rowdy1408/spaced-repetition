document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN ---
    const pages = document.querySelectorAll('.page');
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
    let editingClassId = null;
    let deletingClassId = null;

    // --- CẤU HÌNH LỊCH HỌC ---
    const CLASS_SCHEDULE_DAYS = { '2-4': [1, 3], '3-5': [2, 4], '4-6': [3, 5], '7-cn': [6, 0], '2-4-6': [1, 3, 5], '3-5-7': [2, 4, 6] };
    const REVIEW_OFFSETS = [1, 3, 6, 10];

    // --- QUẢN LÝ DỮ LIỆU ---
    const saveClassesToStorage = () => localStorage.setItem('teacherApp_classes', JSON.stringify(allClasses));
    const loadClassesFromStorage = () => {
        const storedClasses = localStorage.getItem('teacherApp_classes');
        allClasses = storedClasses ? JSON.parse(storedClasses) : [];
    };

    // --- ĐIỀU HƯỚNG & MODAL ---
    const showPage = (pageId) => pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    const showDeleteModal = () => deleteModal.style.display = 'flex';
    const hideDeleteModal = () => deleteModal.style.display = 'none';

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
        while (!scheduleDays.includes(currentDate.getDay())) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const allSessionDates = [];
        while (allSessionDates.length < LESSONS.length + REVIEW_OFFSETS[REVIEW_OFFSETS.length - 1]) {
            if (scheduleDays.includes(currentDate.getDay())) {
                allSessionDates.push(new Date(currentDate.getTime()));
            }
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

    // --- GÁN SỰ KIỆN ---
    document.getElementById('btn-show-create-form').addEventListener('click', () => {
        editingClassId = null;
        formTitle.textContent = '➕ Tạo Lớp Học Mới';
        formSubmitBtn.textContent = 'Tạo Lớp';
        classForm.reset();
        document.getElementById('num-units').value = 20;
        document.getElementById('start-date').valueAsDate = new Date();
        showPage('form-page');
    });
    document.getElementById('btn-show-class-list').addEventListener('click', () => {
        renderClassList();
        showPage('class-list-page');
    });

    document.querySelectorAll('.back-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = e.target.dataset.target;
            if (targetPage === 'class-list-page') renderClassList();
            showPage(targetPage);
        });
    });

    classForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const className = document.getElementById('class-name').value;
        const numUnits = document.getElementById('num-units').value;
        const classType = document.getElementById('class-type').value;
        const startDate = document.getElementById('start-date').value;

        if (!className.trim() || !startDate || !numUnits) {
            document.getElementById('form-error-message').textContent = 'Vui lòng điền đầy đủ thông tin!';
            return;
        }

        if (editingClassId) {
            const classIndex = allClasses.findIndex(cls => cls.id === editingClassId);
            if (classIndex > -1) {
                allClasses[classIndex] = { ...allClasses[classIndex], name: className, numUnits, type: classType, startDate };
            }
        } else {
            const newClass = { id: Date.now(), name: className, numUnits, type: classType, startDate };
            allClasses.push(newClass);
        }
        
        saveClassesToStorage();
        classForm.reset();
        editingClassId = null;
        renderClassList();
        showPage('class-list-page');
    });

    classListContainer.addEventListener('click', (e) => {
        const classInfo = e.target.closest('.class-info');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {
            deletingClassId = Number(deleteBtn.dataset.id);
            showDeleteModal();
        } else if (editBtn) {
            const classId = Number(editBtn.dataset.id);
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
            const classId = Number(classInfo.dataset.id);
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

    btnConfirmDelete.addEventListener('click', () => {
        allClasses = allClasses.filter(cls => cls.id !== deletingClassId);
        saveClassesToStorage();
        renderClassList();
        hideDeleteModal();
    });
    btnCancelDelete.addEventListener('click', hideDeleteModal);

    // --- KHỞI CHẠY ỨNG DỤNG ---
    function initialize() {
        loadClassesFromStorage();
        showPage('home-page');
    }

    initialize();
});