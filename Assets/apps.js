// ==========================================
// 1. STATE VARIABLES & DOM ELEMENTS
// ==========================================

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;

// Gamification State
const POINTS_PER_QUESTION = 20; // High points make ranking up feel faster!

// DOM Elements
const elements = {
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

// ==========================================
// 2. INITIALIZATION & DATA FETCHING
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    loadPlayerData();
    setupEventListeners();
    
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        questions = data.questions;
        renderQuestion();
    } catch (error) {
        elements.questionText.innerText = "Error loading scrolls. Please check your connection to the realm.";
        console.error("Failed to load JSON:", error);
    }
}

// ==========================================
// 3. GAMIFICATION & LOCAL STORAGE
// ==========================================

function loadPlayerData() {
    // Load Score
    const savedScore = localStorage.getItem('farQuestScore');
    if (savedScore) score = parseInt(savedScore);
    updateScoreDisplay();

    // Streak Logic
    let streak = parseInt(localStorage.getItem('farQuestStreak') || '0');
    const lastPlayed = localStorage.getItem('farQuestLastPlayed');
    const today = new Date().toDateString();

    if (lastPlayed !== today) {
        if (lastPlayed === new Date(Date.now() - 86400000).toDateString()) {
            streak++; // Played yesterday, increment
        } else if (lastPlayed) {
            streak = 1; // Missed a day, reset to 1
        } else {
            streak = 1; // First time playing
        }
        localStorage.setItem('farQuestStreak', streak);
        localStorage.setItem('farQuestLastPlayed', today);
    }
    
    elements.streakCounter.innerText = `🔮 Streak: ${streak}`;
}

function updateScoreDisplay() {
    elements.scoreCounter.innerText = `👑 Gold: ${score}`;
    localStorage.setItem('farQuestScore', score);

    // Rank Thresholds
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
    // Reset State
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

    // Update Headers & Progress
    elements.categoryBadge.innerText = q.topic;
    elements.typeBadge.innerText = q.type;
    elements.questionText.innerText = q.question_text;
    elements.progressBar.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;

    // Render based on Type
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
    // Show Exhibits
    if (q.exhibits && q.exhibits.length > 0) {
        elements.exhibitsContainer.classList.remove('hidden');
        q.exhibits.forEach(exhibit => {
            const div = document.createElement('div');
            div.className = 'exhibit-item';
            div.innerHTML = `<h4>📑 ${exhibit.title}</h4><p>${exhibit.content}</p>`;
            elements.exhibitsContainer.appendChild(div);
        });
    }

    // Render Input Task
    const task = q.tasks[0]; // For MVP, assuming 1 task per TBS
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
    // Visually deselect all, select current
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

    // Lock inputs
    const inputs = elements.interactiveContainer.querySelectorAll('button, input');
    inputs.forEach(input => input.disabled = true);

    // Evaluate Answer
    if (q.type === 'MCQ') {
        isCorrect = (selectedAnswer === q.correct_answer);
        feedbackText = q.explanations[selectedAnswer] || "No explanation available.";
        
        // Highlight right/wrong buttons
        const allBtns = elements.interactiveContainer.querySelectorAll('.mcq-option');
        allBtns.forEach(btn => {
            if (btn.innerText === q.correct_answer) btn.classList.add('btn-correct');
            if (btn.innerText === selectedAnswer && !isCorrect) btn.classList.add('btn-incorrect');
        });

    } else if (q.type === 'TBS') {
        const task = q.tasks[0];
        // Note: Simple string match for MVP. In reality, you'd want looser number parsing.
        isCorrect = (selectedAnswer.toLowerCase() === task.correct_answer.toLowerCase());
        feedbackText = isCorrect ? task.explanations.correct : task.explanations.incorrect;
        
        const inputField = elements.interactiveContainer.querySelector('input');
        if (isCorrect) inputField.classList.add('btn-correct');
        else inputField.classList.add('btn-incorrect');
    }

    // Trigger Feedback & Gamification
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
        // Remove class after animation ends so it can shake again later
        setTimeout(() => elements.questBoard.classList.remove('shake'), 400); 
    }

    // Change button to next
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
    
    // Mega Confetti Blast
    var duration = 3 * 1000;
    var end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
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
    // Only fires if the library is loaded from the CDN in index.html
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#f59e0b', '#d97706'] // Gold colors
        });
    }
}