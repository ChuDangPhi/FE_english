/**
 * Conversation Page JavaScript
 * 
 * Flow:
 * 1. User click "Bắt đầu" -> API /conversation/start
 * 2. AI nói (TTS) + hiện text -> Khi audio kết thúc -> enable mic
 * 3. User click mic -> ghi âm
 * 4. User click mic lần 2 -> dừng ghi âm -> gửi API /conversation/message-voice
 * 5. Nhận AI reply (text + audio) -> AI nói -> lặp lại từ bước 3
 */

// ============================================
// CONFIGURATION
// ============================================
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Get lesson_id from URL params (e.g., ?lesson_id=3)
const urlParams = new URLSearchParams(window.location.search);
const LESSON_ID = parseInt(urlParams.get('lesson_id')) || 3;

// ============================================
// STATE
// ============================================
let state = {
    lessonAttemptId: null,
    currentTurn: 0,
    minTurns: 5,
    canEnd: false,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: null,
    timerInterval: null,
    currentAudio: null // Currently playing audio
};

// ============================================
// AUTHENTICATION
// ============================================
function getAuthToken() {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        alert('Vui lòng đăng nhập để sử dụng tính năng này');
        window.location.href = '/Register_Login/dang-nhap.html';
        return false;
    }
    return true;
}

// ============================================
// API CALLS
// ============================================
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API Error');
    }
    
    return response.json();
}

// ============================================
// START CONVERSATION
// ============================================
async function startConversation() {
    if (!checkAuth()) return;
    
    showLoading('Đang bắt đầu hội thoại...');
    
    try {
        const data = await apiCall('/conversation/start', 'POST', {
            lesson_id: LESSON_ID
        });
        
        console.log('Conversation started:', data);
        console.log('Opening message:', data.opening_message);
        console.log('Audio URL:', data.opening_message?.audio_url);
        
        // Update state
        state.lessonAttemptId = data.lesson_attempt_id;
        state.minTurns = data.min_turns;
        
        // Update UI
        document.getElementById('aiRole').textContent = data.ai_role;
        document.getElementById('minTurns').textContent = data.min_turns;
        
        // Switch to chat screen
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('chatScreen').style.display = 'flex';
        
        hideLoading();
        
        // Add AI opening message with audio
        addMessage('ai', data.opening_message.message_text, data.opening_message.audio_url);
        
        // Play AI audio, then enable mic
        if (data.opening_message.audio_url) {
            playAudioThenEnableMic(data.opening_message.audio_url);
        } else {
            enableMic();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Start conversation error:', error);
        alert('Lỗi: ' + error.message);
    }
}

// ============================================
// SEND VOICE MESSAGE
// ============================================
async function sendVoiceMessage(audioBase64) {
    showLoading('Đang xử lý giọng nói...');
    
    try {
        const data = await apiCall('/conversation/message-voice', 'POST', {
            lesson_attempt_id: state.lessonAttemptId,
            audio_base64: audioBase64,
            audio_format: 'webm'
        });
        
        console.log('Message response:', data);
        
        // Update state
        state.currentTurn = data.current_turn;
        state.canEnd = data.can_end;
        
        // Update UI
        updateProgress();
        
        hideLoading();
        
        // Add user message (transcription)
        if (data.user_transcription) {
            addMessage('user', data.user_transcription, data.user_audio_url, data.user_message_analysis);
        }
        
        // Add AI reply
        addMessage('ai', data.ai_message.message_text, data.ai_message.audio_url);
        
        // Update suggested replies
        updateSuggestedReplies(data.suggested_replies);
        
        // Show end button if can end
        if (data.can_end) {
            document.getElementById('endBtn').style.display = 'block';
        }
        
        // Play AI audio, then enable mic
        if (data.ai_message.audio_url) {
            playAudioThenEnableMic(data.ai_message.audio_url);
        } else {
            enableMic();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Send message error:', error);
        alert('Lỗi: ' + error.message);
        enableMic(); // Re-enable mic on error
    }
}

// ============================================
// END CONVERSATION
// ============================================
async function endConversation() {
    showLoading('Đang tổng kết...');
    
    try {
        const data = await apiCall('/conversation/end', 'POST', {
            lesson_attempt_id: state.lessonAttemptId
        });
        
        console.log('Conversation summary:', data);
        
        hideLoading();
        
        // Show summary screen
        showSummary(data);
        
    } catch (error) {
        hideLoading();
        console.error('End conversation error:', error);
        alert('Lỗi: ' + error.message);
    }
}

// ============================================
// UI FUNCTIONS
// ============================================
function addMessage(type, text, audioUrl = null, analysis = null) {
    const messagesContainer = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatarIcon = type === 'ai' ? 'fa-robot' : 'fa-user';
    
    let audioHTML = '';
    if (audioUrl) {
        audioHTML = `
            <div class="message-audio">
                <button class="audio-play-btn" onclick="playMessageAudio(this, '${API_BASE_URL.replace('/api/v1', '')}${audioUrl}')">
                    <i class="fas fa-play"></i>
                </button>
                <div class="audio-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
        `;
    }
    
    let analysisHTML = '';
    if (analysis && type === 'user') {
        const sentiment = analysis.sentiment || 'neutral';
        const sentimentClass = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : '';
        const sentimentIcon = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐';
        
        analysisHTML = `
            <div class="message-analysis">
                <div class="analysis-item ${sentimentClass}">
                    ${sentimentIcon} ${sentiment}
                </div>
                ${analysis.vocabulary_used && analysis.vocabulary_used.length > 0 ? `
                <div class="analysis-item">
                    📚 ${analysis.vocabulary_used.join(', ')}
                </div>
                ` : ''}
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${text}</div>
            ${audioHTML}
            ${analysisHTML}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateProgress() {
    document.getElementById('currentTurn').textContent = state.currentTurn;
    
    const progress = Math.min((state.currentTurn / state.minTurns) * 100, 100);
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateSuggestedReplies(replies) {
    const container = document.getElementById('suggestedReplies');
    container.innerHTML = '';
    
    if (replies && replies.length > 0) {
        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'suggest-btn';
            btn.textContent = reply;
            btn.onclick = () => speakSuggestion(reply);
            container.appendChild(btn);
        });
    }
}

function showSummary(data) {
    document.getElementById('chatScreen').style.display = 'none';
    
    const summaryScreen = document.getElementById('summaryScreen');
    summaryScreen.style.display = 'block';
    
    const passedClass = data.is_passed ? 'passed' : 'failed';
    const passedText = data.is_passed ? '🎉 Hoàn thành xuất sắc!' : '💪 Cần luyện tập thêm';
    
    summaryScreen.innerHTML = `
        <div class="summary-header">
            <h1>${passedText}</h1>
            <p>Bạn đã hoàn thành ${data.total_turns} lượt hội thoại trong ${Math.round(data.duration_seconds / 60)} phút</p>
        </div>
        
        <div class="summary-score">
            <div class="score-card fluency">
                <div class="score-value">${Math.round(data.fluency_score)}</div>
                <div class="score-label">Fluency</div>
            </div>
            <div class="score-card grammar">
                <div class="score-value">${Math.round(data.grammar_score)}</div>
                <div class="score-label">Grammar</div>
            </div>
            <div class="score-card vocabulary">
                <div class="score-value">${Math.round(data.vocabulary_score)}</div>
                <div class="score-label">Vocabulary</div>
            </div>
            <div class="score-card overall">
                <div class="score-value">${Math.round(data.overall_score)}</div>
                <div class="score-label">Overall</div>
            </div>
        </div>
        
        <div class="summary-feedback">
            <h3>💬 Nhận xét từ AI</h3>
            <p>${data.ai_feedback}</p>
        </div>
        
        ${data.vocabulary_used && data.vocabulary_used.length > 0 ? `
        <div class="summary-feedback">
            <h3>📚 Từ vựng đã sử dụng</h3>
            <p>${data.vocabulary_used.join(', ')}</p>
        </div>
        ` : ''}
        
        ${data.strengths && data.strengths.length > 0 ? `
        <div class="summary-feedback">
            <h3>✅ Điểm mạnh</h3>
            <ul>
                ${data.strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${data.areas_to_improve && data.areas_to_improve.length > 0 ? `
        <div class="summary-feedback">
            <h3>📈 Cần cải thiện</h3>
            <ul>
                ${data.areas_to_improve.map(a => `<li>${a}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="summary-actions">
            <button class="btn-retry" onclick="location.reload()">
                <i class="fas fa-redo"></i> Thử lại
            </button>
            <button class="btn-home" onclick="goBack()">
                <i class="fas fa-home"></i> Quay lại
            </button>
        </div>
    `;
}

// ============================================
// AUDIO FUNCTIONS
// ============================================
function playAudioThenEnableMic(audioUrl) {
    console.log('🔊 Playing audio:', audioUrl);
    setStatus('listening', 'Đang nghe AI nói...');
    disableMic();
    
    if (!audioUrl) {
        console.warn('⚠️ No audio URL provided, enabling mic directly');
        enableMic();
        return;
    }
    
    const fullUrl = `${API_BASE_URL.replace('/api/v1', '')}${audioUrl}`;
    console.log('🔊 Full audio URL:', fullUrl);
    
    const audio = new Audio(fullUrl);
    state.currentAudio = audio;
    
    audio.onloadeddata = () => {
        console.log('✅ Audio loaded successfully');
    };
    
    audio.onended = () => {
        console.log('✅ Audio playback ended');
        state.currentAudio = null;
        enableMic();
        setStatus('ready', 'Nhấn mic để nói');
    };
    
    audio.onerror = (e) => {
        console.error('❌ Audio playback error:', e);
        state.currentAudio = null;
        enableMic();
        setStatus('ready', 'Nhấn mic để nói');
    };
    
    audio.play().then(() => {
        console.log('▶️ Audio playing...');
    }).catch(err => {
        console.error('❌ Audio play error:', err);
        enableMic();
        setStatus('ready', 'Nhấn mic để nói');
    });
}

function playMessageAudio(button, audioUrl) {
    // Stop any currently playing audio
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
        document.querySelectorAll('.audio-play-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
    }
    
    if (button.classList.contains('playing')) {
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i>';
        return;
    }
    
    const audio = new Audio(audioUrl);
    state.currentAudio = audio;
    
    button.classList.add('playing');
    button.innerHTML = '<i class="fas fa-pause"></i>';
    
    audio.onended = () => {
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i>';
        state.currentAudio = null;
    };
    
    audio.play().catch(err => {
        console.error('Audio play error:', err);
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i>';
    });
}

// ============================================
// RECORDING FUNCTIONS
// ============================================
async function toggleRecording() {
    if (state.isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        state.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });
        
        state.audioChunks = [];
        
        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                state.audioChunks.push(e.data);
            }
        };
        
        state.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
            const audioBase64 = await blobToBase64(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Send to API
            await sendVoiceMessage(audioBase64);
        };
        
        state.mediaRecorder.start();
        state.isRecording = true;
        state.recordingStartTime = Date.now();
        
        // Update UI
        document.getElementById('micBtn').classList.add('recording');
        document.getElementById('recordingTimer').style.display = 'flex';
        setStatus('recording', 'Đang ghi âm... Nhấn để dừng');
        
        // Start timer
        state.timerInterval = setInterval(updateTimer, 1000);
        
    } catch (error) {
        console.error('Start recording error:', error);
        alert('Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.');
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        
        // Update UI
        document.getElementById('micBtn').classList.remove('recording');
        document.getElementById('recordingTimer').style.display = 'none';
        disableMic();
        setStatus('processing', 'Đang xử lý...');
        
        // Stop timer
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timerText').textContent = `${minutes}:${seconds}`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function setStatus(type, text) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = text;
    statusText.className = type;
}

function enableMic() {
    const micBtn = document.getElementById('micBtn');
    micBtn.disabled = false;
    setStatus('ready', 'Nhấn mic để nói');
}

function disableMic() {
    const micBtn = document.getElementById('micBtn');
    micBtn.disabled = true;
}

function showLoading(text = 'Đang xử lý...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function goBack() {
    window.location.href = '/Dashboard/dashboard.html';
}

// Speak a suggested reply (type it instead of saying)
async function speakSuggestion(text) {
    // For now, send as text message
    showLoading('Đang gửi...');
    
    try {
        const data = await apiCall('/conversation/message', 'POST', {
            lesson_attempt_id: state.lessonAttemptId,
            message_text: text
        });
        
        state.currentTurn = data.current_turn;
        state.canEnd = data.can_end;
        
        updateProgress();
        hideLoading();
        
        // Add user message
        addMessage('user', text, null, data.user_message_analysis);
        
        // Add AI reply
        addMessage('ai', data.ai_message.message_text, data.ai_message.audio_url);
        
        updateSuggestedReplies(data.suggested_replies);
        
        if (data.can_end) {
            document.getElementById('endBtn').style.display = 'block';
        }
        
        // Play AI audio
        if (data.ai_message.audio_url) {
            playAudioThenEnableMic(data.ai_message.audio_url);
        } else {
            enableMic();
        }
        
    } catch (error) {
        hideLoading();
        console.error('Send suggestion error:', error);
        alert('Lỗi: ' + error.message);
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Conversation page loaded, lesson_id:', LESSON_ID);
    
    // Check auth
    if (!checkAuth()) return;
    
    // Load lesson info for preview
    try {
        // You could add an API to get lesson info here
        document.getElementById('minTurnsPreview').textContent = '5';
    } catch (error) {
        console.error('Load lesson info error:', error);
    }
});
