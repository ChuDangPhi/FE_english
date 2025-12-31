// event-handlers.js
function initializeEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterTopics();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            filterTopics();
        });
    });

    // Close modal when clicking outside
    document.getElementById('learningModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeLearningModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeLearningModal();
        }
    });

    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = function() {
            console.log('Đã tải giọng đọc:', speechSynthesis.getVoices().length);
        };
    }
}