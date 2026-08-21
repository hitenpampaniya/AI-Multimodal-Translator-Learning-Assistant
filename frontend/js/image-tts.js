document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = (function() {
        if (typeof BASE_URL !== "undefined" && BASE_URL) return BASE_URL;
        if (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http")) {
            return window.location.origin;
        }
        return "http://localhost:8000";
    })();

    const imageInput = document.getElementById("imageTtsInput");
    const imagePreview = document.getElementById("imageTtsPreview");
    const uploadLabel = document.getElementById("imageTtsUploadLabel");
    const extractBtn = document.getElementById("imageTtsExtractBtn");
    const textOutput = document.getElementById("imageTtsText");
    const languageSelect = document.getElementById("imageTtsLanguage");
    const voiceSelect = document.getElementById("imageTtsVoice");
    const speedSelect = document.getElementById("imageTtsSpeed");
    const generateBtn = document.getElementById("imageTtsGenerateBtn");
    const audioPlayer = document.getElementById("imageTtsAudioPlayer");
    const downloadLink = document.getElementById("imageTtsDownloadLink");
    const statusDiv = document.getElementById("imageTtsStatus");
    const errorDiv = document.getElementById("imageTtsError");

    let allVoices = [];
    let selectedImageFile = null;

    // Comprehensive language name dictionary
    const customLanguageNames = {
        'en': 'English', 'hi': 'Hindi', 'gu': 'Gujarati', 'es': 'Spanish',
        'fr': 'French', 'de': 'German', 'ja': 'Japanese', 'zh': 'Chinese',
        'ar': 'Arabic', 'ru': 'Russian', 'pt': 'Portuguese', 'it': 'Italian',
        'ko': 'Korean', 'bn': 'Bengali', 'mr': 'Marathi', 'ta': 'Tamil',
        'te': 'Telugu', 'ur': 'Urdu', 'vi': 'Vietnamese', 'tr': 'Turkish',
        'nl': 'Dutch', 'pl': 'Polish', 'id': 'Indonesian', 'pa': 'Punjabi'
    };

    function getFullLanguageName(localeCode) {
        if (!localeCode) return "Unknown";
        const parts = localeCode.split('-');
        const langCode = parts[0].toLowerCase();
        const regionCode = parts[1] ? parts[1].toUpperCase() : '';

        let baseName = customLanguageNames[langCode];
        if (!baseName) {
            try {
                const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
                baseName = displayNames.of(langCode);
                if (baseName) baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            } catch (e) {
                baseName = langCode.toUpperCase();
            }
        }

        if (regionCode) {
            try {
                const regionDisplay = new Intl.DisplayNames(['en'], { type: 'region' });
                const regionName = regionDisplay.of(regionCode);
                if (regionName) return `${baseName} (${regionName})`;
            } catch (e) {}
            return `${baseName} (${regionCode})`;
        }
        return baseName || localeCode;
    }

    async function loadVoices() {
        try {
            const response = await fetch(`${apiBaseUrl}/api/tts/voices`);
            if (!response.ok) throw new Error("Failed to load voices from server.");
            
            allVoices = await response.json();
            
            if (!Array.isArray(allVoices) || allVoices.length === 0) {
                throw new Error("No voices returned from server.");
            }

            const languages = [...new Set(allVoices.map(v => v.language || (v.Locale || v.locale || "en").split("-")[0]))].filter(Boolean);
            languages.sort((a, b) => getFullLanguageName(a).localeCompare(getFullLanguageName(b)));
            
            if (languageSelect) {
                languageSelect.innerHTML = "";
                languages.forEach(lang => {
                    const option = document.createElement("option");
                    option.value = lang;
                    option.textContent = getFullLanguageName(lang);
                    languageSelect.appendChild(option);
                });

                const defaultLang = languages.find(l => l.toLowerCase().startsWith('en')) || languages[0];
                if (defaultLang) {
                    languageSelect.value = defaultLang;
                    updateVoicesForLanguage(defaultLang);
                }
            }
        } catch (error) {
            console.error("Error loading voices:", error);
            showError("Unable to load available voices. Check backend connection.");
        }
    }

    function updateVoicesForLanguage(lang) {
        if (!voiceSelect) return;
        voiceSelect.innerHTML = "";
        
        const filtered = allVoices.filter(v => (v.language || (v.Locale || v.locale || "en").split("-")[0]) === lang);
        
        filtered.forEach(v => {
            const option = document.createElement("option");
            const voiceName = v.name || v.ShortName || v.Name || "";
            option.value = voiceName;
            let shortName = voiceName.split("-").pop().replace("Neural", "");
            option.textContent = `${shortName} (${v.gender || v.Gender || "Neutral"}) — ${voiceName}`;
            voiceSelect.appendChild(option);
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener("change", (e) => {
            updateVoicesForLanguage(e.target.value);
        });
    }

    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            hideError();
            const file = e.target.files[0];
            if (file) {
                selectedImageFile = file;
                if (uploadLabel) uploadLabel.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (imagePreview) {
                        imagePreview.src = event.target.result;
                        imagePreview.style.display = "block";
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (extractBtn) {
        extractBtn.addEventListener("click", async () => {
            hideError();
            if (!selectedImageFile) {
                showError("No image selected.");
                return;
            }

            setStatus("⏳ Extracting text...");
            extractBtn.disabled = true;

            const formData = new FormData();
            formData.append("image", selectedImageFile);

            try {
                const res = await fetch(`${apiBaseUrl}/api/image-ocr`, {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || "OCR failed to process the image.");
                }

                const data = await res.json();
                if (textOutput) textOutput.value = data.text || "";
                setStatus("Ready");
            } catch (err) {
                console.error("OCR error:", err);
                showError(err.message || "No text was detected in this image.");
                setStatus("Ready");
            } finally {
                extractBtn.disabled = false;
            }
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            hideError();
            const text = textOutput ? textOutput.value.trim() : "";
            const voice = voiceSelect ? voiceSelect.value : "";
            const targetLang = languageSelect ? languageSelect.value : "";
            const speed = speedSelect ? speedSelect.value : "1.0x";

            if (!text) {
                showError("Extracted text cannot be empty.");
                return;
            }
            if (!voice) {
                showError("Please select a voice.");
                return;
            }

            setStatus("⏳ Translating & Generating voice...");
            generateBtn.disabled = true;

            try {
                let textToSpeak = text;

                // 1. Translate text to selected target language if specified
                if (targetLang) {
                    try {
                        const transRes = await fetch(`${apiBaseUrl}/api/translate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                text: text,
                                source: "auto",
                                target: targetLang
                            })
                        });

                        if (transRes.ok) {
                            const transData = await transRes.json();
                            const translated = transData.translated_text || transData.translation;
                            if (translated && translated.trim()) {
                                textToSpeak = translated.trim();
                                if (textOutput) textOutput.value = textToSpeak;
                            }
                        }
                    } catch (transErr) {
                        console.warn("Translation notice:", transErr);
                    }
                }

                // 2. Generate speech from translated text
                const res = await fetch(`${apiBaseUrl}/api/tts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: textToSpeak, voice, speed })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || "Unable to generate speech.");
                }

                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);

                if (audioPlayer) {
                    audioPlayer.src = audioUrl;
                    audioPlayer.style.display = "block";
                    audioPlayer.play();
                }

                if (downloadLink) {
                    downloadLink.href = audioUrl;
                    downloadLink.download = "image_speech.mp3";
                    downloadLink.style.display = "inline-block";
                }

                setStatus("✓ Speech generated successfully");
            } catch (err) {
                console.error("TTS error:", err);
                showError(err.message || "Unable to generate speech.");
                setStatus("Ready");
            } finally {
                generateBtn.disabled = false;
            }
        });
    }

    function setStatus(msg) {
        if (statusDiv) statusDiv.textContent = msg;
    }

    function showError(msg) {
        if (errorDiv) {
            errorDiv.textContent = msg;
            errorDiv.style.display = "block";
        } else {
            alert(msg);
        }
    }

    function hideError() {
        if (errorDiv) errorDiv.style.display = "none";
    }

    loadVoices();
});