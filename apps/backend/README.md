# Backend

FastAPI-приложение портала Workout Community.

## Требования

- Python 3.11 или новее (проверить: `python3 --version`)

## Первый запуск (шаг за шагом)

1. Перейти в папку backend:

   ```bash
   cd apps/backend
   ```

2. Создать виртуальное окружение (изолированное место для зависимостей
   именно этого проекта, чтобы не засорять систему):

   ```bash
   python3 -m venv .venv
   ```

3. Активировать окружение:

   - macOS / Linux:
     ```bash
     source .venv/bin/activate
     ```
   - Windows (PowerShell):
     ```powershell
     .venv\Scripts\Activate.ps1
     ```

   После активации в начале строки терминала появится `(.venv)`.

4. Установить зависимости:

   ```bash
   pip install -r requirements.txt
   ```

5. Запустить сервер в режиме разработки (перезапускается сам при
   изменении кода):

   ```bash
   uvicorn app.main:app --reload
   ```

6. Открыть в браузере:

   - http://127.0.0.1:8000/health — должен вернуть `{"status":"ok"}`
   - http://127.0.0.1:8000/docs — автоматическая интерактивная документация
     API (Swagger UI), сгенерированная FastAPI. Здесь можно будет
     пробовать все эндпоинты прямо из браузера.

## Структура

```
apps/backend/
    app/
        main.py        # точка входа, создание FastAPI-приложения
        routers/        # эндпоинты, сгруппированные по сущностям (появятся дальше)
    requirements.txt
```
