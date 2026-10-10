# Cinema Connects frontend

React and TypeScript frontend for the Cinema Connects daily film-collaboration game.

## Local development

Requires Node 22 or newer.

```sh
cp .env.example .env.local
npm ci
npm run dev
```

The app is served at `http://localhost:5173`. Set `VITE_API_BASE_URL` to the backend API root; it defaults to `/api`.

## Quality checks

```sh
npm run lint
npm test
npm run build
```

## Container

The production image builds the static bundle and serves it with nginx. Client-side routes fall back to `index.html`.

```sh
docker build --build-arg VITE_API_BASE_URL=/api -t frequent-flyers-fe .
docker run --rm -p 8080:80 frequent-flyers-fe
```

## Structure

- `src/api`: the typed API boundary; transport payloads should be adapted here.
- `src/providers`: application-wide providers.
- `src/components`: shared layout and interface elements.
- `src/pages`: route-level components.

The daily challenge is currently a visual shell. It intentionally does not fake API behaviour or persistence.
