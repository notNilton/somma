# External Health Check & Uptime Monitoring

Somma exposes standardized health check endpoints designed for uptime monitors such as **UptimeRobot**, **Better Uptime**, or **Datadog Synthetics**:

- `GET /healthz` (Standard Kubernetes & Infrastructure Health Check)
- `GET /api/health`
- `GET /api/healthz`

### Response Payload
HTTP Status: `200 OK` (or `503 Service Unavailable` if PostgreSQL connection is severed)
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.60",
  "migrationVersion": "32"
}
```

### UptimeRobot Setup Instructions

1. **Log in** to your [UptimeRobot Dashboard](https://uptimerobot.com).
2. Click **+ Add New Monitor**.
3. Fill in the monitor settings:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Somma API Healthz`
   - **URL (or IP):** `https://api.yourdomain.com/healthz` (or `https://yourdomain.com/healthz`)
   - **Monitoring Interval:** `5 minutes` (or `1 minute` for PRO)
   - **Monitor Timeout:** `30 seconds`
4. **Advanced Settings & Keyword Checking (Optional but recommended):**
   - Under **Keyword**, select `Keyword Exists` and input `"status":"ok"`.
5. Select your notification contacts (Email, Slack, Discord, Telegram, SMS) to receive instant alerts when downtime is detected.
6. Click **Create Monitor**.
