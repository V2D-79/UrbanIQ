# Data Structure & Storage

GhostGrid prioritizes simplicity and performance by using a **CSV-first storage architecture**. This eliminates the need for complex database setups while ensuring data portability.

## 📂 CSV Schema Details

### 1. `components.csv`
This file stores every infrastructure component in the grid.
- **Key Fields:** `id`, `name`, `type`, `lat`, `lng`, `status`, `created_at`, `updated_at`.
- **Component Specifics:** Includes fields like `capacity_kva`, `oil_level`, `panel_type`, `peak_power`, etc.

### 2. `connections.csv`
Defines how components are linked together (e.g., Transformer connected to a Solar Plant).
- **Key Fields:** `id`, `from_id`, `to_id`, `line_type`, `capacity_kw`, `length_km`, `voltage_kv`, `color`.

### 3. `zones.csv`
Stores polygon data for geographic regions or service areas.
- **Key Fields:** `id`, `name`, `coordinates` (JSON string), `population`, `area_sqkm`, `description`.

### 4. `weather_log.txt`
A plain text log file recording weather conditions over time.
- **Format:** `timestamp`, `component_id`, `name`, `lat`, `lng`, `temperature`, `humidity`, `pressure`, `wind_speed`, `conditions`.

## 🔄 Automatic Initialization

On startup, the system checks for the existence of these files. If they are missing, `app.py` automatically creates the directories and initializes the CSV files with the correct headers.

## 💾 Storage Rules
- **No SQLite/MySQL:** Pure flat-file storage for maximum portability.
- **Real-time Persistence:** Every action on the map (Add/Edit/Delete) is immediatey synced to the local CSV.
- **JSON Serialization:** Complex structures like map coordinates are stored as stringified JSON within CSV fields.
