"""Editor panels, panel view, projects, auth, templates and shortcuts."""
S = {}


def add(section):
    for k, v in section.items():
        assert k not in S, k
        assert len(v) == 5, k
        S[k] = v


# ---------------------------------------------------------------- library / inspector
# Short labels for the side-panel tabs: the full names do not fit four abreast.
add({
"tab.inspector": ["Properties", "Vlastnosti", "Властивості", "Właściwości", "Свойства"],
"tab.faults": ["Faults", "Poruchy", "Несправності", "Usterki", "Неисправности"],
"tab.instruments": ["Meters", "Měření", "Виміри", "Pomiary", "Измерения"],
"tab.log": ["Log", "Protokol", "Журнал", "Dziennik", "Журнал"],
})

add({
"library.title": ["Component library", "Knihovna prvků", "Бібліотека елементів", "Biblioteka elementów", "Библиотека элементов"],
"library.search": ["Search components…", "Hledat prvky…", "Пошук елементів…", "Szukaj elementów…", "Поиск элементов…"],
"library.noResults": ["Nothing found", "Nic nenalezeno", "Нічого не знайдено", "Nic nie znaleziono", "Ничего не найдено"],
"library.dragHint": ["Drag onto the canvas", "Přetáhněte na plochu", "Перетягніть на полотно", "Przeciągnij na obszar roboczy", "Перетащите на холст"],
"inspector.title": ["Properties", "Vlastnosti", "Властивості", "Właściwości", "Свойства"],
"inspector.nothing": ["Nothing selected", "Nic není vybráno", "Нічого не вибрано", "Nic nie zaznaczono", "Ничего не выбрано"],
"inspector.multiple": ["{{count}} items selected", "Vybráno položek: {{count}}", "Вибрано елементів: {{count}}", "Zaznaczono elementów: {{count}}", "Выбрано элементов: {{count}}"],
"inspector.component": ["Component", "Prvek", "Елемент", "Element", "Элемент"],
"inspector.wire": ["Conductor", "Vodič", "Провідник", "Przewód", "Проводник"],
"inspector.measurements": ["Live measurements", "Živé hodnoty", "Живі значення", "Wartości bieżące", "Текущие значения"],
"inspector.state": ["State", "Stav", "Стан", "Stan", "Состояние"],
"inspector.state.closed": ["Closed", "Zapnuto", "Увімкнено", "Załączony", "Включено"],
"inspector.state.open": ["Open", "Vypnuto", "Вимкнено", "Wyłączony", "Выключено"],
"inspector.state.tripped": ["Tripped", "Vypnul", "Спрацював", "Zadziałał", "Сработал"],
"inspector.state.blown": ["Blown", "Přepálena", "Перегорів", "Przepalony", "Перегорел"],
"inspector.state.degraded": ["End of life", "Konec životnosti", "Кінець ресурсу", "Koniec żywotności", "Конец ресурса"],
"inspector.thermalLoad": ["Thermal load of the release", "Tepelné zatížení spouště", "Теплове навантаження розчіплювача", "Obciążenie cieplne wyzwalacza", "Тепловая нагрузка расцепителя"],
"inspector.tripIn": ["Will trip in", "Vypne za", "Спрацює через", "Zadziała za", "Сработает через"],
"inspector.noProps": ["This item has no adjustable properties.", "Tento prvek nemá nastavitelné vlastnosti.", "Цей елемент не має налаштувань.", "Ten element nie ma ustawień.", "У этого элемента нет настроек."],
"inspector.terminals": ["Terminals", "Svorky", "Клеми", "Zaciski", "Клеммы"],
"inspector.connected": ["connected", "připojeno", "приєднано", "podłączony", "подключено"],
"inspector.free": ["free", "volná", "вільна", "wolny", "свободна"],
})

# ---------------------------------------------------------------- canvas
add({
"canvas.emptyTitle": ["Empty canvas", "Prázdná plocha", "Порожнє полотно", "Pusty obszar roboczy", "Пустой холст"],
"canvas.emptyHint": ["Drag a component from the library, or start from a template.", "Přetáhněte prvek z knihovny nebo začněte ze šablony.", "Перетягніть елемент із бібліотеки або почніть із шаблону.", "Przeciągnij element z biblioteki albo zacznij od szablonu.", "Перетащите элемент из библиотеки или начните с шаблона."],
"canvas.wireHint": ["Click a terminal, then click the terminal it connects to.", "Klikněte na svorku a pak na svorku, se kterou se spojuje.", "Клацніть клему, потім клему, з якою вона з'єднується.", "Kliknij zacisk, potem zacisk, z którym się łączy.", "Нажмите клемму, затем клемму, с которой она соединяется."],
"canvas.wireCancel": ["Press Esc to cancel the connection.", "Esc zruší spojování.", "Esc скасовує з'єднання.", "Esc anuluje łączenie.", "Esc отменяет соединение."],
"canvas.incompatible": ["These terminals cannot be connected with this conductor.", "Tyto svorky nelze tímto vodičem spojit.", "Ці клеми не можна з'єднати цим провідником.", "Tych zacisków nie można połączyć tym przewodem.", "Эти клеммы нельзя соединить этим проводником."],
"canvas.role": ["Conductor to draw", "Kreslený vodič", "Провідник для креслення", "Rysowany przewód", "Рисуемый проводник"],
"canvas.addBend": ["Double-click a conductor to add a bend point", "Dvojklik na vodič přidá lomový bod", "Подвійний клац по провіднику додає точку зламу", "Podwójne kliknięcie dodaje punkt załamania", "Двойной щелчок добавляет точку излома"],
"canvas.note": ["Note", "Poznámka", "Примітка", "Notatka", "Заметка"],
"canvas.notePlaceholder": ["Type a note…", "Napište poznámku…", "Введіть примітку…", "Wpisz notatkę…", "Введите заметку…"],
})

# ---------------------------------------------------------------- panel view
add({
"panel.title": ["Panel front view", "Pohled na rozvaděč", "Вигляд щита", "Widok rozdzielnicy", "Вид щита"],
"panel.enclosure": ["Enclosure", "Rozvodnice", "Щит", "Rozdzielnica", "Щит"],
"panel.addEnclosure": ["Add enclosure", "Přidat rozvodnici", "Додати щит", "Dodaj rozdzielnicę", "Добавить щит"],
"panel.row": ["Row {{n}}", "Řada {{n}}", "Ряд {{n}}", "Rząd {{n}}", "Ряд {{n}}"],
"panel.modules": ["{{used}} / {{total}} modules", "{{used}} / {{total}} modulů", "{{used}} / {{total}} модулів", "{{used}} / {{total}} modułów", "{{used}} / {{total}} модулей"],
"panel.full": ["This enclosure is out of modules", "V rozvodnici došly moduly", "У щиті скінчилися модулі", "W rozdzielnicy zabrakło modułów", "В щите закончились модули"],
"panel.unplaced": ["Not placed in the panel", "Neosazeno v rozvaděči", "Не розміщено в щиті", "Nieumieszczone w rozdzielnicy", "Не размещено в щите"],
"panel.unplacedHint": ["Drag a device onto a rail to place it.", "Přetáhněte přístroj na lištu.", "Перетягніть апарат на рейку.", "Przeciągnij aparat na szynę.", "Перетащите аппарат на рейку."],
"panel.busbars": ["Comb busbars", "Hřebenové lišty", "Гребінчасті шини", "Szyny grzebieniowe", "Гребенчатые шины"],
"panel.addBusbar": ["Add comb busbar", "Přidat hřebenovou lištu", "Додати гребінчасту шину", "Dodaj szynę grzebieniową", "Добавить гребенчатую шину"],
"panel.terminals": ["N and PE terminal blocks", "Svorkovnice N a PE", "Клемні шини N і PE", "Listwy N i PE", "Клеммные шины N и PE"],
"panel.door": ["Door", "Dvířka", "Дверцята", "Drzwiczki", "Дверца"],
"panel.labelSheet": ["Circuit label sheet", "Štítek obvodů", "Етикетка кіл", "Etykieta obwodów", "Этикетка цепей"],
"panel.labelSheetHint": ["Print and fit behind the door.", "Vytiskněte a vložte za dvířka.", "Роздрукуйте та вставте за дверцята.", "Wydrukuj i umieść za drzwiczkami.", "Распечатайте и вставьте за дверцу."],
"panel.moduleWidth": ["1 module = 17,5 mm", "1 modul = 17,5 mm", "1 модуль = 17,5 мм", "1 moduł = 17,5 mm", "1 модуль = 17,5 мм"],
"panel.noEnclosure": ["No enclosure yet — add one to lay out the board.", "Zatím žádná rozvodnice — přidejte ji a osaďte.", "Ще немає щита — додайте його для компонування.", "Brak rozdzielnicy — dodaj ją, aby rozplanować.", "Щита пока нет — добавьте его для компоновки."],
"panel.circuitColumn": ["Circuit", "Obvod", "Коло", "Obwód", "Цепь"],
"panel.deviceColumn": ["Device", "Přístroj", "Апарат", "Aparat", "Аппарат"],
"panel.ratingColumn": ["Rating", "Jištění", "Захист", "Zabezpieczenie", "Защита"],
"panel.cableColumn": ["Cable", "Kabel", "Кабель", "Kabel", "Кабель"],
})

# ---------------------------------------------------------------- projects
add({
"project.title": ["Projects", "Projekty", "Проєкти", "Projekty", "Проекты"],
"project.name": ["Project name", "Název projektu", "Назва проєкту", "Nazwa projektu", "Название проекта"],
"project.new": ["New project", "Nový projekt", "Новий проєкт", "Nowy projekt", "Новый проект"],
"project.none": ["No projects yet", "Zatím žádné projekty", "Проєктів ще немає", "Brak projektów", "Проектов пока нет"],
"project.local": ["Stored in this browser", "Uloženo v prohlížeči", "Збережено в браузері", "Zapisane w przeglądarce", "Сохранено в браузере"],
"project.cloud": ["In your account", "Ve vašem účtu", "У вашому акаунті", "Na Twoim koncie", "В вашем аккаунте"],
"project.updated": ["Updated", "Změněno", "Змінено", "Zmieniono", "Изменено"],
"project.deleteConfirm": ["Delete “{{name}}” permanently?", "Trvale smazat „{{name}}“?", "Остаточно видалити «{{name}}»?", "Trwale usunąć „{{name}}”?", "Удалить «{{name}}» навсегда?"],
"project.copySuffix": ["copy", "kopie", "копія", "kopia", "копия"],
"project.importedCount": ["{{count}} project(s) moved into your account.", "Do účtu přesunuto projektů: {{count}}.", "Перенесено проєктів в акаунт: {{count}}.", "Przeniesiono projektów na konto: {{count}}.", "Перенесено проектов в аккаунт: {{count}}."],
"project.importFile": ["Import from JSON file", "Import ze souboru JSON", "Імпорт із файлу JSON", "Import z pliku JSON", "Импорт из файла JSON"],
"project.importError": ["This file is not a valid project: {{message}}", "Tento soubor není platný projekt: {{message}}", "Цей файл не є дійсним проєктом: {{message}}", "Ten plik nie jest prawidłowym projektem: {{message}}", "Этот файл не является допустимым проектом: {{message}}"],
"project.migrated": ["Project migrated from schema version {{from}}.", "Projekt převeden ze schématu verze {{from}}.", "Проєкт перенесено зі схеми версії {{from}}.", "Projekt przeniesiono ze schematu w wersji {{from}}.", "Проект перенесён со схемы версии {{from}}."],
"project.unsaved": ["Unsaved changes", "Neuložené změny", "Незбережені зміни", "Niezapisane zmiany", "Несохранённые изменения"],
"project.settings": ["Installation settings", "Nastavení instalace", "Налаштування установки", "Ustawienia instalacji", "Настройки установки"],
"project.premises": ["Type of premises", "Druh objektu", "Тип об'єкта", "Rodzaj obiektu", "Тип объекта"],
"opt.premises.dwelling": ["Dwelling", "Byt / rodinný dům", "Житло", "Mieszkanie / dom", "Жильё"],
"opt.premises.commercial": ["Commercial", "Komerční objekt", "Комерційний об'єкт", "Obiekt komercyjny", "Коммерческий объект"],
"opt.premises.industrial": ["Industrial", "Průmysl", "Промисловість", "Przemysł", "Промышленность"],
"opt.premises.outdoor": ["Outdoor", "Venkovní", "Зовнішній", "Zewnętrzny", "Наружный"],
})

# ---------------------------------------------------------------- auth
add({
"auth.signIn": ["Sign in", "Přihlásit", "Увійти", "Zaloguj się", "Войти"],
"auth.signUp": ["Sign up", "Registrovat", "Зареєструватися", "Zarejestruj się", "Зарегистрироваться"],
"auth.signOut": ["Sign out", "Odhlásit", "Вийти", "Wyloguj", "Выйти"],
"auth.email": ["Email", "E-mail", "Електронна пошта", "E-mail", "Электронная почта"],
"auth.password": ["Password", "Heslo", "Пароль", "Hasło", "Пароль"],
"auth.continueAsGuest": ["Continue as guest", "Pokračovat jako host", "Продовжити як гість", "Kontynuuj jako gość", "Продолжить как гость"],
"auth.haveAccount": ["Already have an account?", "Už máte účet?", "Вже маєте акаунт?", "Masz już konto?", "Уже есть аккаунт?"],
"auth.noAccount": ["No account yet?", "Ještě nemáte účet?", "Ще немає акаунта?", "Nie masz jeszcze konta?", "Ещё нет аккаунта?"],
"auth.error.invalidEmail": ["Enter a valid email address.", "Zadejte platnou e-mailovou adresu.", "Введіть дійсну адресу пошти.", "Podaj prawidłowy adres e-mail.", "Введите действительный адрес почты."],
"auth.error.weakPassword": ["The password must be at least 6 characters.", "Heslo musí mít alespoň 6 znaků.", "Пароль має містити щонайменше 6 символів.", "Hasło musi mieć co najmniej 6 znaków.", "Пароль должен содержать не менее 6 символов."],
"auth.error.emailTaken": ["That email is already registered.", "Tento e-mail je již registrován.", "Ця пошта вже зареєстрована.", "Ten e-mail jest już zarejestrowany.", "Эта почта уже зарегистрирована."],
"auth.error.invalidCredentials": ["Wrong email or password.", "Nesprávný e-mail nebo heslo.", "Неправильна пошта або пароль.", "Błędny e-mail lub hasło.", "Неверная почта или пароль."],
"auth.error.network": ["Cannot reach the server.", "Server není dostupný.", "Сервер недоступний.", "Serwer niedostępny.", "Сервер недоступен."],
})

# ---------------------------------------------------------------- templates
add({
"template.title": ["Start from a template", "Začít ze šablony", "Почати з шаблону", "Zacznij od szablonu", "Начать с шаблона"],
"template.board": ["Distribution boards", "Rozvaděče", "Щити", "Rozdzielnice", "Щиты"],
"template.teaching": ["Small circuits", "Malé obvody", "Малі кола", "Małe obwody", "Малые цепи"],
"template.house.name": ["Family house 3+1", "Rodinný dům 3+1", "Приватний будинок 3+1", "Dom jednorodzinny 3+1", "Частный дом 3+1"],
"template.house.desc": ["TN-C-S, 25 A main breaker, type 1+2 SPD, four RCBOs, cooker, water heater and a wallbox.", "TN-C-S, hlavní jistič 25 A, svodič T1+T2, čtyři kombinované chrániče, sporák, bojler a wallbox.", "TN-C-S, головний автомат 25 А, ПЗІП T1+T2, чотири дифавтомати, плита, бойлер і wallbox.", "TN-C-S, wyłącznik główny 25 A, ogranicznik T1+T2, cztery wyłączniki różnicowoprądowe, kuchenka, podgrzewacz i wallbox.", "TN-C-S, главный автомат 25 А, УЗИП T1+T2, четыре дифавтомата, плита, бойлер и wallbox."],
"template.flat.name": ["Apartment board", "Bytová rozvodnice", "Щит квартири", "Rozdzielnica mieszkaniowa", "Квартирный щит"],
"template.flat.desc": ["Single-phase board with one RCD and four final circuits.", "Jednofázová rozvodnice s jedním chráničem a čtyřmi koncovými obvody.", "Однофазний щит з одним ПЗВ і чотирма кінцевими колами.", "Rozdzielnica jednofazowa z jednym wyłącznikiem różnicowoprądowym i czterema obwodami.", "Однофазный щит с одним УЗО и четырьмя конечными цепями."],
"template.garage.name": ["Garage / workshop board", "Rozvodnice garáže a dílny", "Щит гаража / майстерні", "Rozdzielnica garażu i warsztatu", "Щит гаража / мастерской"],
"template.garage.desc": ["IP54 surface board with lighting, sockets and a three-phase CEE outlet.", "Rozvodnice IP54 na omítku s osvětlením, zásuvkami a třífázovou zásuvkou CEE.", "Накладний щит IP54 з освітленням, розетками та трифазною розеткою CEE.", "Natynkowa rozdzielnica IP54 z oświetleniem, gniazdami i gniazdem siłowym CEE.", "Накладной щит IP54 с освещением, розетками и трёхфазной розеткой CEE."],
"template.socketDemo.name": ["Socket circuit with an RCD", "Zásuvkový obvod s chráničem", "Розеткове коло з ПЗВ", "Obwód gniazdowy z wyłącznikiem", "Розеточная цепь с УЗО"],
"template.socketDemo.desc": ["Main switch, 4P 30 mA type A RCD, B16 and a 2,5 mm² socket circuit.", "Hlavní vypínač, chránič 4P 30 mA typ A, B16 a zásuvkový obvod 2,5 mm².", "Головний вимикач, ПЗВ 4P 30 мА тип A, B16 і розеткове коло 2,5 мм².", "Wyłącznik główny, wyłącznik 4P 30 mA typ A, B16 i obwód gniazdowy 2,5 mm².", "Главный выключатель, УЗО 4P 30 мА тип A, B16 и розеточная цепь 2,5 мм²."],
"template.empty.name": ["Bare enclosure", "Prázdná rozvodnice", "Порожній щит", "Pusta rozdzielnica", "Пустой щит"],
"template.empty.desc": ["Supply, main earthing terminal and an empty 3×12 enclosure.", "Přívod, hlavní přípojnice a prázdná rozvodnice 3×12.", "Ввід, головна шина і порожній щит 3×12.", "Zasilanie, główna szyna i pusta rozdzielnica 3×12.", "Ввод, главная шина и пустой щит 3×12."],
"template.lamp1.name": ["Lamp with a one-way switch", "Světlo s vypínačem řazení 1", "Світло з одноклавішним вимикачем", "Lampa z łącznikiem jednobiegunowym", "Свет с одноклавишным выключателем"],
"template.lamp1.desc": ["The simplest circuit there is — and a good place to check the wiring rules.", "Nejjednodušší obvod — a dobré místo na ověření pravidel zapojení.", "Найпростіше коло — і гарне місце перевірити правила з'єднання.", "Najprostszy obwód — i dobre miejsce na sprawdzenie zasad.", "Простейшая цепь — и хорошее место проверить правила соединения."],
"template.stairway.name": ["Stairway pair (6+6)", "Schodišťové zapojení 6+6", "Прохідні вимикачі (6+6)", "Układ schodowy (6+6)", "Проходные выключатели (6+6)"],
"template.stairway.desc": ["Two two-way switches controlling two lamps.", "Dva přepínače řazení 6 ovládají dvě svítidla.", "Два прохідні перемикачі керують двома світильниками.", "Dwa łączniki schodowe sterują dwiema oprawami.", "Два проходных переключателя управляют двумя светильниками."],
"template.intermediate.name": ["Intermediate switch (7)", "Křížový přepínač řazení 7", "Перехресний перемикач (7)", "Łącznik krzyżowy (7)", "Перекрёстный переключатель (7)"],
"template.intermediate.desc": ["Three points of control on one lighting circuit.", "Tři ovládací místa jednoho světelného obvodu.", "Три місця керування одним колом освітлення.", "Trzy miejsca sterowania jednym obwodem.", "Три места управления одной цепью освещения."],
"template.impulse.name": ["Lighting with an impulse relay", "Osvětlení s impulzním relé", "Освітлення з імпульсним реле", "Oświetlenie z przekaźnikiem bistabilnym", "Освещение с импульсным реле"],
"template.impulse.desc": ["Two push buttons and a latching relay in the board.", "Dvě tlačítka a impulzní relé v rozvaděči.", "Дві кнопки та імпульсне реле в щиті.", "Dwa przyciski i przekaźnik bistabilny w rozdzielnicy.", "Две кнопки и импульсное реле в щите."],
"template.motor.name": ["Contactor-controlled motor", "Motor ovládaný stykačem", "Двигун з контакторним керуванням", "Silnik sterowany stycznikiem", "Двигатель с контакторным управлением"],
"template.motor.desc": ["Start/stop control with a thermal overload relay.", "Ovládání start/stop s tepelným relé.", "Керування пуск/стоп із тепловим реле.", "Sterowanie start/stop z przekaźnikiem termicznym.", "Управление пуск/стоп с тепловым реле."],
})

# ---------------------------------------------------------------- shortcuts
add({
"shortcut.title": ["Keyboard shortcuts", "Klávesové zkratky", "Гарячі клавіші", "Skróty klawiszowe", "Горячие клавиши"],
"shortcut.delete": ["Delete selection", "Smazat výběr", "Видалити виділене", "Usuń zaznaczenie", "Удалить выделенное"],
"shortcut.duplicate": ["Duplicate selection", "Duplikovat výběr", "Дублювати виділене", "Duplikuj zaznaczenie", "Дублировать выделенное"],
"shortcut.wire": ["Wire mode", "Režim spojování", "Режим з'єднання", "Tryb łączenia", "Режим соединения"],
"shortcut.select": ["Select mode", "Režim výběru", "Режим вибору", "Tryb zaznaczania", "Режим выбора"],
"shortcut.runStop": ["Run / stop the simulation", "Spustit / zastavit simulaci", "Запустити / зупинити симуляцію", "Uruchom / zatrzymaj symulację", "Запустить / остановить симуляцию"],
"shortcut.undoRedo": ["Undo / redo", "Zpět / vpřed", "Скасувати / повторити", "Cofnij / ponów", "Отменить / вернуть"],
"shortcut.save": ["Save the project", "Uložit projekt", "Зберегти проєкт", "Zapisz projekt", "Сохранить проект"],
"shortcut.rotate": ["Rotate the selection", "Otočit výběr", "Повернути виділене", "Obróć zaznaczenie", "Повернуть выделенное"],
"shortcut.fit": ["Fit the drawing to the view", "Přizpůsobit výkres oknu", "Вмістити креслення у вікно", "Dopasuj rysunek do okna", "Вписать чертёж в окно"],
"shortcut.escape": ["Cancel the current action", "Zrušit probíhající akci", "Скасувати поточну дію", "Anuluj bieżącą akcję", "Отменить текущее действие"],
})
