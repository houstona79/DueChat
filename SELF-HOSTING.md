# Moving DueChat to your own server

This moves the whole app — website, accounts, messages, rooms, photos — onto an
Ubuntu/Debian server you control, using Docker. Plan on 1–2 hours.

**What you need**

- A Linux VPS with at least 2 GB RAM (4 GB is comfortable)
- Docker and Docker Compose installed
- Your domain (e.g. `app.duechat.com`) pointing at the server's IP
- The DueChat code (connect GitHub in Lovable: Project Settings → Git, then
  `git clone` your repository on the server)

---

## Step 1 — Export your data from Lovable

1. In Lovable, open **More → Database → Manage → Settings → Export data** and
   download the export. It contains your full database (schema + rows).
2. Save it on your computer for now — you'll import it in Step 4.

> **Heads-up about passwords:** for security, member passwords can never be
> exported from any system. After the move, each member uses **Forgot
> password** once to set a new password on the new server. Everything else
> (profiles, messages, rooms, buddies, gifts) carries over.

## Step 2 — Prepare the server

```sh
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out and back in after this

# Get the code
git clone <your-github-repo-url> duechat
cd duechat
```

## Step 3 — Configure

```sh
cd deploy
cp .env.example .env
nano .env
```

- Set `SITE_URL` and `API_EXTERNAL_URL` to your real domain
  (`https://app.duechat.com` and `https://app.duechat.com/api`).
- Generate secrets: `openssl rand -base64 32` — one each for
  `POSTGRES_PASSWORD`, `JWT_SECRET`, `SECRET_KEY_BASE`.
- Run `./generate-keys.sh` and paste the two printed keys into `ANON_KEY` and
  `SERVICE_ROLE_KEY`.
- Fill in the SMTP settings so confirmation and password-reset emails send.

## Step 4 — Import your data

1. Unzip the export from Step 1. Place the SQL file(s) into `deploy/schema/`
   (create the folder). Anything in that folder runs automatically the first
   time the database starts.
2. Start just the database, let it import, then start everything:

```sh
docker compose up -d db
# wait ~30 seconds for the import, then:
docker compose up -d
```

## Step 5 — Put it behind HTTPS

Install Caddy (simplest option) and point it at the app:

```sh
sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
app.duechat.com {
    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

```sh
sudo systemctl reload caddy
```

Caddy gets and renews the HTTPS certificate automatically.

## Step 6 — Verify

1. Open `https://app.duechat.com` — the site should load.
2. Register a test account, confirm the email arrives, send a message.
3. Have a member use **Forgot password** to reclaim their old account.

## Step 7 — Switch the desktop apps

The Mac/Windows/Linux apps load `https://app.duechat.com`, so once your domain
serves the new server, existing installs follow automatically — members don't
need to reinstall anything.

---

## Day-to-day

| Task | Command |
| --- | --- |
| Update to latest code | `git pull && docker compose up -d --build app` |
| View logs | `docker compose logs -f app` |
| Back up the database | `docker compose exec db pg_dump -U postgres postgres > backup.sql` |
| Stop everything | `docker compose down` |

## What stays on Lovable

Nothing is required. Once your server is verified working, you can keep the
Lovable project as your editing environment (changes sync to GitHub, and your
server pulls them), or stop using it entirely.
