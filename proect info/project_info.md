# Project Info: GhostGrid Digital Twin Platform

**GhostGrid** is an AI-powered Digital Twin Platform designed specifically for **Power Infrastructure**. It allows electricity departments and grid operators to build, monitor, and manage a synchronized virtual replica of their physical electrical grid on an interactive map.

## 🛠️ Tech Stack (Strict Requirements)

- **Backend:** [Python Flask](https://flask.palletsprojects.com/)
- **Frontend:** [HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML), [CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS), [Vanilla JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- **Map Engine:** [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/)
- **Storage:** Local [CSV](https://en.wikipedia.org/wiki/Comma-separated_values) Files (No database required)
- **Architecture:** MVC-style separation for clean and modular development.

## ⚙️ Core Philosophy

GhostGrid uses a **Digital Twin approach**, meaning every physical component in the real-world power grid (Transformer, Substation, Solar Plant, etc.) has its digital counterpart in the platform. This allows for:
- **Visual Grid Building:** Placing components visually on a map.
- **Local Data Management:** Storing data efficiently in simple CSV/TXT files.
- **Fail-safe Logic:** Automatic CSV initialization if files are missing.
- **High Performance:** Lightweight backend with fast frontend interactions.

## 👥 Targeted Users

- **Electricity Departments:** For city-wide grid monitoring.
- **Maintenance Engineers:** To identify high-risk components before they fail.
- **Urban Planners:** To simulate future grid expansions using the Digital Twin Canvas.
