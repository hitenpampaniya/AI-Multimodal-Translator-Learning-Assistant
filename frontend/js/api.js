/**
 * api.js
 * -------
 * Frontend API wrapper for FastAPI backend.
 *
 * Frontend
 *    ↓
 * api.js
 *    ↓
 * FastAPI
 *    ↓
 * /api/translate
 * /api/languages
 */


const API = (() => {

  // --------------------------------------------------
  // FastAPI backend URL
  // --------------------------------------------------

  const BASE_URL = "http://localhost:8000";


  // --------------------------------------------------
  // Common request function
  // --------------------------------------------------

  async function request(path, options = {}) {

    try {

      const response = await fetch(
        `${BASE_URL}${path}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
          },

          ...options
        }
      );


      // ----------------------------------------------
      // Handle HTTP errors
      // ----------------------------------------------

      if (!response.ok) {

        let detail = `Request failed (${response.status})`;

        try {

          const body = await response.json();

          if (body.detail) {
            detail = body.detail;
          }

        } catch (error) {

          // Response does not contain JSON
          console.error(
            "Could not read error response:",
            error
          );
        }

        throw new Error(detail);
      }


      // ----------------------------------------------
      // Return JSON response
      // ----------------------------------------------

      return await response.json();

    } catch (error) {

      console.error(
        "API request error:",
        error
      );

      throw error;
    }
  }


  // --------------------------------------------------
  // Translation
  // --------------------------------------------------

  /**
   * Translate text.
   *
   * Backend:
   * POST /api/translate
   *
   * Request:
   * {
   *   text: "Hello",
   *   source: "en",
   *   target: "hi"
   * }
   *
   * Response:
   * {
   *   translated_text: "नमस्ते"
   * }
   */

  async function translate(text, source, target) {

    if (!text || !text.trim()) {

      throw new Error(
        "Please enter text to translate."
      );
    }


    if (!source) {

      throw new Error(
        "Source language is required."
      );
    }


    if (!target) {

      throw new Error(
        "Target language is required."
      );
    }


    return await request(
      "/api/translate",
      {
        method: "POST",

        body: JSON.stringify({
          text: text,
          source: source,
          target: target
        })
      }
    );
  }


  // --------------------------------------------------
  // Get supported languages
  // --------------------------------------------------

  /**
   * Get all languages supported by backend.
   *
   * Backend:
   * GET /api/languages
   */

  async function getLanguages() {

    return await request(
      "/api/languages",
      {
        method: "GET"
      }
    );
  }


  // --------------------------------------------------
  // Test backend connection
  // --------------------------------------------------

  /**
   * Check whether FastAPI backend is running.
   *
   * Backend:
   * GET /
   */

  async function checkConnection() {

    return await request(
      "/",
      {
        method: "GET"
      }
    );
  }


  // --------------------------------------------------
  // Public API
  // --------------------------------------------------

  return {

    translate,
    getLanguages,
    checkConnection

  };

})();