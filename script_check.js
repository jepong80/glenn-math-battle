
    const $ = (id) => document.getElementById(id);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let audioContext = null;

    const el = {
      intro: $("intro"),
      comboBanner: $("comboBanner"),
      settingsBtn: $("settingsBtn"),
      startBtn: $("startBtn"),
      settingsModal: $("settingsModal"),
      closeSettings: $("closeSettings"),
      saveSettings: $("saveSettings"),
      resetScores: $("resetScores"),
      difficulty: $("difficulty"),
      gameTime: $("gameTime"),
      sound: $("sound"),
      autoNext: $("autoNext"),
      avatar: $("avatar"),
      characterName: $("characterName"),
      characterPower: $("characterPower"),
      energyText: $("energyText"),
      energyFill: $("energyFill"),
      accuracyText: $("accuracyText"),
      accuracyFill: $("accuracyFill"),
      comboText: $("comboText"),
      comboFill: $("comboFill"),
      difficultyText: $("difficultyText"),
      time: $("time"),
      score: $("score"),
      streak: $("streak"),
      best: $("best"),
      mode: $("mode"),
      gameScreen: $("gameScreen"),
      floatScore: $("floatScore"),
      roundLabel: $("roundLabel"),
      question: $("question"),
      answer: $("answer"),
      choices: $("choices"),
      attackBtn: $("attackBtn"),
      pauseBtn: $("pauseBtn"),
      resetBtn: $("resetBtn"),
      message: $("message"),
      rankBadge: $("rankBadge"),
      rankName: $("rankName"),
      status: $("status"),
      comment: $("comment"),
      lastScore: $("lastScore"),
      averageScore: $("averageScore"),
      lowScore: $("lowScore"),
      totalGames: $("totalGames"),
      history: $("history")
    };

    const characters = {
      Guardian: {
        icon: "🛡️",
        text: "A steady character for players who want a balanced game."
      },
      Assassin: {
        icon: "🗡️",
        text: "A fast character for players who want bigger combo points."
      },
      Mage: {
        icon: "🔮",
        text: "A smart character for players who want extra battle energy."
      }
    };

    const levels = {
      Easy: { maxAdd: 15, maxMultiply: 8, base: 1, penalty: 0 },
      Normal: { maxAdd: 25, maxMultiply: 12, base: 2, penalty: 1 },
      Hard: { maxAdd: 50, maxMultiply: 15, base: 3, penalty: 2 }
    };

    let settings = JSON.parse(localStorage.getItem("glennMathSettings")) || {
      difficulty: "Normal",
      time: 30,
      operators: ["+", "-", "×"],
      sound: true,
      autoNext: true,
      character: "Guardian"
    };

    let records = JSON.parse(localStorage.getItem("glennMathRecords")) || {
      best: 0,
      scores: []
    };

    let game = {
      answer: 0,
      score: 0,
      streak: 0,
      correct: 0,
      attempts: 0,
      timeLeft: settings.time,
      energy: 0,
      round: 0,
      playing: false,
      paused: false,
      timer: null
    };

    function saveSettingsData() {
      localStorage.setItem("glennMathSettings", JSON.stringify(settings));
    }

    function saveRecords() {
      localStorage.setItem("glennMathRecords", JSON.stringify(records));
    }

    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function setMessage(text, type) {
      el.message.textContent = text;
      el.message.className = `message ${type}`;
    }

    function animateClass(element, className) {
      if (!element || prefersReducedMotion) return;
      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);
    }

    function bumpStat(element) {
      const box = element?.closest(".stat");
      animateClass(box, "bump");
    }

    function getAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    }

    function beep(type) {
      if (!settings.sound) return;
      try {
        const audio = getAudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = type === "good" ? 720 : 180;
        osc.type = type === "good" ? "triangle" : "sawtooth";
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
        osc.start();
        osc.stop(audio.currentTime + 0.13);
      } catch (error) {
        console.log("Sound not available");
      }
    }

    function accuracy() {
      if (game.attempts === 0) return 0;
      return Math.round((game.correct / game.attempts) * 100);
    }

    function averageScore() {
      if (records.scores.length === 0) return 0;
      const total = records.scores.reduce((sum, item) => sum + item.score, 0);
      return Math.round(total / records.scores.length);
    }

    function lowScore() {
      if (records.scores.length === 0) return 0;
      return Math.min(...records.scores.map((item) => item.score));
    }

    function rating(score) {
      const average = averageScore();

      if (score === 0) {
        return {
          label: "Needs Practice",
          badge: "🪨",
          rank: "Rookie",
          comment: "Keep practicing. Try Easy mode first and answer carefully."
        };
      }

      if (records.best > 0 && score >= records.best) {
        return {
          label: "Best Score",
          badge: "👑",
          rank: "Math Champion",
          comment: "Great job! This is your best game so far."
        };
      }

      if (average > 0 && score >= average) {
        return {
          label: "Good Score",
          badge: "⚔️",
          rank: "Fast Solver",
          comment: "Good work! Your score is close to your usual result."
        };
      }

      return {
        label: "Needs Practice",
        badge: "🛡️",
        rank: "Training Player",
        comment: "Not bad. Try to build a streak and avoid wrong answers."
      };
    }

    function updateCharacter(name) {
      settings.character = name;
      el.avatar.textContent = characters[name].icon;
      el.characterName.textContent = name;
      el.characterPower.textContent = characters[name].text;

      document.querySelectorAll(".character-option").forEach((button) => {
        button.classList.toggle("active", button.dataset.character === name);
      });

      saveSettingsData();
    }

    function updateBars() {
      const acc = accuracy();
      const energy = Math.min(game.energy, 100);
      const combo = Math.min(game.streak * 10, 100);

      el.energyText.textContent = `${energy}%`;
      el.energyFill.style.width = `${energy}%`;
      el.accuracyText.textContent = `${acc}%`;
      el.accuracyFill.style.width = `${acc}%`;
      el.comboText.textContent = `${game.streak}x`;
      el.comboFill.style.width = `${combo}%`;
    }

    function updateHud() {
      el.time.textContent = game.timeLeft;
      el.score.textContent = game.score;
      el.streak.textContent = game.streak;
      el.best.textContent = records.best;
      el.mode.textContent = settings.difficulty;
      el.difficultyText.textContent = `${settings.difficulty} Mode`;
      el.time.closest(".stat").classList.toggle("timer-danger", game.playing && game.timeLeft <= 10);
      updateBars();
    }

    function updateBoard(last = records.scores[0]?.score || 0) {
      const info = rating(last);

      el.rankBadge.textContent = info.badge;
      el.rankName.textContent = info.rank;
      el.status.textContent = info.label;
      el.comment.textContent = info.comment;
      el.lastScore.textContent = last;
      el.averageScore.textContent = averageScore();
      el.lowScore.textContent = lowScore();
      el.totalGames.textContent = records.scores.length;
      el.best.textContent = records.best;

      if (records.scores.length === 0) {
        el.history.innerHTML = `<p class="empty">Your latest game results will appear here.</p>`;
        return;
      }

      el.history.innerHTML = records.scores.slice(0, 5).map((item, index) => {
        return `<div class="score-item"><span>#${index + 1} ${item.mode}</span><strong>${item.score} pts</strong></div>`;
      }).join("");
    }

    function shuffle(list) {
      return list
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((item) => item.value);
    }

    function renderChoices() {
      const spread = settings.difficulty === "Hard" ? 15 : settings.difficulty === "Normal" ? 10 : 6;
      const choices = new Set([game.answer]);

      while (choices.size < 4) {
        const direction = Math.random() < 0.5 ? -1 : 1;
        const value = Math.max(0, game.answer + direction * rand(1, spread));
        choices.add(value);
      }

      el.choices.innerHTML = shuffle([...choices]).map((choice) => {
        return `<button class="choice-btn" type="button" data-choice="${choice}">${choice}</button>`;
      }).join("");
    }

    function makeQuestion() {
      const rules = levels[settings.difficulty];
      const ops = settings.operators.length ? settings.operators : ["+", "-", "×"];
      const op = ops[rand(0, ops.length - 1)];
      let a, b;

      if (op === "+") {
        a = rand(1, rules.maxAdd);
        b = rand(1, rules.maxAdd);
        game.answer = a + b;
      }

      if (op === "-") {
        a = rand(1, rules.maxAdd);
        b = rand(1, rules.maxAdd);
        if (b > a) [a, b] = [b, a];
        game.answer = a - b;
      }

      if (op === "×") {
        a = rand(1, rules.maxMultiply);
        b = rand(1, rules.maxMultiply);
        game.answer = a * b;
      }

      if (op === "÷") {
        b = rand(1, rules.maxMultiply);
        game.answer = rand(1, rules.maxMultiply);
        a = b * game.answer;
      }

      game.round++;
      el.roundLabel.textContent = `Round ${game.round} • ${settings.character}`;
      el.question.textContent = `${a} ${op} ${b}`;
      el.answer.value = "";
      renderChoices();
      animateClass(el.question, "question-pop");
      el.answer.focus();
    }

    function points() {
      const rules = levels[settings.difficulty];
      let score = rules.base;

      if (game.streak >= 3) score += 1;
      if (game.streak >= 5) score += 2;
      if (settings.character === "Assassin" && game.streak >= 3) score += 1;
      if (game.energy >= 100) score += 3;

      return score;
    }

    function floatText(text, type) {
      el.floatScore.textContent = text;
      el.floatScore.style.color = type === "good" ? "var(--green)" : "var(--red)";
      el.floatScore.classList.remove("show");
      void el.floatScore.offsetWidth;
      el.floatScore.classList.add("show");
    }

    function flash(type) {
      el.gameScreen.classList.remove("flash-good", "flash-bad");
      void el.gameScreen.offsetWidth;
      el.gameScreen.classList.add(type === "good" ? "flash-good" : "flash-bad");
    }

    function showComboBanner() {
      if (game.streak < 3) return;
      el.comboBanner.textContent = `Combo ${game.streak}x! Keep going!`;
      animateClass(el.comboBanner, "show");
    }

    function submitAnswer() {
      if (!game.playing || game.paused) return;

      if (el.answer.value.trim() === "") {
        setMessage("Type your answer first.", "bad");
        return;
      }

      const userAnswer = Number(el.answer.value);
      game.attempts++;

      if (userAnswer === game.answer) {
        game.correct++;
        game.streak++;
        game.energy = Math.min(100, game.energy + (settings.character === "Mage" ? 18 : 12));
        const add = points();
        game.score += add;
        setMessage(`Correct! +${add} points. Combo ${game.streak}x!`, "good");
        floatText(`+${add}`, "good");
        bumpStat(el.score);
        bumpStat(el.streak);
        showComboBanner();
        beep("good");
        flash("good");
      } else {
        const penalty = levels[settings.difficulty].penalty;
        game.score = Math.max(0, game.score - penalty);
        game.streak = 0;
        game.energy = Math.max(0, game.energy - 10);
        setMessage(`Wrong. The answer was ${game.answer}. ${penalty ? `-${penalty} point.` : "No penalty."}`, "bad");
        floatText(penalty ? `-${penalty}` : "Miss", "bad");
        bumpStat(el.score);
        bumpStat(el.streak);
        beep("bad");
        flash("bad");
      }

      updateHud();
      if (settings.autoNext) makeQuestion();
      else el.answer.value = "";
    }

    function startGame() {
      clearInterval(game.timer);
      game = {
        answer: 0,
        score: 0,
        streak: 0,
        correct: 0,
        attempts: 0,
        timeLeft: settings.time,
        energy: 0,
        round: 0,
        playing: true,
        paused: false,
        timer: null
      };

      el.answer.disabled = false;
      el.attackBtn.disabled = false;
      el.pauseBtn.disabled = false;
      el.startBtn.disabled = true;
      el.pauseBtn.textContent = "Pause";
      el.gameScreen.classList.add("active-round");
      setMessage("Game started. Solve fast and build your combo!", "info");
      updateHud();
      makeQuestion();

      game.timer = setInterval(() => {
        if (game.paused) return;
        game.timeLeft--;
        updateHud();
        if (game.timeLeft <= 0) endGame();
      }, 1000);
    }

    function pauseGame() {
      if (!game.playing) return;
      game.paused = !game.paused;
      el.pauseBtn.textContent = game.paused ? "Resume" : "Pause";
      el.answer.disabled = game.paused;
      el.attackBtn.disabled = game.paused;
      setMessage(game.paused ? "Game paused." : "Game resumed. Keep going!", game.paused ? "info" : "gold");
      if (!game.paused) el.answer.focus();
    }

    function endGame() {
      clearInterval(game.timer);
      game.playing = false;
      game.paused = false;

      el.answer.disabled = true;
      el.attackBtn.disabled = true;
      el.pauseBtn.disabled = true;
      el.startBtn.disabled = false;
      el.question.textContent = "Game Result";
      el.roundLabel.textContent = "Game Complete";
      el.gameScreen.classList.remove("active-round");
      el.choices.innerHTML = "";

      const finalScore = game.score;
      const newBest = finalScore > records.best;
      records.best = Math.max(records.best, finalScore);
      records.scores.unshift({
        score: finalScore,
        mode: settings.difficulty,
        character: settings.character,
        accuracy: accuracy(),
        date: new Date().toLocaleDateString()
      });
      records.scores = records.scores.slice(0, 20);
      saveRecords();

      const info = rating(finalScore);
      if (newBest) setMessage(`New best score! ${finalScore} points • ${accuracy()}% accuracy • ${info.rank}`, "gold");
      else setMessage(`${info.label}: ${finalScore} points • ${accuracy()}% accuracy • ${info.rank}`, info.label === "Needs Practice" ? "bad" : "info");

      updateHud();
      updateBoard(finalScore);
      animateClass(el.rankBadge, "rank-pop");
    }

    function resetGame() {
      clearInterval(game.timer);
      game.playing = false;
      game.paused = false;
      game.score = 0;
      game.streak = 0;
      game.correct = 0;
      game.attempts = 0;
      game.energy = 0;
      game.round = 0;
      game.timeLeft = settings.time;
      el.answer.value = "";
      el.answer.disabled = true;
      el.attackBtn.disabled = true;
      el.pauseBtn.disabled = true;
      el.startBtn.disabled = false;
      el.pauseBtn.textContent = "Pause";
      el.question.textContent = "Press Start";
      el.roundLabel.textContent = "Get Ready";
      el.gameScreen.classList.remove("active-round");
      el.choices.innerHTML = "";
      setMessage("Game reset. Start again when ready.", "info");
      updateHud();
    }

    function openSettings() {
      el.settingsModal.classList.add("open");
    }

    function closeSettingsModal() {
      el.settingsModal.classList.remove("open");
    }

    function applySettings() {
      el.difficulty.value = settings.difficulty;
      el.gameTime.value = String(settings.time);
      el.sound.checked = settings.sound;
      el.autoNext.checked = settings.autoNext;

      document.querySelectorAll('.chip input[value]').forEach((box) => {
        box.checked = settings.operators.includes(box.value);
      });

      updateCharacter(settings.character);
      game.timeLeft = settings.time;
      updateHud();
      updateBoard();
    }

    function saveSettingsFromModal() {
      const selected = [...document.querySelectorAll('.chip input[value]:checked')].map((box) => box.value);
      settings.difficulty = el.difficulty.value;
      settings.time = Number(el.gameTime.value);
      settings.operators = selected.length ? selected : ["+", "-", "×"];
      settings.sound = el.sound.checked;
      settings.autoNext = el.autoNext.checked;
      saveSettingsData();
      resetGame();
      closeSettingsModal();
      setMessage("Settings saved. Start a new game with your chosen setup.", "gold");
    }

    function resetAllScores() {
      records = { best: 0, scores: [] };
      saveRecords();
      updateBoard(0);
      updateHud();
      setMessage("Scores reset. You can start a new score record.", "info");
    }

    document.querySelectorAll(".character-option").forEach((button) => {
      button.addEventListener("click", () => {
        if (game.playing) {
          setMessage("You cannot switch characters while playing.", "bad");
          return;
        }
        updateCharacter(button.dataset.character);
        setMessage(`${button.dataset.character} selected.`, "gold");
      });
    });

    el.startBtn.addEventListener("click", startGame);
    el.attackBtn.addEventListener("click", submitAnswer);
    el.pauseBtn.addEventListener("click", pauseGame);
    el.resetBtn.addEventListener("click", resetGame);
    el.settingsBtn.addEventListener("click", openSettings);
    el.closeSettings.addEventListener("click", closeSettingsModal);
    el.saveSettings.addEventListener("click", saveSettingsFromModal);
    el.resetScores.addEventListener("click", resetAllScores);
    el.answer.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submitAnswer();
    });

    el.choices.addEventListener("click", (event) => {
      const button = event.target.closest(".choice-btn");
      if (!button || !game.playing || game.paused) return;
      el.answer.value = button.dataset.choice;
      submitAnswer();
    });

    el.settingsModal.addEventListener("click", (event) => {
      if (event.target === el.settingsModal) closeSettingsModal();
    });

    window.addEventListener("load", () => {
      document.body.classList.add("loaded");
      setTimeout(() => el.intro.classList.add("hide"), prefersReducedMotion ? 50 : 550);
    });

    applySettings();
  