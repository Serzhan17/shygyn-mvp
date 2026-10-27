# Как опубликовать Shygyn на Render (React + Django + PostgreSQL)

Этот архив — версия MVP с настройками для размещения на Render. Для тестирования, **не для хранения реальных финансовых данных**: перед полноценным публичным запуском нужны аудит безопасности, ограничение попыток входа, безопасная сессия/токены, резервное копирование, политика конфиденциальности и проверка правовых требований.

Схема: GitHub-репозиторий -> Render PostgreSQL + Web Service Django + Static Site React.

## 1. Отправьте исходники в GitHub

Распакуйте ZIP и откройте PowerShell в папке `Shygyn_MVP_Public`:

```powershell
git init
git add .
git commit -m "Prepare Shygyn MVP for Render"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shygyn-mvp.git
git push -u origin main
```

Создайте пустой репозиторий `shygyn-mvp` на github.com **до** исполнения `git push`. Для приватного репозитория тоже возможно подключение Render. Не загружайте `.env`, секреты или SQLite-файл; `.gitignore` исключает их.

## 2. Создайте PostgreSQL

В dashboard.render.com: `New` -> `Postgres`, имя `shygyn-db`, регион, тариф. Скопируйте **Internal Database URL** (не выкладывайте его в GitHub). Выбирайте тот же регион, что для Django.

**Важно:** Бесплатная Render PostgreSQL удаляется после окончания 30-дневного срока, если не перейти на платный тариф. Для долгого хранения финансовых операций выберите постоянное хранилище и настройте резервное копирование.

## 3. Разместите Django API

В Render: `New` -> `Web Service` -> выберите репозиторий `shygyn-mvp`.

| Поле Render | Значение |
|---|---|
| Name | `shygyn-api` (или уникальное имя) |
| Language | `Python` |
| Root Directory | `backend` |
| Build Command | `bash build.sh` |
| Start Command | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |
| Health Check Path | `/api/health/` |
| Plan | Free для теста, платный для стабильной эксплуатации |

Добавьте переменные окружения (раздел Environment):

| Name | Value |
|---|---|
| `DJANGO_DEBUG` | `0` |
| `DJANGO_SECRET_KEY` | длинная случайная строка, созданная генератором секретов |
| `DATABASE_URL` | Internal Database URL из шага 2 |
| `CORS_ALLOWED_ORIGINS` | временно `https://example.com`, после шага 4 заменить адресом сайта |

Настройка `RENDER_EXTERNAL_HOSTNAME` автоматически добавляет точное имя API в `ALLOWED_HOSTS` (для Render). Не создавайте публично аккаунт `demo@shygyn.kz` командой `seed_demo`.

После `Deploy` получите реальный адрес API, например `https://shygyn-api.onrender.com`. Это **только пример**, ваш адрес может отличаться. Проверьте:

`https://ВАШ-API.onrender.com/api/health/`

Должен появиться JSON с `"status":"ok"`.

## 4. Разместите React

В Render: `New` -> `Static Site` -> тот же репозиторий:

| Поле Render | Значение |
|---|---|
| Name | `shygyn-app` (или уникальное имя) |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Перед сборкой в Environment добавьте:

```
VITE_API_BASE_URL=https://ВАШ-API.onrender.com/api
```

Это **полный HTTPS адрес Django API с `/api` в конце** (без `/` после `api`). Нажмите Deploy.

После сборки сайт получит уникальную ссылку, например `https://shygyn-app.onrender.com`. Эту ссылку можно отправлять тестировщикам.

## 5. Разрешите запросы с сайта к Django

Вернитесь в Render -> `shygyn-api` -> Environment и замените значение:

```
CORS_ALLOWED_ORIGINS=https://ВАШ-САЙТ.onrender.com
```

Важны точный HTTPS-адрес, отсутствие пути и завершающего `/`. Сохраните и дождитесь перезапуска API.

## 6. Проверьте

1. Откройте публичную ссылку сайта в режиме инкогнито.
2. Зарегистрируйте тестовый аккаунт (не настоящий финансовый профиль).
3. Создайте счёт, расход и бюджет. Обновите страницу — данные должны сохраниться.
4. Откройте сайт с телефона по той же ссылке.
5. Проверьте, что сервер `/api/health/` отвечает, если UI сообщает об ошибке соединения.

## Частые ошибки

- `DisallowedHost`: неверное значение `DJANGO_ALLOWED_HOSTS`; Render hostname обычно подхватывается автоматически.
- CORS error / Network error: `CORS_ALLOWED_ORIGINS` должен в точности совпадать с адресом сайта, а `VITE_API_BASE_URL` — с адресом API. После изменения `VITE_` пересоберите Static Site (это build-time переменная).
- `relation does not exist`: не выполнились миграции; в журнале Build проверьте выполнение `python manage.py migrate`.
- `No module named gunicorn`: установите зависимости из актуального `backend/requirements.txt`.
- `502`: проверьте `Start Command`, переменные окружения и логи Render.
- Приложение долго открывается: Free Web Service засыпает без входящих запросов.
- Пропали данные: нельзя использовать SQLite на эфемерном диске Render; нужен PostgreSQL; бесплатная БД ограничена по сроку.

## Пользователи и безопасность

Этот MVP сохраняет токен в `localStorage`; это ограничение требует устранения до работы с конфиденциальными финансовыми данными. Не вводите номера карт, CVV, банковские пароли, реальные выписки и другую чувствительную информацию. Для стабильного публичного финтех-продукта нужны защита входа и сессий, аудит, мониторинг, бэкапы, документы о конфиденциальности и выполнение действующих требований законодательства Казахстана.

Официальные инструкции:
- https://render.com/docs/deploy-django
- https://render.com/docs/your-first-deploy
- https://render.com/docs/free
