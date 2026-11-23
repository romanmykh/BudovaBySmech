"""Component library: categories and the name of every component type.

The Czech, Ukrainian, Polish and Russian names are the terms used on site and in
catalogues in each country, not literal translations of the English word.
"""
S = {}


def add(section):
    for k, v in section.items():
        assert k not in S, k
        assert len(v) == 5, k
        S[k] = v


add({
"cat.supply": ["Supply & metering", "Přívod a měření", "Ввід та облік", "Zasilanie i pomiar", "Ввод и учёт"],
"cat.protection": ["Protection", "Jisticí přístroje", "Захисні апарати", "Aparaty zabezpieczające", "Защитные аппараты"],
"cat.switching": ["Switching", "Spínací přístroje", "Комутаційні апарати", "Aparaty łączeniowe", "Коммутационные аппараты"],
"cat.control": ["Control", "Ovládání", "Керування", "Sterowanie", "Управление"],
"cat.terminals": ["Terminals & enclosure", "Svorky a rozvodnice", "Клеми та щит", "Zaciski i rozdzielnica", "Клеммы и щит"],
"cat.wiring": ["Wiring accessories", "Spínače a zásuvky", "Вимикачі та розетки", "Osprzęt instalacyjny", "Выключатели и розетки"],
"cat.loads": ["Loads", "Spotřebiče", "Споживачі", "Odbiorniki", "Потребители"],
"cat.instruments": ["Instruments", "Měřicí přístroje", "Вимірювальні прилади", "Przyrządy pomiarowe", "Измерительные приборы"],
})

# ---------------------------------------------------------------- supply
add({
"comp.supply": ["Utility supply", "Přípojka distribuční sítě", "Ввід від мережі", "Przyłącze sieciowe", "Ввод от сети"],
"comp.mainBreaker": ["Main breaker before the meter", "Hlavní jistič před elektroměrem", "Головний автоматичний вимикач", "Wyłącznik główny przed licznikiem", "Главный автоматический выключатель"],
"comp.meter": ["Electricity meter", "Elektroměr", "Лічильник електроенергії", "Licznik energii elektrycznej", "Счётчик электроэнергии"],
"comp.hdo": ["Ripple control receiver (HDO)", "Přijímač HDO", "Приймач телекерування (HDO)", "Odbiornik sterowania (HDO)", "Приёмник телеуправления (HDO)"],
"comp.mainEarthBar": ["Main earthing terminal", "Hlavní ochranná přípojnice (HOP)", "Головна заземлювальна шина", "Główna szyna uziemiająca", "Главная заземляющая шина"],
"comp.earthElectrode": ["Earth electrode", "Zemnič", "Заземлювач", "Uziom", "Заземлитель"],
})

# ---------------------------------------------------------------- protection
add({
"comp.mcb": ["Miniature circuit breaker (MCB)", "Jistič", "Автоматичний вимикач", "Wyłącznik nadprądowy", "Автоматический выключатель"],
"comp.rcd": ["Residual current device (RCD)", "Proudový chránič", "Пристрій захисного вимкнення (ПЗВ)", "Wyłącznik różnicowoprądowy", "Устройство защитного отключения (УЗО)"],
"comp.rcbo": ["RCBO (RCD with overcurrent protection)", "Kombinovaný chránič s jističem", "Диференційний автомат", "Wyłącznik różnicowoprądowy z członem nadprądowym", "Дифференциальный автомат"],
"comp.afdd": ["Arc fault detection device (AFDD)", "Obloukový ochranný přístroj", "Пристрій захисту від дугового замикання", "Wyłącznik przeciwpożarowy AFDD", "Устройство защиты от дугового пробоя"],
"comp.spd": ["Surge protective device (SPD)", "Svodič přepětí", "Обмежувач перенапруг (ПЗІП)", "Ogranicznik przepięć", "Ограничитель перенапряжений (УЗИП)"],
"comp.fuse": ["Fuse", "Pojistka", "Запобіжник", "Bezpiecznik topikowy", "Плавкий предохранитель"],
"comp.motorStarter": ["Motor protection circuit breaker", "Motorový spouštěč", "Автомат захисту двигуна", "Wyłącznik silnikowy", "Автомат защиты двигателя"],
"comp.overloadRelay": ["Thermal overload relay", "Tepelné nadproudové relé", "Теплове реле", "Przekaźnik termiczny", "Тепловое реле"],
})

# ---------------------------------------------------------------- switching / control
add({
"comp.isolator": ["Isolating switch", "Vypínač — odpínač", "Вимикач-роз'єднувач", "Rozłącznik izolacyjny", "Выключатель-разъединитель"],
"comp.contactor": ["Contactor", "Stykač", "Контактор", "Stycznik", "Контактор"],
"comp.impulseRelay": ["Impulse (latching) relay", "Impulzní relé", "Імпульсне реле", "Przekaźnik bistabilny", "Импульсное реле"],
"comp.stairTimer": ["Staircase timer", "Schodišťový automat", "Сходовий автомат", "Automat schodowy", "Лестничный автомат"],
"comp.timeRelay": ["Time relay", "Časové relé", "Реле часу", "Przekaźnik czasowy", "Реле времени"],
"comp.twilightSwitch": ["Twilight switch", "Soumrakový spínač", "Сутінковий вимикач", "Wyłącznik zmierzchowy", "Сумеречный выключатель"],
"comp.thermostat": ["Thermostat", "Termostat", "Термостат", "Termostat", "Термостат"],
"comp.phaseMonitor": ["Phase failure / voltage monitoring relay", "Hlídač napětí a sledu fází", "Реле контролю напруги та фаз", "Przekaźnik kontroli faz", "Реле контроля напряжения и фаз"],
"comp.priorityRelay": ["Load priority relay", "Přednostní relé", "Реле пріоритету", "Przekaźnik priorytetu", "Реле приоритета"],
"comp.signalLamp": ["Modular signal lamp", "Modulární signálka", "Модульна сигнальна лампа", "Lampka sygnalizacyjna modułowa", "Модульная сигнальная лампа"],
"comp.buzzer": ["Buzzer", "Bzučák", "Зумер", "Brzęczyk", "Зуммер"],
"comp.bellTransformer": ["Bell transformer 8/12 V", "Zvonkový transformátor 8/12 V", "Дзвінковий трансформатор 8/12 В", "Transformator dzwonkowy 8/12 V", "Звонковый трансформатор 8/12 В"],
"comp.dcPsu": ["DIN rail DC power supply", "Napájecí zdroj na DIN lištu", "Блок живлення на DIN-рейку", "Zasilacz na szynę DIN", "Блок питания на DIN-рейку"],
"comp.panelSocket": ["Socket outlet in the panel", "Zásuvka do rozvaděče", "Розетка в щит", "Gniazdo modułowe", "Розетка в щит"],
"comp.energyMonitor": ["DIN energy monitor", "Modulární měřič spotřeby", "Модульний лічильник енергії", "Modułowy licznik energii", "Модульный счётчик энергии"],
})

# ---------------------------------------------------------------- terminals
add({
"comp.peBar": ["PE terminal block", "Svorkovnice PE", "Клемна шина PE", "Listwa zaciskowa PE", "Клеммная шина PE"],
"comp.nBar": ["N terminal block", "Svorkovnice N", "Клемна шина N", "Listwa zaciskowa N", "Клеммная шина N"],
"comp.wago": ["Lever connector (WAGO)", "Svorka WAGO", "Клема WAGO", "Złączka WAGO", "Клемма WAGO"],
"comp.junctionBox": ["Junction box", "Instalační krabice", "Розподільна коробка", "Puszka łączeniowa", "Распределительная коробка"],
"comp.dinRail": ["DIN rail", "DIN lišta", "DIN-рейка", "Szyna DIN", "DIN-рейка"],
"comp.cableGland": ["Cable gland", "Kabelová vývodka", "Кабельний ввід", "Dławnica kablowa", "Кабельный ввод"],
"comp.combBusbar": ["Comb busbar", "Hřebenová lišta", "Гребінчаста шина", "Szyna grzebieniowa", "Гребенчатая шина"],
})

# ---------------------------------------------------------------- wiring accessories
add({
"comp.switch1": ["Switch no. 1 (one-way)", "Vypínač řazení 1 (jednopólový)", "Вимикач № 1 (однополюсний)", "Łącznik nr 1 (jednobiegunowy)", "Выключатель № 1 (однополюсный)"],
"comp.switch2": ["Switch no. 2 (two-pole)", "Vypínač řazení 2 (dvoupólový)", "Вимикач № 2 (двополюсний)", "Łącznik nr 2 (dwubiegunowy)", "Выключатель № 2 (двухполюсный)"],
"comp.switch3": ["Switch no. 3 (three-pole)", "Vypínač řazení 3 (trojpólový)", "Вимикач № 3 (триполюсний)", "Łącznik nr 3 (trójbiegunowy)", "Выключатель № 3 (трёхполюсный)"],
"comp.switch03": ["Switch no. 03 (three-pole + N)", "Vypínač řazení 03 (trojpólový s N)", "Вимикач № 03 (триполюсний + N)", "Łącznik nr 03 (trójbiegunowy + N)", "Выключатель № 03 (трёхполюсный + N)"],
"comp.switch4": ["Switch no. 4 (group, 1-0-2)", "Přepínač řazení 4 (skupinový)", "Перемикач № 4 (груповий 1-0-2)", "Łącznik nr 4 (grupowy 1-0-2)", "Переключатель № 4 (групповой 1-0-2)"],
"comp.switch5": ["Switch no. 5 (double, series)", "Vypínač řazení 5 (sériový, lustrový)", "Вимикач № 5 (двоклавішний)", "Łącznik nr 5 (świecznikowy)", "Выключатель № 5 (двухклавишный)"],
"comp.switch5A": ["Switch no. 5A (double two-way, common L)", "Přepínač řazení 5A (sériový střídavý)", "Перемикач № 5A (двоклавішний прохідний, спільна L)", "Łącznik nr 5A (podwójny schodowy, wspólne L)", "Переключатель № 5A (двухклавишный проходной, общая L)"],
"comp.switch66": ["Switch no. 5B / 6+6 (double two-way)", "Přepínač řazení 5B / 6+6 (dvojitý střídavý)", "Перемикач № 5B / 6+6 (подвійний прохідний)", "Łącznik nr 5B / 6+6 (podwójny schodowy)", "Переключатель № 5B / 6+6 (двойной проходной)"],
"comp.switch6": ["Switch no. 6 (two-way)", "Přepínač řazení 6 (střídavý, schodišťový)", "Перемикач № 6 (прохідний)", "Łącznik nr 6 (schodowy)", "Переключатель № 6 (проходной)"],
"comp.switch7": ["Switch no. 7 (intermediate)", "Přepínač řazení 7 (křížový)", "Перемикач № 7 (перехресний)", "Łącznik nr 7 (krzyżowy)", "Переключатель № 7 (перекрёстный)"],
"comp.button": ["Push button no. 1/0", "Tlačítko řazení 1/0", "Кнопка № 1/0", "Przycisk nr 1/0", "Кнопка № 1/0"],
"comp.dimmer": ["Dimmer", "Stmívač", "Димер", "Ściemniacz", "Диммер"],
"comp.motionDetector": ["Motion detector (PIR)", "Pohybové čidlo (PIR)", "Датчик руху (PIR)", "Czujnik ruchu (PIR)", "Датчик движения (PIR)"],
"comp.smartRelay": ["Smart relay", "Chytré relé", "Розумне реле", "Przekaźnik smart", "Умное реле"],
"comp.socket16": ["Socket outlet 16 A", "Zásuvka 16 A", "Розетка 16 А", "Gniazdo 16 A", "Розетка 16 А"],
"comp.socketUsb": ["Socket outlet with USB", "Zásuvka s USB", "Розетка з USB", "Gniazdo z USB", "Розетка с USB"],
"comp.socketCee": ["CEE three-phase socket", "Zásuvka CEE 5-kolíková", "Розетка CEE 5-контактна", "Gniazdo siłowe CEE", "Розетка силовая CEE"],
"comp.connectionBox": ["Connection box for a fixed appliance", "Přípojné místo pevného spotřebiče", "Місце під'єднання приладу", "Puszka przyłączeniowa", "Место подключения прибора"],
})

# ---------------------------------------------------------------- loads
add({
"comp.lampE27": ["Lamp E27", "Žárovka E27", "Лампа E27", "Żarówka E27", "Лампа E27"],
"comp.ledPanel": ["LED panel", "LED panel", "LED-панель", "Panel LED", "LED-панель"],
"comp.ledStrip": ["LED strip with driver", "LED pásek s driverem", "LED-стрічка з драйвером", "Taśma LED ze sterownikiem", "LED-лента с драйвером"],
"comp.fluorescent": ["Fluorescent fitting", "Zářivkové svítidlo", "Люмінесцентний світильник", "Oprawa świetlówkowa", "Люминесцентный светильник"],
"comp.boiler": ["Water heater / boiler", "Ohřívač vody (bojler)", "Водонагрівач (бойлер)", "Podgrzewacz wody", "Водонагреватель (бойлер)"],
"comp.cooker3f": ["Three-phase cooker", "Třífázový sporák", "Трифазна плита", "Kuchenka trójfazowa", "Трёхфазная плита"],
"comp.oven": ["Oven", "Trouba", "Духова шафа", "Piekarnik", "Духовой шкаф"],
"comp.washingMachine": ["Washing machine", "Pračka", "Пральна машина", "Pralka", "Стиральная машина"],
"comp.dishwasher": ["Dishwasher", "Myčka nádobí", "Посудомийна машина", "Zmywarka", "Посудомоечная машина"],
"comp.floorHeating": ["Electric underfloor heating", "Elektrické podlahové topení", "Електрична тепла підлога", "Ogrzewanie podłogowe elektryczne", "Электрический тёплый пол"],
"comp.airCon": ["Air conditioner", "Klimatizace", "Кондиціонер", "Klimatyzator", "Кондиционер"],
"comp.heatPump": ["Heat pump", "Tepelné čerpadlo", "Тепловий насос", "Pompa ciepła", "Тепловой насос"],
"comp.motor3f": ["Three-phase motor", "Třífázový motor", "Трифазний двигун", "Silnik trójfazowy", "Трёхфазный двигатель"],
"comp.machine": ["Workshop machine", "Dílenský stroj", "Верстат", "Maszyna warsztatowa", "Станок"],
"comp.genericLoad": ["Generic load", "Obecný spotřebič", "Загальний споживач", "Odbiornik ogólny", "Общий потребитель"],
"comp.genericLoad3f": ["Generic three-phase load", "Obecný třífázový spotřebič", "Загальний трифазний споживач", "Odbiornik trójfazowy", "Общий трёхфазный потребитель"],
"comp.evse": ["EV charging point (wallbox)", "Nabíjecí stanice (wallbox)", "Зарядна станція (wallbox)", "Stacja ładowania (wallbox)", "Зарядная станция (wallbox)"],
})

# ---------------------------------------------------------------- instruments
add({
"comp.multimeter": ["Multimeter", "Multimetr", "Мультиметр", "Multimetr", "Мультиметр"],
"comp.clampMeter": ["Clamp meter", "Klešťový ampérmetr", "Струмовимірювальні кліщі", "Miernik cęgowy", "Токоизмерительные клещи"],
"comp.insulationTester": ["Insulation resistance tester", "Měřič izolačního odporu", "Вимірювач опору ізоляції", "Miernik rezystancji izolacji", "Измеритель сопротивления изоляции"],
"comp.loopTester": ["Loop impedance tester", "Měřič impedance smyčky", "Вимірювач опору петлі", "Miernik impedancji pętli zwarcia", "Измеритель сопротивления петли"],
"comp.rcdTester": ["RCD tester", "Tester proudových chráničů", "Тестер ПЗВ", "Tester wyłączników różnicowoprądowych", "Тестер УЗО"],
"comp.phaseTester": ["Phase rotation tester", "Zkoušečka sledu fází", "Індикатор чергування фаз", "Wskaźnik kolejności faz", "Индикатор чередования фаз"],
"comp.socketTester": ["Socket tester", "Zkoušečka zásuvek", "Тестер розеток", "Tester gniazd", "Тестер розеток"],
"cat.relays": ["Contactors, relays & pilot devices", "Stykače, relé a ovladače", "Контактори, реле та кнопки", "Styczniki, przekaźniki i łączniki sterownicze", "Контакторы, реле и кнопки"],
"comp.motorContactor": ["Motor contactor (AC-3)", "Motorový stykač (AC-3)", "Контактор двигуна (AC-3)", "Stycznik silnikowy (AC-3)", "Контактор двигателя (AC-3)"],
"comp.controlRelay": ["Control relay (changeover)", "Pomocné relé (přepínací)", "Проміжне реле (перекидне)", "Przekaźnik pomocniczy (przełączny)", "Промежуточное реле (перекидное)"],
"comp.pushButton": ["Control push button", "Ovládací tlačítko", "Кнопка керування", "Przycisk sterowniczy", "Кнопка управления"],
"comp.selectorSwitch": ["Selector switch", "Ovládací přepínač", "Перемикач керування", "Przełącznik sterowniczy", "Переключатель управления"],
"comp.emergencyStop": ["Emergency stop", "Nouzové zastavení (TOTAL STOP)", "Аварійна кнопка «Стоп»", "Wyłącznik bezpieczeństwa (grzybek)", "Аварийная кнопка «Стоп»"],
"comp.limitSwitch": ["Limit switch", "Koncový spínač", "Кінцевий вимикач", "Łącznik krańcowy", "Концевой выключатель"],
})
