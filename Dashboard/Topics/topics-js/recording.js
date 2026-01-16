// recording.js
console.log('recording.js đã được tải!');

(function () {
    // Chỉ khởi tạo biến nếu chưa có (để tránh lỗi redeclare nếu script chạy lại)
    // Tuy nhiên, tốt nhất là dùng biến cục bộ trong IIFE

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingTimer = null;
    let recordingStartTime = 0;
    let currentRecording = null;
    let currentAudioBlob = null; // Lưu blob ghi âm để gửi lên API

    // Các hàm global cần được gán vào window
    window.startRecording = function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Trình duyệt của bạn không hỗ trợ ghi âm. Vui lòng dùng Chrome, Firefox hoặc Edge.');
            return;
        }

        const recordBtn = document.getElementById('recordBtn');
        const playBtn = document.getElementById('playRecordBtn');
        const deleteBtn = document.getElementById('deleteRecordBtn');
        const timer = document.getElementById('recordingTimer');
        const feedback = document.getElementById('recordingFeedback');

        if (isRecording) {
            stopRecording();
            return;
        }

        // Reset
        audioChunks = [];
        currentRecording = null;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    currentRecording = URL.createObjectURL(audioBlob);

                    // Lưu blob để gửi API
                    currentAudioBlob = audioBlob;

                    // Cập nhật UI
                    recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Ghi âm lại';
                    recordBtn.classList.remove('recording');
                    playBtn.disabled = false;
                    deleteBtn.disabled = false;

                    // Enable nút so sánh phát âm
                    const compareBtn = document.getElementById('compareBtn');
                    if (compareBtn) {
                        console.log('Enabling compareBtn...');
                        compareBtn.disabled = false;
                        compareBtn.removeAttribute('disabled');
                        // Re-attach event
                        compareBtn.onclick = comparePronunciation;
                    } else {
                        console.error('Không tìm thấy compareBtn trong onstop');
                    }

                    // Hiển thị feedback
                    const duration = Math.round((Date.now() - recordingStartTime) / 1000);
                    feedback.innerHTML = `
                        <p class="feedback-text">✅ Đã ghi âm thành công!</p>
                        <p class="feedback-time">Thời lượng: ${duration} giây</p>
                        <p class="feedback-time">Nhấn "So sánh phát âm" để kiểm tra!</p>
                    `;
                    feedback.className = 'recording-feedback recorded';

                    // Dừng stream
                    stream.getTracks().forEach(track => track.stop());
                    console.log('Đã lưu Audio Blob:', currentAudioBlob);
                };

                // Bắt đầu ghi âm
                mediaRecorder.start();
                isRecording = true;
                recordingStartTime = Date.now();

                // Cập nhật UI
                recordBtn.innerHTML = '<i class="fas fa-stop"></i> Dừng ghi âm';
                recordBtn.classList.add('recording');
                playBtn.disabled = true;
                deleteBtn.disabled = true;
                feedback.innerHTML = '<p class="feedback-text">🎤 Đang ghi âm... Nói từ vào micro</p>';
                feedback.className = 'recording-feedback recording';

                // Bắt đầu đếm thời gian
                startTimer();
                startVisualizer();
            })
            .catch(error => {
                console.error('Lỗi truy cập micro:', error);
                alert('Không thể truy cập micro. Vui lòng cho phép quyền sử dụng micro và thử lại.');
            });
    }

    window.stopRecording = function () {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            stopTimer();
            stopVisualizer();
        }
    }

    window.playRecording = function () {
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

    window.deleteRecording = function () {
        if (currentRecording) {
            URL.revokeObjectURL(currentRecording);
            currentRecording = null;
        }

        // Reset audio blob
        currentAudioBlob = null;

        const recordBtn = document.getElementById('recordBtn');
        const playBtn = document.getElementById('playRecordBtn');
        const deleteBtn = document.getElementById('deleteRecordBtn');
        const compareBtn = document.getElementById('compareBtn');
        const feedback = document.getElementById('recordingFeedback');
        const timer = document.getElementById('recordingTimer');

        // Reset UI
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Bắt đầu ghi âm';
        recordBtn.classList.remove('recording');
        playBtn.disabled = true;
        deleteBtn.disabled = true;
        if (compareBtn) compareBtn.disabled = true;
        timer.textContent = '00:00';
        feedback.innerHTML = '<p>Ghi âm để so sánh với phát âm chuẩn</p>';
        feedback.className = 'recording-feedback';
    }

    // ========== TIMER & VISUALIZER ==========

    function startTimer() {
        const timer = document.getElementById('recordingTimer');
        recordingStartTime = Date.now();

        if (recordingTimer) clearInterval(recordingTimer); // Clear old timer if any

        recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            if (timer) timer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    function stopTimer() {
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
    }

    function startVisualizer() {
        const bars = document.querySelectorAll('.visualizer-bar');
        if (bars.length === 0) return;

        let animationFrame;
        let startTime = Date.now();

        function updateVisualizer() {
            if (!isRecording) {
                cancelAnimationFrame(animationFrame);
                bars.forEach(bar => {
                    bar.style.height = '5px';
                    bar.classList.remove('active');
                });
                return;
            }

            const elapsed = (Date.now() - startTime) * 0.001; // Thời gian tính bằng giây

            bars.forEach((bar, index) => {
                const frequency = 1 + index * 0.3;
                const phase = index * 0.5;

                const wave1 = Math.sin(elapsed * frequency + phase);
                const wave2 = Math.sin(elapsed * (frequency + 0.7) + phase * 2);
                const wave3 = Math.sin(elapsed * (frequency + 1.2) + phase * 3);

                const combinedWave = (wave1 + wave2 + wave3) / 3;
                const normalizedWave = (combinedWave + 1) / 2;

                const height = 5 + normalizedWave * 40;
                bar.style.height = `${height}px`;

                if (normalizedWave > 0.7) {
                    bar.classList.add('active');
                } else {
                    bar.classList.remove('active');
                }
            });

            animationFrame = requestAnimationFrame(updateVisualizer);
        }

        animationFrame = requestAnimationFrame(updateVisualizer);
    }

    function stopVisualizer() {
        const bars = document.querySelectorAll('.visualizer-bar');

        bars.forEach((bar, index) => {
            const currentHeight = parseInt(bar.style.height) || 5;
            const targetHeight = 5;
            const duration = 400 + index * 30;

            bar.style.transition = `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            bar.style.height = `${targetHeight}px`;
            bar.classList.remove('active');
        });

        setTimeout(() => {
            bars.forEach(bar => {
                bar.style.transition = '';
            });
        }, 800);
    }

    // ========== PRONUNCIATION COMPARISON ==========

    // API Configuration
    const API_BASE_URL = 'http://localhost:8000/api/v1';
    
    // Lấy token từ localStorage (sau khi đăng nhập)
    function getAuthToken() {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    }

    window.comparePronunciation = async function () {
        console.log('Bắt đầu so sánh phát âm...');

        if (!currentAudioBlob) {
            console.error('Không tìm thấy Audio Blob');
            alert('Lỗi: Chưa có dữ liệu ghi âm!');
            return;
        }

        const currentWord = document.getElementById('currentEnglish')?.textContent || '';
        if (!currentWord) {
            alert('Không tìm thấy từ để so sánh!');
            return;
        }

        const compareBtn = document.getElementById('compareBtn');
        const feedback = document.getElementById('recordingFeedback');

        if (compareBtn) {
            compareBtn.disabled = true;
            compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
        }

        if (feedback) {
            feedback.innerHTML = '<p class="feedback-text">⏳ Đang phân tích phát âm của bạn...</p>';
            feedback.className = 'recording-feedback';
        }

        try {
            // Convert audio blob to base64
            const audioBase64 = await blobToBase64(currentAudioBlob);
            console.log('Audio converted to base64, length:', audioBase64.length);

            const token = getAuthToken();
            
            // Gọi API quick-check (không cần lesson_attempt)
            console.log('Calling API /pronunciation/quick-check');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Thêm token nếu có (optional auth)
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/pronunciation/quick-check`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    expected_text: currentWord,
                    audio_base64: audioBase64,
                    audio_format: 'webm'
                })
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('API result:', result);
                displayPronunciationResultFromAPI(result);
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Lỗi khi kiểm tra phát âm');
            }
        } catch (error) {
            console.error('Pronunciation check error:', error);
            if (feedback) {
                feedback.innerHTML = `
                    <p class="feedback-text" style="color: #dc3545;">❌ Lỗi: ${error.message}</p>
                    <p class="feedback-time">Vui lòng thử lại sau</p>
                `;
                feedback.className = 'recording-feedback';
            }
        } finally {
            if (compareBtn) {
                compareBtn.disabled = false;
                compareBtn.innerHTML = '<i class="fas fa-check-circle"></i> So sánh phát âm';
            }
        }
    }

    // Helper function to convert Blob to Base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Display result from API (QuickPronunciationCheckResponse)
    function displayPronunciationResultFromAPI(result) {
        const feedback = document.getElementById('recordingFeedback');
        if (!feedback) return;

        // Extract data from API response
        const scores = result.scores || {};
        const pronunciationScore = scores.pronunciation_score || 0;
        const intonationScore = scores.intonation_score || 0;
        const stressScore = scores.stress_score || 0;
        const accuracyScore = scores.accuracy_score || 0;
        
        const transcription = result.transcription || '';
        const expectedText = result.expected_text || '';
        const feedbackData = result.feedback || {};
        const isPassed = result.is_passed || false;
        const isMock = result.is_mock || false;

        let scoreColor = '#dc3545';
        let emoji = '😔';
        let message = 'Cần luyện tập thêm';

        if (accuracyScore >= 90) {
            scoreColor = '#28a745';
            emoji = '🎉';
            message = 'Xuất sắc! Phát âm rất chuẩn!';
        } else if (accuracyScore >= 70) {
            scoreColor = '#28a745';
            emoji = '👍';
            message = 'Tốt! Phát âm khá chuẩn';
        } else if (accuracyScore >= 50) {
            scoreColor = '#ffc107';
            emoji = '💪';
            message = 'Tạm được, cần cải thiện thêm';
        }

        feedback.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <p style="font-size: 2em; margin-bottom: 5px;">${emoji}</p>
                <p style="font-size: 1.8em; font-weight: bold; color: ${scoreColor}; margin-bottom: 10px;">
                    ${Math.round(accuracyScore)}/100
                </p>
                <p style="font-weight: 600; margin-bottom: 15px;">${message}</p>
                
                <div style="text-align: left; background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <p style="margin: 5px 0; font-size: 0.9em;">
                        <strong>🎯 Từ cần nói:</strong> ${expectedText}
                    </p>
                    <p style="margin: 5px 0; font-size: 0.9em;">
                        <strong>🗣️ Bạn đã nói:</strong> ${transcription || '(không nhận diện được)'}
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px;">
                    <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
                        <p style="font-size: 0.75em; color: #aaa; margin: 0;">Phát âm</p>
                        <p style="font-size: 1.2em; font-weight: bold; margin: 2px 0; color: ${getScoreColor(pronunciationScore)}">${Math.round(pronunciationScore)}</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
                        <p style="font-size: 0.75em; color: #aaa; margin: 0;">Ngữ điệu</p>
                        <p style="font-size: 1.2em; font-weight: bold; margin: 2px 0; color: ${getScoreColor(intonationScore)}">${Math.round(intonationScore)}</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
                        <p style="font-size: 0.75em; color: #aaa; margin: 0;">Trọng âm</p>
                        <p style="font-size: 1.2em; font-weight: bold; margin: 2px 0; color: ${getScoreColor(stressScore)}">${Math.round(stressScore)}</p>
                    </div>
                </div>
                
                ${feedbackData.overall ? `
                <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; text-align: left;">
                    <p style="font-size: 0.85em; color: #ddd; margin: 0;">💡 ${feedbackData.overall}</p>
                </div>
                ` : ''}
                
                ${feedbackData.pronunciation_feedback ? `
                <div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; text-align: left;">
                    <p style="font-size: 0.8em; color: #bbb; margin: 0;">🎤 ${feedbackData.pronunciation_feedback}</p>
                </div>
                ` : ''}
                
                ${feedbackData.suggestions && feedbackData.suggestions.length > 0 ? `
                <div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; text-align: left;">
                    <p style="font-size: 0.8em; color: #bbb; margin: 0 0 5px 0;">📝 Gợi ý:</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.75em; color: #999;">
                        ${feedbackData.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${isPassed ? 
                    '<p style="color: #28a745; margin-top: 10px;">✅ Đạt yêu cầu!</p>' : 
                    '<p style="color: #ffc107; margin-top: 10px;">⚡ Thử lại để đạt điểm cao hơn!</p>'
                }
                
                ${isMock ? 
                    '<p style="color: #999; font-size: 0.7em; margin-top: 5px;">⚠️ Demo mode - Cần cấu hình Deepgram API</p>' : 
                    ''
                }
            </div>
        `;
        feedback.className = 'recording-feedback recorded';
    }

    // Helper to get color based on score
    function getScoreColor(score) {
        if (score >= 80) return '#28a745';
        if (score >= 60) return '#ffc107';
        return '#dc3545';
    }

    function displayPronunciationResult(result, word) {
        const feedback = document.getElementById('recordingFeedback');
        if (!feedback) return;

        const score = result.score || result.accuracy || 0;
        const transcription = result.transcription || result.recognized_text || '';

        let scoreColor = '#dc3545';
        let emoji = '😔';
        let message = 'Cần luyện tập thêm';

        if (score >= 90) {
            scoreColor = '#28a745';
            emoji = '🎉';
            message = 'Xuất sắc! Phát âm rất chuẩn!';
        } else if (score >= 70) {
            scoreColor = '#28a745';
            emoji = '👍';
            message = 'Tốt! Phát âm khá chuẩn';
        } else if (score >= 50) {
            scoreColor = '#ffc107';
            emoji = '💪';
            message = 'Tạm được, cần cải thiện thêm';
        }

        feedback.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <p style="font-size: 2em; margin-bottom: 5px;">${emoji}</p>
                <p style="font-size: 1.5em; font-weight: bold; color: ${scoreColor}; margin-bottom: 10px;">
                    Điểm: ${Math.round(score)}/100
                </p>
                <p style="font-weight: 600; margin-bottom: 5px;">${message}</p>
            </div>
        `;
        feedback.className = 'recording-feedback recorded';
    }

    // Tự động gán sự kiện khi document load
    function attachCompareEvent() {
        console.log('Đang kiểm tra compareBtn để gán sự kiện...');
        const compareBtn = document.getElementById('compareBtn');
        if (compareBtn) {
            compareBtn.removeEventListener('click', window.comparePronunciation);
            compareBtn.addEventListener('click', window.comparePronunciation);
            compareBtn.onclick = window.comparePronunciation; // Fallback
            console.log('✅ Đã gán sự kiện click cho compareBtn');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachCompareEvent);
    } else {
        attachCompareEvent();
    }

})(); // End IIFE
