// ==========================================
// 1. STATE VARIABLES 
// ==========================================

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let elements = {}; // We will populate this safely after the DOM loads

const POINTS_PER_QUESTION = 20;

// ==========================================
// 2. BULLETPROOF INITIALIZATION
// ==========================================

// This checks if the HTML is already loaded. If it is, it runs the app immediately. 
// If not, it waits. This solves the GitHub Pages race condition.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeElementsAndApp);
} else {
    initializeElementsAndApp();
}

function initializeElementsAndApp() {
    // We grab the elements ONLY when we are 100% sure the HTML exists
    elements = {
        themeToggle: document.getElementById('theme-toggle'),
        streakCounter: document.getElementById('streak-counter'),
        scoreCounter: document.getElementById('score-counter'),
        playerRank: document.getElementById('player-rank'),
        questBoard: document.getElementById('quest-board'),
        categoryBadge: document.getElementById('category-badge'),
        typeBadge: document.getElementById('question-type-badge'),
        questionText: document.getElementById('question-text'),
        exhibitsContainer: document.getElementById('exhibits-container'),
        interactiveContainer: document.getElementById('interactive-container'),
        explanationBox: document.getElementById('explanation-box'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackText: document.getElementById('feedback-text'),
        actionBtn: document.getElementById('action-btn'),
        progressBar: document.getElementById('progress-bar')
    };

    initApp();
}

async function initApp() {
    // The entire startup sequence is now wrapped in a try/catch block
    // If ANYTHING fails, it will update the text on the screen so you know why.
    try {
        loadPlayerData();
        setupEventListeners();
        
        // Added './' to ensure GitHub Pages looks in the exact right directory
        const response = await fetch('./questions.json');
        
        // Check if GitHub returned a 404 page instead of the file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.questions) {
            throw new Error("JSON parsed, but no questions array was found.");
        }

        questions = data.questions;
        renderQuestion();

    } catch (error) {
        elements.questionText.innerText = `Error: The spell failed. ${error.message}. Check your questions.json file!`;
        console.error("Initialization Error:", error);
    }
}

// ==========================================
// 3. SAFE GAMIFICATION & LOCAL STORAGE
// ==========================================

function loadPlayerData() {
    try {
        const savedScore = localStorage.getItem('farQuestScore');
        if (savedScore) score = parseInt(savedScore);
        
        let streak = parseInt(localStorage.getItem('farQuestStreak') || '0');
        const lastPlayed = localStorage.getItem('farQuestLastPlayed');
        const today = new Date().toDateString();

        if (lastPlayed !== today) {
            if (lastPlayed === new Date(Date.now() - 86400000).toDateString()) {
                streak++; 
            } else if (lastPlayed) {
                streak = 1; 
            } else {
                streak = 1; 
            }
            localStorage.setItem('farQuestStreak', streak);
            localStorage.setItem('farQuestLastPlayed', today);
        }
        
        elements.streakCounter.innerText = `🔮 Streak: ${streak}`;
    } catch (e) {
        // If the browser blocks storage, we catch it silently so the app still runs!
        console.warn("Local storage is restricted.", e);
        elements.streakCounter.innerText = `🔮 Streak: 0`;
    }
    
    updateScoreDisplay();
}

function updateScoreDisplay() {
    elements.scoreCounter.innerText = `👑 Gold: ${score}`;
    
    try {
        localStorage.setItem('farQuestScore', score);
    } catch(e) { /* ignore security blocks */ }

    let rank = "🧟‍♂️ Zombie of the Ledger";
    if (score > 50) rank = "🧝‍♂️ Elven Bookkeeper";
    if (score > 150) rank = "🧚‍♀️ Fairy of Financials";
    if (score > 300) rank = "🧞‍♂️ Djinn of Depreciation";
    if (score >= 500) rank = "🧙‍♂️ Grand Wizard of GAAP";
    
    elements.playerRank.innerText = rank;
}

// ==========================================
// 4. RENDERING THE UI
// ==========================================

function renderQuestion() {
    selectedAnswer = null;
    elements.actionBtn.innerText = "Cast Answer ⚡";
    elements.actionBtn.disabled = true;
    elements.actionBtn.onclick = handleSubmission;
    elements.explanationBox.className = "hidden";
    elements.exhibitsContainer.className = "hidden";
    elements.exhibitsContainer.innerHTML = '';
    elements.interactiveContainer.innerHTML = '';
    elements.questBoard.classList.remove('shake');

    const q = questions[currentQuestionIndex];

    elements.categoryBadge.innerText = q.topic;
    elements.typeBadge.innerText = q.type;
    elements.questionText.innerText = q.question_text;
    elements.progressBar.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;

    if (q.type === 'MCQ') {
        renderMCQ(q);
    } else if (q.type === 'TBS') {
        renderTBS(q);
    }
}

function renderMCQ(q) {
    q.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'mcq-option';
        btn.innerText = option;
        btn.onclick = () => selectMCQ(btn, option);
        elements.interactiveContainer.appendChild(btn);
    });
}

function renderTBS(q) {
    if (q.exhibits && q.exhibits.length > 0) {
        elements.exhibitsContainer.classList.remove('hidden');
        q.exhibits.forEach(exhibit => {
            const div = document.createElement('div');
            div.className = 'exhibit-item';
            div.innerHTML = `<h4>📑 ${exhibit.title}</h4><p>${exhibit.content}</p>`;
            elements.exhibitsContainer.appendChild(div);
        });
    }

    const task = q.tasks[0]; 
    const inputGroup = document.createElement('div');
    inputGroup.className = 'tbs-input-group';
    
    const label = document.createElement('label');
    label.innerText = task.prompt;
    label.style.fontWeight = "bold";
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tbs-input';
    input.placeholder = "Enter your calculation here...";
    input.oninput = (e) => {
        selectedAnswer = e.target.value.trim();
        elements.actionBtn.disabled = selectedAnswer === "";
    };

    inputGroup.appendChild(label);
    inputGroup.appendChild(input);
    elements.interactiveContainer.appendChild(inputGroup);
}

// ==========================================
// 5. INTERACTION LOGIC
// ==========================================

function selectMCQ(selectedBtn, optionValue) {
    const allBtns = elements.interactiveContainer.querySelectorAll('.mcq-option');
    allBtns.forEach(btn => btn.classList.remove('selected'));
    selectedBtn.classList.add('selected');

    selectedAnswer = optionValue;
    elements.actionBtn.disabled = false;
}

function handleSubmission() {
    const q = questions[currentQuestionIndex];
    let isCorrect = false;
    let feedbackText = "";

    const inputs = elements.interactiveContainer.querySelectorAll('button, input');
    inputs.forEach(input => input.disabled = true);

    if (q.type === 'MCQ') {
        isCorrect = (selectedAnswer === q.correct_answer);
        feedbackText = q.explanations[selectedAnswer] || "No explanation available.";
        
        const allBtns = elements.interactiveContainer.querySelectorAll('.mcq-option');
        allBtns.forEach(btn => {
            if (btn.innerText === q.correct_answer) btn.classList.add('btn-correct');
            if (btn.innerText === selectedAnswer && !isCorrect) btn.classList.add('btn-incorrect');
        });

    } else if (q.type === 'TBS') {
        const task = q.tasks[0];
        isCorrect = (selectedAnswer.toLowerCase() === task.correct_answer.toLowerCase());
        feedbackText = isCorrect ? task.explanations.correct : task.explanations.incorrect;
        
        const inputField = elements.interactiveContainer.querySelector('input');
        if (isCorrect) inputField.classList.add('btn-correct');
        else inputField.classList.add('btn-incorrect');
    }

    elements.explanationBox.classList.remove('hidden');
    elements.explanationBox.className = isCorrect ? 'correct-feedback' : 'incorrect-feedback';
    elements.feedbackTitle.innerText = isCorrect ? '✨ Correct!' : '🛑 Incorrect';
    elements.feedbackText.innerText = feedbackText;

    if (isCorrect) {
        score += POINTS_PER_QUESTION;
        updateScoreDisplay();
        triggerConfetti();
    } else {
        elements.questBoard.classList.add('shake');
        setTimeout(() => elements.questBoard.classList.remove('shake'), 400); 
    }

    elements.actionBtn.innerText = "Next Encounter ➡️";
    elements.actionBtn.disabled = false;
    elements.actionBtn.onclick = goToNextQuestion;
}

function goToNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        renderQuestion();
    } else {
        showCompletionScreen();
    }
}

function showCompletionScreen() {
    elements.progressBar.style.width = "100%";
    elements.categoryBadge.className = "hidden";
    elements.typeBadge.className = "hidden";
    elements.exhibitsContainer.className = "hidden";
    elements.interactiveContainer.innerHTML = '';
    elements.explanationBox.className = "hidden";
    elements.actionBtn.className = "hidden";

    elements.questionText.innerHTML = `
        🎉 <strong>Quest Complete!</strong><br><br>
        You have studied the scrolls and braved the simulations.<br>
        Your total gold: <strong>${score}</strong>
    `;
    
    if (typeof confetti === 'function') {
        var duration = 3 * 1000;
        var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
}

// ==========================================
// 6. UTILITIES
// ==========================================

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('fantasy-theme');
    });
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
    }
}