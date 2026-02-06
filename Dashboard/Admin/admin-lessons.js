// ========== ADMIN LESSONS PAGE JS ==========

// Pagination state
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;

// Filter state
let currentFilters = {
    lesson_type: '',
    sort_by: 'total_attempts',
    sort_order: 'desc'
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAdminAuth()) return;
    
    setupUserMenu();
    
    await Promise.all([
        loadLessonTypeStats(),
        loadLessons()
    ]);
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

function applyFilters() {
    currentFilters.lesson_type = document.getElementById('typeFilter').value;
    currentFilters.sort_by = document.getElementById('sortFilter').value;
    currentFilters.sort_order = document.getElementById('sortOrder').value;
    currentPage = 1;
    loadLessons();
}

// ========== DATA LOADING ==========
async function loadLessonTypeStats() {
    try {
        const response = await fetch(
            `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.LESSON_TYPES}`,
            { headers: getAuthHeaders() }
        );
        
        if (response.ok) {
            const data = await response.json();
            renderSummaryCards(data);
        }
    } catch (error) {
        console.error('Error loading lesson type stats:', error);
    }
}

async function loadLessons() {
    showTableLoading(true);
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            page_size: pageSize,
            sort_by: currentFilters.sort_by,
            sort_order: currentFilters.sort_order
        });
        
        if (currentFilters.lesson_type) {
            params.append('lesson_type', currentFilters.lesson_type);
        }
        
        const url = `${ADMIN_CONFIG.API_BASE_URL}${ADMIN_CONFIG.ENDPOINTS.LESSONS}?${params}`;
        console.log('Fetching lessons from:', url);
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            
            if (response.status === 401) {
                alert('Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.');
                localStorage.clear();
                window.location.href = '../../Register_Login/dang-nhap.html';
                return;
            }
            if (response.status === 403) {
                alert('Bạn không có quyền admin!');
                window.location.href = '../dashboard.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        renderLessonsTable(data.items);
        updatePagination(data);
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        showError('Không thể tải danh sách bài học');
    } finally {
        showTableLoading(false);
    }
}

// ========== RENDER FUNCTIONS ==========
function renderSummaryCards(stats) {
    const container = document.getElementById('summaryCards');
    
    const typeConfig = {
        'vocabulary_matching': { icon: 'fa-puzzle-piece', label: 'Nối từ vựng', class: 'vocab' },
        'pronunciation': { icon: 'fa-microphone', label: 'Phát âm', class: 'pronun' },
        'conversation': { icon: 'fa-comments', label: 'Hội thoại', class: 'convo' },
        'mixed': { icon: 'fa-layer-group', label: 'Tổng hợp', class: 'mixed' }
    };
    
    if (!stats || stats.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = stats.map(stat => {
        const config = typeConfig[stat.lesson_type] || { icon: 'fa-book', label: stat.lesson_type, class: 'vocab' };
        const passRate = stat.pass_rate || 0;
        
        return `
            <div class="summary-card">
                <div class="summary-icon ${config.class}">
                    <i class="fas ${config.icon}"></i>
                </div>
                <div class="summary-info">
                    <div class="summary-value">${stat.total_attempts || 0}</div>
                    <div class="summary-label">${config.label}</div>
                    <div class="summary-detail">Tỉ lệ đạt: ${passRate.toFixed(1)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderLessonsTable(lessons) {
    const tbody = document.getElementById('lessonsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!lessons || lessons.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    const typeNames = {
        'vocabulary_matching': 'Nối từ vựng',
        'pronunciation': 'Phát âm',
        'conversation': 'Hội thoại',
        'mixed': 'Tổng hợp'
    };
    
    tbody.innerHTML = lessons.map(lesson => {
        const passRate = lesson.pass_rate || 0;
        const rateClass = passRate >= 70 ? 'high' : passRate >= 40 ? 'medium' : 'low';
        const avgScore = lesson.average_score || 0;
        const duration = lesson.avg_duration_seconds ? formatDuration(lesson.avg_duration_seconds) : '--';
        
        return `
            <tr>
                <td>
                    <div class="lesson-cell">
                        <div class="lesson-title">${lesson.lesson_title}</div>
                        <div class="lesson-topic">${lesson.topic_name}</div>
                    </div>
                </td>
                <td>
                    <span class="type-badge ${lesson.lesson_type}">
                        ${typeNames[lesson.lesson_type] || lesson.lesson_type}
                    </span>
                </td>
                <td class="stat-value highlight">${lesson.total_attempts || 0}</td>
                <td class="stat-value">${lesson.unique_users || 0}</td>
                <td class="stat-value">${lesson.completed_count || 0}</td>
                <td>
                    <span class="rate-badge ${rateClass}">${passRate.toFixed(1)}%</span>
                </td>
                <td>
                    <div class="score-cell">
                        <span>${avgScore.toFixed(1)}</span>
                        <div class="score-bar">
                            <div class="score-bar-fill" style="width: ${avgScore}%"></div>
                        </div>
                    </div>
                </td>
                <td class="duration-cell">${duration}</td>
            </tr>
        `;
    }).join('');
}

function updatePagination(data) {
    totalPages = data.total_pages;
    currentPage = data.page;
    
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    document.getElementById('pageInfo').textContent = `Trang ${currentPage}/${totalPages} (${data.total} bài học)`;
    
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
    loadLessons();
}

// ========== UTILITIES ==========
function showTableLoading(show) {
    const loading = document.getElementById('tableLoading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function formatDuration(seconds) {
    if (!seconds) return '--';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

function showError(message) {
    console.error(message);
    alert(message);
}
