# BigQuery Release Pulse Dashboard

A premium, operations-control-room style real-time dashboard built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. The application pulls the Google Cloud BigQuery RSS/Atom release notes feed, parses/segments bulk entries into discrete updates, and enables users to search, filter, and share individual items directly to Twitter/X with character-limit validation.

---

## 🚀 Key Features

*   **Granular Release Parsing**: Uses `BeautifulSoup4` in the Flask backend to dissect daily update posts by `<h3>` tags, exposing individual features, fixes, and changes as separate interactive cards.
*   **Aesthetic Telemetry Interface**: Implements a slate-dark glassmorphic design featuring custom neon glow effects, page entry transitions, custom scrollbars, and SVG telemetry stats counters.
*   **Reactive Filters & Search**: Offers instantaneous client-side searching and type-specific filter chips (Features, Issues, Changes, Deprecations) without full page reloads.
*   **Custom Tweet Composer**: Provides an in-app share modal that formats text preview templates, cleans HTML tags, checks character limits (280 max), and drives a dynamic SVG character progress circle that alerts when near or exceeding limits.

---

## 🛠️ Technology Stack

*   **Backend**: Python 3.13.x, Flask, Requests, BeautifulSoup4
*   **Frontend**: HTML5, Vanilla CSS3 (custom variables, blur filters), ES6 JavaScript
*   **Icons**: Google Material Symbols Outlined

---

## 📂 Project Directory Structure

```text
bigquery-releases-app/
├── app.py                 # Flask server & RSS feed parser controller
├── requirements.txt       # Python dependencies
├── .gitignore             # Git ignore file (cache, venv, log files)
├── README.md              # Project documentation
├── templates/
│   └── index.html         # Main dashboard template
└── static/
    ├── style.css          # Glassmorphic layout stylesheet
    └── app.js             # Client controller (fetch, search, tweet modal)
```

---

## 💻 Setup & Run Locally

### 1. Prerequisites
Ensure Python 3.x is installed on your machine.

### 2. Install Dependencies
Run pip inside the project folder:
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
Execute the Flask backend application:
```bash
python app.py
```

Open your browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🌐 GitHub Repository
This project is published on GitHub:
*   [https://github.com/Himanshpapnai/antigravity-event-talks-app](https://github.com/Himanshpapnai/antigravity-event-talks-app)
