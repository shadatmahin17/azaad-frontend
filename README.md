# azaad-frontend

Azaad premium music frontend, configured for Vercel deployment with Vite + React.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

### Environment variables

- `VITE_API_BASE_URL`: Backend base URL used by song fetch requests.
- `VITE_API_KEY`: Optional API key sent as `x-api-key` header.

> Security note: avoid hardcoding production API keys in frontend source files.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repository in Vercel.
3. Vercel will detect `vercel.json` and use:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.
