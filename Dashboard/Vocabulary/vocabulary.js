// Vocabulary Notebook JavaScript
const API_BASE = 'http://localhost:8000/api/v1';

// State
let vocabularyData = [];
let filteredData = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let currentFilter = 'all';
let currentWord = null;
let currentAudio = null;

// DOM Elements
const vocabList = document.getElementById('vocabList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const wordModal = document.getElementById('wordModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    loadVocabulary();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../../Register_Login/dang-nhap.html';
    }
}

// Load user info
function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            document.getElementById('userName').textContent = user.full_name || user.email || 'Tài khoản';
        } catch (e) {
            console.error('Error parsing user info:', e);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterVocabulary();
        });
    });
    
    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadVocabulary();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadVocabulary();
        }
    });
    
    // Modal close on overlay click
    wordModal.addEventListener('click', (e) => {
        if (e.target === wordModal) {
            closeModal();
        }
    });
    
    // Mastery buttons
    document.querySelectorAll('.mastery-btn').forEach(btn => {
        btn.addEventListener('click', () => updateMastery(btn.dataset.level));
    });
    
    // User dropdown
    const userSection = document.getElementById('userSection');
    const userMenu = document.getElementById('userMenu');
    const chevronIcon = document.getElementById('chevronIcon');
    
    if (userSection) {
        userSection.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('active');
            chevronIcon.style.transform = userMenu.classList.contains('active') 
                ? 'rotate(180deg)' 
                : 'rotate(0deg)';
        });
    }
    
    // Close dropdown on outside click
    document.addEventListener('click', () => {
        userMenu?.classList.remove('active');
        if (chevronIcon) chevronIcon.style.transform = 'rotate(0deg)';
    });
    
    // ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Load vocabulary from API
async function loadVocabulary() {
    const token = localStorage.getItem('access_token');
    
    showLoading(true);
    
    try {
        const response = await fetch(
            `${API_BASE}/vocabulary/saved?page=${currentPage}&page_size=${pageSize}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to load vocabulary');
        }
        
        const data = await response.json();
        
        vocabularyData = data.items || data.data || data || [];
        totalPages = data.total_pages || Math.ceil((data.total || vocabularyData.length) / pageSize) || 1;
        
        // Update stats
        updateStats();
        
        // Filter and render
        filterVocabulary();
        
        // Update pagination
        updatePagination();
        
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showError('Không thể tải từ vựng. Vui lòng thử lại.');
    } finally {
        showLoading(false);
    }
}

// Filter vocabulary
function filterVocabulary() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    filteredData = vocabularyData.filter(item => {
        // Search filter
        const matchesSearch = !searchTerm || 
            item.word?.toLowerCase().includes(searchTerm) ||
            item.definition?.toLowerCase().includes(searchTerm) ||
            item.phonetic?.toLowerCase().includes(searchTerm);
        
        // Mastery filter
        const mastery = item.mastery_level || item.mastery || 'learning';
        const matchesFilter = currentFilter === 'all' || mastery === currentFilter;
        
        return matchesSearch && matchesFilter;
    });
    
    renderVocabulary();
}

// Render vocabulary list
function renderVocabulary() {
    if (filteredData.length === 0) {
        vocabList.innerHTML = '';
        emptyState.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    pagination.style.display = 'flex';
    
    vocabList.innerHTML = filteredData.map((item, index) => {
        const mastery = item.mastery_level || item.mastery || 'learning';
        const masteryText = getMasteryText(mastery);
        
        return `
            <div class="word-card" onclick="openWordDetail(${index})">
                <div class="word-card-header">
                    <div>
                        <div class="word-card-word">${escapeHtml(item.word)}</div>
                        <div class="word-card-phonetic">${escapeHtml(item.phonetic || '')}</div>
                    </div>
                    <button class="word-card-audio" onclick="event.stopPropagation(); playWordAudio('${escapeHtml(item.audio_url || '')}', this)">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="word-card-definition">${escapeHtml(item.definition || 'Chưa có định nghĩa')}</div>
                <div class="word-card-footer">
                    <span class="word-card-type">${escapeHtml(item.part_of_speech || 'từ')}</span>
                    <span class="word-card-mastery mastery-${mastery}">${masteryText}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update stats
function updateStats() {
    const total = vocabularyData.length;
    let mastered = 0;
    let learning = 0;
    
    vocabularyData.forEach(item => {
        const mastery = item.mastery_level || item.mastery || 'learning';
        if (mastery === 'mastered') mastered++;
        else if (mastery === 'learning' || mastery === 'familiar') learning++;
    });
    
    document.getElementById('totalSaved').textContent = total;
    document.getElementById('totalMastered').textContent = mastered;
    document.getElementById('totalLearning').textContent = learning;
}

// Update pagination
function updatePagination() {
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Open word detail modal
function openWordDetail(index) {
    currentWord = filteredData[index];
    
    if (!currentWord) return;
    
    document.getElementById('modalWord').textContent = currentWord.word;
    document.getElementById('modalType').textContent = currentWord.part_of_speech || 'từ';
    document.getElementById('modalPhonetic').textContent = currentWord.phonetic || '';
    document.getElementById('modalDefinition').textContent = currentWord.definition || 'Chưa có định nghĩa';
    document.getElementById('modalExample').textContent = currentWord.example_sentence || 'Chưa có ví dụ';
    
    // Update mastery buttons
    const mastery = currentWord.mastery_level || currentWord.mastery || 'learning';
    document.querySelectorAll('.mastery-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === mastery);
    });
    
    wordModal.classList.add('active');
}

// Close modal
function closeModal() {
    wordModal.classList.remove('active');
    stopAudio();
}

// Play audio
function playAudio() {
    if (!currentWord || !currentWord.audio_url) {
        // Generate TTS if no audio URL
        speakWord(currentWord.word);
        return;
    }
    
    const btn = document.getElementById('modalPlayBtn');
    playWordAudio(currentWord.audio_url, btn);
}

// Play word audio
function playWordAudio(audioUrl, buttonElement) {
    stopAudio();
    
    if (!audioUrl) {
        // Use browser TTS
        const word = buttonElement.closest('.word-card')?.querySelector('.word-card-word')?.textContent;
        if (word) speakWord(word);
        return;
    }
    
    // Check if URL is relative
    let fullUrl = audioUrl;
    if (!audioUrl.startsWith('http')) {
        fullUrl = `http://localhost:8000${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
    }
    
    currentAudio = new Audio(fullUrl);
    
    buttonElement.classList.add('playing');
    
    currentAudio.onended = () => {
        buttonElement.classList.remove('playing');
    };
    
    currentAudio.onerror = () => {
        buttonElement.classList.remove('playing');
        // Fallback to TTS
        const word = buttonElement.closest('.word-card')?.querySelector('.word-card-word')?.textContent 
            || currentWord?.word;
        if (word) speakWord(word);
    };
    
    currentAudio.play().catch(() => {
        buttonElement.classList.remove('playing');
    });
}

// Stop audio
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    speechSynthesis.cancel();
}

// Speak word using browser TTS
function speakWord(word) {
    if (!word) return;
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
}

// Update mastery level
async function updateMastery(level) {
    if (!currentWord) return;
    
    const token = localStorage.getItem('access_token');
    
    try {
        const response = await fetch(`${API_BASE}/vocabulary/${currentWord.id}/mastery`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mastery_level: level })
        });
        
        if (response.ok) {
            // Update local data
            currentWord.mastery_level = level;
            currentWord.mastery = level;
            
            // Update UI
            document.querySelectorAll('.mastery-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.level === level);
            });
            
            // Re-render list
            updateStats();
            filterVocabulary();
            
            showToast('Đã cập nhật mức độ');
        }
    } catch (error) {
        console.error('Error updating mastery:', error);
        showToast('Không thể cập nhật', 'error');
    }
}

// Remove word from notebook
async function removeWord() {
    if (!currentWord) return;
    
    if (!confirm(`Xóa từ "${currentWord.word}" khỏi sổ tay?`)) return;
    
    const token = localStorage.getItem('access_token');
    
    try {
        const response = await fetch(`${API_BASE}/vocabulary/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vocabulary_id: currentWord.id || currentWord.vocabulary_id,
                is_saved: false
            })
        });
        
        if (response.ok) {
            // Remove from local data
            vocabularyData = vocabularyData.filter(v => 
                (v.id || v.vocabulary_id) !== (currentWord.id || currentWord.vocabulary_id)
            );
            
            closeModal();
            updateStats();
            filterVocabulary();
            
            showToast('Đã xóa khỏi sổ tay');
        }
    } catch (error) {
        console.error('Error removing word:', error);
        showToast('Không thể xóa từ', 'error');
    }
}

// Handle search
function handleSearch() {
    filterVocabulary();
}

// Show loading
function showLoading(show) {
    loadingState.style.display = show ? 'flex' : 'none';
    if (show) {
        vocabList.innerHTML = '';
        emptyState.style.display = 'none';
    }
}

// Show error
function showError(message) {
    vocabList.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            <i class="fas fa-exclamation-triangle" style="color: #ff5252;"></i>
            <h3>Đã có lỗi xảy ra</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="loadVocabulary()">
                <i class="fas fa-redo"></i> Thử lại
            </button>
        </div>
    `;
}

// Show toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 14px 24px;
        background: ${type === 'success' ? '#4caf50' : '#ff5252'};
        color: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getMasteryText(level) {
    const texts = {
        'learning': 'Đang học',
        'familiar': 'Quen thuộc',
        'mastered': 'Đã thuộc'
    };
    return texts[level] || 'Đang học';
}

// Logout
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '../../Register_Login/dang-nhap.html';
}

// Add toast animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
