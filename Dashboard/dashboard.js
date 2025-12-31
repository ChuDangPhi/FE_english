// dashboard.js
const userSection = document.getElementById('userSection');
const userMenu = document.getElementById('userMenu');
const chevronIcon = document.getElementById('chevronIcon');

// Toggle user menu
userSection.addEventListener('click', function (e) {
    e.stopPropagation();
    userMenu.classList.toggle('active');
    chevronIcon.style.transform = userMenu.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
});

// Close menu when clicking outside
document.addEventListener('click', function (e) {
    if (!userSection.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
        chevronIcon.style.transform = 'rotate(0deg)';
    }
});

// Handle menu item clicks
document.querySelectorAll('.user-menu-item').forEach(item => {
    item.addEventListener('click', function () {
        if (this.classList.contains('logout')) {
            handleLogout();
        } else {
            // Xử lý thông tin cá nhân
            window.location.href = 'profile.html'; // Hoặc link đến trang thông tin cá nhân
        }
    });
});

// Hàm xử lý đăng xuất
async function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                // Gọi API đăng xuất
                const response = await fetch('http://localhost:8000/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    console.warn('Logout server side failed:', response.status);
                }
            }
        } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
        } finally {
            // Luôn xóa token và chuyển hướng bất kể API thành công hay thất bại
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            // Chuyển hướng về trang đăng nhập
            window.location.href = '../Register_Login/dang-nhap.html';
        }
    }
}

// ========== USER CONTEXT & ID IDENTIFICATION ==========
// Detect User ID as early as possible (Synchronously)
function detectUserId() {
    try {
        const cachedUserStr = localStorage.getItem('user');
        if (cachedUserStr) {
            const cachedUser = JSON.parse(cachedUserStr);
            return cachedUser.id || cachedUser.user_id || cachedUser._id || 'guest';
        }
    } catch (e) {
        console.error('Error detecting user ID:', e);
    }
    return 'guest';
}

window.currentUserId = detectUserId();

window.getStudyKey = function (key) {
    // Luôn gắn suffix ID để tách biệt dữ liệu, kể cả guest
    const uid = window.currentUserId || 'guest';
    return `${key}_${uid}`;
};

// Khởi tạo user context và đồng bộ dữ liệu
async function initUserContext() {
    // 1. Initial Render (Sử dụng ID từ cache hoặc guest đã detect phía trên)
    renderStudyCalendar();

    // 2. Kiểm tra/Verify với Server
    try {
        const token = localStorage.getItem('access_token');
        if (token) {
            // Thử lấy profile mới nhất
            const response = await fetch('http://localhost:8000/api/v1/user/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            let user = null;
            if (response.ok) {
                user = await response.json();
            } else {
                // Fallback sang auth/me
                const meResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (meResponse.ok) user = await meResponse.json();
            }

            if (user) {
                const newId = user.id || user.user_id || user._id || 'guest';
                if (newId !== window.currentUserId) {
                    console.log(`🔄 User ID changed/synced: ${window.currentUserId} -> ${newId}`);
                    window.currentUserId = newId;
                    renderStudyCalendar(); // Render lại với ID chính thức
                }
                // Cập nhật lại cache user
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
    } catch (e) {
        console.error('Failed to sync user profile:', e);
    }
}

// Gọi duy nhất 1 lần khi trang load
document.addEventListener('DOMContentLoaded', initUserContext);


// ========== QUẢN LÝ NGÀY HỌC ==========

// Lưu ngày học khi hoàn thành bài
function markStudyComplete() {
    const today = new Date().toDateString();
    const key = window.getStudyKey('studyDates');
    let studyDates = JSON.parse(localStorage.getItem(key) || '[]');

    // Chỉ thêm nếu chưa có ngày hôm nay
    if (!studyDates.includes(today)) {
        studyDates.push(today);
        localStorage.setItem(key, JSON.stringify(studyDates));
        console.log('✅ Đã đánh dấu ngày học:', today);
    }
}

// Render calendar với các ngày đã học
function renderStudyCalendar() {
    const datesKey = window.getStudyKey('studyDates');
    const wordsKey = window.getStudyKey('totalWordsLearned');

    // Load data an toàn
    let studyDates = [];
    try {
        const stored = localStorage.getItem(datesKey);
        studyDates = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(studyDates)) studyDates = [];
    } catch (e) {
        console.error('Error loading studyDates:', e);
        studyDates = [];
    }

    // Lọc bỏ ngày lỗi và ngày trùng lặp
    studyDates = [...new Set(studyDates.filter(d => d && !isNaN(new Date(d).getTime())))];

    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    // Clear calendar
    calendarGrid.innerHTML = '';

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    // 1. CẬP NHẬT THỐNG KÊ (STATS)
    const topicsKey = (window.getStudyKey) ? window.getStudyKey('completedTopics') : 'completedTopics';
    const completedTopicsArray = JSON.parse(localStorage.getItem(topicsKey) || '[]');
    const completedLessons = completedTopicsArray.length; // Số bài học đã hoàn thành
    const totalWords = parseInt(localStorage.getItem(wordsKey) || '0');

    // Cập nhật số liệu trên thẻ tiến độ
    const totalDaysElement = document.getElementById('totalStudyDays');
    if (totalDaysElement) totalDaysElement.textContent = studyDates.length; // Số ngày học

    const completedLessonsElement = document.getElementById('completedLessons');
    if (completedLessonsElement) completedLessonsElement.textContent = completedLessons; // Số bài học

    const totalWordsElement = document.getElementById('totalWords');
    if (totalWordsElement) totalWordsElement.textContent = totalWords;

    // Cập nhật Progress Bar
    const monthlyGoal = 20;
    const progressPercent = Math.min(Math.round((completedLessons / monthlyGoal) * 100), 100);

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = progressPercent + '%';

    const progressPercentText = document.getElementById('progressPercent');
    if (progressPercentText) progressPercentText.textContent = progressPercent + '%';

    // Message mục tiêu
    const progressMessage = document.getElementById('progressMessage');
    if (progressMessage) {
        if (completedLessons === 0) progressMessage.textContent = 'Bắt đầu học để đạt mục tiêu! 🎯';
        else if (progressPercent < 50) progressMessage.textContent = `Còn ${monthlyGoal - completedLessons} bài nữa để đạt mục tiêu! 💪`;
        else if (progressPercent < 100) progressMessage.textContent = `Sắp đạt mục tiêu rồi! Cố lên! 🔥`;
        else progressMessage.textContent = `Xuất sắc! Đã vượt mục tiêu! 🎉`;
    }

    // 2. TÍNH TOÁN STREAK
    const currentStreak = window.calculateStreak(studyDates);

    const streakNumberElement = document.getElementById('streakNumber');
    if (streakNumberElement) streakNumberElement.textContent = currentStreak;

    const streakMessageElement = document.getElementById('streakMessage');
    if (streakMessageElement) {
        if (currentStreak === 0) streakMessageElement.textContent = 'Bắt đầu học để tạo streak!';
        else if (currentStreak === 1) streakMessageElement.textContent = 'Tuyệt vời! Tiếp tục duy trì nhé! 💪';
        else streakMessageElement.textContent = `Duy trì ${currentStreak} ngày liên tiếp! 🔥`;
    }

    const streakInfoElement = document.getElementById('streakInfo');
    if (streakInfoElement) {
        const todayStr = (new Date()).toDateString();
        streakInfoElement.textContent = studyDates.includes(todayStr)
            ? 'Hôm nay đã hoàn thành! ✅'
            : 'Học ngay để duy trì streak! 🔥';
    }

    // 3. RENDER LỊCH (CALENDAR)
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const monthElement = document.getElementById('calendarMonth');
    if (monthElement) monthElement.textContent = `${monthNames[currentMonth]}, ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        calendarGrid.appendChild(empty);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        if (day === currentDate) dayElement.classList.add('today');

        const dateStr = new Date(currentYear, currentMonth, day).toDateString();
        if (studyDates.includes(dateStr)) {
            dayElement.classList.add('studied');
        }
        calendarGrid.appendChild(dayElement);
    }
}

// Reset lịch sử học (chỉ dùng cho mục đích kiểm thử/demo)
function resetStudyHistory() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử học tập? Hành động này không thể hoàn tác.')) {
        const datesKey = window.getStudyKey('studyDates');
        const wordsKey = window.getStudyKey('totalWordsLearned');
        const progressKey = window.getStudyKey('topicProgress');

        localStorage.removeItem(datesKey);
        localStorage.removeItem(wordsKey);
        localStorage.removeItem(progressKey);

        alert('Đã xóa lịch sử học tập!');
        renderStudyCalendar();
    }
}

// Export để có thể gọi từ trang khác (ví dụ từ topics.js)
window.renderStudyCalendar = renderStudyCalendar;
window.markStudyComplete = markStudyComplete;
window.resetStudyHistory = resetStudyHistory;

// Shared streak calculation logic
window.calculateStreak = function (studyDates) {
    if (!studyDates || studyDates.length === 0) return 0;

    // Lọc bỏ ngày lỗi và sắp xếp từ mới nhất đến cũ nhất
    const sortedDates = studyDates
        .filter(d => d && !isNaN(new Date(d).getTime()))
        .map(d => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date;
        })
        .sort((a, b) => b - a);

    if (sortedDates.length === 0) return 0;

    // Loại bỏ các ngày trùng lặp (nếu có)
    const uniqueDates = [];
    const seen = new Set();
    for (const date of sortedDates) {
        const time = date.getTime();
        if (!seen.has(time)) {
            uniqueDates.push(date);
            seen.add(time);
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestStudyDate = uniqueDates[0];
    const daysDiff = Math.floor((today - latestStudyDate) / (1000 * 60 * 60 * 24));

    // Nếu ngày học gần nhất CAO HƠN hôm qua (tức là không học hôm nay cũng không học hôm qua)
    // thì streak đã kết thúc
    if (daysDiff > 1) return 0;

    let currentStreak = 0;
    let checkDate = new Date(latestStudyDate);

    for (let i = 0; i < uniqueDates.length; i++) {
        if (uniqueDates[i].getTime() === checkDate.getTime()) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Có gap trong streak
            break;
        }
    }

    return currentStreak;
};
