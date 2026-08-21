document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:8000";

    const dropZone = document.getElementById("pdfDropZone");
    const fileInput = document.getElementById("pdfFileInput");
    const chooseBtn = document.getElementById("pdfChooseBtn");
    const fileInfo = document.getElementById("pdfFileInfo");
    const fileNameElem = document.getElementById("pdfFileName");
    const fileSizeElem = document.getElementById("pdfFileSize");
    const sourceLangSelect = document.getElementById("pdfSourceLang");
    const targetLangSelect = document.getElementById("pdfTargetLang");
    const translateBtn = document.getElementById("pdfTranslateBtn");
    const statusDiv = document.getElementById("pdfStatus");
    const errorDiv = document.getElementById("pdfError");
    const resultContainer = document.getElementById("pdfResultContainer");
    const downloadLink = document.getElementById("pdfDownloadLink");

    let selectedFile = null;

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

    if (sourceLangSelect && sourceLangSelect.options.length <= 1) {
        sourceLangSelect.innerHTML = "";
        languages.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.code;
            opt.textContent = l.name;
            sourceLangSelect.appendChild(opt);
        });
        sourceLangSelect.value = "auto";
    }

    if (targetLangSelect && targetLangSelect.options.length <= 1) {
        targetLangSelect.innerHTML = "";
        languages.filter(l => l.code !== "auto").forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.code;
            opt.textContent = l.name;
            targetLangSelect.appendChild(opt);
        });
        targetLangSelect.value = "hi";
    }

    if (chooseBtn && fileInput) {
        chooseBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            handleFile(e.target.files[0]);
        });
    }

    if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "var(--blue-500)";
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.style.borderColor = "var(--ink-150)";
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "var(--ink-150)";
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    function handleFile(file) {
        hideError();
        if (!file) return;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            showError("Only PDF files are supported.");
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showError("PDF size exceeds the maximum allowed size (20MB).");
            return;
        }

        selectedFile = file;
        if (fileNameElem) fileNameElem.textContent = file.name;
        if (fileSizeElem) fileSizeElem.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        if (fileInfo) fileInfo.style.display = "block";
    }

    if (translateBtn) {
        translateBtn.addEventListener("click", async () => {
            hideError();
            if (!selectedFile) {
                showError("Please select a PDF.");
                return;
            }

            setStatus("Uploading PDF...");
            translateBtn.disabled = true;

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("source_language", sourceLangSelect ? sourceLangSelect.value : "auto");
            formData.append("target_language", targetLangSelect ? targetLangSelect.value : "hi");

            try {
                setStatus("Extracting text and translating...");
                const res = await fetch(`${apiBaseUrl}/api/pdf-translate`, {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || "Translation failed. Please try again.");
                }

                setStatus("Generating translated PDF...");
                const data = await res.json();

                if (data.download_url) {
                    const downloadUrl = data.download_url.startsWith("http") ? data.download_url : `${apiBaseUrl}${data.download_url}`;
                    if (downloadLink) {
                        downloadLink.href = downloadUrl;
                        downloadLink.download = data.filename || "translated_document.pdf";
                    }
                    if (resultContainer) resultContainer.style.display = "block";
                }

                setStatus("✅ PDF translated successfully!");
            } catch (error) {
                console.error("PDF translation error:", error);
                showError(error.message || "Something went wrong. Please try again.");
                setStatus("Ready");
            } finally {
                translateBtn.disabled = false;
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
});