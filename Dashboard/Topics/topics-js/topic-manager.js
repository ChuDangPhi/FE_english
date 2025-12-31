// topic-manager.js
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
        card.innerHTML = `
            <div class="topic-icon">${topic.icon}</div>
            <h3>${topic.title}</h3>
            <p>${topic.description}</p>
            <span class="topic-level">${topic.level}</span>
            <div class="btn-group">
                <button class="btn-learn" onclick="startMatchingGame(${topic.id})">
                    Học ngay
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterTopics() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTopics = topics.filter(topic => {
        const matchesSearch = topic.title.toLowerCase().includes(searchTerm) || 
                             topic.description.toLowerCase().includes(searchTerm);
        const matchesCategory = currentCategory === 'all' || topic.category === currentCategory;
        return matchesSearch && matchesCategory;
    });

    renderTopics(filteredTopics);
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