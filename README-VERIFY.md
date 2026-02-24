Local verification server (free)

Quick start (local):

1. Install Node.js (if not installed): https://nodejs.org/
2. From the project folder run:

```bash
npm install
npm start
```

3. The server listens on `http://localhost:5000` by default.

API:
- GET /health -> { ok: true }
- POST /verify  { name, pseudocode } -> { valid: true } or { valid: false, message }

Edit `pseudocodes.json` to add the pseudocodes the admin distributes.

Free deployments options:
- Replit: import the repo, set the run command to `npm install && npm start` (free tier runs small servers).
- Render: Free web services for hobby projects (connect GitHub repo and use `npm start`).
- Fly.io / Railway / Render have free tiers — choose one you prefer; deployment instructions vary.

Security note: This example is intentionally minimal and not hardened. For production, add authentication, rate-limiting and validation.
