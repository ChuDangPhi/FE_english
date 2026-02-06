// ========== ADMIN DASHBOARD JS ==========

// Global variables
let activityChart = null;
let levelChart = null;
let currentActivityDays = 7;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Check admin auth
    if (!checkAdminAuth()) {
        return;
    }
    
    // Setup UI
    setupUserMenu();
    setupChartControls();
    
    // Load dashboard data
    await loadDashboard();
});

// ========== AUTH ==========
function checkAdminAuth() {
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        alert('Vui lòng đăng nhập!');
        window.location.href = '../../Register_Login/dang-nhap.html';
        return false;
    }
    
    if (user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = '../dashboard.html';
        return false;
    }
    
    // Update admin name
    document.getElementById('adminName').textContent = user.full_name || user.email || 'Admin';
    
    return true;
}

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
                await fetch(`${ADMIN_CONFIG.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '../../Register_Login/dang-nhap.html';
        }
    }
}

// ========== UI SETUP ==========
function setupUserMenu() {
    const userSection = document.getElementById('userSection');
    const userMenu = document.getElementById('userMenu');
    const chevronIcon = document.getElementById('chevronIcon');
    
    userSection.addEventListener('click', function(e) {
        e.stopPropagation();
        userMenu.classList.toggle('active');
        chevronIcon.style.transform = userMenu.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
    });
    
    document.addEventListener('click', function(e) {
        if (!userSection.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.classList.remove('active');
            chevronIcon.style.transform = 'rotate(0deg)';
        }
    });
}

function setupChartControls() {
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentActivityDays = parseInt(this.dataset.days);
            await loadActivityChart(currentActivityDays);
        });
    });
}

function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        `Cập nhật: ${now.toLocaleTimeString('vi-VN')}`;
}

// ========== DATA LOADING ==========
async function loadDashboard() {
    showLoading(true);
    
    try {
        // Load all data in parallel
        const [dashboardData] = await Promise.all([
            fetchDashboardData()
        ]);
        
        if (dashboardData) {
            renderOverview(dashboardData.overview);
            renderUserDistribution(dashboardData.user_distribution);
            renderLessonTypeStats(dashboardData.lesson_type_stats);
            renderActivityChart(dashboardData.recent_activity);
            renderTopUsers(dashboardData.top_users);
            renderTopLessons(dashboardData.top_lessons);
        }
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Không thể tải dữ liệu dashboard');
    } finally {
        showLoading(false);
    }
}

async function fetchDashboardData() {
    try {
        const url = `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.DASHBOARD}`;
        console.log('Fetching dashboard from:', url);
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            
            if (response.status === 401) {
                alert('Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.');
                localStorage.clear();
                window.location.href = '../../Register_Login/dang-nhap.html';
                return null;
            }
            if (response.status === 403) {
                alert('Bạn không có quyền admin!');
                window.location.href = '../dashboard.html';
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch dashboard error:', error);
        throw error;
    }
}

async function loadActivityChart(days = 7) {
    try {
        const response = await fetch(
            `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.ACTIVITY}?days=${days}`,
            { headers: getAuthHeaders() }
        );
        
        if (response.ok) {
            const data = await response.json();
            renderActivityChart(data.data);
        }
    } catch (error) {
        console.error('Error loading activity chart:', error);
    }
}

async function refreshDashboard() {
    await loadDashboard();
}

// ========== RENDER FUNCTIONS ==========
function renderOverview(overview) {
    if (!overview) return;
    
    document.getElementById('totalUsers').textContent = formatNumber(overview.total_users);
    document.getElementById('activeUsers').textContent = `${formatNumber(overview.active_users)} active`;
    document.getElementById('newUsersToday').textContent = `+${overview.new_users_today} hôm nay`;
    
    document.getElementById('totalLessonsCompleted').textContent = formatNumber(overview.total_lessons_completed);
    document.getElementById('totalLessons').textContent = `${overview.total_lessons} bài học`;
    
    const hours = Math.floor(overview.total_study_time_minutes / 60);
    document.getElementById('totalStudyTime').textContent = `${formatNumber(hours)}h`;
    
    document.getElementById('averageScore').textContent = 
        overview.average_score ? `${overview.average_score.toFixed(1)}` : '--';
    document.getElementById('totalVocabulary').textContent = `${formatNumber(overview.total_vocabulary)} từ vựng`;
}

function renderUserDistribution(distribution) {
    if (!distribution) return;
    
    const ctx = document.getElementById('levelChart').getContext('2d');
    
    if (levelChart) {
        levelChart.destroy();
    }
    
    const total = distribution.beginner + distribution.intermediate + distribution.advanced;
    
    levelChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Beginner', 'Intermediate', 'Advanced'],
            datasets: [{
                data: [distribution.beginner, distribution.intermediate, distribution.advanced],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(56, 239, 125, 0.8)',
                    'rgba(245, 87, 108, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(56, 239, 125, 1)',
                    'rgba(245, 87, 108, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 31, 61, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a0a0a0',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Render legend
    const legendHtml = `
        <div class="legend-item">
            <div class="legend-color" style="background: rgba(102, 126, 234, 0.8);"></div>
            <span>Beginner (${distribution.beginner})</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: rgba(56, 239, 125, 0.8);"></div>
            <span>Intermediate (${distribution.intermediate})</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: rgba(245, 87, 108, 0.8);"></div>
            <span>Advanced (${distribution.advanced})</span>
        </div>
    `;
    document.getElementById('levelLegend').innerHTML = legendHtml;
}

function renderActivityChart(data) {
    if (!data || data.length === 0) return;
    
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    if (activityChart) {
        activityChart.destroy();
    }
    
    const labels = data.map(d => formatDate(d.date));
    const activeUsers = data.map(d => d.active_users);
    const lessonsCompleted = data.map(d => d.lessons_completed);
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Users hoạt động',
                    data: activeUsers,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Bài học hoàn thành',
                    data: lessonsCompleted,
                    borderColor: 'rgba(56, 239, 125, 1)',
                    backgroundColor: 'rgba(56, 239, 125, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#a0a0a0',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 31, 61, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a0a0a0',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0a0a0',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderLessonTypeStats(stats) {
    if (!stats || stats.length === 0) {
        document.getElementById('lessonTypeStats').innerHTML = 
            '<p style="color: #a0a0a0; text-align: center;">Chưa có dữ liệu</p>';
        return;
    }
    
    const typeNames = {
        'vocabulary_matching': 'Nối từ vựng',
        'pronunciation': 'Phát âm',
        'conversation': 'Hội thoại',
        'mixed': 'Tổng hợp'
    };
    
    const html = stats.map(stat => {
        const completionRate = stat.completion_rate || 0;
        const passRate = stat.pass_rate || 0;
        
        return `
            <div class="lesson-type-item">
                <div class="lesson-type-header">
                    <span class="lesson-type-name">${typeNames[stat.lesson_type] || stat.lesson_type}</span>
                    <span class="lesson-type-attempts">${stat.total_attempts} lượt</span>
                </div>
                <div class="lesson-type-bars">
                    <div class="type-bar">
                        <div class="type-bar-label">
                            <span>Hoàn thành</span>
                            <span>${completionRate.toFixed(1)}%</span>
                        </div>
                        <div class="type-bar-track">
                            <div class="type-bar-fill completion" style="width: ${completionRate}%"></div>
                        </div>
                    </div>
                    <div class="type-bar">
                        <div class="type-bar-label">
                            <span>Đạt</span>
                            <span>${passRate.toFixed(1)}%</span>
                        </div>
                        <div class="type-bar-track">
                            <div class="type-bar-fill pass" style="width: ${passRate}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('lessonTypeStats').innerHTML = html;
}

function renderTopUsers(users) {
    if (!users || users.length === 0) {
        document.getElementById('topUsersList').innerHTML = 
            '<p style="color: #a0a0a0; text-align: center; padding: 20px;">Chưa có dữ liệu</p>';
        return;
    }
    
    const html = users.slice(0, 5).map((user, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';
        
        return `
            <div class="top-user-item">
                <div class="rank ${rankClass}">${user.rank}</div>
                <div class="user-info">
                    <div class="user-email">${user.full_name || user.email}</div>
                    <div class="user-level">${user.current_level}</div>
                </div>
                <div class="user-score">
                    <div class="score-value">${user.value.toFixed(1)}</div>
                    <div class="score-label">điểm TB</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('topUsersList').innerHTML = html;
}

function renderTopLessons(lessons) {
    if (!lessons || lessons.length === 0) {
        document.getElementById('topLessonsList').innerHTML = 
            '<p style="color: #a0a0a0; text-align: center; padding: 20px;">Chưa có dữ liệu</p>';
        return;
    }
    
    const html = lessons.slice(0, 5).map((lesson, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';
        
        return `
            <div class="top-lesson-item">
                <div class="rank ${rankClass}">${index + 1}</div>
                <div class="lesson-info">
                    <div class="lesson-title">${lesson.lesson_title}</div>
                    <div class="lesson-topic">${lesson.topic_name}</div>
                </div>
                <div class="lesson-attempts">
                    <div class="attempts-value">${Math.round(lesson.value)}</div>
                    <div class="attempts-label">lượt làm</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('topLessonsList').innerHTML = html;
}

// ========== UTILITIES ==========
function formatNumber(num) {
    if (num === null || num === undefined) return '--';
    return num.toLocaleString('vi-VN');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function showError(message) {
    // Simple error display - can be enhanced with toast notifications
    console.error(message);
    alert(message);
}
