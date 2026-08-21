
document.addEventListener("DOMContentLoaded", () => {



    const sourceText =
        document.getElementById("sourceText");

    const targetText =
        document.getElementById("targetText");

    const sourceLang =
        document.getElementById("sourceLang");

    const targetLang =
        document.getElementById("targetLang");

    const sourceLangLabel =
        document.getElementById("sourceLangLabel");

    const targetLangLabel =
        document.getElementById("targetLangLabel");

    const sourceLangBtn =
        document.getElementById("sourceLangBtn");

    const targetLangBtn =
        document.getElementById("targetLangBtn");

    const swapBtn =
        document.getElementById("swapBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const copyBtn =
        document.getElementById("copyBtn");

    const starBtn =
        document.getElementById("starBtn");

    const charCount =
        document.getElementById("charCount");

    const detectedTag =
        document.getElementById("detectedTag");

    const errorBanner =
        document.getElementById("errorBanner");

    const toast =
        document.getElementById("toast");

    const shimmerBar =
        document.getElementById("shimmerBar");

    const liveIndicator =
        document.getElementById("liveIndicator");



    const imageInput =
        document.getElementById("imageInput");


    let languages = {};

    let isTranslating = false;

    let translationTimer = null;

    let toastTimer = null;


    // ============================================================
    // LANGUAGE DISPLAY
    // ============================================================

    const languageDisplayNames =
        new Intl.DisplayNames(
            ["en"],
            {
                type: "language"
            }
        );


    // ============================================================
    // LOAD LANGUAGES
    // ============================================================

    async function loadLanguages() {

        try {

            showLoading();

            languages =
                await API.getLanguages();

            populateLanguageDropdowns();

            hideError();

        } catch (error) {

            console.error(
                "Failed to load languages:",
                error
            );

            showError(
                "Could not load languages. " +
                "Please make sure the FastAPI backend is running."
            );

        } finally {

            hideLoading();

        }
    }


    // ============================================================
    // POPULATE LANGUAGE DROPDOWNS
    // ============================================================

    function populateLanguageDropdowns() {

        sourceLang.innerHTML = "";

        targetLang.innerHTML = "";


        // --------------------------------------------------------
        // AUTO DETECT
        // --------------------------------------------------------

        const autoOption =
            document.createElement("option");

        autoOption.value = "auto";

        autoOption.textContent =
            "Detect language";

        sourceLang.appendChild(
            autoOption
        );


        // --------------------------------------------------------
        // LANGUAGE CODES
        // --------------------------------------------------------

        const languageCodes =
            Object.keys(languages);


        languageCodes.sort((a, b) => {

            try {

                return getLanguageName(a)
                    .localeCompare(
                        getLanguageName(b)
                    );

            } catch (error) {

                return a.localeCompare(b);

            }

        });


        // --------------------------------------------------------
        // ADD LANGUAGES
        // --------------------------------------------------------

        languageCodes.forEach(code => {

            const fullName =
                getLanguageName(code);


            if (!fullName) {
                return;
            }


            // SOURCE
            const sourceOption =
                document.createElement("option");

            sourceOption.value = code;

            sourceOption.textContent =
                fullName;

            sourceLang.appendChild(
                sourceOption
            );


            // TARGET
            const targetOption =
                document.createElement("option");

            targetOption.value = code;

            targetOption.textContent =
                fullName;

            targetLang.appendChild(
                targetOption
            );

        });


        // --------------------------------------------------------
        // DEFAULT VALUES
        // --------------------------------------------------------

        sourceLang.value = "auto";


        if (
            languages["hi"] !== undefined
        ) {

            targetLang.value = "hi";

        } else {

            const firstLanguage =
                languageCodes[0];

            if (firstLanguage) {
                targetLang.value =
                    firstLanguage;
            }

        }


        updateLanguageLabels();

    }


    // ============================================================
    // GET LANGUAGE NAME
    // ============================================================

    function getLanguageName(code) {

        if (code === "auto") {

            return "Detect language";

        }


        try {

            const name =
                languageDisplayNames.of(code);

            if (name) {
                return name;
            }

        } catch (error) {

            console.warn(
                "Intl language lookup failed:",
                code
            );

        }


        // Backend fallback

        const backendName =
            languages[code];


        if (backendName) {

            return (
                backendName
                    .charAt(0)
                    .toUpperCase() +
                backendName.slice(1)
            );

        }


        return code;

    }


    // ============================================================
    // UPDATE LANGUAGE LABELS
    // ============================================================

    function updateLanguageLabels() {

        const sourceCode =
            sourceLang.value;

        const targetCode =
            targetLang.value;


        if (sourceCode === "auto") {

            sourceLangLabel.textContent =
                "Detect language";

        } else {

            sourceLangLabel.textContent =
                getLanguageName(
                    sourceCode
                );

        }


        targetLangLabel.textContent =
            getLanguageName(
                targetCode
            );

    }


    // ============================================================
    // TEXT TRANSLATION
    // ============================================================

    async function translate() {

        const text =
            sourceText.value.trim();

        const source =
            sourceLang.value;

        const target =
            targetLang.value;


        // Empty text

        if (!text) {

            targetText.textContent = "";

            detectedTag.hidden = true;

            hideError();

            return;

        }


        // Same language

        if (
            source !== "auto" &&
            source === target
        ) {

            targetText.textContent =
                text;

            detectedTag.hidden = true;

            return;

        }


        try {

            isTranslating = true;

            showLoading();

            hideError();


            const result =
                await API.translate(
                    text,
                    source,
                    target
                );


            targetText.textContent =
                result.translated_text || "";


            // Auto detection indicator

            if (source === "auto") {

                detectedTag.hidden = false;

                detectedTag.textContent =
                    "Auto detected";

            } else {

                detectedTag.hidden = true;

            }


        } catch (error) {

            console.error(
                "Translation error:",
                error
            );


            targetText.textContent = "";

            showError(
                error.message ||
                "Translation failed."
            );


        } finally {

            isTranslating = false;

            hideLoading();

        }

    }


    // ============================================================
    // LIVE TRANSLATION
    // ============================================================

    function scheduleTranslation() {

        clearTimeout(
            translationTimer
        );


        const text =
            sourceText.value.trim();


        if (!text) {

            targetText.textContent = "";

            return;

        }


        // Wait 700ms

        translationTimer =
            setTimeout(() => {

                translate();

            }, 700);

    }


    // ============================================================
    // IMAGE TRANSLATION
    // ============================================================

    async function translateImage(file) {

        // --------------------------------------------------------
        // Check image
        // --------------------------------------------------------

        if (!file) {

            showToast(
                "Please select an image."
            );

            return;

        }


        // --------------------------------------------------------
        // Check target language
        // --------------------------------------------------------

        const target =
            targetLang.value;


        if (!target) {

            showToast(
                "Please select target language."
            );

            return;

        }


        // --------------------------------------------------------
        // Validate image
        // --------------------------------------------------------

        if (
            !file.type ||
            !file.type.startsWith("image/")
        ) {

            showError(
                "Please select a valid image file."
            );

            return;

        }


        // --------------------------------------------------------
        // Create FormData
        // --------------------------------------------------------

        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        formData.append(
            "target",
            target
        );


        try {

            // ----------------------------------------------------
            // Loading
            // ----------------------------------------------------

            showLoading();

            hideError();

            detectedTag.hidden = true;


            // ----------------------------------------------------
            // Show status
            // ----------------------------------------------------

            targetText.textContent =
                "Reading image and translating...";


            // ----------------------------------------------------
            // Send image to FastAPI
            // ----------------------------------------------------

            const endpointUrl = typeof BASE_URL !== "undefined" && BASE_URL ? `${BASE_URL}/api/image-translate` : (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http") ? `${window.location.origin}/api/image-translate` : "http://localhost:8000/api/image-translate");

            const response =
                await fetch(
                    endpointUrl,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            // ----------------------------------------------------
            // Read response
            // ----------------------------------------------------

            let result;


            try {

                result =
                    await response.json();

            } catch (error) {

                throw new Error(
                    "Invalid response from backend."
                );

            }


            // ----------------------------------------------------
            // Backend error
            // ----------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    result.detail ||
                    "Image translation failed."
                );

            }


            // ----------------------------------------------------
            // Show translated result
            // ----------------------------------------------------

            targetText.textContent =
                result.translated_text || "";


            // ----------------------------------------------------
            // Show detected language
            // ----------------------------------------------------

            if (
                result.detected_language
            ) {

                detectedTag.hidden = false;

                detectedTag.textContent =
                    "Detected: " +
                    result.detected_language;

            } else {

                detectedTag.hidden = false;

                detectedTag.textContent =
                    "Image translated";

            }


            // ----------------------------------------------------
            // Optional: show OCR text in console
            // ----------------------------------------------------

            console.log(
                "OCR Text:",
                result.extracted_text
            );


            console.log(
                "Translated Text:",
                result.translated_text
            );


            showToast(
                "Image translated successfully!"
            );


        } catch (error) {

            console.error(
                "Image translation error:",
                error
            );


            targetText.textContent = "";


            showError(
                error.message ||
                "Image translation failed."
            );


        } finally {

            hideLoading();

        }

    }


    // ============================================================
    // IMAGE INPUT EVENT
    // ============================================================

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            async (event) => {

                const file =
                    event.target.files[0];


                if (!file) {
                    return;
                }


                await translateImage(
                    file
                );


                // Allow selecting same image again

                imageInput.value = "";

            }
        );

    }


    // ============================================================
    // SOURCE TEXT INPUT
    // ============================================================

    sourceText.addEventListener(
        "input",
        () => {

            updateCharacterCount();

            scheduleTranslation();

        }
    );


    // ============================================================
    // SOURCE LANGUAGE CHANGE
    // ============================================================

    sourceLang.addEventListener(
        "change",
        () => {

            updateLanguageLabels();


            if (
                sourceText.value.trim()
            ) {

                translate();

            }

        }
    );


    // ============================================================
    // TARGET LANGUAGE CHANGE
    // ============================================================

    targetLang.addEventListener(
        "change",
        () => {

            updateLanguageLabels();


            if (
                sourceText.value.trim()
            ) {

                translate();

            }

        }
    );


    // ============================================================
    // SWAP LANGUAGES
    // ============================================================

    swapBtn.addEventListener(
        "click",
        () => {

            const currentSource =
                sourceLang.value;

            const currentTarget =
                targetLang.value;


            if (currentSource === "auto") {

                showToast(
                    "Source language is set to auto-detect."
                );

                return;

            }


            // Swap dropdowns

            sourceLang.value =
                currentTarget;

            targetLang.value =
                currentSource;


            updateLanguageLabels();


            // Swap text

            const currentSourceText =
                sourceText.value;

            const currentTargetText =
                targetText.textContent;


            sourceText.value =
                currentTargetText;

            targetText.textContent =
                currentSourceText;


            updateCharacterCount();


            // Translate again

            if (
                sourceText.value.trim()
            ) {

                translate();

            }

        }
    );


    // ============================================================
    // CLEAR
    // ============================================================

    clearBtn.addEventListener(
        "click",
        () => {

            sourceText.value = "";

            targetText.textContent = "";

            detectedTag.hidden = true;

            updateCharacterCount();

            hideError();

            sourceText.focus();

        }
    );


    // ============================================================
    // COPY
    // ============================================================

    copyBtn.addEventListener(
        "click",
        async () => {

            const text =
                targetText.textContent.trim();


            if (!text) {

                showToast(
                    "Nothing to copy."
                );

                return;

            }


            try {

                await navigator.clipboard.writeText(
                    text
                );

                showToast(
                    "Translation copied!"
                );

            } catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

                showToast(
                    "Could not copy translation."
                );

            }

        }
    );


    // ============================================================
    // FAVORITES
    // ============================================================

    starBtn.addEventListener(
        "click",
        () => {

            const isPressed =
                starBtn.getAttribute(
                    "aria-pressed"
                ) === "true";


            starBtn.setAttribute(
                "aria-pressed",
                String(!isPressed)
            );


            if (!isPressed) {

                showToast(
                    "Added to favorites."
                );

            } else {

                showToast(
                    "Removed from favorites."
                );

            }

        }
    );


    // ============================================================
    // SOURCE LANGUAGE BUTTON
    // ============================================================

    sourceLangBtn.addEventListener(
        "click",
        () => {

            sourceLang.focus();

            sourceLang.click();

        }
    );


    // ============================================================
    // TARGET LANGUAGE BUTTON
    // ============================================================

    targetLangBtn.addEventListener(
        "click",
        () => {

            targetLang.focus();

            targetLang.click();

        }
    );


    // ============================================================
    // CTRL + ENTER
    // ============================================================

    sourceText.addEventListener(
        "keydown",
        (event) => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                clearTimeout(
                    translationTimer
                );

                translate();

            }

        }
    );


    // ============================================================
    // CHARACTER COUNT
    // ============================================================

    function updateCharacterCount() {

        const length =
            sourceText.value.length;


        charCount.textContent =
            `${length} / 5000`;

    }


    // ============================================================
    // ERROR
    // ============================================================

    function showError(message) {

        errorBanner.textContent =
            message;

        errorBanner.hidden = false;

    }


    function hideError() {

        errorBanner.textContent = "";

        errorBanner.hidden = true;

    }


    // ============================================================
    // LOADING
    // ============================================================

    function showLoading() {

        if (shimmerBar) {

            shimmerBar.classList.add(
                "active"
            );

        }


        if (liveIndicator) {

            liveIndicator.style.opacity =
                "0.6";

        }

    }


    function hideLoading() {

        if (shimmerBar) {

            shimmerBar.classList.remove(
                "active"
            );

        }


        if (liveIndicator) {

            liveIndicator.style.opacity =
                "1";

        }

    }


    // ============================================================
    // TOAST
    // ============================================================

    function showToast(message) {

        toast.textContent =
            message;

        toast.classList.add(
            "show"
        );


        clearTimeout(
            toastTimer
        );


        toastTimer =
            setTimeout(() => {

                toast.classList.remove(
                    "show"
                );

            }, 2000);

    }


    // ============================================================
    // INITIALIZATION
    // ============================================================

    updateCharacterCount();

    loadLanguages();

});