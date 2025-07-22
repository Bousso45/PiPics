document.addEventListener("DOMContentLoaded", function () {

  let isMuted = localStorage.getItem("pipics_muted") === "true";
  let currentLevel = 0;
  let coins = 314;
  let filledLetters = [];
  let correctAnswer = "";
  let maxLetters = 0;
  let letterSources = [];
  let selectedDifficulty = "easy";
  let levelsData = {};
  const praiseWords = ["Awesome!", "Fantastic!", "Great Job!", "Very Good!", "Well Done!"];

  // Pi Network variables
  let piUser = null;
  let piAuth = null;
  let piPaymentInProgress = false;

  const coinDisplay = document.getElementById("coin-count");
  const levelDisplay = document.getElementById("level-number");
  const answerContainer = document.getElementById("answer-boxes");

  const successSound = document.getElementById("success-sound");
  const errorSound = document.getElementById("error-sound");
  const transitionSound = document.getElementById("transition-sound");
  const tapSound = document.getElementById("tap-sound");
  const removeSound = document.getElementById("remove-sound");
  const hintSound = document.getElementById("hint-sound");
  const deleteSound = document.getElementById("delete-sound");
  const selectSound = document.getElementById("select-sound");

  // Initialize Pi Network SDK
  function initializePiNetwork() {
    Pi.init({ version: "2.0", sandbox: false }).then(() => {
      console.log("Pi SDK initialized");

      // Check if user is already authenticated
      const storedAuth = localStorage.getItem('pi_auth');
      if (storedAuth) {
        try {
          piAuth = JSON.parse(storedAuth);
          piUser = piAuth.user;
          updatePiUserUI();
        } catch (e) {
          console.error("Failed to parse stored auth", e);
        }
      }
    }).catch(error => {
      console.error("Pi SDK initialization failed", error);
    });
  }

  // Update UI with Pi user info
  function updatePiUserUI() {
    if (piUser) {
      document.getElementById('pi-auth-button').style.display = 'none';
      document.getElementById('pi-user-info').style.display = 'flex';
      document.getElementById('pi-username').textContent = piUser.username;
      document.getElementById('pi-user-avatar').src = piUser.avatar;
      document.getElementById('game-pi-user').style.display = 'flex';
      document.getElementById('game-user-avatar').src = piUser.avatar;

      // Load user progress from localStorage or Pi server
      loadUserProgress();
    } else {
      document.getElementById('pi-auth-button').style.display = 'flex';
      document.getElementById('pi-user-info').style.display = 'none';
      document.getElementById('game-pi-user').style.display = 'none';
    }
  }

  // Handle Pi authentication
  function authenticateWithPi() {
    Pi.authenticate(['username', 'payments', 'wallet_address'], function(auth) {
      console.log('Pi Auth successful', auth);
      piAuth = auth;
      piUser = auth.user;
      localStorage.setItem('pi_auth', JSON.stringify(auth));
      updatePiUserUI();

      // Send auth data to your backend if needed
      // sendAuthToBackend(auth);

    }, function(error) {
      console.error('Pi Auth error', error);
      alert('Pi Network authentication failed: ' + error.message);
    });
  }

  // Load user progress from localStorage
  function loadUserProgress() {
    if (!piUser) return;

    const userKey = `pipics_${piUser.uid}`;
    const savedProgress = localStorage.getItem(userKey);

    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        coins = progress.coins || coins;
        currentLevel = progress.currentLevel || currentLevel;
        selectedDifficulty = progress.selectedDifficulty || selectedDifficulty;
        coinDisplay.textContent = Math.floor(coins);
      } catch (e) {
        console.error("Failed to parse saved progress", e);
      }
    }
  }

  // Save user progress to localStorage
  function saveUserProgress() {
    if (!piUser) return;

    const userKey = `pipics_${piUser.uid}`;
    const progress = {
      coins,
      currentLevel,
      selectedDifficulty
    };

    localStorage.setItem(userKey, JSON.stringify(progress));
  }

  // Process Pi payment for in-game purchases
  function processPiPayment(amount, description, callback) {
    if (piPaymentInProgress) {
      alert("Please wait for the current payment to complete");
      return;
    }

    if (!piAuth) {
      alert("Please sign in with Pi first");
      return;
    }

    piPaymentInProgress = true;

    const paymentData = {
      amount: amount,
      memo: description,
      metadata: { 
        game: "PiPics",
        action: description.toLowerCase().replace(/ /g, "_")
      }
    };

    Pi.createPayment(paymentData, {
      onReadyForServerApproval: function(paymentId) {
        console.log("Ready for server approval", paymentId);
        // Here you would typically send paymentId to your backend for approval
        // For demo purposes, we'll simulate approval
        setTimeout(() => {
          Pi.approvePayment(paymentId, { onDone: callback });
        }, 1000);
      },
      onReadyForServerCompletion: function(paymentId, txid) {
        console.log("Ready for server completion", paymentId, txid);
        // Here you would typically send paymentId and txid to your backend
        // For demo purposes, we'll simulate completion
        setTimeout(() => {
          Pi.completePayment(paymentId, txid, {
            onDone: function() {
              console.log("Payment completed");
              piPaymentInProgress = false;
            },
            onCancel: function() {
              console.log("Payment cancelled");
              piPaymentInProgress = false;
            }
          });
        }, 1000);
      },
      onCancel: function() {
        console.log("Payment cancelled by user");
        piPaymentInProgress = false;
      },
      onError: function(error, payment) {
        console.error("Payment error", error, payment);
        alert("Payment failed: " + error.message);
        piPaymentInProgress = false;
      }
    });
  }

  // Set sound icon on load
  const soundToggleBtn = document.getElementById("sound-toggle");
  if (soundToggleBtn) {
    soundToggleBtn.textContent = isMuted ? "🔇" : "🔊";
    soundToggleBtn.addEventListener("click", () => {
      isMuted = !isMuted;
      soundToggleBtn.textContent = isMuted ? "🔇" : "🔊";
      localStorage.setItem("pipics_muted", isMuted);
    });
  }

  // Initialize Pi Network
  initializePiNetwork();

  // Set up Pi auth button
  document.getElementById('pi-auth-button')?.addEventListener('click', authenticateWithPi);

  fetch("levels.json")
    .then(res => res.json())
    .then(data => {
      levelsData = data;
      initDifficultyButtons();
    });

  function initDifficultyButtons() {
    document.querySelectorAll(".difficulty-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectedDifficulty = button.dataset.mode;
        const savedLevel = localStorage.getItem("level_" + selectedDifficulty);
        currentLevel = savedLevel ? parseInt(savedLevel) : 0;
        coins = 314;
        coinDisplay.textContent = Math.floor(coins);
        document.getElementById("difficulty-screen").classList.remove("active");
        document.getElementById("game-screen").classList.add("active");
        if (!isMuted) {
          selectSound.currentTime = 0;
          selectSound.play();
          transitionSound.play();
        }
        loadLevel();
      });
    });
  }

  function loadLevel() {
    const levelSet = levelsData[selectedDifficulty];
    if (!levelSet) {
      alert("Levels not loaded for: " + selectedDifficulty);
      return;
    }

    const level = levelSet[currentLevel % levelSet.length];
    correctAnswer = level.answer;
    maxLetters = correctAnswer.length;
    filledLetters = new Array(maxLetters).fill("");
    letterSources = new Array(maxLetters).fill(null);
    levelDisplay.textContent = currentLevel + 1;

    const imageGrid = document.querySelector(".image-grid");
    imageGrid.innerHTML = "";
    level.images.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "game-image";
      imageGrid.appendChild(img);

      img.addEventListener("click", () => {
        const overlay = document.createElement("div");
        overlay.className = "fullscreen-overlay";
        overlay.innerHTML = `<img src="${img.src}" class="fullscreen-img" />`;
        document.body.appendChild(overlay);

        // 🚫 Disable scrolling
        document.body.style.overflow = "hidden";

        overlay.addEventListener("click", () => {
          overlay.remove();

          // ✅ Restore scrolling when overlay is closed
          document.body.style.overflow = "";
        });
      });
    });

    answerContainer.innerHTML = "";
    for (let i = 0; i < maxLetters; i++) {
      const div = document.createElement("div");
      div.className = "answer-letter";
      answerContainer.appendChild(div);
    }

    const lettersNeeded = correctAnswer.split("");
    while (lettersNeeded.length < 12) {
      const rand = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      lettersNeeded.push(rand);
    }
    const shuffled = lettersNeeded.sort(() => 0.5 - Math.random());
    const letterButtons = document.querySelectorAll(".letter-btn:not(.hint-btn):not(.delete-btn)");
    letterButtons.forEach((btn, i) => {
      btn.textContent = shuffled[i];
      btn.style.visibility = "visible";
    });

    document.querySelectorAll(".answer-letter").forEach((box, i) => {
      box.onclick = () => {
        if (filledLetters[i]) {
          if (letterSources[i]) letterSources[i].style.visibility = "visible";
          filledLetters[i] = "";
          letterSources[i] = null;
          box.textContent = "";
          if (!isMuted) {
            removeSound.currentTime = 0;
            removeSound.play();
          }
        }
        resetBoxStyles();
      };
    });

    resetBoxStyles();
  }

  function resetBoxStyles() {
    document.querySelectorAll(".answer-letter").forEach(box => {
      box.classList.remove("wrong-box");
      box.style.backgroundColor = "#333";
      box.style.color = "#fff";
    });
  }

  function checkAnswer() {
    const guess = filledLetters.join("");
    const boxes = document.querySelectorAll(".answer-letter");

    if (guess === correctAnswer) {
      if (!isMuted) successSound.play();

      // Award bonus coins for Pi users
      const bonusMultiplier = piUser ? 1.5 : 1;
      const coinsEarned = 3.14 * bonusMultiplier;

      showSuccessPopup(coinsEarned);
      saveUserProgress();
    } else {
      if (!isMuted) errorSound.play();
      answerContainer.classList.add("shake");
      boxes.forEach(box => box.classList.add("wrong-box"));
      setTimeout(() => answerContainer.classList.remove("shake"), 400);
    }
  }

  function showSuccessPopup(coinsEarned) {
    const popup = document.createElement("div");
    popup.className = "success-popup";
    const praise = praiseWords[Math.floor(Math.random() * praiseWords.length)];

    popup.innerHTML = `
      <div class="popup-light"></div>
      <div class="popup-praise">${praise}</div>
      <div class="popup-word">${correctAnswer.split("").map(l => `<span>${l}</span>`).join("")}</div>
      <div class="popup-coin-box">
        <img src="coin.png" alt="coin" />
        <div class="popup-coins">+ ${coinsEarned.toFixed(2)}</div>
      </div>
      ${piUser ? '<div class="pi-bonus-badge">Pi Bonus!</div>' : ''}
      <button class="popup-next">Next</button>
    `;

    document.body.appendChild(popup);
    coins += coinsEarned;
    coinDisplay.textContent = Math.floor(coins);

    document.querySelector(".popup-next").addEventListener("click", () => {
      popup.remove();
      currentLevel++;
      localStorage.setItem("level_" + selectedDifficulty, currentLevel);
      if (!isMuted) transitionSound.play();
      loadLevel();
      saveUserProgress();
    });
  }

  document.querySelectorAll(".letter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const letter = btn.textContent;

      for (let i = 0; i < maxLetters; i++) {
        if (!filledLetters[i]) {
          filledLetters[i] = letter;
          document.querySelectorAll(".answer-letter")[i].textContent = letter;
          letterSources[i] = btn;
          btn.style.visibility = "hidden";

          if (filledLetters.filter(l => l === "").length > 0 && !isMuted) {
            tapSound.currentTime = 0;
            tapSound.play();
          }
          break;
        }
      }

      if (!filledLetters.includes("")) checkAnswer();
    });
  });

  document.querySelector(".hint-btn").addEventListener("click", () => {
    if (coins < 30) {
      if (piUser) {
        // Offer to buy coins with Pi
        if (confirm("Not enough coins! Buy 100 coins for 0.1 π?")) {
          processPiPayment(0.1, "Buy 100 coins", function() {
            coins += 100;
            coinDisplay.textContent = Math.floor(coins);
            saveUserProgress();
            alert("Payment successful! You received 100 coins.");
          });
        }
      } else {
        alert("Not enough coins for a hint.");
      }
      return;
    }

    const emptyIndexes = filledLetters.map((val, idx) => val === "" ? idx : null).filter(idx => idx !== null);
    if (!emptyIndexes.length) return alert("No more letters to reveal.");

    const randomIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    const correctLetter = correctAnswer[randomIndex];
    filledLetters[randomIndex] = correctLetter;
    document.querySelectorAll(".answer-letter")[randomIndex].textContent = correctLetter;
    document.querySelectorAll(".answer-letter")[randomIndex].style.pointerEvents = "none";

    const letterButtons = document.querySelectorAll(".letter-btn");
    for (const btn of letterButtons) {
      if (btn.textContent === correctLetter && btn.style.visibility !== "hidden") {
        btn.style.visibility = "hidden";
        break;
      }
    }

    coins -= 30;
    coinDisplay.textContent = Math.floor(coins);
    if (!isMuted) hintSound.play();
    saveUserProgress();

    if (!filledLetters.includes("") && filledLetters.join("") === correctAnswer) {
      if (!isMuted) successSound.play();
      setTimeout(() => showSuccessPopup(3.14), 500);
    }
  });

  document.querySelector(".delete-btn").addEventListener("click", () => {
    if (coins < 80) {
      if (piUser) {
        // Offer to buy coins with Pi
        if (confirm("Not enough coins! Buy 100 coins for 0.1 π?")) {
          processPiPayment(0.1, "Buy 100 coins", function() {
            coins += 100;
            coinDisplay.textContent = Math.floor(coins);
            saveUserProgress();
            alert("Payment successful! You received 100 coins.");
          });
        }
      } else {
        alert("Not enough coins to delete wrong letters.");
      }
      return;
    }

    const correctLetters = correctAnswer.split("");
    const letterCount = {};
    correctLetters.forEach(l => letterCount[l] = (letterCount[l] || 0) + 1);

    let removed = false;
    const countMap = {};

    document.querySelectorAll(".letter-btn:not(.hint-btn):not(.delete-btn)").forEach(btn => {
      const letter = btn.textContent;
      if (btn.style.visibility === "hidden") return;

      if (!correctLetters.includes(letter)) {
        btn.style.visibility = "hidden";
        removed = true;
      } else {
        countMap[letter] = (countMap[letter] || 0) + 1;
        if (countMap[letter] > letterCount[letter]) {
          btn.style.visibility = "hidden";
          removed = true;
        }
      }
    });

    if (removed) {
      coins -= 80;
      coinDisplay.textContent = Math.floor(coins);
      if (!isMuted) deleteSound.play();
      saveUserProgress();
    } else {
      alert("No wrong letters to delete!");
    }
  });

  document.querySelector(".skip-btn")?.addEventListener("click", () => {
    if (coins < 100) {
      if (piUser) {
        // Offer to buy coins with Pi
        if (confirm("Not enough coins! Buy 100 coins for 0.1 π?")) {
          processPiPayment(0.1, "Buy 100 coins", function() {
            coins += 100;
            coinDisplay.textContent = Math.floor(coins);
            saveUserProgress();
            alert("Payment successful! You received 100 coins.");
          });
        }
      } else {
        alert("Not enough coins to skip.");
      }
      return;
    }

    if (confirm("Skip this level for 100 coins?")) {
      coins -= 100;
      coinDisplay.textContent = Math.floor(coins);
      if (!isMuted) removeSound.play();

      const gameScreen = document.getElementById("game-screen");
      gameScreen.classList.add("fade-out");

      setTimeout(() => {
        gameScreen.classList.remove("fade-out");
        gameScreen.classList.add("fade-in");
        currentLevel++;
        if (!isMuted) transitionSound.play();
        loadLevel();
        setTimeout(() => gameScreen.classList.remove("fade-in"), 500);
        saveUserProgress();
      }, 500);
    }
  });

  document.querySelector(".back-btn").addEventListener("click", () => {
    if (confirm("Are you sure you want to go back to difficulty selection?\nYour level progress will be reset.")) {
      document.getElementById("game-screen").classList.remove("active");
      document.getElementById("difficulty-screen").classList.add("active");
      saveUserProgress();
    }
  });
});