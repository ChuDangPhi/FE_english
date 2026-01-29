/**
 * AI Chat Module - Hội thoại với AI
 * Tính năng: Chat, Gợi ý câu, Đánh giá ngữ pháp, Đánh giá cuối hội thoại
 */

// ========== CONFIGURATION ==========
const BACKEND_API_URL = 'http://127.0.0.1:8000/api/v1';

// ========== STATE ==========
let aiChatState = {
    isActive: false,
    messages: [],
    topicContext: null,
    isLoading: false,
    conversationId: null,
    lastAiMessage: null
};

// ========== INITIALIZE ==========
function initAIChatGame() {
    console.log('[AI Chat] Initializing for topic:', currentTopic?.title);

    aiChatState = {
        isActive: false,
        messages: [],
        topicContext: currentTopic,
        isLoading: false,
        conversationId: Date.now(),
        lastAiMessage: null
    };

    showChatWelcomeScreen();
}

// ========== WELCOME SCREEN ==========
function showChatWelcomeScreen() {
    const chatContainer = document.getElementById('aiChatContainer');
    if (!chatContainer) return;

    const topicTitle = currentTopic?.title || 'Chủ đề này';

    chatContainer.innerHTML = `
        <div class="chat-welcome">
            <div class="welcome-icon"></div>
            <h3>Hội thoại với AI</h3>
            <p>Luyện giao tiếp tiếng Anh về chủ đề <strong>"${topicTitle}"</strong><br>
            AI sẽ đóng vai người bản xứ để trò chuyện với bạn.</p>
            <button class="start-chat-btn" onclick="startAIConversation()">
                <i class="fas fa-comments"></i>
                Bắt đầu trò chuyện
            </button>
        </div>
    `;
}

// ========== START CONVERSATION ==========
async function startAIConversation() {
    aiChatState.isActive = true;
    aiChatState.messages = [];
    aiChatState.lastAiMessage = null;

    showChatInterface();
    await sendOpeningMessage();
}

// ========== SHOW CHAT INTERFACE ==========
function showChatInterface() {
    const chatContainer = document.getElementById('aiChatContainer');
    if (!chatContainer) return;

    const topicTitle = currentTopic?.title || 'Chủ đề học';

    chatContainer.innerHTML = `
        <div class="chat-header">
            <div class="ai-avatar"></div>
            <div class="ai-info">
                <h4>AI English Tutor</h4>
                <p>Đang trò chuyện về: ${topicTitle}</p>
            </div>
        </div>

        <div class="chat-messages" id="chatMessages">
            <!-- Messages will be added here -->
        </div>

        <div class="suggestion-chips" id="suggestionChips">
            <!-- Suggestions will be added here -->
        </div>

        <div class="chat-input-container">
            <button class="voice-input-btn" id="voiceInputBtn" onclick="toggleVoiceInput()" title="Nhập bằng giọng nói">
                <i class="fas fa-microphone"></i>
            </button>
            <input type="text" class="chat-input" id="chatInput"
                   placeholder="Nhập tin nhắn tiếng Anh..."
                   onkeypress="handleChatKeypress(event)">
            <button class="chat-send-btn" id="chatSendBtn" onclick="sendUserMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>

        <div class="chat-controls">
            <button class="chat-control-btn btn-suggest" onclick="requestSuggestion()" title="AI gợi ý câu trả lời">
                <i class="fas fa-lightbulb"></i> Gợi ý câu
            </button>
            <button class="chat-control-btn btn-new-chat" onclick="restartConversation()">
                <i class="fas fa-redo"></i> Cuộc trò chuyện mới
            </button>
            <button class="chat-control-btn btn-end-chat" onclick="endConversation()">
                <i class="fas fa-times"></i> Kết thúc
            </button>
        </div>
    `;

    setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
}

// ========== API CALL ==========
async function callBackendAPI(messages) {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BACKEND_API_URL}/conversation/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            messages: messages,
            topic_id: currentTopic?.id
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
        reply: data.reply,
        audio_url: data.audio_url || null
    };
}

// ========== SEND OPENING MESSAGE ==========
async function sendOpeningMessage() {
    showTypingIndicator();

    const topicTitle = currentTopic?.title || 'general English';
    const topicWords = currentTopic?.words?.slice(0, 5).map(w => w.word).join(', ') || '';

    const systemPrompt = `You are a friendly English tutor helping a Vietnamese student practice English conversation.
The current topic is: "${topicTitle}"
${topicWords ? `Some vocabulary for this topic: ${topicWords}` : ''}

Start with a friendly greeting and ask a simple question related to the topic.
Keep your response short (1-2 sentences), natural, and appropriate for English learners.
Respond in English only.`;

    try {
        const response = await callBackendAPI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Start the conversation' }
        ]);

        removeTypingIndicator();
        addMessage('ai', response.reply, response.audio_url);
        showSuggestions(response.reply);
    } catch (error) {
        console.error('[AI Chat] Opening message error:', error);
        removeTypingIndicator();

        const fallbackMsg = `Hello! Let's practice English together about "${topicTitle}". How are you today?`;
        addMessage('ai', fallbackMsg);
        showDefaultSuggestions();
    }
}

// ========== SEND USER MESSAGE ==========
async function sendUserMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();

    if (!message || aiChatState.isLoading) return;

    input.value = '';
    addMessage('user', message);
    hideSuggestions();
    showTypingIndicator();
    aiChatState.isLoading = true;

    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) sendBtn.disabled = true;

    const topicContext = `You are helping a Vietnamese student practice English conversation about "${currentTopic?.title || 'general topics'}".
Keep responses short (1-3 sentences), encouraging, and appropriate for English learners.
If the user makes grammar mistakes, gently correct them while continuing the conversation.
Respond in English only.`;

    const apiMessages = [
        { role: 'system', content: topicContext },
        ...aiChatState.messages.map(m => ({
            role: m.type === 'ai' ? 'assistant' : 'user',
            content: m.content
        }))
    ];

    try {
        const response = await callBackendAPI(apiMessages);

        removeTypingIndicator();
        aiChatState.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;

        addMessage('ai', response.reply, response.audio_url);
        showSuggestions(response.reply);
    } catch (error) {
        console.error('[AI Chat] Error:', error);
        removeTypingIndicator();
        aiChatState.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;

        showError('Không thể kết nối đến AI. Vui lòng thử lại.');
    }

    scrollToBottom();
}

// ========== ADD MESSAGE ==========
function addMessage(type, content, audioUrl = null) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageId = `msg-${Date.now()}`;

    aiChatState.messages.push({ type, content, audioUrl, timestamp: new Date(), id: messageId });

    if (type === 'ai') {
        aiChatState.lastAiMessage = content;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    messageDiv.id = messageId;

    const avatar = type === 'ai' ? '' : '';
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const aiAudioButton = (type === 'ai' && audioUrl)
        ? `<button class="play-audio-btn" onclick="playMessageAudio('${audioUrl}')" title="Nghe">
               <i class="fas fa-volume-up"></i>
           </button>`
        : '';

    const userEvalButton = (type === 'user')
        ? `<button class="evaluate-btn" onclick="evaluateUserMessage('${messageId}', '${content.replace(/'/g, "\\'")}')" title="Đánh giá câu này">
               <i class="fas fa-check-circle"></i> Đánh giá
           </button>`
        : '';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${content}
            ${aiAudioButton}
            ${userEvalButton}
            <span class="message-time">${time}</span>
        </div>
        <div class="message-evaluation" id="eval-${messageId}" style="display: none;"></div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    if (type === 'ai' && audioUrl) {
        playMessageAudio(audioUrl);
    }
}

// ========== PLAY AUDIO ==========
function playMessageAudio(audioUrl) {
    if (!audioUrl) return;

    let fullUrl = audioUrl;
    if (audioUrl.startsWith('/')) {
        fullUrl = BACKEND_API_URL.replace('/api/v1', '') + audioUrl;
    }

    const audio = new Audio(fullUrl);
    audio.play().catch(err => console.error('[AI Chat] Audio error:', err));
}

// ========== TYPING INDICATOR ==========
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    removeTypingIndicator();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
}

// ========== SUGGESTIONS ==========
function showSuggestions(aiMessage) {
    const chipsContainer = document.getElementById('suggestionChips');
    if (!chipsContainer) return;

    const suggestions = generateSuggestions(aiMessage);
    chipsContainer.innerHTML = suggestions.map(s =>
        `<button class="suggestion-chip" onclick="useSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`
    ).join('');
}

function showDefaultSuggestions() {
    const suggestions = [
        "I'm doing well, thank you!",
        "Can you help me?",
        "Tell me more.",
        "How do you say...?"
    ];

    const chipsContainer = document.getElementById('suggestionChips');
    if (chipsContainer) {
        chipsContainer.innerHTML = suggestions.map(s =>
            `<button class="suggestion-chip" onclick="useSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`
        ).join('');
    }
}

function generateSuggestions(aiMessage) {
    const lowerMsg = aiMessage.toLowerCase();

    if (lowerMsg.includes('how are you') || lowerMsg.includes('how do you feel')) {
        return ["I'm great, thanks!", "I'm doing well.", "I'm fine, and you?", "Pretty good!"];
    }
    if (lowerMsg.includes('what do you think') || lowerMsg.includes('your opinion')) {
        return ["I think...", "In my opinion...", "I believe that...", "I'm not sure."];
    }
    if (lowerMsg.includes('tell me') || lowerMsg.includes('explain')) {
        return ["Let me explain...", "Well, it's like...", "Here's what I know...", "Can you give an example?"];
    }
    if (lowerMsg.includes('?')) {
        return ["Yes, I do.", "No, I don't.", "I'm not sure.", "Can you repeat?"];
    }

    return ["That's interesting!", "Tell me more.", "I understand.", "Can you explain?"];
}

function hideSuggestions() {
    const chipsContainer = document.getElementById('suggestionChips');
    if (chipsContainer) chipsContainer.innerHTML = '';
}

function useSuggestion(text) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = text;
        input.focus();
    }
}

// ========== VOICE INPUT ==========
let voiceRecognition = null;
let isVoiceRecording = false;

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
        return;
    }

    if (isVoiceRecording) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.lang = 'en-US';
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = false;

    voiceRecognition.onstart = () => {
        isVoiceRecording = true;
        const btn = document.getElementById('voiceInputBtn');
        if (btn) {
            btn.classList.add('recording');
            btn.innerHTML = '<i class="fas fa-stop"></i>';
        }
    };

    voiceRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = transcript;
        }
        stopVoiceInput();
    };

    voiceRecognition.onerror = (event) => {
        console.error('[Voice] Error:', event.error);
        stopVoiceInput();
        if (event.error !== 'no-speech') {
            alert('Lỗi nhận diện giọng nói: ' + event.error);
        }
    };

    voiceRecognition.onend = () => {
        stopVoiceInput();
    };

    voiceRecognition.start();
}

function stopVoiceInput() {
    if (voiceRecognition) {
        voiceRecognition.stop();
        voiceRecognition = null;
    }

    isVoiceRecording = false;
    const btn = document.getElementById('voiceInputBtn');
    if (btn) {
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

// ========== UTILITY FUNCTIONS ==========
function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendUserMessage();
    }
}

function showError(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

    messagesContainer.appendChild(errorDiv);
    scrollToBottom();

    setTimeout(() => errorDiv.remove(), 5000);
}

function restartConversation() {
    if (confirm('Bạn có muốn bắt đầu cuộc trò chuyện mới?')) {
        startAIConversation();
    }
}

async function endConversation() {
    if (aiChatState.messages.length < 2) {
        aiChatState.isActive = false;
        showChatWelcomeScreen();
        return;
    }

    if (!confirm('Bạn có muốn kết thúc và xem đánh giá?')) return;

    try {
        showTypingIndicator();

        const token = localStorage.getItem('access_token');
        const response = await fetch(`${BACKEND_API_URL}/conversation/end-simple`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: aiChatState.messages.map(m => ({
                    role: m.type === 'ai' ? 'ai' : 'user',
                    content: m.content,
                    audio_url: m.audioUrl || null
                })),
                topic: currentTopic?.title || 'English Practice'
            })
        });

        removeTypingIndicator();

        if (response.ok) {
            const evaluation = await response.json();
            showConversationEvaluation(evaluation);
        } else {
            showFallbackEvaluation();
        }
    } catch (error) {
        console.error('End conversation error:', error);
        removeTypingIndicator();
        showFallbackEvaluation();
    }

    aiChatState.isActive = false;
}

// ========== CONVERSATION EVALUATION ==========
function showConversationEvaluation(evaluation) {
    const chatContainer = document.getElementById('aiChatContainer');
    if (!chatContainer) return;

    const scores = evaluation.scores || {};

    chatContainer.innerHTML = `
        <div class="evaluation-result">
            <div class="eval-header">
                <div class="eval-icon"></div>
                <h3>Hoàn thành hội thoại!</h3>
                <p>Bạn đã hoàn thành ${evaluation.total_turns || 0} lượt trò chuyện</p>
            </div>

            <div class="eval-scores">
                <div class="score-item">
                    <div class="score-label">Tổng điểm</div>
                    <div class="score-value overall">${(scores.overall || 7).toFixed(1)}</div>
                </div>
                <div class="score-details">
                    <div class="score-detail">
                        <span>Trôi chảy:</span>
                        <div class="score-bar"><div style="width: ${(scores.fluency || 7) * 10}%"></div></div>
                        <span>${(scores.fluency || 7).toFixed(1)}</span>
                    </div>
                    <div class="score-detail">
                        <span>Ngữ pháp:</span>
                        <div class="score-bar"><div style="width: ${(scores.grammar || 7) * 10}%"></div></div>
                        <span>${(scores.grammar || 7).toFixed(1)}</span>
                    </div>
                    <div class="score-detail">
                        <span>Từ vựng:</span>
                        <div class="score-bar"><div style="width: ${(scores.vocabulary || 7) * 10}%"></div></div>
                        <span>${(scores.vocabulary || 7).toFixed(1)}</span>
                    </div>
                    <div class="score-detail">
                        <span>Liên quan:</span>
                        <div class="score-bar"><div style="width: ${(scores.relevance || 7) * 10}%"></div></div>
                        <span>${(scores.relevance || 7).toFixed(1)}</span>
                    </div>
                </div>
            </div>

            ${evaluation.grammar_errors?.length > 0 ? `
            <div class="eval-section">
                <h4> Lỗi ngữ pháp cần chú ý</h4>
                <div class="grammar-errors">
                    ${evaluation.grammar_errors.slice(0, 5).map(err => `
                        <div class="error-item">
                            <div class="error-original"> ${err.original}</div>
                            <div class="error-corrected"> ${err.corrected}</div>
                            <div class="error-explanation">${err.explanation}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${evaluation.strengths?.length > 0 ? `
            <div class="eval-section">
                <h4> Điểm mạnh</h4>
                <ul class="strengths-list">
                    ${evaluation.strengths.map(s => `<li> ${s}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${evaluation.areas_to_improve?.length > 0 ? `
            <div class="eval-section">
                <h4> Cần cải thiện</h4>
                <ul class="improve-list">
                    ${evaluation.areas_to_improve.map(s => `<li> ${s}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="eval-section">
                <h4> Nhận xét</h4>
                <p class="overall-feedback">${evaluation.overall_feedback || 'Buổi luyện tập tốt!'}</p>
            </div>

            ${evaluation.tips?.length > 0 ? `
            <div class="eval-section">
                <h4> Mẹo luyện tập</h4>
                <ul class="tips-list">
                    ${evaluation.tips.map(t => `<li> ${t}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="eval-actions">
                <button class="btn-primary" onclick="startAIConversation()">
                    <i class="fas fa-redo"></i> Luyện tập lại
                </button>
                <button class="btn-secondary" onclick="showChatWelcomeScreen()">
                    <i class="fas fa-home"></i> Quay lại
                </button>
            </div>
        </div>
    `;
}

function showFallbackEvaluation() {
    showConversationEvaluation({
        total_turns: aiChatState.messages.filter(m => m.type === 'user').length,
        scores: { fluency: 7, grammar: 7, vocabulary: 7, relevance: 7.5, overall: 7 },
        strengths: ['Đã hoàn thành cuộc hội thoại'],
        areas_to_improve: ['Tiếp tục luyện tập thường xuyên'],
        overall_feedback: 'Bạn đã hoàn thành buổi luyện tập! Hãy tiếp tục cố gắng nhé.',
        tips: ['Luyện tập nói mỗi ngày 15-30 phút']
    });
}

// ========== SUGGESTION POPUP ==========
async function requestSuggestion() {
    if (!aiChatState.lastAiMessage) {
        alert('Hãy đợi AI nói trước để được gợi ý câu trả lời.');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${BACKEND_API_URL}/conversation/suggest-reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ai_message: aiChatState.lastAiMessage,
                topic: currentTopic?.title || 'English Practice'
            })
        });

        if (response.ok) {
            const data = await response.json();
            showSuggestionPopup(data);
        } else {
            showDefaultSuggestions();
        }
    } catch (error) {
        console.error('Suggest reply error:', error);
        showDefaultSuggestions();
    }
}

function showSuggestionPopup(data) {
    const existingPopup = document.getElementById('suggestionPopup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'suggestionPopup';
    popup.className = 'suggestion-popup';
    popup.innerHTML = `
        <div class="suggestion-popup-content">
            <div class="popup-header">
                <h4> Gợi ý câu trả lời</h4>
                <button class="close-popup" onclick="closeSuggestionPopup()">&times;</button>
            </div>

            <div class="suggestion-options">
                ${data.suggestions?.map(s => `
                    <button class="suggestion-option" onclick="useSuggestionFromPopup('${s.replace(/'/g, "\\'")}')">
                        ${s}
                    </button>
                `).join('') || ''}
            </div>

            <div class="example-section">
                <h5> Mẫu câu đầy đủ:</h5>
                <div class="example-sentence" onclick="useSuggestionFromPopup('${(data.example_sentence || '').replace(/'/g, "\\'")}')">
                    ${data.example_sentence || 'I would like to continue our conversation.'}
                </div>
            </div>

            ${data.explanation ? `
            <div class="explanation-section">
                <h5> Giải thích:</h5>
                <p>${data.explanation}</p>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('aiChatContainer')?.appendChild(popup);
}

function closeSuggestionPopup() {
    document.getElementById('suggestionPopup')?.remove();
}

function useSuggestionFromPopup(text) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = text;
        input.focus();
    }
    closeSuggestionPopup();
}

// ========== MESSAGE EVALUATION ==========
async function evaluateUserMessage(messageId, userText) {
    const evalContainer = document.getElementById(`eval-${messageId}`);
    if (!evalContainer) return;

    evalContainer.style.display = 'block';
    evalContainer.innerHTML = '<div class="eval-loading"><i class="fas fa-spinner fa-spin"></i> Đang đánh giá...</div>';

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${BACKEND_API_URL}/conversation/evaluate-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                user_text: userText,
                ai_previous_message: aiChatState.lastAiMessage,
                topic: currentTopic?.title || 'English Practice'
            })
        });

        if (response.ok) {
            const evaluation = await response.json();
            showMessageEvaluation(evalContainer, evaluation);
        } else {
            evalContainer.innerHTML = '<div class="eval-error">Không thể đánh giá lúc này.</div>';
        }
    } catch (error) {
        console.error('Evaluate message error:', error);
        evalContainer.innerHTML = '<div class="eval-error">Lỗi kết nối. Vui lòng thử lại.</div>';
    }
}

function showMessageEvaluation(container, evaluation) {
    const isCorrect = evaluation.is_correct;
    const corrections = evaluation.grammar_corrections || [];

    container.innerHTML = `
        <div class="message-eval ${isCorrect ? 'correct' : 'has-errors'}">
            ${isCorrect ?
                `<div class="eval-status correct"> Câu đúng ngữ pháp!</div>` :
                `<div class="eval-status incorrect"> Cần sửa một số lỗi</div>`
            }

            ${!isCorrect && evaluation.corrected_text ? `
                <div class="corrected-text">
                    <strong>Sửa lại:</strong> ${evaluation.corrected_text}
                </div>
            ` : ''}

            ${corrections.length > 0 ? `
                <div class="corrections-list">
                    ${corrections.map(c => `
                        <div class="correction-item">
                            <span class="original"> ${c.original}</span>
                            <span class="arrow"></span>
                            <span class="corrected"> ${c.corrected}</span>
                            <div class="explanation">${c.explanation}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="eval-feedback">
                <span class="relevance">Độ phù hợp: ${evaluation.relevance_score}/10</span>
                <span class="encouragement">${evaluation.encouragement}</span>
            </div>
        </div>
    `;
}

// ========== EXPORT ==========
window.initAIChatGame = initAIChatGame;
window.startAIConversation = startAIConversation;
window.sendUserMessage = sendUserMessage;
window.toggleVoiceInput = toggleVoiceInput;
window.useSuggestion = useSuggestion;
window.handleChatKeypress = handleChatKeypress;
window.restartConversation = restartConversation;
window.endConversation = endConversation;
window.requestSuggestion = requestSuggestion;
window.evaluateUserMessage = evaluateUserMessage;
window.closeSuggestionPopup = closeSuggestionPopup;
window.useSuggestionFromPopup = useSuggestionFromPopup;
window.playMessageAudio = playMessageAudio;
window.showChatWelcomeScreen = showChatWelcomeScreen;

console.log('[AI Chat]  Module loaded');