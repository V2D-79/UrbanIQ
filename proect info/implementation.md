# Implementation Details

GhostGrid is implemented using a modular approach that separates frontend interactivity from backend data processing.

## 📡 Backend API Implementation (`app.py`)

The Flask server provides a RESTful API for the frontend.

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/components` | `GET` | Retrieve list of all grid components. |
| `/api/components` | `POST` | Add a new component to the grid. |
| `/api/components/<id>` | `DELETE` | Remove a component (and its connections). |
| `/api/connections` | `POST` | Link two components via power lines. |
| `/api/metrics` | `GET` | Calculate system-wide health and utilization. |
| `/api/weather/current`| `GET` | Fetch live weather for a specific lat/lng. |

## 🗺️ Leaflet Integration (`static/js/main.js`)

- **Map Layers:** Supports Satellite, OpenStreetMap, and Topographical views.
- **Drawing Manager:** Uses `Leaflet.Draw` for zone creation (polygons).
- **Custom Icons:** Dynamic FontAwesome icons based on component type (e.g., `fa-bolt` for transformers).
- **Interactive Popups:** Custom HTML templates embedded in map popups to display real-time component data.

## 🎨 UI/UX Design Implementation

- **Theme:** Dark Futuristic Grid (Neon Blue + Electric Colors).
- **Responsiveness:** Uses CSS Flexbox/Grid to ensure the dashboard works on both large monitors and tablets.
- **Component Panel:** A collapsible sidebar in the Canvas page for efficient management of hundreds of components.

## 🧠 Risk logic

Risk is calculated dynamically on the frontend/backend for predictions:
```javascript
// Example Simulation Logic
failure_probability = (load_percentage * 0.6) + (temperature_factor * 0.4)
```
- **High Risk (> 80):** Displayed in Red.
- **Medium Risk (50-80):** Displayed in Orange.
- **Low Risk (< 50):** Displayed in Green.
