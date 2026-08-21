document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:8000";

    const sttSourceLang = document.getElementById("sttSourceLang");
    const sttRecordBtn = document.getElementById("sttRecordBtn");
    const sttStatus = document.getElementById("sttStatus");
    const sttResultContainer = document.getElementById("sttResultContainer");
    const sttTextOutput = document.getElementById("sttTextOutput");
    const sttCopyBtn = document.getElementById("sttCopyBtn");
    const sttClearBtn = document.getElementById("sttClearBtn");
    const sttError = document.getElementById("sttError");

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

        if (sttSourceLang && sttSourceLang.options.length <= 1) {
            sttSourceLang.innerHTML = "";
            languages.forEach(l => {
                const opt = document.createElement("option");
                opt.value = l.code;
                opt.textContent = l.name;
                sttSourceLang.appendChild(opt);
            });
            sttSourceLang.value = "auto";
        }
    }

    initLanguages();

    if (sttRecordBtn) {
        sttRecordBtn.addEventListener("click", async () => {
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
                    sttRecordBtn.textContent = "⏹ Stop Recording";
                    if (sttStatus) sttStatus.textContent = "🔴 Recording...";
                } catch (err) {
                    console.error("Microphone permission error:", err);
                    showError("Microphone permission is required.");
                }
            } else {
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
                isRecording = false;
                sttRecordBtn.textContent = "🎤 Start Recording";
            }
        });
    }

    async function processAudioBlob(blob) {
        if (!blob || blob.size === 0) {
            showError("No speech detected. Please try again.");
            if (sttStatus) sttStatus.textContent = "Ready";
            return;
        }

        if (sttStatus) sttStatus.textContent = "⏳ Processing audio...";

        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("language", sttSourceLang ? sttSourceLang.value : "auto");

        try {
            if (sttStatus) sttStatus.textContent = "🔄 Converting speech to text...";
            
            const res = await fetch(`${apiBaseUrl}/api/speech-to-text`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.detail || "Could not convert speech to text.");
            }

            const data = await res.json();
            
            if (sttTextOutput) sttTextOutput.textContent = data.text || "";
            if (sttResultContainer) sttResultContainer.style.display = "block";
            if (sttStatus) sttStatus.textContent = "✅ Transcription completed";

        } catch (error) {
            console.error("STT error:", error);
            showError(error.message || "Something went wrong. Please try again.");
            if (sttStatus) sttStatus.textContent = "Ready";
        }
    }

    if (sttCopyBtn) {
        sttCopyBtn.addEventListener("click", () => {
            const text = sttTextOutput ? sttTextOutput.textContent : "";
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                showToast("Text copied successfully.");
            }).catch(() => {
                showError("Failed to copy text.");
            });
        });
    }

    if (sttClearBtn) {
        sttClearBtn.addEventListener("click", () => {
            if (sttTextOutput) sttTextOutput.textContent = "";
            if (sttResultContainer) sttResultContainer.style.display = "none";
            if (sttStatus) sttStatus.textContent = "Ready";
            hideError();
        });
    }

    function showError(msg) {
        if (sttError) {
            sttError.textContent = msg;
            sttError.style.display = "block";
        } else {
            alert(msg);
        }
    }

    function hideError() {
        if (sttError) {
            sttError.style.display = "none";
        }
    }

    function showToast(msg) {
        const toast = document.getElementById("toast");
        if (toast) {
            toast.textContent = msg;
            toast.className = "toast show";
            setTimeout(() => {
                toast.className = "toast";
            }, 3000);
        } else {
            alert(msg);
        }
    }
});