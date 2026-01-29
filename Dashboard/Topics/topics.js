// topics.js
// ========== USER CONTEXT & SHARED UTILS ==========
if (!window.currentUserId) {
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
}

if (!window.getStudyKey) {
    window.getStudyKey = function (key) {
        const uid = window.currentUserId || 'guest';
        return `${key}_${uid}`;
    };
    console.log('Topics.js initialized User Context:', window.currentUserId);
}

let topics = [];
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
let isAdmin = false;

// Saved vocabulary tracking
let savedVocabularyIds = new Set();

let filteredTopics = [];
let currentCategory = 'all';
let currentTopic = null;
let selectedWord = null;
let selectedMeaning = null;
let userMatches = [];



// Hàm đánh dấu ngày học khi hoàn thành bài
function markStudyComplete(wordCount = 0, topicId = null) {
    const today = new Date().toDateString();

    const datesKey = (window.getStudyKey) ? window.getStudyKey('studyDates') : 'studyDates';
    const wordsKey = (window.getStudyKey) ? window.getStudyKey('totalWordsLearned') : 'totalWordsLearned';
    const topicsKey = (window.getStudyKey) ? window.getStudyKey('completedTopics') : 'completedTopics';

    let studyDates = JSON.parse(localStorage.getItem(datesKey) || '[]');

    // Lưu ngày học
    if (!studyDates.includes(today)) {
        studyDates.push(today);
        localStorage.setItem(datesKey, JSON.stringify(studyDates));
        console.log('✅ Đã đánh dấu ngày học:', today);
    }

    // Chỉ cộng số từ nếu là lần đầu hoàn thành topic này
    if (topicId) {
        const progress = getTopicProgress(topicId);

        // Nếu chưa từng hoàn thành matching trước đó, mới cộng từ
        if (!progress.matchingCompleted) {
            let totalWords = parseInt(localStorage.getItem(wordsKey) || '0');
            totalWords += wordCount;
            localStorage.setItem(wordsKey, totalWords.toString());
            console.log('📚 Tổng từ đã học (lần đầu):', totalWords);

            // Cộng số bài học đã hoàn thành
            let completedTopics = JSON.parse(localStorage.getItem(topicsKey) || '[]');
            if (!completedTopics.includes(topicId)) {
                completedTopics.push(topicId);
                localStorage.setItem(topicsKey, JSON.stringify(completedTopics));
                console.log('🎓 Tổng bài học đã hoàn thành:', completedTopics.length);
            }
        } else {
            console.log('ℹ️ Topic đã hoàn thành trước đó, không cộng từ và bài học');
        }
    } else {
        // Fallback: không có topicId thì vẫn cộng (để tương thích code cũ)
        let totalWords = parseInt(localStorage.getItem(wordsKey) || '0');
        totalWords += wordCount;
        localStorage.setItem(wordsKey, totalWords.toString());
        console.log('📚 Tổng từ đã học:', totalWords);
    }

    // Cập nhật ngay giao diện Dashboard (Lịch, Streak, Stats)
    if (typeof window.renderStudyCalendar === 'function') {
        window.renderStudyCalendar();
    }

    // Cập nhật Stats trên Profile nếu đang mở (nếu hàm tồn tại)
    if (typeof window.updateProfileStats === 'function') {
        window.updateProfileStats();
    }
}

// API Helper
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');
    console.log(`[AuthFetch] Calling: ${url}`);
    console.log(`[AuthFetch] Token present: ${!!token}`);
    // Check if token exists
    if (!token) {
        console.warn('No token found');
        alert('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.');
        window.location.href = '../../Register_Login/dang-nhap.html';
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        console.log(`[AuthFetch] Response Status: ${response.status}`);
        if (response.status === 401) {
            console.warn('[AuthFetch] 401 Unauthorized');
            alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            localStorage.removeItem('access_token'); // Clear invalid token
            window.location.href = '../../Register_Login/dang-nhap.html';
            return null;
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Không thể kết nối đến máy chủ.');
        return null;
    }
}

// Check Admin Status
function checkAdminStatus() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            // Assuming is_superuser indicates admin rights
            isAdmin = !!user.is_superuser || (user.role && user.role.toLowerCase() === 'admin');
            console.log('Is Admin (Local check):', isAdmin);

            // Show/Hide Add Button
            const adminControls = document.getElementById('adminControls');
            if (adminControls) {
                adminControls.style.display = isAdmin ? 'block' : 'none';
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
            isAdmin = false;
        }
    }
}

// Fetch Topics from API
async function fetchTopics() {
    checkAdminStatus();
    try {
        const response = await authFetch(`${API_BASE_URL}/topics?page_size=50`); // Get all topics
        if (!response || !response.ok) return;

        const data = await response.json();
        const apiTopics = data.items;

        // Map API format to Frontend format
        topics = apiTopics.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            thumbnail_url: t.thumbnail_url || null, // URL ảnh thumbnail từ API
            icon: "📚", // Fallback icon nếu không có thumbnail
            level: t.difficulty_level === 'beginner' ? 'Cơ bản' : (t.difficulty_level === 'intermediate' ? 'Trung bình' : 'Nâng cao'),
            category: t.category, // daily_life, business, etc.
            words: [] // Will be fetched when clicking "Học ngay"
        }));

        filteredTopics = topics;
        renderTopics(filteredTopics);

    } catch (error) {
        console.error('Error fetching topics:', error);
        document.getElementById('topicsGrid').innerHTML = '<p style="color:white">Không thể tải danh sách chủ đề. Vui lòng thử lại sau.</p>';
    }
}

function renderTopics(toRender) {
    const grid = document.getElementById('topicsGrid');
    grid.innerHTML = '';

    if (toRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-search"></i>
                <h2>Không tìm thấy chủ đề</h2>
                <p>Thử tìm kiếm với từ khóa khác</p>
            </div>
        `;
        return;
    }

    toRender.forEach(topic => {
        const card = document.createElement('div');
        card.className = 'topic-card';
        
        // Hiển thị thumbnail hoặc icon fallback
        const thumbnailHtml = topic.thumbnail_url 
            ? `<div class="topic-thumbnail"><img src="${topic.thumbnail_url}" alt="${topic.title}" onerror="this.parentElement.innerHTML='<div class=\\'topic-icon\\'>📚</div>'"></div>`
            : `<div class="topic-icon">${topic.icon}</div>`;
        
        card.innerHTML = `
            ${thumbnailHtml}
            <h3>${topic.title}</h3>
            <p>${topic.description}</p>
            <span class="topic-level">${topic.level}</span>
            <div class="btn-group">
                <button class="btn-learn" onclick="startMatchingGame(${topic.id})">
                    Học ngay
                </button>
                ${isAdmin ? `
                <button class="btn-edit" onclick="openEditTopicModal(${topic.id}, event)" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteTopic(${topic.id}, event)" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

async function startMatchingGame(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    currentTopic = topic;

    // Fetch details to get vocabulary
    // 1. Get Topic Details (including lessons)
    try {
        const topicRes = await authFetch(`${API_BASE_URL}/topics/${topicId}`);
        if (!topicRes || !topicRes.ok) {
            alert('Không thể tải thông tin chủ đề. Vui lòng thử lại.');
            return;
        }
        const topicData = await topicRes.json();

        // 2. Find Vocabulary Lesson
        if (!topicData.lessons) {
            alert('Dữ liệu bài học không hợp lệ.');
            return;
        }
        const vocabLesson = topicData.lessons.find(l => l.lesson_type === 'vocabulary_matching');

        if (vocabLesson) {
            console.log(`[MatchingGame] Found Vocab Lesson ID: ${vocabLesson.id}`);
            // 3. Get Lesson Details (Vocabulary List)
            const lessonRes = await authFetch(`${API_BASE_URL}/lessons/${vocabLesson.id}`);
            if (lessonRes && lessonRes.ok) {
                const lessonData = await lessonRes.json();
                console.log('[MatchingGame] Lesson Data:', lessonData);

                // Map API vocabulary to Frontend format
                // API: { id, word, definition } -> Frontend: { id, word, meaning }
                if (lessonData.vocabulary_list) {
                    currentTopic.words = lessonData.vocabulary_list.map(v => ({
                        id: v.id,
                        word: v.word,
                        meaning: v.definition,
                        phonetic: v.phonetic || '',
                        example_sentence: v.example_sentence || '',
                        audio_url: v.audio_url || ''
                    }));
                } else {
                    console.warn('[MatchingGame] vocabulary_list is missing or empty');
                    currentTopic.words = [];
                }

                // Store lesson_id for tracking attempts if needed later
                currentTopic.vocabLessonId = vocabLesson.id;
            } else {
                alert('Không thể tải danh sách từ vựng.');
                return;
            }
        } else {
            // Fallback if no specific vocab lesson found
            console.warn('No vocabulary lesson found for this topic');
            currentTopic.words = [];
            alert('Chủ đề này chưa có bài học từ vựng (Vocabulary Matching).');
            return;
        }

    } catch (error) {
        console.error('Error fetching lesson details:', error);
        alert('Lỗi kết nối khi tải bài học: ' + error.message);
        return;
    }

    if (!currentTopic.words || currentTopic.words.length === 0) {
        alert('Chủ đề này hiện chưa có từ vựng nào.');
        return;
    }

    document.getElementById('modalTopicName').textContent = currentTopic.title;
    document.getElementById('learningModal').style.display = 'block';

    // Cập nhật trạng thái khóa/mở các tab
    if (typeof updateTabsUI === 'function') {
        updateTabsUI();
    }

    // Mặc định hiển thị tab nối từ
    showGameTab('matching');
}

function closeLearningModal() {
    document.getElementById('learningModal').style.display = 'none';
    resetGame();
}

function initWordMatchingGame() {
    console.log('[initWordMatchingGame] CALLED!');
    const wordsColumn = document.getElementById('wordsColumn');
    const meaningsColumn = document.getElementById('meaningsColumn');
    const connectionsDisplay = document.getElementById('connectionsDisplay');
    
    console.log('[initWordMatchingGame] wordsColumn:', wordsColumn);
    console.log('[initWordMatchingGame] currentTopic:', currentTopic);

    wordsColumn.innerHTML = '';
    meaningsColumn.innerHTML = '';
    connectionsDisplay.innerHTML = '<p>Chọn từ tiếng Việt và nghĩa tiếng Anh tương ứng</p>';

    selectedWord = null;
    selectedMeaning = null;
    userMatches = [];

    if (!currentTopic.words || currentTopic.words.length === 0) {
        connectionsDisplay.innerHTML = '<p>Không có từ vựng nào.</p>';
        return;
    }

    console.log('[MatchingGame] Words data:', currentTopic.words);

    // Shuffle words
    const shuffledWords = [...currentTopic.words].sort(() => Math.random() - 0.5);
    const shuffledMeanings = [...currentTopic.words].sort(() => Math.random() - 0.5);

    // Create word items with save button
    shuffledWords.forEach((wordObj, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.dataset.word = wordObj.word;
        const vocabId = wordObj.id || wordObj.vocabulary_id;
        wordItem.dataset.vocabId = vocabId || '';
        
        // Word text span
        const wordText = document.createElement('span');
        wordText.className = 'word-text';
        wordText.textContent = wordObj.word;
        wordItem.appendChild(wordText);
        
        // Save button - bookmark icon
        const saveBtn = document.createElement('button');
        const isSaved = vocabId && savedVocabularyIds.has(Number(vocabId));
        saveBtn.className = 'save-vocab-btn' + (isSaved ? ' saved' : '');
        saveBtn.dataset.vocabId = vocabId || index;
        saveBtn.dataset.word = wordObj.word;
        saveBtn.innerHTML = isSaved 
            ? '<i class="fas fa-bookmark"></i>' 
            : '<i class="far fa-bookmark"></i>';
        saveBtn.title = isSaved ? 'Đã lưu - Bấm để xóa' : 'Lưu vào sổ từ vựng';
        // Force inline styles to ensure visibility
        saveBtn.style.cssText = `
            position: absolute !important;
            right: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            border: 2px solid #fbbf24 !important;
            background: rgba(251, 191, 36, 0.2) !important;
            color: #fbbf24 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 14px !important;
            z-index: 1000 !important;
        `;
        console.log('[SaveBtn] Created for:', wordObj.word, saveBtn);
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('[SaveVocab] Clicked:', wordObj.word, 'ID:', vocabId);
            if (vocabId) {
                toggleSaveVocabulary(Number(vocabId));
            } else {
                // If no ID, save by word text
                saveVocabularyByWord(wordObj.word, wordObj.meaning);
            }
        };
        wordItem.appendChild(saveBtn);
        
        wordItem.onclick = (e) => {
            // Don't select if clicking save button
            if (!e.target.closest('.save-vocab-btn')) {
                selectWord(wordItem, wordObj.word);
            }
        };
        wordsColumn.appendChild(wordItem);
    });

    // Create meaning items
    shuffledMeanings.forEach((wordObj, index) => {
        const meaningItem = document.createElement('div');
        meaningItem.className = 'meaning-item';
        meaningItem.textContent = wordObj.meaning;
        meaningItem.dataset.meaning = wordObj.meaning;
        meaningItem.onclick = () => selectMeaning(meaningItem, wordObj.meaning);
        meaningsColumn.appendChild(meaningItem);
    });

    // Clear result message
    document.getElementById('resultMessage').innerHTML = '';
}

function selectWord(wordElement, word) {
    // Reset previous selection
    document.querySelectorAll('.word-item').forEach(item => {
        item.classList.remove('selected');
    });

    wordElement.classList.add('selected');
    selectedWord = word;

    checkForMatch();
}

function selectMeaning(meaningElement, meaning) {
    // Reset previous selection
    document.querySelectorAll('.meaning-item').forEach(item => {
        item.classList.remove('selected');
    });

    meaningElement.classList.add('selected');
    selectedMeaning = meaning;

    checkForMatch();
}

function checkForMatch() {
    if (selectedWord && selectedMeaning) {
        // Find the correct word object
        const correctWord = currentTopic.words.find(w => w.word === selectedWord);

        if (correctWord && correctWord.meaning === selectedMeaning) {
            // Correct match
            userMatches.push({ word: selectedWord, meaning: selectedMeaning });

            // Mark items as matched
            document.querySelectorAll('.word-item').forEach(item => {
                if (item.dataset.word === selectedWord) {
                    item.classList.add('matched');
                    item.classList.remove('selected');
                }
            });

            document.querySelectorAll('.meaning-item').forEach(item => {
                if (item.dataset.meaning === selectedMeaning) {
                    item.classList.add('matched');
                    item.classList.remove('selected');
                }
            });

            // Update connections display
            updateConnectionsDisplay();

            // Reset selections
            selectedWord = null;
            selectedMeaning = null;

            // Check if all matches are done
            if (userMatches.length === currentTopic.words.length) {
                document.getElementById('resultMessage').innerHTML =
                    '<div class="result-message result-success">Chúc mừng! Bạn đã nối đúng tất cả! 🎉</div>';

                // Kiểm tra xem bài này đã hoàn thành trước đó chưa
                const existingProgress = getTopicProgress(currentTopic.id);
                const isFirstTimeComplete = !existingProgress.matchingCompleted;

                // Chỉ cập nhật tiến độ nếu là lần đầu hoàn thành
                if (isFirstTimeComplete) {
                    // Đánh dấu ngày học khi hoàn thành với số từ thực tế
                    const wordCount = currentTopic.words.length;
                    markStudyComplete(wordCount);

                    // Lưu trạng thái hoàn thành Matching để mở khóa Pronunciation
                    saveTopicProgress(currentTopic.id, { matchingCompleted: true });

                    // Hiển thị thông báo mở khóa
                    setTimeout(() => {
                        alert('🎉 Chúc mừng! Bạn đã mở khóa phần Luyện phát âm!');
                        updateTabsUI(); // Cập nhật giao diện tabs
                    }, 1000);
                }
            }
        } else {
            // Wrong match - show error temporarily
            document.querySelectorAll('.word-item.selected, .meaning-item.selected').forEach(item => {
                item.classList.add('error');
            });

            setTimeout(() => {
                document.querySelectorAll('.word-item.selected, .meaning-item.selected').forEach(item => {
                    item.classList.remove('selected', 'error');
                });
                selectedWord = null;
                selectedMeaning = null;
            }, 1000);
        }
    }
}

function updateConnectionsDisplay() {
    const connectionsDisplay = document.getElementById('connectionsDisplay');
    connectionsDisplay.innerHTML = '';

    if (userMatches.length === 0) {
        connectionsDisplay.innerHTML = '<p>Chọn từ tiếng Việt và nghĩa tiếng Anh tương ứng</p>';
        return;
    }

    userMatches.forEach(match => {
        const connectionPair = document.createElement('div');
        connectionPair.className = 'connection-pair';
        connectionPair.textContent = `${match.word} = ${match.meaning}`;
        connectionsDisplay.appendChild(connectionPair);
    });
}

function checkMatches() {
    const resultMessage = document.getElementById('resultMessage');

    if (userMatches.length === currentTopic.words.length) {
        resultMessage.innerHTML = '<div class="result-message result-success">Chúc mừng! Tất cả đều đúng! 🎉</div>';
    } else {
        const remaining = currentTopic.words.length - userMatches.length;
        resultMessage.innerHTML = `<div class="result-message result-error">Còn ${remaining} từ chưa được nối. Hãy tiếp tục!</div>`;
    }
}

function resetGame() {
    initWordMatchingGame();
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    // Since we fetch from API now, local filtering is still fine as 'topics' has all data
    // However, if we implement server-side search later, this would change.
    // For now, client-side filtering on the fetched list is okay.
    filterTopics();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        filterTopics();
    });
});

function filterTopics() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredTopics = topics.filter(topic => {
        const matchesSearch = topic.title.toLowerCase().includes(searchTerm) ||
            topic.description.toLowerCase().includes(searchTerm);

        let matchesCategory = false;
        if (currentCategory === 'all') matchesCategory = true;
        // Map simplified categories to API response values if needed
        // Assuming API returns 'daily_life', 'business', 'travel', etc.
        else if (currentCategory === 'daily' && topic.category === 'daily_life') matchesCategory = true;
        else if (currentCategory === 'work' && topic.category === 'business') matchesCategory = true;
        else if (currentCategory === 'travel' && topic.category === 'travel') matchesCategory = true;
        else if (topic.category === currentCategory) matchesCategory = true;

        return matchesSearch && matchesCategory;
    });

    renderTopics(filteredTopics);
}

// Close modal when clicking outside
document.getElementById('learningModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeLearningModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeLearningModal();
    }
});

// Fetch Current User to validate Admin role
async function fetchCurrentUser() {
    try {
        const response = await authFetch(`${API_BASE_URL}/auth/me`);
        if (response && response.ok) {
            const user = await response.json();
            // Update admin status
            // Check for is_superuser OR role === 'admin'
            isAdmin = !!user.is_superuser || (user.role && user.role.toLowerCase() === 'admin');

            // Also store/update to localStorage for consistency
            localStorage.setItem('user', JSON.stringify(user));

            console.log('User Role Check:', { isAdmin, role: user.role, is_superuser: user.is_superuser });

            // Show/Hide Add Button
            const adminControls = document.getElementById('adminControls');
            if (adminControls) {
                adminControls.style.display = isAdmin ? 'block' : 'none';
            }
        }
    } catch (e) {
        console.error('Error fetching user info:', e);
        // Fallback to localStorage check
        checkAdminStatus();
    }
}

// Initial call
// First fetch user info to know about admin rights, then fetch topics
fetchCurrentUser().then(() => {
    fetchTopics();
});


// ========== PHẦN PHÁT ÂM ==========

let currentWordIndex = 0;

// Hàm chuyển tab giữa nối từ, phát âm và hội thoại AI
function showGameTab(tabName) {
    console.log('Chuyển sang tab:', tabName);

    // Kiểm tra xem tab có được unlock chưa
    if (!isTabUnlocked(tabName)) {
        alert(getUnlockMessage(tabName));
        return;
    }

    // Cập nhật tab active
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    // Cập nhật nội dung active
    document.querySelectorAll('.game-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Game`).classList.add('active');

    // Khởi tạo game tương ứng
    if (tabName === 'matching') {
        initWordMatchingGame();
    } else if (tabName === 'pronunciation') {
        initPronunciationGame();
    } else if (tabName === 'aiChat') {
        if (typeof initAIChatGame === 'function') {
            initAIChatGame();
        } else {
            console.warn('[AI Chat] initAIChatGame function not found');
        }
    }
}

// Kiểm tra xem tab có được unlock chưa
function isTabUnlocked(tabName) {
    if (!currentTopic) return false;

    const topicProgress = getTopicProgress(currentTopic.id);

    // Matching luôn unlock
    if (tabName === 'matching') return true;

    // Pronunciation unlock khi hoàn thành matching
    if (tabName === 'pronunciation') {
        return topicProgress.matchingCompleted;
    }

    // AI Chat unlock khi hoàn thành pronunciation
    if (tabName === 'aiChat') {
        return topicProgress.pronunciationCompleted;
    }

    return false;
}

// Lấy message khi tab bị khóa
function getUnlockMessage(tabName) {
    if (tabName === 'pronunciation') {
        return '🔒 Hoàn thành phần Nối từ để mở khóa Phát âm!';
    }
    if (tabName === 'aiChat') {
        return '🔒 Hoàn thành phần Phát âm để mở khóa Hội thoại với AI!';
    }

    return 'Tab này đang bị khóa';
}

// Lấy tiến độ của topic
function getTopicProgress(topicId) {
    const key = (window.getStudyKey) ? window.getStudyKey('topicProgress') : 'topicProgress';
    const progress = JSON.parse(localStorage.getItem(key) || '{}');
    return progress[topicId] || {
        matchingCompleted: false,
        pronunciationCompleted: false,
        aiChatCompleted: false,
        listenedWords: []
    };
}

// Lưu tiến độ của topic
function saveTopicProgress(topicId, progressData) {
    const key = (window.getStudyKey) ? window.getStudyKey('topicProgress') : 'topicProgress';
    const allProgress = JSON.parse(localStorage.getItem(key) || '{}');
    allProgress[topicId] = { ...allProgress[topicId], ...progressData };
    localStorage.setItem(key, JSON.stringify(allProgress));

    // Cập nhật UI tabs


    // Cập nhật UI tabs
    updateTabsUI();
}

// Cập nhật UI của tabs (locked/unlocked)
function updateTabsUI() {
    if (!currentTopic) return;

    const tabs = document.querySelectorAll('.game-tab');
    tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        const unlocked = isTabUnlocked(tabName);

        if (unlocked) {
            tab.classList.remove('locked');
            tab.style.opacity = '1';
            tab.style.cursor = 'pointer';
        } else {
            tab.classList.add('locked');
            tab.style.opacity = '0.5';
            tab.style.cursor = 'not-allowed';
            // Thêm icon khóa
            if (!tab.querySelector('.lock-icon')) {
                const lockIcon = document.createElement('span');
                lockIcon.className = 'lock-icon';
                lockIcon.innerHTML = ' 🔒';
                lockIcon.style.marginLeft = '5px';
                tab.appendChild(lockIcon);
            }
        }
    });
}

// Khởi tạo phát âm
function initPronunciationGame() {
    console.log('Đang khởi tạo game phát âm...');

    const wordsList = document.getElementById('wordsList');
    if (!wordsList) {
        console.error('Không tìm thấy danh sách từ!');
        return;
    }

    wordsList.innerHTML = '';

    // Reset recording khi chuyển từ
    deleteRecording();

    if (!currentTopic.words || currentTopic.words.length === 0) return;

    // Tạo danh sách từ
    currentTopic.words.forEach((wordObj, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'list-word-item';
        wordItem.textContent = wordObj.word;
        wordItem.onclick = () => {
            showWordDetails(index);
            deleteRecording(); // Reset recording khi chuyển từ mới
        };
        wordsList.appendChild(wordItem);
    });

    // Hiển thị từ đầu tiên
    showWordDetails(0);
}

// Hiển thị chi tiết từ
function showWordDetails(index) {
    currentWordIndex = index;
    const wordObj = currentTopic.words[index];

    // Cập nhật thẻ từ
    document.getElementById('currentEnglish').textContent = wordObj.word;
    document.getElementById('currentVietnamese').textContent = wordObj.meaning;

    document.getElementById('currentMeaning').textContent = "";

    // Cập nhật trạng thái active trong danh sách
    document.querySelectorAll('.list-word-item').forEach((item, i) => {
        item.classList.remove('active');
        if (i === index) {
            item.classList.add('active');
        }
    });
}

// Phát âm tiếng Anh
function speakEnglish() {
    if (speechSynthesis.speaking) {
        console.log('Đang phát âm thanh, không phát lại');
        return;
    }

    const wordObj = currentTopic.words[currentWordIndex];
    const text = wordObj.word; // Speak the English word
    const btn = document.getElementById('englishBtn');

    if (!('speechSynthesis' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ chức năng phát âm.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner audio-loading"></i> Đang phát...';

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice =>
        voice.lang === 'en-US' || voice.lang.startsWith('en-')
    );

    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    utterance.onstart = function () {
        // Ghi nhận đã nghe từ này
        const wordId = wordObj.id || wordObj.word;
        const progress = getTopicProgress(currentTopic.id);
        const listenedWords = progress.listenedWords || [];

        if (!listenedWords.includes(wordId)) {
            listenedWords.push(wordId);

            let updateData = { listenedWords: listenedWords };

            // Kiểm tra nếu đã nghe hết các từ và chưa hoàn thành trước đó
            if (listenedWords.length === currentTopic.words.length && !progress.pronunciationCompleted) {
                updateData.pronunciationCompleted = true;

                // Thông báo mở khóa AI Chat (chỉ lần đầu)
                setTimeout(() => {
                    alert('🎉 Chúc mừng! Bạn đã mở khóa phần Hội thoại với AI!');
                    updateTabsUI();
                }, 500);
            }

            saveTopicProgress(currentTopic.id, updateData);
        }
    };

    utterance.onend = function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';
    };

    utterance.onerror = function (event) {
        console.error('Lỗi phát âm:', event);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';

        if (event.error !== 'interrupted') {
            // alert('Có lỗi khi phát âm. Vui lòng thử lại.');
        }
    };

    speechSynthesis.speak(utterance);

    setTimeout(() => {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';
        }
    }, 2000);
}

// Chuyển từ tiếp theo
function nextWord() {
    if (currentWordIndex < currentTopic.words.length - 1) {
        showWordDetails(currentWordIndex + 1);
    } else {
        showWordDetails(0);
    }
}

// Chuyển từ trước đó
function prevWord() {
    if (currentWordIndex > 0) {
        showWordDetails(currentWordIndex - 1);
    } else {
        showWordDetails(currentTopic.words.length - 1);
    }
}

// Load voices
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = function () {
        console.log('Đã tải giọng đọc:', speechSynthesis.getVoices().length);
    };
}

// ========== BIẾN CHO PHẦN GHI ÂM ==========
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = 0;
let currentRecording = null;

// ========== HÀM GHI ÂM ==========

// ========== VISUALIZER VỚI WEBAUDIO API ==========
let audioContext;
let analyser;
let dataArray;
let visualizerFrame;

function startVisualizer(stream) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Số lượng mẫu (ít để thanh to)
    analyser.smoothingTimeConstant = 0.85; // Tăng độ mượt (0 -> 1)

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const bars = document.querySelectorAll('.visualizer-bar');

    const animate = () => {
        analyser.getByteFrequencyData(dataArray);

        // Cập nhật chiều cao các thanh dựa trên tần số âm thanh
        bars.forEach((bar, index) => {
            // Lấy giá trị tần số tương ứng (chia đều)
            const dataIndex = Math.floor(index * (bufferLength / bars.length));
            const value = dataArray[dataIndex];

            // Tính chiều cao (min 5px, max 40px)
            const targetHeight = 5 + (value / 255) * 45; // Tăng max height lên xíu

            bar.style.height = `${targetHeight}px`;
            // Add slight transition in CSS for extra smoothness if not present
            bar.style.transition = 'height 0.1s linear';

            // Màu sắc dựa trên độ to
            if (value > 120) { // Giảm ngưỡng active xíu
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });

        visualizerFrame = requestAnimationFrame(animate);
    };

    animate();
}

function stopVisualizer() {
    if (visualizerFrame) {
        cancelAnimationFrame(visualizerFrame);
    }

    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        bar.style.height = '5px';
        bar.classList.remove('active');
    });
}

// Cập nhật hàm startRecording để gọi visualizer mới
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Trình duyệt của bạn không hỗ trợ ghi âm.');
        return;
    }

    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playRecordBtn');
    const deleteBtn = document.getElementById('deleteRecordBtn');
    const feedback = document.getElementById('recordingFeedback');

    if (isRecording) {
        stopRecording();
        return;
    }

    audioChunks = [];
    currentRecording = null;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                currentRecording = URL.createObjectURL(audioBlob);

                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Ghi âm lại';
                recordBtn.classList.remove('recording');
                playBtn.disabled = false;
                deleteBtn.disabled = false;

                const duration = Math.round((Date.now() - recordingStartTime) / 1000);
                feedback.innerHTML = `
                    <p class="feedback-text">✅ Đã ghi âm thành công!</p>
                    <p class="feedback-time">Thời lượng: ${duration} giây</p>
                `;
                feedback.className = 'recording-feedback recorded';

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordingStartTime = Date.now();

            recordBtn.innerHTML = '<i class="fas fa-stop"></i> Dừng ghi âm';
            recordBtn.classList.add('recording');
            playBtn.disabled = true;
            deleteBtn.disabled = true;
            feedback.innerHTML = '<p class="feedback-text">🎤 Đang ghi âm... Nói từ vào micro</p>';
            feedback.className = 'recording-feedback recording';

            startTimer();
            startVisualizer(stream); // Truyền stream vào visualizer
        })
        .catch(error => {
            console.error('Lỗi truy cập micro:', error);
            alert('Vui lòng cấp quyền sử dụng micro.');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        stopTimer();
        stopVisualizer();
    }
}

function playRecording() {
    if (!currentRecording) return;

    const audio = new Audio(currentRecording);
    const playBtn = document.getElementById('playRecordBtn');

    playBtn.innerHTML = '<i class="fas fa-pause"></i> Đang phát...';
    playBtn.disabled = true;

    audio.onended = () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i> Nghe lại';
        playBtn.disabled = false;
    };

    audio.play();
}

function deleteRecording() {
    if (currentRecording) {
        URL.revokeObjectURL(currentRecording);
        currentRecording = null;
    }

    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playRecordBtn');
    const deleteBtn = document.getElementById('deleteRecordBtn');
    const feedback = document.getElementById('recordingFeedback');
    const timer = document.getElementById('recordingTimer');

    // Reset UI
    if (recordBtn) {
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Bắt đầu ghi âm';
        recordBtn.classList.remove('recording');
        recordBtn.disabled = false;
    }
    if (playBtn) playBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (timer) timer.textContent = '00:00';
    if (feedback) {
        feedback.innerHTML = '<p>Ghi âm để so sánh với phát âm chuẩn</p>';
        feedback.className = 'recording-feedback';
    }
}

// ========== TIMER & VISUALIZER ==========

function startTimer() {
    const timer = document.getElementById('recordingTimer');
    recordingStartTime = Date.now();

    recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
    }
}








// ========== ADD TOPIC FUNCTIONS ==========

function openAddTopicModal() {
    console.log('[DEBUG] openAddTopicModal called');

    // Reset form
    const form = document.getElementById('addTopicForm');
    if (form) form.reset();

    // Show modal - force visibility
    const modal = document.getElementById('addTopicModal');
    console.log('[DEBUG] modal element:', modal);
    if (modal) {
        // Force display with setAttribute to override CSS
        modal.setAttribute('style',
            'display: block !important; z-index: 10001 !important; position: fixed !important; ' +
            'top: 0; left: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5);'
        );
        console.log('[DEBUG] Modal should now be visible');
    } else {
        console.error('Add Topic Modal not found');
    }
}
window.openAddTopicModal = openAddTopicModal;

function closeAddTopicModal() {
    const modal = document.getElementById('addTopicModal');
    if (modal) modal.style.display = 'none';
}
window.closeAddTopicModal = closeAddTopicModal;

function setupAddTopicForm() {
    const form = document.getElementById('addTopicForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('addTopicTitle').value;
            const description = document.getElementById('addTopicDescription').value;
            const level = document.getElementById('addTopicLevel').value;
            const category = document.getElementById('addTopicCategory').value;

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            btn.disabled = true;

            try {
                // CREATE NEW TOPIC
                const createRes = await authFetch(`${API_BASE_URL}/topics`, {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        description,
                        difficulty_level: level,
                        category,
                        estimated_duration_minutes: 30, // Default
                        display_order: 0,
                        thumbnail_url: ""
                    })
                });

                if (createRes && createRes.ok) {
                    const newTopic = await createRes.json();

                    // Create default Vocabulary Lesson
                    console.log('Creating default vocab lesson for topic:', newTopic.id);
                    await authFetch(`${API_BASE_URL}/lessons`, {
                        method: 'POST',
                        body: JSON.stringify({
                            topic_id: newTopic.id,
                            lesson_type: "vocabulary_matching",
                            title: "Vocabulary Matching",
                            description: "Learn new words",
                            lesson_order: 1,
                            instructions: "Match words with definitions",
                            difficulty_level: level,
                            estimated_minutes: 10,
                            passing_score: 80
                        })
                    });

                    alert('Tạo chủ đề thành công!');
                    closeAddTopicModal();
                    fetchTopics(); // Reload list
                } else {
                    alert('Tạo chủ đề thất bại! Vui lòng thử lại.');
                }
            } catch (error) {
                console.error('Error creating topic:', error);
                alert('Có lỗi xảy ra: ' + error.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
}

// Call setup immediately
setupAddTopicForm();


function openEditTopicModal(topicId, event) {
    if (event) event.stopPropagation();
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    document.getElementById('editModalTitle').textContent = 'Chỉnh sửa chủ đề';
    document.getElementById('editTopicId').value = topic.id;
    document.getElementById('editTopicTitle').value = topic.title;
    document.getElementById('editTopicDescription').value = topic.description;

    // Reverse map level
    let levelValue = 'beginner';
    if (topic.level === 'Trung bình') levelValue = 'intermediate';
    if (topic.level === 'Nâng cao') levelValue = 'advanced';

    document.getElementById('editTopicLevel').value = levelValue;
    document.getElementById('editTopicCategory').value = topic.category;

    // Show vocab section
    const vocabListContainer = document.getElementById('editTopicVocabList');
    if (vocabListContainer) {
        const vocabSection = vocabListContainer.parentNode;
        if (vocabSection) vocabSection.style.display = 'block';
    }

    // Load vocab
    loadTopicVocabulary(topic.id);

    // Force display block & High Z-Index
    const modal = document.getElementById('editTopicModal');
    if (modal) {
        // Ensure Learning Modal is closed/hidden to avoid conflict
        const learningModal = document.getElementById('learningModal');
        if (learningModal) learningModal.style.display = 'none';

        modal.style.zIndex = '10000';
        modal.style.display = 'block';
    }
}

function closeEditTopicModal() {
    document.getElementById('editTopicModal').style.display = 'none';
    currentEditLessonId = null;
}

const editForm = document.getElementById('editTopicForm');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editTopicId').value;
        const title = document.getElementById('editTopicTitle').value;
        const description = document.getElementById('editTopicDescription').value;
        const level = document.getElementById('editTopicLevel').value;
        const category = document.getElementById('editTopicCategory').value;

        const btn = editForm.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;

        try {
            if (!id) {
                alert('Lỗi: Không có ID chủ đề');
                return;
            }

            // UPDATE EXISTING TOPIC
            const response = await authFetch(`${API_BASE_URL}/topics/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title,
                    description,
                    difficulty_level: level,
                    category
                })
            });

            if (response && response.ok) {
                alert('Cập nhật chủ đề thành công!');
                closeEditTopicModal();
                fetchTopics(); // Reload list
            } else {
                alert('Cập nhật thất bại! Vui lòng thử lại.');
            }

        } catch (error) {
            console.error('Error saving topic:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

async function deleteTopic(topicId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa chủ đề này? Hành động này không thể hoàn tác.')) return;

    try {
        const response = await authFetch(`${API_BASE_URL}/topics/${topicId}`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            alert('Xóa chủ đề thành công!');
            fetchTopics();
        } else {
            alert('Xóa thất bại! Có thể chủ đề đang được sử dụng.');
        }
    } catch (error) {
        console.error('Error deleting topic:', error);
        alert('Có lỗi xảy ra: ' + error.message);
    }
}


// ========== ADMIN VOCABULARY MANAGEMENT ==========
let currentEditLessonId = null;

async function loadTopicVocabulary(topicId) {
    const listContainer = document.getElementById('editTopicVocabList');
    listContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Đang tải...</div>';

    // Find vocab lesson id like in startMatchingGame
    try {
        // 1. Get Topic Details
        const topicRes = await authFetch(`${API_BASE_URL}/topics/${topicId}`);
        if (!topicRes || !topicRes.ok) throw new Error('Cannot fetch topic');
        const topicData = await topicRes.json();

        // 2. Find Vocab Lesson
        const vocabLesson = topicData.lessons.find(l => l.lesson_type === 'vocabulary_matching');

        if (!vocabLesson) {
            listContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Chưa có bài học từ vựng để thêm từ.</div>';
            currentEditLessonId = null;
            return;
        }

        currentEditLessonId = vocabLesson.id;

        // 3. Get Lesson Details (Vocab List)
        const lessonRes = await authFetch(`${API_BASE_URL}/lessons/${vocabLesson.id}`);
        if (!lessonRes || !lessonRes.ok) throw new Error('Cannot fetch lesson');
        const lessonData = await lessonRes.json();

        renderEditVocabList(lessonData.vocabulary_list || []);

    } catch (error) {
        console.error('Load vocab error:', error);
        listContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: red;">Lỗi tải danh sách từ.</div>';
    }
}

function renderEditVocabList(vocabList) {
    const listContainer = document.getElementById('editTopicVocabList');
    listContainer.innerHTML = '';

    if (!vocabList || vocabList.length === 0) {
        listContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Chưa có từ vựng nào.</div>';
        return;
    }

    vocabList.forEach(v => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; background: white;';
        item.innerHTML = `
            <div>
                <strong>${v.word}</strong> <span style="color: #666;">- ${v.definition}</span>
            </div>
            <button type="button" onclick="removeWordFromLesson(${v.id})" style="background: none; border: none; color: #dc3545; cursor: pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        listContainer.appendChild(item);
    });
}

function openAddWordForm() {
    if (!currentEditLessonId) {
        alert('Không tìm thấy bài học từ vựng để thêm từ vào!');
        return;
    }
    document.getElementById('addWordForm').style.display = 'block';
    document.getElementById('editTopicVocabList').style.display = 'none';
}

function closeAddWordForm() {
    document.getElementById('addWordForm').style.display = 'none';
    document.getElementById('editTopicVocabList').style.display = 'block';

    // Clear inputs
    document.getElementById('newWord').value = '';
    document.getElementById('newWordMeaning').value = '';
    document.getElementById('newWordPhonetic').value = '';
}

async function handleAddNewWord() {
    const word = document.getElementById('newWord').value.trim();
    const meaning = document.getElementById('newWordMeaning').value.trim();
    const phonetic = document.getElementById('newWordPhonetic').value.trim();

    if (!word || !meaning) {
        alert('Vui lòng nhập Từ và Nghĩa!');
        return;
    }

    const btn = document.querySelector('#addWordForm button:last-child');
    const originalText = btn.innerText;
    btn.innerText = 'Đang xử lý...';
    btn.disabled = true;

    try {
        // Step 1: Create local vocabulary item (POST /vocabulary)
        // If word already exists, API might return strict error or we might need to search first.
        // Assuming simplistic approach: Try create, if fail (duplicate 400), try to search/find ID.

        let vocabId = null;

        // Try create
        const createRes = await authFetch(`${API_BASE_URL}/vocabulary`, {
            method: 'POST',
            body: JSON.stringify({
                word: word,
                definition: meaning,
                phonetic: phonetic,
                difficulty_level: "beginner", // Default
                part_of_speech: "noun" // Default
            })
        });

        if (createRes.ok) {
            const newVocab = await createRes.json();
            vocabId = newVocab.id;
        } else if (createRes.status === 400) {
            // Likely duplicate. Let's find its ID by search.
            const searchRes = await authFetch(`${API_BASE_URL}/vocabulary?search=${encodeURIComponent(word)}`);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                // Find exact match
                const match = searchData.find(v => v.word.toLowerCase() === word.toLowerCase());
                if (match) {
                    vocabId = match.id;
                }
            }
        }

        if (!vocabId) {
            throw new Error('Không thể tạo hoặc tìm thấy từ vựng này.');
        }

        // Step 2: Add to Lesson (POST /lessons/{id}/vocabulary)
        const addToLessonRes = await authFetch(`${API_BASE_URL}/lessons/${currentEditLessonId}/vocabulary`, {
            method: 'POST',
            body: JSON.stringify([vocabId]) // Array of IDs
        });

        if (addToLessonRes.ok) {
            alert('Thêm từ thành công!');
            closeAddWordForm();
            // Reload list
            const topicId = document.getElementById('editTopicId').value;
            loadTopicVocabulary(topicId);
        } else {
            throw new Error('Lỗi khi thêm từ vào bài học.');
        }

    } catch (error) {
        console.error('Add word error:', error);
        alert('Lỗi: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function removeWordFromLesson(vocabId) {
    if (!confirm('Bạn có chắc muốn xóa từ này khỏi bài học?')) return;

    try {
        const res = await authFetch(`${API_BASE_URL}/lessons/${currentEditLessonId}/vocabulary/${vocabId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            // Reload list
            const topicId = document.getElementById('editTopicId').value;
            loadTopicVocabulary(topicId);
        } else {
            alert('Xóa thất bại.');
        }
    } catch (error) {
        console.error('Remove word error:', error);
        alert('Lỗi kết nối.');
    }
}

// ========== VOCABULARY NOTEBOOK FUNCTIONS ==========

// Save vocabulary to notebook
async function saveVocabularyToNotebook(vocabId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để lưu từ!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/vocabulary/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vocabulary_id: vocabId,
                is_saved: true
            })
        });

        if (response.ok) {
            savedVocabularyIds.add(vocabId);
            updateSaveButtonUI(vocabId, true);
            showVocabToast('Đã lưu vào sổ từ vựng!', 'success');
        } else {
            throw new Error('Lưu thất bại');
        }
    } catch (error) {
        console.error('Save vocabulary error:', error);
        showVocabToast('Không thể lưu từ. Vui lòng thử lại.', 'error');
    }
}

// Unsave vocabulary from notebook
async function unsaveVocabularyFromNotebook(vocabId) {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/vocabulary/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vocabulary_id: vocabId,
                is_saved: false
            })
        });

        if (response.ok) {
            savedVocabularyIds.delete(vocabId);
            updateSaveButtonUI(vocabId, false);
            showVocabToast('Đã xóa khỏi sổ từ vựng', 'info');
        }
    } catch (error) {
        console.error('Unsave vocabulary error:', error);
    }
}

// Toggle save state
function toggleSaveVocabulary(vocabId) {
    if (savedVocabularyIds.has(vocabId)) {
        unsaveVocabularyFromNotebook(vocabId);
    } else {
        saveVocabularyToNotebook(vocabId);
    }
}

// Save vocabulary by word text (when no ID available)
async function saveVocabularyByWord(word, meaning) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để lưu từ!');
        return;
    }

    try {
        // First, try to find or create vocabulary by word
        const response = await fetch(`${API_BASE_URL}/vocabulary/save-by-word`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                word: word,
                definition: meaning,
                is_saved: true
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.id) {
                savedVocabularyIds.add(data.id);
            }
            // Update button by word
            const btn = document.querySelector(`.save-vocab-btn[data-word="${word}"]`);
            if (btn) {
                btn.classList.add('saved');
                btn.innerHTML = '<i class="fas fa-bookmark"></i>';
                btn.title = 'Đã lưu - Bấm để xóa';
                if (data.id) btn.dataset.vocabId = data.id;
            }
            showVocabToast('Đã lưu vào sổ từ vựng!', 'success');
        } else {
            throw new Error('Lưu thất bại');
        }
    } catch (error) {
        console.error('Save vocabulary by word error:', error);
        showVocabToast('Không thể lưu từ. Vui lòng thử lại.', 'error');
    }
}

// Update save button UI
function updateSaveButtonUI(vocabId, isSaved) {
    const btn = document.querySelector(`.save-vocab-btn[data-vocab-id="${vocabId}"]`);
    if (btn) {
        if (isSaved) {
            btn.classList.add('saved');
            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
            btn.title = 'Đã lưu - Bấm để xóa';
        } else {
            btn.classList.remove('saved');
            btn.innerHTML = '<i class="far fa-bookmark"></i>';
            btn.title = 'Lưu vào sổ từ vựng';
        }
    }
}

// Load saved vocabulary IDs
async function loadSavedVocabularyIds() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/vocabulary/saved?page_size=1000`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const items = data.items || data.data || data || [];
            savedVocabularyIds = new Set(items.map(v => Number(v.id || v.vocabulary_id)));
            console.log('[SaveVocab] Loaded saved IDs:', savedVocabularyIds);
        }
    } catch (error) {
        console.error('Load saved vocabulary error:', error);
    }
}

// Show toast notification
function showVocabToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.vocab-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `vocab-toast vocab-toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Add toast styles dynamically
(function addVocabToastStyles() {
    if (document.getElementById('vocab-toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'vocab-toast-styles';
    style.textContent = `
        .vocab-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 24px;
            background: #4caf50;
            color: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInToast 0.3s ease;
        }
        .vocab-toast-error { background: #f44336; }
        .vocab-toast-info { background: #2196f3; }
        .vocab-toast.fade-out { animation: slideOutToast 0.3s ease forwards; }
        
        @keyframes slideInToast {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutToast {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .save-vocab-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.9);
            color: #888;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.2s;
            position: absolute;
            top: 8px;
            right: 8px;
        }
        .save-vocab-btn:hover {
            transform: scale(1.15);
            color: #667eea;
        }
        .save-vocab-btn.saved {
            color: #f59e0b;
            background: #fffbeb;
        }
        .save-vocab-btn.saved:hover {
            color: #d97706;
        }
        
        .word-item, .meaning-item {
            position: relative;
        }
    `;
    document.head.appendChild(style);
})();

// Initialize saved vocabulary on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSavedVocabularyIds();
});

// Export functions to window for use in other modules
window.toggleSaveVocabulary = toggleSaveVocabulary;
window.savedVocabularyIds = savedVocabularyIds;
window.saveVocabularyToNotebook = saveVocabularyToNotebook;
window.unsaveVocabularyFromNotebook = unsaveVocabularyFromNotebook;
window.updateSaveButtonUI = updateSaveButtonUI;

// End of file
