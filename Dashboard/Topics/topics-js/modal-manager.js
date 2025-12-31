// modal-manager.js
function startMatchingGame(topicId) {
    currentTopic = topics.find(t => t.id === topicId);
    if (!currentTopic) return;

    document.getElementById('modalTopicName').textContent = currentTopic.title;
    document.getElementById('learningModal').style.display = 'block';

    // Mặc định hiển thị tab nối từ
    showGameTab('matching');
}

function closeLearningModal() {
    document.getElementById('learningModal').style.display = 'none';
    resetGame();
}

function showGameTab(tabName) {
    console.log('Chuyển sang tab:', tabName);

    // Cập nhật tab active
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.game-tab').forEach(tab => {
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
    }
}

function closeMatchingGame() {
    document.getElementById('matchingModal').style.display = 'none';
    resetGame();
}