// ========== AI CHAT CONFIGURATION ==========
const AI_CHAT_CONFIG = {
    API_BASE_URL: 'https://api.groq.com/openai/v1',
    API_KEY: null, // Will be loaded from config.js
    MODEL: 'llama-3.3-70b-versatile',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.5
};

// ========== AI CHAT STATE ==========
let aiChatState = {
    isActive: false,
    messages: [],
    topicContext: null,
    isLoading: false,
    conversationId: null
};

// ========== INITIALIZE AI CHAT ==========
function initAIChatGame() {
    console.log('[AI Chat] Initializing AI Chat Game for topic:', currentTopic?.title);

    // Reset chat state
    aiChatState = {
        isActive: false,
        messages: [],
        topicContext: currentTopic,
        isLoading: false,
        conversationId: Date.now()
    };

    // Show welcome screen
    showChatWelcomeScreen();
}

// ========== SHOW WELCOME SCREEN ==========
function showChatWelcomeScreen() {
    const chatContainer = document.getElementById('aiChatContainer');
    if (!chatContainer) return;

    const topicTitle = currentTopic?.title || 'Chủ đề này';
    const topicLevel = currentTopic?.level || 'Cơ bản';

    chatContainer.innerHTML = `
        <div class="chat-welcome">
            <div class="welcome-icon">🤖</div>
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

// ========== START AI CONVERSATION ==========
async function startAIConversation() {
    console.log('[AI Chat] Starting conversation...');

    aiChatState.isActive = true;
    aiChatState.messages = [];

    // Show chat interface
    showChatInterface();

    // Generate opening message from AI
    await sendSystemMessage();
}

// ========== SHOW CHAT INTERFACE ==========
function showChatInterface() {
    const chatContainer = document.getElementById('aiChatContainer');
    if (!chatContainer) return;

    const topicTitle = currentTopic?.title || 'Chủ đề học';

    chatContainer.innerHTML = `
        <div class="chat-header">
            <div class="ai-avatar">🤖</div>
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
            <button class="chat-control-btn btn-new-chat" onclick="restartConversation()">
                <i class="fas fa-redo"></i> Cuộc trò chuyện mới
            </button>
            <button class="chat-control-btn btn-end-chat" onclick="endConversation()">
                <i class="fas fa-times"></i> Kết thúc
            </button>
        </div>
    `;

    // Focus on input
    setTimeout(() => {
        document.getElementById('chatInput')?.focus();
    }, 100);
}

// ========== SEND SYSTEM MESSAGE (AI OPENING) ==========
async function sendSystemMessage() {
    // Show typing indicator
    showTypingIndicator();

    const topicTitle = currentTopic?.title || 'general English';
    const topicWords = currentTopic?.words?.slice(0, 5).map(w => w.word).join(', ') || '';

    // Create context-aware opening
    const systemPrompt = `You are a friendly English tutor helping a Vietnamese student practice English conversation. 
The current topic is: "${topicTitle}"
${topicWords ? `Some vocabulary for this topic: ${topicWords}` : ''}

Start with a friendly greeting and ask a simple question related to the topic to begin the conversation.
Keep your response short (1-2 sentences), natural, and appropriate for English learners.
Respond in English only.`;

    try {
        const response = await callOhMyGPTAPI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Start the conversation' }
        ]);

        removeTypingIndicator();

        if (response) {
            addMessage('ai', response);
            showSuggestions(response);
        } else {
            addMessage('ai', `Hello! Let's practice English together. Today we're learning about "${topicTitle}". How are you doing today?`);
            showDefaultSuggestions();
        }
    } catch (error) {
        console.error('[AI Chat] Error getting opening message:', error);
        removeTypingIndicator();
        addMessage('ai', `Hello! Let's practice English together about "${topicTitle}". How are you today?`);
        showDefaultSuggestions();
    }
}

// ========== CALL OHMYGPT API ==========
async function callOhMyGPTAPI(messages) {
    console.log('[AI Chat] Calling API with messages:', messages.length);

    // Thử gọi qua backend trước (an toàn hơn)
    const token = localStorage.getItem('access_token');

    try {
        console.log('[AI Chat] Trying backend proxy...');
        const backendResponse = await fetch(`${API_BASE_URL}/conversation/chat`, {
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

        console.log('[AI Chat] Backend response status:', backendResponse.status);

        if (backendResponse.ok) {
            const data = await backendResponse.json();
            console.log('[AI Chat] Backend response data:', data);

            // Kiểm tra nếu có lỗi trong response
            if (data.error) {
                console.warn('[AI Chat] Backend returned error:', data.error);
                // Vẫn trả về reply nếu có
                if (data.reply) {
                    return data.reply;
                }
            } else {
                return data.reply || data.message;
            }
        } else {
            console.warn('[AI Chat] Backend proxy failed with status:', backendResponse.status);
        }
    } catch (e) {
        console.warn('[AI Chat] Backend proxy not available:', e.message);
    }

    // Fallback: Gọi trực tiếp Groq API
    console.log('[AI Chat] Falling back to direct Groq API call...');

    // Lấy API key từ config file
    const apiKey = window.APP_CONFIG?.GROQ_API_KEY || AI_CHAT_CONFIG.API_KEY;

    if (!apiKey || apiKey === '' || apiKey === 'your-groq-api-key-here') {
        console.error('[AI Chat] ⚠️ Chưa cấu hình API key!');
        console.error('[AI Chat] Vui lòng:');
        console.error('[AI Chat] 1. Copy file config.example.js thành config.js');
        console.error('[AI Chat] 2. Thay API key trong config.js');
        console.error('[AI Chat] 3. Lấy API key miễn phí tại: https://console.groq.com/keys');
        return generateContextualResponse(messages);
    }

    try {
        const response = await fetch(`${AI_CHAT_CONFIG.API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: AI_CHAT_CONFIG.MODEL,
                messages: messages,
                max_tokens: AI_CHAT_CONFIG.MAX_TOKENS,
                temperature: AI_CHAT_CONFIG.TEMPERATURE
            })
        });

        console.log('[AI Chat] Direct API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('[AI Chat] Direct API success:', data.choices?.[0]?.message?.content?.substring(0, 50));
            return data.choices[0].message.content;
        } else {
            const errorText = await response.text();
            console.error('[AI Chat] Direct API error:', response.status, errorText);
            return generateContextualResponse(messages);
        }
    } catch (error) {
        console.error('[AI Chat] Direct API connection error:', error);
        return generateContextualResponse(messages);
    }
}

// ========== GENERATE CONTEXTUAL RESPONSE (Smart Fallback) ==========
function generateContextualResponse(messages) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const topicTitle = currentTopic?.title || 'English';

    console.log('[AI Chat] Using contextual fallback for:', lastUserMessage);

    // Phân tích câu hỏi và trả lời phù hợp hơn
    const lowerMessage = lastUserMessage.toLowerCase();

    // Câu hỏi về định nghĩa / nghĩa
    if (lowerMessage.includes('what is') || lowerMessage.includes('what are') ||
        lowerMessage.includes('what does') || lowerMessage.includes('meaning')) {
        return `That's a great question about ${topicTitle}! Let me explain - this is related to the vocabulary we're learning. Can you try using it in a sentence?`;
    }

    // Câu hỏi cách nói/phát âm
    if (lowerMessage.includes('how to say') || lowerMessage.includes('how do you say') ||
        lowerMessage.includes('pronounce')) {
        return `Good question! To say that in English, you would use the words from our topic "${topicTitle}". Try practicing the pronunciation!`;
    }

    // Câu hỏi về ngữ pháp
    if (lowerMessage.includes('grammar') || lowerMessage.includes('correct') ||
        lowerMessage.includes('wrong') || lowerMessage.includes('mistake')) {
        return `Grammar is important! In English, we usually structure sentences as Subject + Verb + Object. Would you like me to check a specific sentence?`;
    }

    // Yêu cầu ví dụ
    if (lowerMessage.includes('example') || lowerMessage.includes('for example')) {
        return `Sure! Here's an example related to "${topicTitle}": You could say "I would like to..." or "Could you please...?" Try making your own sentence!`;
    }

    // Câu chào
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lastUserMessage)) {
        return `Hello! I'm happy to help you practice English about "${topicTitle}". What would you like to learn or discuss?`;
    }

    // Trả lời tốt/khỏe
    if (/^(i'm fine|i'm good|i'm great|i am fine|i am good|fine|good|great)/i.test(lastUserMessage)) {
        return `That's wonderful to hear! So, shall we practice some English about "${topicTitle}"? What aspect interests you most?`;
    }

    // Câu hỏi có dấu ?
    if (lastUserMessage.includes('?')) {
        return `That's an interesting question about our topic! In the context of "${topicTitle}", I'd say it depends on the situation. What do you think?`;
    }

    // Câu khẳng định/bình luận
    if (lastUserMessage.length > 20) {
        return `I appreciate your thoughts! You're expressing yourself well in English. Can you tell me more about that?`;
    }

    // Mặc định
    return `That's great that you're practicing! Let's continue our conversation about "${topicTitle}". What would you like to know?`;
}

// ========== SEND USER MESSAGE ==========
async function sendUserMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();

    if (!message || aiChatState.isLoading) return;

    // Clear input
    input.value = '';

    // Add user message
    addMessage('user', message);

    // Hide suggestions while waiting
    hideSuggestions();

    // Show typing indicator
    showTypingIndicator();
    aiChatState.isLoading = true;

    // Disable send button
    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) sendBtn.disabled = true;

    // Build messages array for API
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
        const response = await callOhMyGPTAPI(apiMessages);

        removeTypingIndicator();
        aiChatState.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;

        if (response) {
            addMessage('ai', response);
            showSuggestions(response);
        } else {
            addMessage('ai', "That's great! Keep practicing. What else would you like to talk about?");
            showDefaultSuggestions();
        }
    } catch (error) {
        console.error('[AI Chat] Error:', error);
        removeTypingIndicator();
        aiChatState.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;

        showError('Không thể kết nối đến AI. Vui lòng thử lại.');
    }

    // Scroll to bottom
    scrollToBottom();
}

// ========== ADD MESSAGE TO CHAT ==========
function addMessage(type, content) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    // Save to state
    aiChatState.messages.push({ type, content, timestamp: new Date() });

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;

    const avatar = type === 'ai' ? '🤖' : '👤';
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${content}
            <span class="message-time">${time}</span>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// ========== TYPING INDICATOR ==========
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    // Remove any existing indicator
    removeTypingIndicator();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// ========== SUGGESTIONS ==========
function showSuggestions(aiMessage) {
    const chipsContainer = document.getElementById('suggestionChips');
    if (!chipsContainer) return;

    // Generate contextual suggestions based on AI message
    let suggestions = generateSuggestions(aiMessage);

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

    // Based on question type in AI message
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

    // Default suggestions
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
        if (event.error === 'no-speech') {
            // Silent, don't show error
        } else {
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

    // Auto remove after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
}

function restartConversation() {
    if (confirm('Bạn có muốn bắt đầu cuộc trò chuyện mới?')) {
        startAIConversation();
    }
}

function endConversation() {
    aiChatState.isActive = false;
    showChatWelcomeScreen();
}

// ========== EXPORT FUNCTIONS ==========
window.initAIChatGame = initAIChatGame;
window.startAIConversation = startAIConversation;
window.sendUserMessage = sendUserMessage;
window.toggleVoiceInput = toggleVoiceInput;
window.useSuggestion = useSuggestion;
window.handleChatKeypress = handleChatKeypress;
window.restartConversation = restartConversation;
window.endConversation = endConversation;

console.log('[AI Chat] Module loaded successfully');
