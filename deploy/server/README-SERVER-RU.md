# Перенос Asset-Manager на свой сервер

Архив содержит **исходники, node_modules, собранные dist** — после распаковки и настройки `.env` приложение работает как на Vercel (та же БД Neon = те же пользователи и данные).

## Требования

- **Linux** (Ubuntu 22.04+ / Debian 12+) или macOS для теста
- **Node.js 20+** и **npm**
- **nginx** (рекомендуется) или другой reverse proxy
- **PostgreSQL** — можно оставить **Neon** (скопируйте `DATABASE_URL` из текущего prod)

## Быстрый старт

```bash
# 1. Распаковать
unzip Asset-Manager-server-YYYYMMDD.zip -d /opt
cd /opt/Asset-Manager-server-YYYYMMDD   # или переименуйте в /opt/Asset-Manager

# 2. Настроить окружение
cp deploy/server/env.template deploy/server/.env
nano deploy/server/.env   # DATABASE_URL, PUBLIC_URL, ALLOWED_ORIGINS

# 3. Пересобрать фронт под ваш домен (если меняли PUBLIC_URL)
chmod +x deploy/server/*.sh
./deploy/server/install.sh

# 4. Запустить API
./deploy/server/start-api.sh
# Проверка: curl http://127.0.0.1:3000/health

# 5. nginx — см. deploy/server/nginx.conf.example
sudo cp deploy/server/nginx.conf.example /etc/nginx/sites-available/proptech
# отредактировать server_name и root
sudo ln -s /etc/nginx/sites-available/proptech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Переменные (.env)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL (Neon с `?sslmode=require`) |
| `PUBLIC_URL` | URL сайта без `/` на конце |
| `ALLOWED_ORIGINS` | То же для CORS |
| `PORT` | Порт API (3000) |

Фронт при сборке получает `VITE_API_URL=${PUBLIC_URL}/api`. Nginx проксирует `/api/*` на Express (префикс `/api` снимается в коде API).

## Автозапуск (systemd)

```bash
sudo cp deploy/server/systemd/proptech-api.service /etc/systemd/system/
# поправьте пути User/WorkingDirectory под ваш каталог
sudo systemctl daemon-reload
sudo systemctl enable --now proptech-api
```

## Миграции БД

При старте API вызывается `runMigrations()` — новые SQL из `artifacts/api-server/drizzle/migrations/` применятся автоматически. **Не удаляйте** таблицу `users`.

## Безопасность

- Файл `.env` **не включён** в архив — перенесите секреты вручную.
- Не коммитьте `.env` в git.
- Для HTTPS: certbot + Let's Encrypt на nginx.

## Структура

| Компонент | Путь |
|-----------|------|
| API (Express) | `artifacts/api-server/dist/index.mjs` |
| Миграции | `artifacts/api-server/drizzle/migrations/` |
| Frontend (статика) | `artifacts/proptech/dist/` |
| Скрипты | `deploy/server/` |

## Troubleshooting

- **401/ CORS** — `ALLOWED_ORIGINS` должен совпадать с URL в браузере.
- **500 на login** — проверьте `DATABASE_URL` и что миграции прошли (логи API).
- **Фронт не видит API** — пересоберите: `./deploy/server/install.sh` после смены `PUBLIC_URL`.
