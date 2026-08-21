document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:8000";

    const vtSourceLang = document.getElementById("vtSourceLang");
    const vtTargetLang = document.getElementById("vtTargetLang");
    const vtRecordBtn = document.getElementById("vtRecordBtn");
    const vtStatus = document.getElementById("vtStatus");
    const vtOriginalText = document.getElementById("vtOriginalText");
    const vtTranslatedText = document.getElementById("vtTranslatedText");
    const vtAudioPlayer = document.getElementById("vtAudioPlayer");
    const vtDownloadLink = document.getElementById("vtDownloadLink");
    const vtResultContainer = document.getElementById("vtResultContainer");
    const vtError = document.getElementById("vtError");

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    function initLanguages() {
        const languages = [
            { code: "auto", name: "Auto Detect" },
            { code: "en", name: "English" },
            { code: "hi", name: "Hindi" },
            { code: "gu", name: "Gujarati" },
            { code: "es", name: "Spanish" },
            { code: "fr", name: "French" },
            { code: "de", name: "German" },
            { code: "ja", name: "Japanese" },
            { code: "zh", name: "Chinese" },
            { code: "ar", name: "Arabic" },
            { code: "pt", name: "Portuguese" },
            { code: "ru", name: "Russian" }
        ];

        if (vtSourceLang && vtSourceLang.options.length <= 1) {
            vtSourceLang.innerHTML = "";
            languages.forEach(l => {
                const opt = document.createElement("option");
                opt.value = l.code;
                opt.textContent = l.name;
                vtSourceLang.appendChild(opt);
            });
            vtSourceLang.value = "auto";
        }

        if (vtTargetLang && vtTargetLang.options.length <= 1) {
            vtTargetLang.innerHTML = "";
            languages.filter(l => l.code !== "auto").forEach(l => {
                const opt = document.createElement("option");
                opt.value = l.code;
                opt.textContent = l.name;
                vtTargetLang.appendChild(opt);
            });
            vtTargetLang.value = "en";
        }
    }

    initLanguages();

    if (vtRecordBtn) {
        vtRecordBtn.addEventListener("click", async () => {
            if (!isRecording) {
                try {
                    hideError();
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            audioChunks.push(event.data);
                        }
                    };

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        await processAudioBlob(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    vtRecordBtn.textContent = "⏹ Stop Recording";
                    if (vtStatus) vtStatus.textContent = "🔴 Recording...";
                } catch (err) {
                    console.error("Microphone permission error:", err);
                    showError("Microphone permission is required.");
                }
            } else {
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
                isRecording = false;
                vtRecordBtn.textContent = "🎤 Start Recording";
            }
        });
    }

    async function processAudioBlob(blob) {
        if (!blob || blob.size === 0) {
            showError("No speech detected. Please try again.");
            if (vtStatus) vtStatus.textContent = "Ready";
            return;
        }

        if (vtStatus) vtStatus.textContent = "⏳ Converting speech...";

        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("source_language", vtSourceLang ? vtSourceLang.value : "auto");
        formData.append("target_language", vtTargetLang ? vtTargetLang.value : "en");

        try {
            if (vtStatus) vtStatus.textContent = "🌐 Translating...";
            const res = await fetch(`${apiBaseUrl}/api/voice-translate`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.detail || "Translation failed. Please try again.");
            }

            if (vtStatus) vtStatus.textContent = "🔊 Generating voice...";
            const data = await res.json();

            if (vtOriginalText) vtOriginalText.textContent = data.source_text || "";
            if (vtTranslatedText) vtTranslatedText.textContent = data.translated_text || "";

            if (data.audio_url) {
                const audioSrc = data.audio_url.startsWith("http") ? data.audio_url : `${apiBaseUrl}${data.audio_url}`;
                if (vtAudioPlayer) {
                    vtAudioPlayer.src = audioSrc;
                    vtAudioPlayer.style.display = "block";
                    vtAudioPlayer.play();
                }
                if (vtDownloadLink) {
                    vtDownloadLink.href = audioSrc;
                    vtDownloadLink.download = "translated_speech.mp3";
                    vtDownloadLink.style.display = "inline-block";
                }
            }

            if (vtResultContainer) vtResultContainer.style.display = "block";
            if (vtStatus) vtStatus.textContent = "✅ Translation completed";

        } catch (error) {
            console.error("Voice translation error:", error);
            showError(error.message || "Translation failed. Please try again.");
            if (vtStatus) vtStatus.textContent = "Ready";
        }
    }

    function showError(msg) {
        if (vtError) {
            vtError.textContent = msg;
            vtError.style.display = "block";
        } else {
            alert(msg);
        }
    }

    function hideError() {
        if (vtError) {
            vtError.style.display = "none";
        }
    }
});