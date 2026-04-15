# GhostGrid Project Structure

The project follows a clean and modular **MVC-style (Model-View-Controller)** structure, ensuring scalability.

## 📂 Folder Tree

```text
Ghost-Gride/
└── Ghost Gride/
    ├── app.py                  # Main Flask Server (Controller)
    ├── requirements.txt        # Dependencies
    ├── setup.py                # Project setup configuration
    ├── populate_data.py        # Utility to generate mock data
    │
    ├── data/                   # Data Storage (Model)
    │   ├── components.csv      # Grid components data
    │   ├── connections.csv     # Connection links data
    │   ├── zones.csv           # Geographic zones data
    │   └── weather_log.txt     # Historical weather logs
    │
    ├── static/                 # Static Assets
    │   ├── css/
    │   │   └── style.css       # Main theme (Dark Futuristic Grid)
    │   ├── js/
    │   │   ├── main.js         # Core Canvas logic
    │   │   ├── dashboard.js    # Prediction & charting logic
    │   │   └── utils.js        # Helper utilities
    │   └── images/             # Icons & Illustrations
    │
    ├── templates/              # HTML Views (View)
    │   ├── base.html           # Layout with Shared Navbar
    │   ├── index.html          # Landing Page (Home)
    │   ├── canvas.html         # Digital Twin Editor
    │   ├── dashboard.html      # Prediction Page
    │   └── weather.html        # Monitoring Page
    │
    ├── config/                 # Environment and app configuration
    ├── models/                 # Logic for data models
    ├── utils/                  # Python utility scripts
    └── logs/                   # Server side logs
```

## 📝 File Descriptions

- **`app.py`**: The central brain of the application. It handles routing, API calls, and local file I/O.
- **`data/`**: Serves as the persistent storage layer. All grid components are saved here in real-time.
- **`static/js/main.js`**: Manages the Leaflet map, marker placement, and user interaction on the canvas.
- **`static/css/style.css`**: Defines the "Neon-Future" aesthetic, using dark backgrounds with blue/electric highlights.
- **`templates/base.html`**: Ensures a consistent look and feel with a sticky, responsive navigation bar.
