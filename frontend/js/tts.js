document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:8000";

    const textInput = document.getElementById("tts-text");
    const languageSelect = document.getElementById("tts-language");
    const voiceSelect = document.getElementById("tts-voice");
    const speedSelect = document.getElementById("tts-speed");
    const generateBtn = document.getElementById("tts-generate-btn");
    const audioPlayer = document.getElementById("tts-audio-player");
    const downloadLink = document.getElementById("tts-download-link");
    const errorDiv = document.getElementById("tts-error");
    const loadingIndicator = document.getElementById("tts-loading");

    let allVoices = [];

    // Dictionary and Intl helper for proper full language names
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
                if (baseName) {
                    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                }
            } catch (e) {
                baseName = langCode.toUpperCase();
            }
        }

        if (regionCode) {
            try {
                const regionDisplay = new Intl.DisplayNames(['en'], { type: 'region' });
                const regionName = regionDisplay.of(regionCode);
                if (regionName) {
                    return `${baseName} (${regionName})`;
                }
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

            // Extract all unique languages/locales directly from backend data and sort by proper name
            const languages = [...new Set(allVoices.map(v => v.language))];
            languages.sort((a, b) => getFullLanguageName(a).localeCompare(getFullLanguageName(b)));
            
            if (languageSelect) {
                languageSelect.innerHTML = "";
                languages.forEach(lang => {
                    const option = document.createElement("option");
                    option.value = lang;
                    option.textContent = getFullLanguageName(lang); // Displays proper full language name
                    languageSelect.appendChild(option);
                });

                // Default selection
                const defaultLang = languages.find(l => l.toLowerCase().includes('en')) || languages[0];
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
        
        // Filter all voices belonging to the selected language from backend data
        const filtered = allVoices.filter(v => v.language === lang);
        
        filtered.forEach(v => {
            const option = document.createElement("option");
            option.value = v.name;
            option.textContent = `${v.friendlyName || v.name} (${v.gender || "Neutral"})`;
            voiceSelect.appendChild(option);
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener("change", (e) => {
            updateVoicesForLanguage(e.target.value);
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            hideError();
            const text = textInput ? textInput.value.trim() : "";
            const voice = voiceSelect ? voiceSelect.value : "";
            const speed = speedSelect ? speedSelect.value : "1.0x";

            if (!text) {
                showError("Please enter some text.");
                return;
            }
            if (!voice) {
                showError("Please select a voice.");
                return;
            }

            if (loadingIndicator) loadingIndicator.style.display = "block";
            generateBtn.disabled = true;

            try {
                const response = await fetch(`${apiBaseUrl}/api/tts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ text, voice, speed })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || "Unable to generate speech. Please try again.");
                }

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);

                if (audioPlayer) {
                    audioPlayer.src = audioUrl;
                    audioPlayer.style.display = "block";
                    audioPlayer.play();
                }

                if (downloadLink) {
                    downloadLink.href = audioUrl;
                    downloadLink.download = "speech.mp3";
                    downloadLink.style.display = "inline-block";
                }

            } catch (error) {
                console.error("TTS Generation Error:", error);
                showError(error.message || "Unable to generate speech. Please try again.");
            } finally {
                if (loadingIndicator) loadingIndicator.style.display = "none";
                generateBtn.disabled = false;
            }
        });
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
        if (errorDiv) {
            errorDiv.style.display = "none";
        }
    }

    loadVoices();
});