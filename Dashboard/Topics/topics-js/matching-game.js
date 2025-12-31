// matching-game.js
(function () {
    let selectedWord = null;
    let selectedMeaning = null;
    let userMatches = [];

    window.initWordMatchingGame = function () {
        if (!currentTopic || !currentTopic.words) return;

        const wordsColumn = document.getElementById('wordsColumn');
        const meaningsColumn = document.getElementById('meaningsColumn');
        const connectionsDisplay = document.getElementById('connectionsDisplay');

        if (!wordsColumn || !meaningsColumn) return;

        wordsColumn.innerHTML = '';
        meaningsColumn.innerHTML = '';
        if (connectionsDisplay) {
            connectionsDisplay.innerHTML = '<p>Chọn từ tiếng Việt và nghĩa tiếng Anh tương ứng</p>';
        }

        selectedWord = null;
        selectedMeaning = null;
        userMatches = [];

        // Shuffle words
        const shuffledWords = [...currentTopic.words].sort(() => Math.random() - 0.5);
        const shuffledMeanings = [...currentTopic.words].sort(() => Math.random() - 0.5);

        // Create word items
        shuffledWords.forEach((wordObj, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = wordObj.word;
            wordItem.dataset.word = wordObj.word;
            wordItem.onclick = () => selectWord(wordItem, wordObj.word);
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

        if (document.getElementById('resultMessage')) {
            document.getElementById('resultMessage').innerHTML = '';
        }
    }

    function selectWord(wordElement, word) {
        document.querySelectorAll('.word-item').forEach(item => {
            item.classList.remove('selected');
        });

        wordElement.classList.add('selected');
        selectedWord = word;
        checkForMatch();
    }

    function selectMeaning(meaningElement, meaning) {
        document.querySelectorAll('.meaning-item').forEach(item => {
            item.classList.remove('selected');
        });

        meaningElement.classList.add('selected');
        selectedMeaning = meaning;
        checkForMatch();
    }

    function checkForMatch() {
        if (selectedWord && selectedMeaning) {
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

                updateConnectionsDisplay();
                selectedWord = null;
                selectedMeaning = null;

                // Check if all matches are done
                if (userMatches.length === currentTopic.words.length) {
                    if (document.getElementById('resultMessage')) {
                        document.getElementById('resultMessage').innerHTML =
                            '<div class="result-message result-success">Chúc mừng! Bạn đã nối đúng tất cả! 🎉</div>';
                    }

                    // Mark study complete
                    if (window.markStudyComplete && currentTopic) {
                        window.markStudyComplete(userMatches.length, currentTopic.id);
                    }

                    // Save progress to unlock pronunciation tab
                    if (window.saveTopicProgress && currentTopic) {
                        window.saveTopicProgress(currentTopic.id, { matchingCompleted: true });

                        // Show unlock notification
                        setTimeout(() => {
                            alert('🎉 Chúc mừng! Bạn đã mở khóa phần Luyện phát âm!');
                            if (window.updateTabsUI) {
                                window.updateTabsUI();
                            }
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
        if (!connectionsDisplay) return;

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

    window.resetGame = function () {
        window.initWordMatchingGame();
    }

})();
