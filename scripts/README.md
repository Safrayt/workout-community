# Бэкапы

Автоматические бэкапы PostgreSQL и загруженных файлов. Скрипты
рассчитаны на запуск **на сервере**, где выполняется `docker compose`
для этого проекта — не на локальной машине разработки.

## Настройка (один раз, на сервере)

```bash
chmod +x scripts/backup.sh scripts/restore.sh
```

Проверьте вручную, что бэкап отрабатывает (замените путь на реальный):

```bash
./scripts/backup.sh /path/to/workout-community
ls backups/
```

Должны появиться два файла: `db_<дата>.sql.gz` и `uploads_<дата>.tar.gz`.

Добавьте в cron (`crontab -e`) ежедневный запуск, например в 3:00 ночи:

```
0 3 * * * /path/to/workout-community/scripts/backup.sh /path/to/workout-community >> /path/to/workout-community/backups/backup.log 2>&1
```

## Хранение

- Бэкапы лежат в `backups/` в корне проекта, по умолчанию хранятся
  14 дней — старые удаляются автоматически при каждом запуске
  скрипта (переменная `BACKUP_KEEP_DAYS`, если нужно другое число).
- `backups/` уже добавлена в `.gitignore` — в git бэкапы попадать не должны.

**Важно:** пока бэкапы хранятся на том же сервере, что и сама база —
это лучше, чем ничего, но не защищает от отказа сервера целиком (диск,
хостинг, случайное удаление). Как только будет время, стоит настроить
регулярную выгрузку `backups/` куда-то ещё: rsync на другую машину,
S3-совместимое хранилище, или просто `scp`/`rsync` по расписанию себе
на локальную машину.

## Восстановление

База данных:

```bash
./scripts/restore.sh backups/db_2026-09-03_03-00-00.sql.gz /path/to/workout-community
```

Скрипт остановит backend, попросит подтверждение, восстановит дамп и
запустит backend обратно.

Загруженные фото восстанавливаются вручную (перезаписывают текущие
файлы в `/app/uploads` внутри контейнера backend):

```bash
docker compose stop backend
cat backups/uploads_2026-09-03_03-00-00.tar.gz | docker compose exec -T backend tar xzf - -C /app/uploads
docker compose start backend
```
