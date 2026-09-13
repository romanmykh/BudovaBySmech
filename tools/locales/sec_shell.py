"""UI shell, view names and actions."""
S = {}


def add(section):
    for k, v in section.items():
        assert k not in S, k
        assert len(v) == 5, k
        S[k] = v


# ---------------------------------------------------------------- shell / app
add({
"app.title": ["Electrical installation simulator", "Simulátor elektroinstalace", "Симулятор електроінсталяції", "Symulator instalacji elektrycznej", "Симулятор электроустановки"],
"app.short": ["Installation simulator", "Simulátor instalace", "Симулятор інсталяції", "Symulator instalacji", "Симулятор установки"],
"app.guest": ["Guest", "Host", "Гість", "Gość", "Гость"],
"app.guestHint": ["Projects are stored in this browser only", "Projekty jsou uloženy jen v tomto prohlížeči", "Проєкти зберігаються лише в цьому браузері", "Projekty zapisane tylko w tej przeglądarce", "Проекты хранятся только в этом браузере"],
"app.loading": ["Loading…", "Načítání…", "Завантаження…", "Ładowanie…", "Загрузка…"],
"app.offline": ["Server unavailable — working locally", "Server není dostupný — pracuje se lokálně", "Сервер недоступний — робота локально", "Serwer niedostępny — praca lokalna", "Сервер недоступен — работа локально"],
"view.schematic": ["Schematic", "Schéma", "Схема", "Schemat", "Схема"],
"view.panel": ["Panel", "Rozvaděč", "Щит", "Rozdzielnica", "Щит"],
"view.report": ["Report", "Revize", "Звіт", "Protokół", "Отчёт"],
"theme.light": ["Light", "Světlý", "Світла", "Jasny", "Светлая"],
"theme.dark": ["Dark", "Tmavý", "Темна", "Ciemny", "Тёмная"],
"lang.label": ["Language", "Jazyk", "Мова", "Język", "Язык"],
})

# ---------------------------------------------------------------- actions
add({
"action.new": ["New", "Nový", "Новий", "Nowy", "Новый"],
"action.open": ["Open", "Otevřít", "Відкрити", "Otwórz", "Открыть"],
"action.save": ["Save", "Uložit", "Зберегти", "Zapisz", "Сохранить"],
"action.saved": ["Saved", "Uloženo", "Збережено", "Zapisano", "Сохранено"],
"action.saving": ["Saving…", "Ukládání…", "Збереження…", "Zapisywanie…", "Сохранение…"],
"action.rename": ["Rename", "Přejmenovat", "Перейменувати", "Zmień nazwę", "Переименовать"],
"action.duplicate": ["Duplicate", "Duplikovat", "Дублювати", "Duplikuj", "Дублировать"],
"action.delete": ["Delete", "Smazat", "Видалити", "Usuń", "Удалить"],
"action.undo": ["Undo", "Zpět", "Скасувати", "Cofnij", "Отменить"],
"action.redo": ["Redo", "Vpřed", "Повторити", "Ponów", "Вернуть"],
"action.copy": ["Copy", "Kopírovat", "Копіювати", "Kopiuj", "Копировать"],
"action.paste": ["Paste", "Vložit", "Вставити", "Wklej", "Вставить"],
"action.selectAll": ["Select all", "Vybrat vše", "Виділити все", "Zaznacz wszystko", "Выделить всё"],
"action.group": ["Group", "Seskupit", "Згрупувати", "Grupuj", "Сгруппировать"],
"action.ungroup": ["Ungroup", "Zrušit skupinu", "Розгрупувати", "Rozgrupuj", "Разгруппировать"],
"action.alignLeft": ["Align left", "Zarovnat vlevo", "Вирівняти ліворуч", "Wyrównaj do lewej", "Выровнять по левому краю"],
"action.alignTop": ["Align top", "Zarovnat nahoru", "Вирівняти вгору", "Wyrównaj do góry", "Выровнять по верху"],
"action.distributeH": ["Distribute horizontally", "Rozmístit vodorovně", "Розподілити горизонтально", "Rozmieść poziomo", "Распределить по горизонтали"],
"action.rotate": ["Rotate", "Otočit", "Повернути", "Obróć", "Повернуть"],
"action.wireMode": ["Wire mode", "Režim spojování", "Режим з'єднання", "Tryb łączenia", "Режим соединения"],
"action.selectMode": ["Select", "Výběr", "Вибір", "Zaznaczanie", "Выбор"],
"action.panMode": ["Pan", "Posun", "Переміщення", "Przesuwanie", "Панорама"],
"action.textMode": ["Text note", "Poznámka", "Примітка", "Notatka", "Заметка"],
"action.run": ["Run", "Spustit", "Запустити", "Uruchom", "Запустить"],
"action.stop": ["Stop", "Zastavit", "Зупинити", "Zatrzymaj", "Остановить"],
"action.reset": ["Reset", "Reset", "Скинути", "Reset", "Сброс"],
"action.step": ["Step", "Krok", "Крок", "Krok", "Шаг"],
"action.speed": ["Speed", "Rychlost", "Швидкість", "Prędkość", "Скорость"],
"action.export": ["Export", "Export", "Експорт", "Eksport", "Экспорт"],
"action.import": ["Import", "Import", "Імпорт", "Import", "Импорт"],
"action.exportJson": ["Project JSON", "Projekt JSON", "Проєкт JSON", "Projekt JSON", "Проект JSON"],
"action.exportSvg": ["SVG drawing", "Výkres SVG", "Креслення SVG", "Rysunek SVG", "Чертёж SVG"],
"action.exportPng": ["PNG image", "Obrázek PNG", "Зображення PNG", "Obraz PNG", "Изображение PNG"],
"action.exportPdf": ["PDF", "PDF", "PDF", "PDF", "PDF"],
"action.exportLabels": ["Circuit label sheet", "Štítky obvodů", "Етикетки кіл", "Etykiety obwodów", "Этикетки цепей"],
"action.check": ["Run check", "Spustit kontrolu", "Виконати перевірку", "Uruchom kontrolę", "Выполнить проверку"],
"action.close": ["Close", "Zavřít", "Закрити", "Zamknij", "Закрыть"],
"action.cancel": ["Cancel", "Zrušit", "Скасувати", "Anuluj", "Отмена"],
"action.confirm": ["Confirm", "Potvrdit", "Підтвердити", "Potwierdź", "Подтвердить"],
"action.add": ["Add", "Přidat", "Додати", "Dodaj", "Добавить"],
"action.apply": ["Apply", "Použít", "Застосувати", "Zastosuj", "Применить"],
"action.clear": ["Clear", "Vymazat", "Очистити", "Wyczyść", "Очистить"],
"action.zoomIn": ["Zoom in", "Přiblížit", "Збільшити", "Powiększ", "Приблизить"],
"action.zoomOut": ["Zoom out", "Oddálit", "Зменшити", "Pomniejsz", "Отдалить"],
"action.zoomFit": ["Fit to view", "Přizpůsobit", "Вмістити", "Dopasuj", "Вписать"],
"action.snap": ["Snap to grid", "Přichytit k mřížce", "Прив'язка до сітки", "Przyciągaj do siatki", "Привязка к сетке"],
"action.grid": ["Grid", "Mřížka", "Сітка", "Siatka", "Сетка"],
"action.minimap": ["Minimap", "Minimapa", "Мінікарта", "Minimapa", "Миникарта"],
"action.shortcuts": ["Keyboard shortcuts", "Klávesové zkratky", "Гарячі клавіші", "Skróty klawiszowe", "Горячие клавиши"],
"action.templates": ["Templates", "Šablony", "Шаблони", "Szablony", "Шаблоны"],
"action.moveLocal": ["Move my local projects into my account", "Přesunout mé lokální projekty do účtu", "Перенести локальні проєкти в акаунт", "Przenieś lokalne projekty na konto", "Перенести локальные проекты в аккаунт"],
"action.reconnect": ["Reset device", "Vrátit přístroj do provozu", "Повернути прилад у роботу", "Przywróć aparat", "Вернуть аппарат в работу"],
})

