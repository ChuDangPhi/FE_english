// ========== ADMIN LEADERBOARD JS ==========

// State
let currentMetric = 'score';
let currentPeriod = '';

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAdminAuth()) return;
    
    setupUserMenu();
    setupTabs();
    
    await loadLeaderboard();
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
        localStorage.clear();
        window.location.href = '../../Register_Login/dang-nhap.html';
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
    
    document.addEventListener('click', function() {
        userMenu.classList.remove('active');
        chevronIcon.style.transform = 'rotate(0deg)';
    });
}

function setupTabs() {
    // Metric tabs
    document.querySelectorAll('.metric-tab').forEach(tab => {
        tab.addEventListener('click', async function() {
            document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentMetric = this.dataset.metric;
            await loadLeaderboard();
        });
    });
    
    // Period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            await loadLeaderboard();
        });
    });
}

// ========== DATA LOADING ==========
async function loadLeaderboard() {
    showLoading(true);
    
    try {
        const params = new URLSearchParams({
            metric: currentMetric,
            limit: 50
        });
        
        if (currentPeriod) {
            params.append('period', currentPeriod);
        }
        
        const response = await fetch(
            `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.LEADERBOARD}?${params}`,
            { headers: getAuthHeaders() }
        );
        
        if (!response.ok) {
            if (response.status === 403) {
                alert('Bạn không có quyền admin!');
                window.location.href = '../dashboard.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        renderPodium(data.items.slice(0, 3));
        renderLeaderboard(data.items);
        document.getElementById('totalCount').textContent = `${data.items.length} người`;
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showError('Không thể tải bảng xếp hạng');
    } finally {
        showLoading(false);
    }
}

// ========== RENDER FUNCTIONS ==========
function renderPodium(topUsers) {
    const container = document.getElementById('podiumContainer');
    
    if (!topUsers || topUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-leaderboard">
                <i class="fas fa-trophy"></i>
                <p>Chưa có dữ liệu xếp hạng</p>
            </div>
        `;
        return;
    }
    
    // Reorder for podium display: 2nd, 1st, 3rd
    const ordered = [];
    if (topUsers[1]) ordered.push({ ...topUsers[1], position: 'second' });
    if (topUsers[0]) ordered.push({ ...topUsers[0], position: 'first' });
    if (topUsers[2]) ordered.push({ ...topUsers[2], position: 'third' });
    
    container.innerHTML = ordered.map(user => {
        const initials = getInitials(user.full_name || user.email);
        const valueDisplay = formatValue(user.value, currentMetric);
        
        return `
            <div class="podium-item ${user.position}">
                <div class="podium-avatar">
                    ${user.position === 'first' ? '<span class="podium-crown">👑</span>' : ''}
                    ${user.avatar_url 
                        ? `<img src="${user.avatar_url}" alt="">` 
                        : initials}
                </div>
                <div class="podium-name">${user.full_name || user.email.split('@')[0]}</div>
                <div class="podium-value">${valueDisplay}</div>
                <div class="podium-stand">${user.rank}</div>
            </div>
        `;
    }).join('');
}

function renderLeaderboard(users) {
    const table = document.getElementById('leaderboardTable');
    
    if (!users || users.length === 0) {
        table.innerHTML = `
            <div class="empty-leaderboard">
                <i class="fas fa-users-slash"></i>
                <p>Chưa có dữ liệu xếp hạng</p>
            </div>
        `;
        return;
    }
    
    table.innerHTML = users.map(user => {
        const rankClass = user.rank === 1 ? 'gold' : user.rank === 2 ? 'silver' : user.rank === 3 ? 'bronze' : 'normal';
        const initials = getInitials(user.full_name || user.email);
        const valueDisplay = formatValue(user.value, currentMetric);
        const valueLabel = getValueLabel(currentMetric);
        
        return `
            <div class="leaderboard-row ${user.rank <= 3 ? 'top-3' : ''}">
                <div class="lb-rank ${rankClass}">${user.rank}</div>
                <div class="lb-avatar">
                    ${user.avatar_url 
                        ? `<img src="${user.avatar_url}" alt="">` 
                        : initials}
                </div>
                <div class="lb-info">
                    <div class="lb-name">${user.full_name || 'Chưa cập nhật'}</div>
                    <div class="lb-email">${user.email}</div>
                </div>
                <span class="lb-level ${user.current_level || 'beginner'}">${capitalizeFirst(user.current_level || 'beginner')}</span>
                <div class="lb-value">
                    <div class="lb-value-num">${valueDisplay}</div>
                    <div class="lb-value-label">${valueLabel}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== UTILITIES ==========
function showLoading(show) {
    const loading = document.getElementById('tableLoading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(/[@\s]/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatValue(value, metric) {
    if (value === null || value === undefined) return '--';
    
    switch (metric) {
        case 'score':
            return value.toFixed(1);
        case 'lessons_completed':
            return Math.round(value);
        case 'streak':
            return `🔥 ${Math.round(value)}`;
        case 'study_time':
            // Value is in minutes
            const hours = Math.floor(value / 60);
            const mins = value % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        default:
            return value;
    }
}

function getValueLabel(metric) {
    switch (metric) {
        case 'score': return 'điểm TB';
        case 'lessons_completed': return 'bài học';
        case 'streak': return 'ngày liên tục';
        case 'study_time': return 'thời gian';
        default: return '';
    }
}

function showError(message) {
    console.error(message);
    alert(message);
}
