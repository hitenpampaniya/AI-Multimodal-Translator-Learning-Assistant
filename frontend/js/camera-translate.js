document.addEventListener("DOMContentLoaded", () => {
  const apiBaseUrl = (function() {
    if (typeof BASE_URL !== "undefined" && BASE_URL) return BASE_URL;
    if (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http")) {
      return window.location.origin;
    }
    return "http://localhost:8000";
  })();

  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("cameraCanvas");
  const startCamBtn = document.getElementById("startCamBtn");
  const stopCamBtn = document.getElementById("stopCamBtn");
  const captureBtn = document.getElementById("captureBtn");
  const liveToggle = document.getElementById("liveToggle");
  const camError = document.getElementById("camError");
  const camSourceLang = document.getElementById("camSourceLang");
  const camTargetLang = document.getElementById("camTargetLang");
  const camTranslateBtn = document.getElementById("camTranslateBtn");
  const camDetectedText = document.getElementById("camDetectedText");
  const camTranslatedText = document.getElementById("camTranslatedText");
  const camTtsBtn = document.getElementById("camTtsBtn");
  const liveOverlay = document.getElementById("liveOverlay");

  let mediaStream = null;
  let liveInterval = null;
  let isProcessingFrame = false;
  let lastAudioUrl = null;

  // Comprehensive language list fallback so dropdowns are always populated
  const allLanguages = {
    "en": "English",
    "hi": "Hindi",
    "gu": "Gujarati",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "ar": "Arabic",
    "ru": "Russian",
    "pt": "Portuguese",
    "it": "Italian",
    "ko": "Korean",
    "bn": "Bengali",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu"
  };

  function populateDropdowns(langs) {
    if (!camSourceLang || !camTargetLang) return;
    
    camSourceLang.innerHTML = '<option value="auto">Auto Detect</option>';
    camTargetLang.innerHTML = '';

    for (const [code, name] of Object.entries(langs)) {
      camSourceLang.innerHTML += `<option value="${code}">${name}</option>`;
      camTargetLang.innerHTML += `<option value="${code}">${name}</option>`;
    }
    camTargetLang.value = "en"; // Default target English
  }

  // Load languages (tries API first, falls back to full list)
  async function loadCameraLanguages() {
    populateDropdowns(allLanguages);
    try {
      const response = await fetch(`${apiBaseUrl}/api/languages`);
      if (response.ok) {
        const data = await response.json();
        const languages = data.languages || data;
        if (languages && Object.keys(languages).length > 0) {
          populateDropdowns(languages);
        }
      }
    } catch (err) {
      console.warn("Using default comprehensive language list.");
    }
  }
  loadCameraLanguages();

  // Start Camera
  if (startCamBtn) {
    startCamBtn.addEventListener("click", async () => {
      hideError();
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
        video.srcObject = mediaStream;
        startCamBtn.disabled = true;
        stopCamBtn.disabled = false;
        if (captureBtn) captureBtn.disabled = false;
        if (liveToggle) liveToggle.disabled = false;
      } catch (err) {
        console.error("Camera access error:", err);
        showError("Camera permission is required. Please check browser permissions.");
      }
    });
  }

  // Stop Camera
  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    video.srcObject = null;
    stopLiveTranslate();
    if (startCamBtn) startCamBtn.disabled = false;
    if (stopCamBtn) stopCamBtn.disabled = true;
    if (captureBtn) captureBtn.disabled = true;
    if (liveToggle) {
      liveToggle.disabled = true;
      liveToggle.checked = false;
    }
    if (liveOverlay) liveOverlay.style.display = "none";
  }
  if (stopCamBtn) stopCamBtn.addEventListener("click", stopCamera);

  function showError(msg) {
    if (!camError) return;
    camError.textContent = msg;
    camError.style.display = "block";
  }
  function hideError() {
    if (!camError) return;
    camError.style.display = "none";
    camError.textContent = "";
  }

  // Process Frame: OCR + Translation
  async function processCurrentFrame(isLive = false) {
    if (!mediaStream || isProcessingFrame) return;
    isProcessingFrame = true;

    try {
      if (!video.videoWidth || !video.videoHeight) {
        isProcessingFrame = false;
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) {
        isProcessingFrame = false;
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      // 1. OCR Request
      const ocrRes = await fetch(`${apiBaseUrl}/api/ocr`, {
        method: "POST",
        body: formData
      });

      if (!ocrRes.ok) throw new Error("OCR extraction failed.");
      const ocrData = await ocrRes.json();
      const detectedText = (ocrData.text || ocrData.extracted_text || "").trim();

      if (!detectedText) {
        if (isLive && liveOverlay) {
          liveOverlay.style.display = "none";
          liveOverlay.textContent = "";
        } else if (!isLive) {
          if (camDetectedText) camDetectedText.textContent = "No text detected. Point camera at clear text.";
          if (camTranslatedText) camTranslatedText.textContent = "";
        }
        isProcessingFrame = false;
        return;
      }

      if (!isLive && camDetectedText) {
        camDetectedText.textContent = detectedText;
      }

      // 2. Translation Request
      const srcLang = camSourceLang ? camSourceLang.value : "auto";
      const tgtLang = camTargetLang ? camTargetLang.value : "en";

      const transRes = await fetch(`${apiBaseUrl}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: detectedText,
          source: srcLang,
          target: tgtLang
        })
      });

      if (!transRes.ok) throw new Error("Translation failed.");
      const transData = await transRes.json();
      const translatedText = (transData.translated_text || transData.translation || "").trim();

      if (isLive) {
        if (liveOverlay) {
          liveOverlay.style.display = "block";
          liveOverlay.textContent = translatedText;
        }
      } else {
        if (camTranslatedText) camTranslatedText.textContent = translatedText;
        if (camTtsBtn) camTtsBtn.disabled = false;
      }
    } catch (err) {
      console.error("Camera pipeline error:", err);
      if (!isLive) showError("Translation failed. Please try again.");
    } finally {
      isProcessingFrame = false;
    }
  }

  if (captureBtn) captureBtn.addEventListener("click", () => processCurrentFrame(false));
  if (camTranslateBtn) camTranslateBtn.addEventListener("click", () => processCurrentFrame(false));

  // Live Translate Mode
  if (liveToggle) {
    liveToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (!mediaStream) {
          liveToggle.checked = false;
          return;
        }
        liveInterval = setInterval(() => {
          processCurrentFrame(true);
        }, 1800);
      } else {
        stopLiveTranslate();
      }
    });
  }

  function stopLiveTranslate() {
    if (liveInterval) {
      clearInterval(liveInterval);
      liveInterval = null;
    }
    if (liveOverlay) {
      liveOverlay.style.display = "none";
      liveOverlay.textContent = "";
    }
  }

  // TTS Audio Playback
  if (camTtsBtn) {
    camTtsBtn.addEventListener("click", async () => {
      const textToSpeak = camTranslatedText ? camTranslatedText.textContent : "";
      if (!textToSpeak) return;

      const langCode = camTargetLang ? camTargetLang.value : "en";
      const defaultVoiceMap = {
        "hi": "hi-IN-SwaraNeural",
        "gu": "gu-IN-DhwaniNeural",
        "en": "en-US-AriaNeural",
        "es": "es-ES-ElviraNeural",
        "fr": "fr-FR-DeniseNeural",
        "de": "de-DE-KatjaNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "ja": "ja-JP-NanamiNeural",
        "ar": "ar-SA-ZariyahNeural",
        "ru": "ru-RU-SvetlanaNeural"
      };
      const voiceToUse = defaultVoiceMap[langCode] || `${langCode}-US-AriaNeural`;

      try {
        camTtsBtn.style.opacity = "0.5";
        const response = await fetch(`${apiBaseUrl}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            voice: voiceToUse,
            speed: "1.0x"
          })
        });

        if (!response.ok) throw new Error("TTS failed.");
        const audioBlob = await response.blob();
        if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
        lastAudioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(lastAudioUrl);
        audio.play();
        audio.onended = () => { camTtsBtn.style.opacity = "1"; };
      } catch (err) {
        console.error("TTS Error:", err);
        camTtsBtn.style.opacity = "1";
      }
    });
  }
});