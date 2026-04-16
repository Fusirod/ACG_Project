export function setupUI(callbacks) {
    // --- Menu Logic from ref.js 762 ---
    const menuOverlay = document.getElementById("menuOverlay");
    const settingsPanel = document.getElementById("settingsPanel");
    const startBtn = document.getElementById("startBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const backToMenuBtn = document.getElementById("backToMenuBtn");

    if (!menuOverlay || !startBtn) {
        console.warn("UI Elements not found. Check index.html IDs.");
    }

    // Tab Logic
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    // Helper for safe registration
    const listen = (id, event, cb) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, cb);
    };

    const updateVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    listen("startBtn", "click", () => {
        callbacks.onStart();
        if (menuOverlay) menuOverlay.classList.add("hidden");
    });

    listen("settingsBtn", "click", () => {
        if (menuOverlay) menuOverlay.classList.add("hidden");
        if (settingsPanel) settingsPanel.classList.remove("hidden");
    });

    listen("backToMenuBtn", "click", () => {
        if (settingsPanel) settingsPanel.classList.add("hidden");
        if (menuOverlay) menuOverlay.classList.remove("hidden");
    });

    listen("sensitivityRange", "input", (e) => {
        const percent = parseInt(e.target.value);
        callbacks.onSensitivity(percent);
        updateVal("sensitivityVal", percent + "%");
    });

    listen("fovRange", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onFOV(val);
        updateVal("fovVal", val);
    });

    listen("musicVolume", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onMusicVolume(val);
        updateVal("musicVolumeVal", val + "%");
    });

    listen("sfxVolume", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onSFXVolume(val);
        updateVal("sfxVolumeVal", val + "%");
    });

    listen("glowIntensity", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onGlow(val);
        updateVal("glowVal", val + "%");
    });

    listen("minimapToggle", "change", (e) => {
        callbacks.onMinimap(e.target.checked);
    });

    listen("ghostSpeed", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onGhostSpeed(val);
        updateVal("ghostSpeedVal", (val / 100).toFixed(1) + "x");
    });

    listen("frightenedDuration", "input", (e) => {
        const val = parseInt(e.target.value);
        callbacks.onFrightenedDuration(val);
        updateVal("frightenedVal", val + "s");
    });

    listen("perfToggle", "change", (e) => {
        const perfHud = document.getElementById("perfHud");
        if (perfHud) {
            if (e.target.checked) perfHud.classList.remove("hidden");
            else perfHud.classList.add("hidden");
        }
    });

    listen("headBobToggle", "change", (e) => {
        callbacks.onHeadBob(e.target.checked);
    });

    document.querySelectorAll(".segment").forEach(seg => {
        seg.addEventListener("click", () => {
            document.querySelectorAll(".segment").forEach(s => s.classList.remove("active"));
            seg.classList.add("active");
            callbacks.onGraphics(parseFloat(seg.dataset.val));
        });
    });

    // Endgame UI
    const gameOverScreen = document.getElementById("gameOverScreen");
    const endGameStatus = document.getElementById("endGameStatus");
    const finalScoreText = document.getElementById("finalScore");
    const retryBtn = document.getElementById("retryBtn");
    const endToMenuBtn = document.getElementById("endToMenuBtn");

    if (retryBtn) retryBtn.addEventListener("click", () => callbacks.onRetry());
    if (endToMenuBtn) {
        endToMenuBtn.addEventListener("click", () => {
            sessionStorage.removeItem('autoStartPacman');
            window.location.reload();
        });
    }

    return {
        showEndScreen: (isWin, score) => {
            if (!gameOverScreen || !gameOverScreen.classList.contains("hidden")) return;
            gameOverScreen.classList.remove("hidden");
            endGameStatus.innerText = isWin ? "VICTORY!" : "GAME OVER";
            finalScoreText.innerText = score;
        },
        hideEndScreen: () => gameOverScreen.classList.add("hidden")
    };
}
