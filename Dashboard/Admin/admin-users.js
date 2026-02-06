// ========== ADMIN USERS PAGE JS ==========

// Pagination state
let currentPage = 1;
let totalPages = 1;
let pageSize = 15;

// Filter state
let currentFilters = {
    search: '',
    level: '',
    is_active: '',
    sort_by: 'created_at',
    sort_order: 'desc'
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAdminAuth()) return;
    
    setupUserMenu();
    setupSearch();
    
    await loadUsers();
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
        try {
            await fetch(`${ADMIN_CONFIG.API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.clear();
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

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.search = this.value.trim();
            currentPage = 1;
            loadUsers();
        }, 500);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            currentFilters.search = this.value.trim();
            currentPage = 1;
            loadUsers();
        }
    });
}

function applyFilters() {
    currentFilters.level = document.getElementById('levelFilter').value;
    currentFilters.is_active = document.getElementById('statusFilter').value;
    currentFilters.sort_by = document.getElementById('sortFilter').value;
    currentPage = 1;
    loadUsers();
}

// ========== DATA LOADING ==========
async function loadUsers() {
    showTableLoading(true);
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            page_size: pageSize,
            sort_by: currentFilters.sort_by,
            sort_order: currentFilters.sort_order
        });
        
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.level) params.append('level', currentFilters.level);
        if (currentFilters.is_active !== '') params.append('is_active', currentFilters.is_active);
        
        const response = await fetch(
            `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.USERS}?${params}`,
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
        renderUsersTable(data.items);
        updatePagination(data);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Không thể tải danh sách users');
    } finally {
        showTableLoading(false);
    }
}

async function loadUserDetail(userId) {
    try {
        const response = await fetch(
            `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.USER_DETAIL}${userId}`,
            { headers: getAuthHeaders() }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        renderUserDetailModal(data);
        openModal();
        
    } catch (error) {
        console.error('Error loading user detail:', error);
        showError('Không thể tải thông tin user');
    }
}

// ========== RENDER FUNCTIONS ==========
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = users.map(user => {
        const initials = getInitials(user.full_name || user.email);
        const levelClass = user.current_level || 'beginner';
        const statusClass = user.is_active ? 'active' : 'inactive';
        const statusIcon = user.is_active ? 'fa-circle' : 'fa-circle';
        const statusText = user.is_active ? 'Hoạt động' : 'Đã khóa';
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-small">
                            ${user.avatar_url 
                                ? `<img src="${user.avatar_url}" alt="">` 
                                : initials}
                        </div>
                        <div class="user-details">
                            <div class="user-email-cell">${user.email}</div>
                            <div class="user-name-cell">${user.full_name || '--'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="level-badge ${levelClass}">${capitalizeFirst(user.current_level || 'beginner')}</span>
                </td>
                <td class="stat-cell highlight">${user.total_lessons_completed || 0}</td>
                <td class="stat-cell">${formatStudyTime(user.total_study_time_minutes)}</td>
                <td class="stat-cell">${user.average_score ? user.average_score.toFixed(1) : '--'}</td>
                <td>
                    <div class="streak-cell">
                        <span class="fire">🔥</span>
                        <span>${user.current_streak || 0}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </span>
                </td>
                <td>${formatDateTime(user.created_at)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn view" onclick="loadUserDetail(${user.id})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderUserDetailModal(data) {
    const body = document.getElementById('userDetailBody');
    const user = data.user;
    const initials = getInitials(user.full_name || user.email);
    
    body.innerHTML = `
        <!-- Header -->
        <div class="user-detail-header">
            <div class="user-detail-avatar">
                ${user.avatar_url 
                    ? `<img src="${user.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">` 
                    : initials}
            </div>
            <div class="user-detail-info">
                <h3>${user.full_name || 'Chưa cập nhật tên'}</h3>
                <p>${user.email}</p>
                <div class="user-detail-badges">
                    <span class="level-badge ${user.current_level || 'beginner'}">${capitalizeFirst(user.current_level || 'beginner')}</span>
                    <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                        <i class="fas fa-circle"></i>
                        ${user.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                    ${user.email_verified 
                        ? '<span class="status-badge active"><i class="fas fa-check"></i> Email verified</span>' 
                        : ''}
                </div>
            </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-box-value">${user.total_lessons_completed || 0}</div>
                <div class="stat-box-label">Bài học</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-value">${formatStudyTime(user.total_study_time_minutes)}</div>
                <div class="stat-box-label">Thời gian học</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-value">${user.average_score ? user.average_score.toFixed(1) : '--'}</div>
                <div class="stat-box-label">Điểm TB</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-value">🔥 ${user.current_streak || 0}</div>
                <div class="stat-box-label">Streak</div>
            </div>
        </div>
        
        <!-- Vocabulary Progress -->
        <div class="detail-section">
            <h4><i class="fas fa-book"></i> Tiến độ từ vựng</h4>
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-box">
                    <div class="stat-box-value">${data.total_vocabulary_learned || 0}</div>
                    <div class="stat-box-label">Tổng từ</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="color: #38ef7d;">${data.vocabulary_mastered || 0}</div>
                    <div class="stat-box-label">Thành thạo</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="color: #fee140;">${data.vocabulary_familiar || 0}</div>
                    <div class="stat-box-label">Quen thuộc</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-value" style="color: #a0a0a0;">${data.vocabulary_learning || 0}</div>
                    <div class="stat-box-label">Đang học</div>
                </div>
            </div>
        </div>
        
        <!-- Score Progress -->
        <div class="detail-section">
            <h4><i class="fas fa-chart-bar"></i> Điểm theo loại bài</h4>
            <div class="progress-bars">
                <div class="progress-item">
                    <div class="progress-label">Từ vựng</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${data.avg_vocabulary_score || 0}%"></div>
                    </div>
                    <div class="progress-value">${data.avg_vocabulary_score ? data.avg_vocabulary_score.toFixed(1) : '--'}</div>
                </div>
                <div class="progress-item">
                    <div class="progress-label">Phát âm</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${data.avg_pronunciation_score || 0}%; background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);"></div>
                    </div>
                    <div class="progress-value">${data.avg_pronunciation_score ? data.avg_pronunciation_score.toFixed(1) : '--'}</div>
                </div>
                <div class="progress-item">
                    <div class="progress-label">Hội thoại</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${data.avg_conversation_score || 0}%; background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);"></div>
                    </div>
                    <div class="progress-value">${data.avg_conversation_score ? data.avg_conversation_score.toFixed(1) : '--'}</div>
                </div>
            </div>
        </div>
        
        <!-- Recent Attempts -->
        <div class="detail-section">
            <h4><i class="fas fa-history"></i> Hoạt động gần đây</h4>
            <div class="recent-attempts">
                ${data.recent_attempts && data.recent_attempts.length > 0 
                    ? data.recent_attempts.map(attempt => `
                        <div class="attempt-item">
                            <div class="attempt-icon ${attempt.is_passed ? 'passed' : 'failed'}">
                                <i class="fas ${attempt.is_passed ? 'fa-check' : 'fa-times'}"></i>
                            </div>
                            <div class="attempt-info">
                                <div class="attempt-title">${attempt.lesson_title}</div>
                                <div class="attempt-date">${formatDateTime(attempt.completed_at)}</div>
                            </div>
                            <div class="attempt-score">${attempt.score ? attempt.score.toFixed(1) : '--'}</div>
                        </div>
                    `).join('')
                    : '<p style="color: #a0a0a0; text-align: center; padding: 20px;">Chưa có hoạt động</p>'
                }
            </div>
        </div>
    `;
}

function updatePagination(data) {
    totalPages = data.total_pages;
    currentPage = data.page;
    
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    document.getElementById('pageInfo').textContent = `Trang ${currentPage}/${totalPages} (${data.total} users)`;
    
    // Render page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    let html = '';
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-num ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    pageNumbers.innerHTML = html;
}

// ========== PAGINATION ==========
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadUsers();
}

// ========== MODAL ==========
function openModal() {
    document.getElementById('userDetailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('userDetailModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on backdrop click
document.getElementById('userDetailModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// ========== UTILITIES ==========
function showTableLoading(show) {
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

function formatStudyTime(minutes) {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showError(message) {
    console.error(message);
    alert(message);
}
