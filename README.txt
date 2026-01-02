Как заменить файлы в репозитории GitHub Pages (вариант B)
===========================================================

1) Открой репозиторий tajweed (где лежит сайт):
   fatsarfat-design.github.io/tajweed/

2) Удали / замени файлы в корне репозитория на файлы из этого архива:
   - index.html
   - styles.css
   - data.js
   - tests.js
   - app.js
   - sw.js
   - manifest.json

3) Commit -> Push (если через GitHub Desktop) или просто Commit changes (если через сайт GitHub).

4) Важно для старого кеша (если когда-то было пусто):
   - открой сайт 1 раз обычным способом
   - если вдруг видишь старую версию: обнови страницу с Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
   - затем всё будет обновляться нормально (SW v21 сам удалит старые кеши).

Готово. Сайт будет: https://fatsarfat-design.github.io/tajweed/?v=21
