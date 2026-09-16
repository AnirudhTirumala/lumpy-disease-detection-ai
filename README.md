# LumpyAI deployment

LumpyAI has two deployable services:

- `frontend-web`: the Next.js application, authentication, MongoDB API, and Socket.IO server.
- `backend`: the Flask/YOLO inference API. Its model is tracked at `backend/models/best.pt`.

## Recommended: deploy the complete application on Render

The root [`render.yaml`](render.yaml) is a Blueprint that creates both services. The ML API is private, so only the web application can call it. It uses one Gunicorn worker to avoid loading the YOLO model more than once, and the scanner uses Render's private network rather than a public inference URL.

1. Commit and push this repository. Do not omit `backend/models/best.pt`.
2. In Render, choose **New → Blueprint**, select the repository, and keep `render.yaml` as the Blueprint path.
3. Supply the requested secrets:
   - `MONGODB_URI`: a MongoDB Atlas connection string (allow Render's outbound connections in Atlas).
   - `NEXT_PUBLIC_BASE_URL`: the final `https://...onrender.com` URL or custom domain for `lumpy-ai-web`.
   - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` to enable email OTP and reset links.
   - `FAST2SMS_API_KEY` only if SMS verification is wanted.
4. Deploy. Render generates `SESSION_SECRET` and injects the ML service's private hostname automatically.

The ML service needs the `1c-2g` plan because PyTorch/YOLO needs more memory than a small free instance. The public web service can start on the free plan. Render supports the persistent Socket.IO connection used by this project.

## Vercel option

Vercel can host `frontend-web` while Render hosts the ML API. Import the repository into Vercel and set **Root Directory** to `frontend-web`; [`frontend-web/vercel.json`](frontend-web/vercel.json) supplies the build settings.

Set these Vercel environment variables: `MONGODB_URI`, `MONGODB_DB_NAME`, `SESSION_SECRET`, `ML_BACKEND_URL` (the public Render ML URL), `NEXT_PUBLIC_BASE_URL`, and the email/SMS variables as needed. Use the same `SESSION_SECRET` for every deployment environment that must honor existing login cookies.

Vercel Functions reject request bodies over 4.5 MB, so the scanner route now validates images at 4 MB. For the complete real-time Socket.IO experience and larger uploads, use the Render Blueprint deployment.

## Local run

Copy each `.env.example` to `.env.local` / `.env`, fill the values, then run:

```powershell
# terminal 1
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py

# terminal 2
cd frontend-web
npm ci
npm run dev
```

Visit `http://localhost:3000`. The ML readiness endpoint is `http://localhost:5000/health`.
