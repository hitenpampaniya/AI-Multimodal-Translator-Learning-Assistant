document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");

    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add("dark-mode");
            if (themeToggle) {
                themeToggle.textContent = "☀️";
                themeToggle.setAttribute("title", "Switch to light mode");
                themeToggle.setAttribute("aria-label", "Switch to light mode");
            }
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark-mode");
            if (themeToggle) {
                themeToggle.textContent = "🌙";
                themeToggle.setAttribute("title", "Switch to dark mode");
                themeToggle.setAttribute("aria-label", "Switch to dark mode");
            }
            localStorage.setItem("theme", "light");
        }
    }

    // 1. Saved user preference, 2. System preference, 3. Light mode fallback
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
        setTheme(true);
    } else {
        setTheme(false);
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const isDark = document.body.classList.contains("dark-mode");
            setTheme(!isDark);
        });
    }
});