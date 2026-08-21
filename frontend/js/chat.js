document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:8000";

    const chatMessages = document.getElementById("chatMessages");
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");
    const clearBtn = document.getElementById("chatClearBtn");
    const nativeLangSelect = document.getElementById("chatNativeLang");
    const learningLangSelect = document.getElementById("chatLearningLang");
    const levelSelect = document.getElementById("chatLevel");
    const chatError = document.getElementById("chatError");

    function appendMessage(sender, text) {
        if (!chatMessages) return;
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${sender === 'user' ? 'user-msg' : 'ai-msg'}`;
        
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble";
        bubble.textContent = text;
        
        const label = document.createElement("div");
        label.className = "chat-label";
        label.textContent = sender === 'user' ? 'You' : 'AI Tutor';
        
        msgDiv.appendChild(label);
        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const message = chatInput ? chatInput.value.trim() : "";
        if (!message) return;

        const native_language = nativeLangSelect ? nativeLangSelect.value : "English";
        const learning_language = learningLangSelect ? learningLangSelect.value : "Hindi";
        const level = levelSelect ? levelSelect.value : "Beginner";

        appendMessage("user", message);
        if (chatInput) chatInput.value = "";
        if (chatError) chatError.style.display = "none";

        const loadingId = "loading-" + Date.now();
        if (chatMessages) {
            const loadDiv = document.createElement("div");
            loadDiv.id = loadingId;
            loadDiv.className = "chat-message ai-msg";
            loadDiv.innerHTML = `<div class="chat-label">AI Tutor</div><div class="chat-bubble" style="font-style: italic; color: var(--ink-500);">AI tutor is typing...</div>`;
            chatMessages.appendChild(loadDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, native_language, learning_language, level })
            });

            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Unable to connect to AI tutor. Please try again.");
            }

            const data = await response.json();
            appendMessage("ai", data.reply);

        } catch (error) {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            console.error("Chat error:", error);
            if (chatError) {
                chatError.textContent = error.message || "Unable to connect to AI tutor. Please try again.";
                chatError.style.display = "block";
            }
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="chat-message ai-msg">
                        <div class="chat-label">AI Tutor</div>
                        <div class="chat-bubble">Namaste! 👋 Let's learn a new language together. Type a message or ask a question to get started.</div>
                    </div>
                `;
            }
            if (chatError) chatError.style.display = "none";
        });
    }
});