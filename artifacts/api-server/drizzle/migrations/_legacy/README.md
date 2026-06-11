# Legacy migrations (0000–0033)

Исторические SQL-миграции до baseline (п.11 TASKS.md). **Не участвуют** в `drizzle.__drizzle_migrations` после перехода на `0000_prod_baseline`.

- Боевая база BuildFlow уже содержит схему из этих файлов.
- Новые окружения: достаточно одной миграции `0000_prod_baseline.sql` (см. `../meta/_journal.json`).
- Архив сохранён для аудита и diff; не править и не регистрировать в `_journal.json`.
