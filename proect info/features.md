# GhostGrid: Features & Capabilities

GhostGrid is packed with professional-grade features for infrastructure management.

## 🚀 Main Features

1.  **Visual Digital Twin Builder (Canvas):**
    - Click-to-place component system on Leaflet maps.
    - Multiple component types with specific icons and properties.
    - Path and Connection linking between components (Transmission/Distribution lines).
    - Polygon-based Zone creation for area management.

2.  **AI-Powered Risk Prediction:**
    - Real-time risk scoring based on Load and Temperature.
    - Visual indicators (Green, Orange, Red) for component health.
    - Automated failure probability calculation.

3.  **Dynamic Weather Monitoring:**
    - OpenWeatherMap API integration for live weather tracking.
    - Weather impact analysis on grid components.
    - Automated weather logging for historical analysis.

4.  **Local Data Ecosystem:**
    - Local CSV storage (No external database).
    - Export/Import capabilities for grid data.
    - Auto-initialization of data structures on startup.

## 📄 File-wise Features

### Backend (`app.py`)
- **API Management:** Services data for components, connections, zones, and metrics.
- **CSV Handling:** Efficient reading and writing using `csv.DictWriter`.
- **System Metrics:** Logic to calculate total capacity, utilization, and health scores.
- **Weather Proxy:** Fetches live weather data from OpenWeatherMap.

### Frontend Logic (`static/js/`)
- **`main.js`**: Core Leaflet map initialization, event handling for adding components, and map marker management.
- **`dashboard.js`**: Handles charting (Chart.js) and real-time metric updates on the prediction page.
- **`utils.js`**: Reusable helper functions for UI notifications and data formatting.

### User Interface (`templates/`)
- **`index.html`**: Professional landing page with hero sections and feature walkthroughs.
- **`canvas.html`**: The primary Digital Twin editor with sidebar controls and full-screen map.
- **`dashboard.html`**: A clean, data-driven view for monitoring system-wide performance and risks.
- **`weather.html`**: Dedicated monitoring for environmental impacts on the infrastructure.
