// dashboard.js - Sử dụng API Progress từ Backend
const API_BASE_URL = 'http://localhost:8000/api/v1';

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
            window.location.href = 'profile.html';
        }
    });
});

// ========== AUTH HELPERS ==========
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    credentials: 'include'
                });
            }
        } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '../Register_Login/dang-nhap.html';
        }
    }
}

// ========== USER CONTEXT ==========
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

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        // Không có token, redirect về đăng nhập
        window.location.href = '../Register_Login/dang-nhap.html';
        return;
    }
    
    // Load dữ liệu từ API
    await initDashboard();
});

async function initDashboard() {
    try {
        // Load tất cả data song song
        const [overviewData, streakData, dailyData] = await Promise.all([
            fetchProgressOverview(),
            fetchStreakInfo(),
            fetchDailyStats(30) // Lấy 30 ngày để hiển thị calendar
        ]);
        
        // Render UI
        if (overviewData) {
            renderProgressStats(overviewData);
        }
        
        if (streakData) {
            renderStreakInfo(streakData);
        }
        
        if (dailyData) {
            renderStudyCalendar(dailyData);
        }
        
        // Check admin
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        showAdminMenuIfAdmin(user);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Fallback: render với data trống
        renderStudyCalendar([]);
    }
}

// ========== API CALLS ==========
async function fetchProgressOverview() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/overview`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            // Token hết hạn
            localStorage.clear();
            window.location.href = '../Register_Login/dang-nhap.html';
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching progress overview:', error);
        return null;
    }
}

async function fetchStreakInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/streak`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching streak info:', error);
        return null;
    }
}

async function fetchDailyStats(days = 30) {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/daily?days=${days}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        return [];
    }
}

// ========== RENDER FUNCTIONS ==========
function renderProgressStats(data) {
    // Số ngày học (từ daily stats có lessons_completed > 0)
    const totalDaysElement = document.getElementById('totalStudyDays');
    if (totalDaysElement) {
        // Tính từ overview: total_study_minutes / 30 (ước tính)
        const estimatedDays = Math.max(1, Math.floor(data.total_study_minutes / 30));
        totalDaysElement.textContent = data.total_lessons_completed > 0 ? estimatedDays : 0;
    }
    
    // Số bài học đã hoàn thành
    const completedLessonsElement = document.getElementById('completedLessons');
    if (completedLessonsElement) {
        completedLessonsElement.textContent = data.total_lessons_completed || 0;
    }
    
    // Số từ vựng đã học
    const totalWordsElement = document.getElementById('totalWords');
    if (totalWordsElement) {
        totalWordsElement.textContent = data.total_vocabulary_learned || 0;
    }
    
    // Progress Bar - mục tiêu 20 bài/tháng
    const monthlyGoal = 20;
    const completedLessons = data.total_lessons_completed || 0;
    const progressPercent = Math.min(Math.round((completedLessons / monthlyGoal) * 100), 100);
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = progressPercent + '%';
    
    const progressPercentText = document.getElementById('progressPercent');
    if (progressPercentText) progressPercentText.textContent = progressPercent + '%';
    
    // Message mục tiêu
    const progressMessage = document.getElementById('progressMessage');
    if (progressMessage) {
        if (completedLessons === 0) {
            progressMessage.textContent = 'Bắt đầu học để đạt mục tiêu! 🎯';
        } else if (progressPercent < 50) {
            progressMessage.textContent = `Còn ${monthlyGoal - completedLessons} bài nữa để đạt mục tiêu! 💪`;
        } else if (progressPercent < 100) {
            progressMessage.textContent = `Sắp đạt mục tiêu rồi! Cố lên! 🔥`;
        } else {
            progressMessage.textContent = `Xuất sắc! Đã vượt mục tiêu! 🎉`;
        }
    }
}

function renderStreakInfo(data) {
    const streakNumberElement = document.getElementById('streakNumber');
    if (streakNumberElement) {
        streakNumberElement.textContent = data.current_streak || 0;
    }
    
    const streakMessageElement = document.getElementById('streakMessage');
    if (streakMessageElement) {
        const streak = data.current_streak || 0;
        if (streak === 0) {
            streakMessageElement.textContent = 'Bắt đầu học để tạo streak!';
        } else if (streak === 1) {
            streakMessageElement.textContent = 'Tuyệt vời! Tiếp tục duy trì nhé! 💪';
        } else {
            streakMessageElement.textContent = `Duy trì ${streak} ngày liên tiếp! 🔥`;
        }
    }
    
    const streakInfoElement = document.getElementById('streakInfo');
    if (streakInfoElement) {
        if (data.learned_today) {
            streakInfoElement.textContent = 'Hôm nay đã hoàn thành! ✅';
        } else {
            streakInfoElement.textContent = 'Học ngay để duy trì streak! 🔥';
        }
    }
}

function renderStudyCalendar(dailyStats) {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // Clear calendar
    calendarGrid.innerHTML = '';
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();
    
    // Tạo Set các ngày đã học (có lessons_completed > 0)
    const studiedDates = new Set();
    if (dailyStats && dailyStats.length > 0) {
        dailyStats.forEach(stat => {
            if (stat.lessons_completed > 0) {
                // Chuyển date string thành Date object để so sánh
                const d = new Date(stat.date);
                studiedDates.add(d.toDateString());
            }
        });
    }
    
    // Cập nhật số ngày học
    const totalDaysElement = document.getElementById('totalStudyDays');
    if (totalDaysElement) {
        totalDaysElement.textContent = studiedDates.size;
    }
    
    // Render calendar header
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const monthElement = document.getElementById('calendarMonth');
    if (monthElement) monthElement.textContent = `${monthNames[currentMonth]}, ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Empty cells for days before month starts
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
        
        if (day === currentDate) {
            dayElement.classList.add('today');
        }
        
        const dateStr = new Date(currentYear, currentMonth, day).toDateString();
        if (studiedDates.has(dateStr)) {
            dayElement.classList.add('studied');
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// ========== ADMIN MENU ==========
function showAdminMenuIfAdmin(user) {
    const adminNavItem = document.getElementById('adminNavItem');
    if (adminNavItem && user && user.role === 'admin') {
        adminNavItem.style.display = 'block';
        console.log('🔑 Admin access enabled');
    }
}

// ========== EXPORT FOR OTHER PAGES ==========
// Hàm gọi API để cập nhật streak (gọi từ topics.js khi hoàn thành bài)
window.updateStreakOnServer = async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/streak/update`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Streak updated:', result);
            return result;
        }
    } catch (error) {
        console.error('Error updating streak:', error);
    }
    return null;
};

// Hàm refresh dashboard data
window.refreshDashboard = async function() {
    await initDashboard();
};

// Export API_BASE_URL
window.DASHBOARD_API_URL = API_BASE_URL;
