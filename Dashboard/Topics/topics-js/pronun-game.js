// pronunciation-game.js
let currentWordIndex = 0;

function initPronunciationGame() {
    console.log('Đang khởi tạo game phát âm...');

    const wordsList = document.getElementById('wordsList');
    if (!wordsList) {
        console.error('Không tìm thấy danh sách từ!');
        return;
    }

    wordsList.innerHTML = '';
    deleteRecording();

    // Tạo danh sách từ
    currentTopic.words.forEach((wordObj, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'list-word-item';
        wordItem.textContent = wordObj.word;
        wordItem.onclick = () => {
            showWordDetails(index);
            deleteRecording();
        };
        wordsList.appendChild(wordItem);
    });

    // Hiển thị từ đầu tiên
    showWordDetails(0);
}

function showWordDetails(index) {
    currentWordIndex = index;
    const wordObj = currentTopic.words[index];

    // Cập nhật thẻ từ
    document.getElementById('currentEnglish').textContent = wordObj.meaning;
    document.getElementById('currentVietnamese').textContent = wordObj.word;
    document.getElementById('currentMeaning').textContent = getWordExample(wordObj.word);

    // Cập nhật trạng thái active trong danh sách
    document.querySelectorAll('.list-word-item').forEach((item, i) => {
        item.classList.remove('active');
        if (i === index) {
            item.classList.add('active');
        }
    });

    // Cập nhật tiến độ
    document.getElementById('progressInfo').textContent =
        `${index + 1} / ${currentTopic.words.length}`;
}

function getWordExample(word) {
    const examples = {
        "Xin chào": "Xin chào, rất vui được gặp bạn",
        "Tên": "Tên tôi là Minh",
        "Tuổi": "Tôi 25 tuổi",
        "Quê quán": "Quê tôi ở Hà Nội",
        "Nghề nghiệp": "Tôi là giáo viên",
        "Sở thích": "Sở thích của tôi là đọc sách",
        "Gia đình": "Gia đình tôi có 4 người",
        "Quốc tịch": "Tôi là người Việt Nam",
        "Ngôn ngữ": "Tôi nói được tiếng Anh và tiếng Nhật",
        "Trình độ": "Tôi có bằng đại học",
        "Khách sạn": "Khách sạn này rất đẹp",
        "Đặt phòng": "Tôi muốn đặt phòng 2 đêm",
        "Phòng đơn": "Cho tôi một phòng đơn",
        "Phòng đôi": "Chúng tôi cần phòng đôi",
        "Nhà hàng": "Nhà hàng này phục vụ rất tốt",
        "Thực đơn": "Cho tôi xem thực đơn",
        "Gọi món": "Chúng tôi đã sẵn sàng gọi món",
        "Phỏng vấn": "Tôi có buổi phỏng vấn vào sáng mai",
        "Kinh nghiệm": "Tôi có 5 năm kinh nghiệm",
        "Du lịch": "Tôi thích đi du lịch nước ngoài",
        "Mua sắm": "Tôi thích đi mua sắm vào cuối tuần",
        "Cửa hàng": "Cửa hàng này bán quần áo đẹp",
        "Giá": "Giá cả rất hợp lý",
        "Giảm giá": "Đang có chương trình giảm giá",
        "Thanh toán": "Tôi thanh toán bằng thẻ tín dụng",
        "Công việc": "Công việc của tôi rất thú vị",
        "Dự án": "Chúng tôi đang làm dự án mới",
        "Đồng nghiệp": "Đồng nghiệp của tôi rất thân thiện",
        "Lễ hội": "Lễ hội này rất đặc sắc",
        "Tết": "Tết là dịp sum họp gia đình",
        "Trung thu": "Trẻ em thích rước đèn Trung thu"
    };

    return examples[word] || `Ví dụ với từ "${word}"`;
}

function speakEnglish() {
    // Kiểm tra nếu đang phát thì không làm gì cả
    if (speechSynthesis.speaking) {
        console.log('Đang phát âm thanh, không phát lại');
        return;
    }

    const wordObj = currentTopic.words[currentWordIndex];
    const text = wordObj.meaning;
    const btn = document.getElementById('englishBtn');

    if (!('speechSynthesis' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ chức năng phát âm.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner audio-loading"></i> Đang phát...';

    // Dừng phát âm cũ
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Tìm giọng đọc tiếng Anh
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice =>
        voice.lang === 'en-US' || voice.lang.startsWith('en-')
    );

    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    utterance.onend = function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';
    };

    utterance.onerror = function (event) {
        console.error('Lỗi phát âm:', event);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';

        // Chỉ hiện lỗi nếu không phải do cancel
        if (event.error !== 'interrupted') {
            alert('Có lỗi khi phát âm. Vui lòng thử lại.');
        }
    };

    speechSynthesis.speak(utterance);

    // Timeout an toàn
    setTimeout(() => {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-volume-up"></i> Phát âm';
        }
    }, 2000);
}

function nextWord() {
    if (currentWordIndex < currentTopic.words.length - 1) {
        showWordDetails(currentWordIndex + 1);
    } else {
        // Quay lại từ đầu
        showWordDetails(0);
    }
}

function prevWord() {
    if (currentWordIndex > 0) {
        showWordDetails(currentWordIndex - 1);
    } else {
        // Chuyển đến từ cuối
        showWordDetails(currentTopic.words.length - 1);
    }
}