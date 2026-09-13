"""Simulation: event log, fault injection, instruments and the status bar."""
S = {}


def add(section):
    for k, v in section.items():
        assert k not in S, k
        assert len(v) == 5, k
        S[k] = v


# ---------------------------------------------------------------- event log
add({
"log.title": ["Event log", "Protokol událostí", "Журнал подій", "Dziennik zdarzeń", "Журнал событий"],
"log.empty": ["No events yet", "Zatím žádné události", "Подій ще немає", "Brak zdarzeń", "Событий пока нет"],
"log.mcbTripThermal": [
 "{{label}} tripped on overload: {{i}} A through a {{inA}} A device, thermal release after about {{s}} s.",
 "{{label}} vypnul přetížením: {{i}} A přes {{inA}} A přístroj, tepelná spoušť asi po {{s}} s.",
 "{{label}} спрацював від перевантаження: {{i}} А через апарат {{inA}} А, теплова дія приблизно за {{s}} с.",
 "{{label}} zadziałał od przeciążenia: {{i}} A przez aparat {{inA}} A, wyzwalacz termiczny po ok. {{s}} s.",
 "{{label}} сработал от перегрузки: {{i}} А через аппарат {{inA}} А, тепловой расцепитель примерно через {{s}} с."],
"log.mcbTripMagnetic": [
 "{{label}} tripped on short circuit: {{i}} A is above the magnetic threshold of a {{inA}} A curve {{curve}} device; it cleared in {{ms}} ms.",
 "{{label}} vypnul zkratem: {{i}} A překračuje zkratovou spoušť jističe {{inA}} A charakteristiky {{curve}}; vypnul za {{ms}} ms.",
 "{{label}} спрацював від короткого замикання: {{i}} А перевищує електромагнітний розчіплювач апарата {{inA}} А характеристики {{curve}}; вимкнув за {{ms}} мс.",
 "{{label}} zadziałał od zwarcia: {{i}} A przekracza wyzwalacz zwarciowy aparatu {{inA}} A o charakterystyce {{curve}}; wyłączył w {{ms}} ms.",
 "{{label}} сработал от короткого замыкания: {{i}} А превышает электромагнитный расцепитель аппарата {{inA}} А характеристики {{curve}}; отключил за {{ms}} мс."],
"log.breakingCapacityExceeded": [
 "{{label}}: the prospective current {{i}} A exceeds the {{icn}} A breaking capacity of the device — it may be destroyed instead of clearing the fault.",
 "{{label}}: předpokládaný proud {{i}} A překračuje zkratovou odolnost {{icn}} A — přístroj se může zničit místo vypnutí.",
 "{{label}}: очікуваний струм {{i}} А перевищує вимикальну здатність {{icn}} А — апарат може зруйнуватися замість вимкнення.",
 "{{label}}: spodziewany prąd {{i}} A przekracza zdolność zwarciową {{icn}} A — aparat może ulec zniszczeniu zamiast wyłączyć.",
 "{{label}}: ожидаемый ток {{i}} А превышает отключающую способность {{icn}} А — аппарат может разрушиться вместо отключения."],
"log.rcdTrip": [
 "{{label}} tripped: residual current {{mA}} mA against IΔn {{idn}} mA, operating time {{ms}} ms.",
 "{{label}} vypnul: reziduální proud {{mA}} mA proti IΔn {{idn}} mA, vypínací čas {{ms}} ms.",
 "{{label}} спрацював: диференційний струм {{mA}} мА проти IΔn {{idn}} мА, час спрацювання {{ms}} мс.",
 "{{label}} zadziałał: prąd różnicowy {{mA}} mA wobec IΔn {{idn}} mA, czas wyłączenia {{ms}} ms.",
 "{{label}} сработал: дифференциальный ток {{mA}} мА против IΔn {{idn}} мА, время срабатывания {{ms}} мс."],
"log.rcdTripDc": [
 "{{label}} tripped on a smooth DC residual current of {{mA}} mA.",
 "{{label}} vypnul na hladkém stejnosměrném reziduálním proudu {{mA}} mA.",
 "{{label}} спрацював від згладженого постійного диференційного струму {{mA}} мА.",
 "{{label}} zadziałał od wygładzonego stałego prądu różnicowego {{mA}} mA.",
 "{{label}} сработал от сглаженного постоянного дифференциального тока {{mA}} мА."],
"log.rcdBlindedByDc": [
 "{{label}} is a type {{type}} device and is blinded by {{mA}} mA of smooth DC — it can no longer detect an AC fault.",
 "{{label}} je typ {{type}} a je zaslepen {{mA}} mA hladkého DC — už nedokáže detekovat střídavou poruchu.",
 "{{label}} — тип {{type}}, насичений {{mA}} мА згладженого постійного струму і більше не виявляє змінний струм витоку.",
 "{{label}} typu {{type}} jest oślepiony przez {{mA}} mA prądu stałego — nie wykryje już usterki przemiennej.",
 "{{label}} типа {{type}} насыщен {{mA}} мА сглаженного постоянного тока и больше не обнаруживает переменный ток утечки."],
"log.rcdFailedToTrip": [
 "{{label}} (type {{type}}) did NOT trip on a residual current of {{mA}} mA — the fault waveform is outside what this type can detect.",
 "{{label}} (typ {{type}}) NEVYPNUL při reziduálním proudu {{mA}} mA — tvar poruchového proudu tento typ nedetekuje.",
 "{{label}} (тип {{type}}) НЕ спрацював при струмі витоку {{mA}} мА — форма струму поза можливостями цього типу.",
 "{{label}} (typ {{type}}) NIE zadziałał przy prądzie różnicowym {{mA}} mA — kształt prądu jest poza możliwościami tego typu.",
 "{{label}} (тип {{type}}) НЕ сработал при токе утечки {{mA}} мА — форма тока вне возможностей этого типа."],
"log.rcdLeakageHigh": [
 "{{label}}: standing leakage {{mA}} mA — a third of IΔn is already used up, nuisance tripping is likely.",
 "{{label}}: trvalý svodový proud {{mA}} mA — třetina IΔn je vyčerpána, hrozí planá vypnutí.",
 "{{label}}: постійний струм витоку {{mA}} мА — третину IΔn вичерпано, ймовірні хибні спрацювання.",
 "{{label}}: stały prąd upływu {{mA}} mA — jedna trzecia IΔn wykorzystana, możliwe zbędne wyłączenia.",
 "{{label}}: постоянный ток утечки {{mA}} мА — треть IΔn исчерпана, вероятны ложные срабатывания."],
"log.rcdOverloaded": [
 "{{label}} is carrying {{i}} A but is rated {{inA}} A — it has no overcurrent release of its own and must be backed up.",
 "{{label}} vede {{i}} A, ale je dimenzován na {{inA}} A — nemá vlastní nadproudovou spoušť a musí být jištěn.",
 "{{label}} проводить {{i}} А при номіналі {{inA}} А — власного розчіплювача не має, потрібен захист перед ним.",
 "{{label}} przewodzi {{i}} A przy znamionowym {{inA}} A — nie ma własnego wyzwalacza, musi być zabezpieczony.",
 "{{label}} проводит {{i}} А при номинале {{inA}} А — собственного расцепителя нет, нужна защита перед ним."],
"log.afddTrip": [
 "{{label}} detected an arc fault of {{a}} A and disconnected in {{ms}} ms.",
 "{{label}} detekoval poruchový oblouk {{a}} A a odpojil za {{ms}} ms.",
 "{{label}} виявив дугове замикання {{a}} А і вимкнув за {{ms}} мс.",
 "{{label}} wykrył łuk {{a}} A i wyłączył w {{ms}} ms.",
 "{{label}} обнаружил дуговой пробой {{a}} А и отключил за {{ms}} мс."],
"log.afddBelowThreshold": [
 "{{label}}: arc current {{a}} A is below the 2,5 A detection threshold — the device will not operate.",
 "{{label}}: proud oblouku {{a}} A je pod prahem detekce 2,5 A — přístroj nezapůsobí.",
 "{{label}}: струм дуги {{a}} А нижчий за поріг виявлення 2,5 А — апарат не спрацює.",
 "{{label}}: prąd łuku {{a}} A jest poniżej progu 2,5 A — aparat nie zadziała.",
 "{{label}}: ток дуги {{a}} А ниже порога обнаружения 2,5 А — аппарат не сработает."],
"log.spdConducting": [
 "{{label}} is conducting: {{u}} V between line and PE, the surge is being diverted to earth.",
 "{{label}} vede: {{u}} V mezi fází a PE, přepětí je svedeno do země.",
 "{{label}} проводить: {{u}} В між фазою і PE, імпульс відводиться на землю.",
 "{{label}} przewodzi: {{u}} V między fazą a PE, przepięcie jest odprowadzane do ziemi.",
 "{{label}} проводит: {{u}} В между фазой и PE, импульс отводится на землю."],
"log.spdEndOfLife": [
 "{{label}} has reached the end of its life and no longer protects — replace the cartridge.",
 "{{label}} je na konci životnosti a už nechrání — vyměňte modul.",
 "{{label}} вичерпав ресурс і більше не захищає — замініть модуль.",
 "{{label}} osiągnął koniec żywotności i nie chroni — wymień wkładkę.",
 "{{label}} исчерпал ресурс и больше не защищает — замените модуль."],
"log.fuseBlown": [
 "{{label}} ruptured: {{i}} A through a {{inA}} A {{kind}} fuse link.",
 "{{label}} přepálena: {{i}} A přes pojistkovou vložku {{inA}} A {{kind}}.",
 "{{label}} перегорів: {{i}} А через вставку {{inA}} А {{kind}}.",
 "{{label}} przepalony: {{i}} A przez wkładkę {{inA}} A {{kind}}.",
 "{{label}} перегорел: {{i}} А через вставку {{inA}} А {{kind}}."],
"log.motorStarterShort": [
 "{{label}} tripped magnetically at {{i}} A.",
 "{{label}} vypnul zkratovou spouští při {{i}} A.",
 "{{label}} спрацював електромагнітним розчіплювачем при {{i}} А.",
 "{{label}} zadziałał wyzwalaczem zwarciowym przy {{i}} A.",
 "{{label}} сработал электромагнитным расцепителем при {{i}} А."],
"log.motorOverload": [
 "{{label}} tripped on thermal overload: {{i}} A against a setting of {{setA}} A.",
 "{{label}} vypnul tepelnou ochranou: {{i}} A proti nastavení {{setA}} A.",
 "{{label}} спрацював тепловим захистом: {{i}} А проти уставки {{setA}} А.",
 "{{label}} zadziałał zabezpieczeniem termicznym: {{i}} A wobec nastawy {{setA}} A.",
 "{{label}} сработал тепловой защитой: {{i}} А против уставки {{setA}} А."],
"log.contactorOn": ["{{label}} picked up.", "{{label}} sepnul.", "{{label}} увімкнувся.", "{{label}} załączył.", "{{label}} включился."],
"log.contactorOff": ["{{label}} dropped out.", "{{label}} rozepnul.", "{{label}} вимкнувся.", "{{label}} wyłączył.", "{{label}} отключился."],
"log.impulseToggle": ["{{label}} changed state.", "{{label}} přepnulo stav.", "{{label}} змінило стан.", "{{label}} zmienił stan.", "{{label}} изменило состояние."],
"log.stairTimerExpired": ["{{label}} timed out and switched the lighting off.", "{{label}} doběhl a zhasl osvětlení.", "{{label}} відпрацював і вимкнув освітлення.", "{{label}} odliczył czas i wyłączył oświetlenie.", "{{label}} отработал и выключил освещение."],
"log.phaseMonitorFault": ["{{label}}: voltage out of range, lowest phase {{u}} V — output contact opened.", "{{label}}: napětí mimo meze, nejnižší fáze {{u}} V — výstupní kontakt rozepnul.", "{{label}}: напруга поза межами, найнижча фаза {{u}} В — контакт розімкнувся.", "{{label}}: napięcie poza zakresem, najniższa faza {{u}} V — styk rozwarty.", "{{label}}: напряжение вне пределов, низшая фаза {{u}} В — контакт разомкнулся."],
"log.phaseMonitorOk": ["{{label}}: all three phases healthy again.", "{{label}}: všechny tři fáze jsou opět v pořádku.", "{{label}}: усі три фази знову в нормі.", "{{label}}: wszystkie trzy fazy znów prawidłowe.", "{{label}}: все три фазы снова в норме."],
"log.prioritySheds": ["{{label}} shed the low-priority load at {{i}} A.", "{{label}} odpojilo podružnou zátěž při {{i}} A.", "{{label}} відключило другорядне навантаження при {{i}} А.", "{{label}} odłączył odbiornik podrzędny przy {{i}} A.", "{{label}} отключило второстепенную нагрузку при {{i}} А."],
"log.priorityRestored": ["{{label}} restored the low-priority load.", "{{label}} obnovilo podružnou zátěž.", "{{label}} відновило другорядне навантаження.", "{{label}} przywrócił odbiornik podrzędny.", "{{label}} восстановило второстепенную нагрузку."],
"log.motionDetected": ["{{label}} detected movement.", "{{label}} zaznamenalo pohyb.", "{{label}} виявив рух.", "{{label}} wykrył ruch.", "{{label}} обнаружил движение."],
"log.motionTimeout": ["{{label}} hold time expired.", "{{label}} doběhla doba sepnutí.", "{{label}}: час утримання минув.", "{{label}}: czas podtrzymania minął.", "{{label}}: время удержания истекло."],
"log.bodyCurrent": [
 "A current of {{mA}} mA is flowing through the person ({{zone}}).",
 "Osobou protéká proud {{mA}} mA ({{zone}}).",
 "Крізь людину тече струм {{mA}} мА ({{zone}}).",
 "Przez człowieka płynie prąd {{mA}} mA ({{zone}}).",
 "Через человека течёт ток {{mA}} мА ({{zone}})."],
"log.fatalOutcome": [
 "FATAL: {{mA}} mA for {{s}} s — ventricular fibrillation is probable. Nothing disconnected the supply in time.",
 "SMRTELNÉ: {{mA}} mA po dobu {{s}} s — fibrilace komor je pravděpodobná. Nic neodpojilo napájení včas.",
 "СМЕРТЕЛЬНО: {{mA}} мА протягом {{s}} с — фібриляція шлуночків імовірна. Ніщо не вимкнуло живлення вчасно.",
 "ŚMIERTELNIE: {{mA}} mA przez {{s}} s — migotanie komór jest prawdopodobne. Nic nie odłączyło zasilania na czas.",
 "СМЕРТЕЛЬНО: {{mA}} мА в течение {{s}} с — фибрилляция желудочков вероятна. Ничто не отключило питание вовремя."],
"log.shockCleared": ["The person was disconnected after {{ms}} ms.", "Osoba byla odpojena po {{ms}} ms.", "Людину знеструмлено через {{ms}} мс.", "Człowiek został odłączony po {{ms}} ms.", "Человек обесточен через {{ms}} мс."],
})

# operator actions
add({
"log.operate.toggle": ["{{label}} operated.", "{{label}} přepnuto.", "{{label}} перемкнуто.", "{{label}} przełączony.", "{{label}} переключено."],
"log.operate.toggleA": ["{{label}} — first circuit operated.", "{{label}} — přepnut první obvod.", "{{label}} — перемкнуто перше коло.", "{{label}} — przełączony pierwszy obwód.", "{{label}} — переключена первая цепь."],
"log.operate.toggleB": ["{{label}} — second circuit operated.", "{{label}} — přepnut druhý obvod.", "{{label}} — перемкнуто друге коло.", "{{label}} — przełączony drugi obwód.", "{{label}} — переключена вторая цепь."],
"log.operate.press": ["{{label}} pressed.", "{{label}} stisknuto.", "{{label}} натиснуто.", "{{label}} naciśnięty.", "{{label}} нажато."],
"log.operate.release": ["{{label}} released.", "{{label}} uvolněno.", "{{label}} відпущено.", "{{label}} zwolniony.", "{{label}} отпущено."],
"log.operate.close": ["{{label}} closed.", "{{label}} zapnuto.", "{{label}} увімкнено.", "{{label}} załączony.", "{{label}} включено."],
"log.operate.open": ["{{label}} opened.", "{{label}} vypnuto.", "{{label}} вимкнено.", "{{label}} wyłączony.", "{{label}} выключено."],
"log.operate.reset": ["{{label}} reset and put back into service.", "{{label}} resetován a vrácen do provozu.", "{{label}} скинуто й повернуто в роботу.", "{{label}} zresetowany i przywrócony.", "{{label}} сброшен и возвращён в работу."],
"log.operate.set": ["{{label}} adjusted.", "{{label}} nastaveno.", "{{label}} налаштовано.", "{{label}} ustawiony.", "{{label}} настроено."],
"log.operate.plug": ["Appliance plugged into {{label}}.", "Spotřebič zapojen do {{label}}.", "Прилад увімкнено в {{label}}.", "Odbiornik podłączony do {{label}}.", "Прибор подключён к {{label}}."],
"log.operate.unplug": ["Appliance unplugged from {{label}}.", "Spotřebič odpojen z {{label}}.", "Прилад від'єднано від {{label}}.", "Odbiornik odłączony od {{label}}.", "Прибор отключён от {{label}}."],
"log.operate.trigger": ["{{label}} triggered.", "{{label}} aktivováno.", "{{label}} активовано.", "{{label}} wyzwolony.", "{{label}} активировано."],
})

# body zones
add({
"zone.none": ["no effect", "bez účinku", "без впливу", "bez skutku", "без воздействия"],
"zone.perception": ["perception threshold", "práh vnímání", "поріг відчуття", "próg odczuwania", "порог ощущения"],
"zone.muscular": ["muscular reaction, cannot let go", "svalová reakce, nelze se pustit", "м'язова реакція, неможливо відпустити", "reakcja mięśniowa, brak możliwości puszczenia", "мышечная реакция, невозможно отпустить"],
"zone.severe": ["severe effects", "těžké účinky", "тяжкі наслідки", "ciężkie skutki", "тяжёлые последствия"],
"zone.fibrillation": ["risk of ventricular fibrillation", "riziko fibrilace komor", "ризик фібриляції шлуночків", "ryzyko migotania komór", "риск фибрилляции желудочков"],
})

# ---------------------------------------------------------------- faults
add({
"fault.title": ["Fault injection", "Zavedení poruchy", "Введення несправності", "Wprowadzenie usterki", "Введение неисправности"],
"fault.add": ["Inject fault", "Zavést poruchu", "Ввести несправність", "Wprowadź usterkę", "Ввести неисправность"],
"fault.active": ["Active faults", "Aktivní poruchy", "Активні несправності", "Aktywne usterki", "Активные неисправности"],
"fault.none": ["No faults injected", "Žádné poruchy", "Немає несправностей", "Brak usterek", "Нет неисправностей"],
"fault.target": ["Apply to", "Použít na", "Застосувати до", "Zastosuj do", "Применить к"],
"fault.terminal": ["Terminal", "Svorka", "Клема", "Zacisk", "Клемма"],
"fault.resistance": ["Fault resistance", "Odpor poruchy", "Опір несправності", "Rezystancja usterki", "Сопротивление неисправности"],
"fault.bodyResistance": ["Body resistance", "Odpor těla", "Опір тіла", "Rezystancja ciała", "Сопротивление тела"],
"fault.standingResistance": ["Standing resistance (shoes, floor)", "Odpor stanoviště (obuv, podlaha)", "Опір місця стояння (взуття, підлога)", "Rezystancja stanowiska (obuwie, podłoga)", "Сопротивление места стояния (обувь, пол)"],
"fault.surgeV": ["Surge peak voltage", "Vrcholové napětí přepětí", "Пікова напруга імпульсу", "Napięcie szczytowe przepięcia", "Пиковое напряжение импульса"],
"fault.arcCurrent": ["Arc current", "Proud oblouku", "Струм дуги", "Prąd łuku", "Ток дуги"],
"fault.dcResidual": ["Smooth DC residual current", "Hladký stejnosměrný reziduální proud", "Згладжений постійний струм витоку", "Wygładzony stały prąd różnicowy", "Сглаженный постоянный ток утечки"],
"fault.wire": ["Conductor", "Vodič", "Провідник", "Przewód", "Проводник"],
"fault.kind.shortLN": ["Short circuit L-N", "Zkrat L-N", "Коротке замикання L-N", "Zwarcie L-N", "Короткое замыкание L-N"],
"fault.kind.shortLPE": ["Short circuit L-PE", "Zkrat L-PE", "Коротке замикання L-PE", "Zwarcie L-PE", "Короткое замыкание L-PE"],
"fault.kind.shortLL": ["Short circuit L-L", "Zkrat L-L", "Коротке замикання L-L", "Zwarcie L-L", "Короткое замыкание L-L"],
"fault.kind.earthFault": ["Earth fault", "Zemní spojení", "Замикання на землю", "Zwarcie doziemne", "Замыкание на землю"],
"fault.kind.touch": ["Person touching a live part", "Dotyk živé části člověkem", "Дотик людини до струмовідних частин", "Dotyk człowieka do części czynnej", "Прикосновение человека к токоведущей части"],
"fault.kind.insulation": ["Insulation degradation", "Zhoršení izolace", "Погіршення ізоляції", "Pogorszenie izolacji", "Ухудшение изоляции"],
"fault.kind.lossPE": ["Loss of the protective conductor", "Ztráta ochranného vodiče", "Втрата захисного провідника", "Utrata przewodu ochronnego", "Потеря защитного проводника"],
"fault.kind.lossPhase": ["Loss of a phase", "Výpadek fáze", "Втрата фази", "Zanik fazy", "Потеря фазы"],
"fault.kind.surge": ["Mains surge", "Přepětí v síti", "Перенапруга в мережі", "Przepięcie sieciowe", "Перенапряжение в сети"],
"fault.kind.cableDamage": ["Cable damage", "Poškození kabelu", "Пошкодження кабелю", "Uszkodzenie kabla", "Повреждение кабеля"],
"fault.kind.arc": ["Arc fault", "Poruchový oblouk", "Дугове замикання", "Zwarcie łukowe", "Дуговой пробой"],
"fault.kind.dcResidual": ["DC residual current", "Stejnosměrný reziduální proud", "Постійний струм витоку", "Stały prąd różnicowy", "Постоянный ток утечки"],
"log.fault.shortLN": ["Short circuit L-N injected at {{target}}.", "Zaveden zkrat L-N na {{target}}.", "Введено коротке замикання L-N на {{target}}.", "Wprowadzono zwarcie L-N w {{target}}.", "Введено короткое замыкание L-N на {{target}}."],
"log.fault.shortLPE": ["Short circuit L-PE injected at {{target}}.", "Zaveden zkrat L-PE na {{target}}.", "Введено коротке замикання L-PE на {{target}}.", "Wprowadzono zwarcie L-PE w {{target}}.", "Введено короткое замыкание L-PE на {{target}}."],
"log.fault.shortLL": ["Short circuit L-L injected at {{target}}.", "Zaveden zkrat L-L na {{target}}.", "Введено коротке замикання L-L на {{target}}.", "Wprowadzono zwarcie L-L w {{target}}.", "Введено короткое замыкание L-L на {{target}}."],
"log.fault.earthFault": ["Earth fault injected at {{target}}.", "Zavedeno zemní spojení na {{target}}.", "Введено замикання на землю на {{target}}.", "Wprowadzono zwarcie doziemne w {{target}}.", "Введено замыкание на землю на {{target}}."],
"log.fault.touch": ["A person is touching {{target}}.", "Osoba se dotýká {{target}}.", "Людина торкається {{target}}.", "Człowiek dotyka {{target}}.", "Человек касается {{target}}."],
"log.fault.insulation": ["Insulation of {{target}} degraded.", "Izolace {{target}} zhoršena.", "Ізоляцію {{target}} погіршено.", "Izolacja {{target}} pogorszona.", "Изоляция {{target}} ухудшена."],
"log.fault.lossPE": ["Protective conductor lost at {{target}}.", "Ztracen ochranný vodič u {{target}}.", "Втрачено захисний провідник біля {{target}}.", "Utracono przewód ochronny przy {{target}}.", "Потерян защитный проводник у {{target}}."],
"log.fault.lossPhase": ["Phase lost at {{target}}.", "Výpadek fáze na {{target}}.", "Втрата фази на {{target}}.", "Zanik fazy w {{target}}.", "Потеря фазы на {{target}}."],
"log.fault.surge": ["Mains surge applied at {{target}}.", "Přepětí zavedeno na {{target}}.", "Перенапругу подано на {{target}}.", "Przepięcie podane na {{target}}.", "Перенапряжение подано на {{target}}."],
"log.fault.cableDamage": ["Cable damage injected at {{target}}.", "Zavedeno poškození kabelu u {{target}}.", "Введено пошкодження кабелю біля {{target}}.", "Wprowadzono uszkodzenie kabla przy {{target}}.", "Введено повреждение кабеля у {{target}}."],
"log.fault.arc": ["Arc fault injected at {{target}}.", "Zaveden poruchový oblouk na {{target}}.", "Введено дугове замикання на {{target}}.", "Wprowadzono zwarcie łukowe w {{target}}.", "Введён дуговой пробой на {{target}}."],
"log.fault.dcResidual": ["DC residual current injected at {{target}}.", "Zaveden stejnosměrný reziduální proud na {{target}}.", "Введено постійний струм витоку на {{target}}.", "Wprowadzono stały prąd różnicowy w {{target}}.", "Введён постоянный ток утечки на {{target}}."],
})

# ---------------------------------------------------------------- instruments
add({
"inst.title": ["Instruments", "Měření", "Вимірювання", "Pomiary", "Измерения"],
"inst.reading": ["Reading", "Naměřeno", "Показання", "Odczyt", "Показание"],
"inst.measure": ["Measure", "Změřit", "Виміряти", "Zmierz", "Измерить"],
"inst.probeA": ["Probe A", "Hrot A", "Щуп A", "Sonda A", "Щуп A"],
"inst.probeB": ["Probe B", "Hrot B", "Щуп B", "Sonda B", "Щуп B"],
"inst.zs": ["Loop impedance Zs", "Impedance smyčky Zs", "Опір петлі Zs", "Impedancja pętli Zs", "Сопротивление петли Zs"],
"inst.ipf": ["Prospective fault current", "Předpokládaný poruchový proud", "Очікуваний струм пошкодження", "Spodziewany prąd zwarciowy", "Ожидаемый ток повреждения"],
"inst.insulation": ["Insulation resistance", "Izolační odpor", "Опір ізоляції", "Rezystancja izolacji", "Сопротивление изоляции"],
"inst.tripTime": ["Trip time", "Vypínací čas", "Час спрацювання", "Czas wyłączenia", "Время срабатывания"],
"inst.tripCurrent": ["Trip current", "Vypínací proud", "Струм спрацювання", "Prąd wyłączenia", "Ток срабатывания"],
"inst.limit": ["Limit", "Mez", "Межа", "Granica", "Предел"],
"inst.rotation": ["Phase rotation", "Sled fází", "Чергування фаз", "Kolejność faz", "Чередование фаз"],
"inst.rotation.incomplete": ["Cannot determine — a phase is missing", "Nelze určit — chybí fáze", "Неможливо визначити — бракує фази", "Nie można określić — brak fazy", "Невозможно определить — нет фазы"],
"inst.noRcd": ["No RCD protects this point", "Toto místo nechrání žádný chránič", "Цю точку не захищає жоден ПЗВ", "Tego punktu nie chroni żaden wyłącznik różnicowoprądowy", "Эту точку не защищает ни одно УЗО"],
"inst.typeCannotSense": ["This RCD type cannot sense the applied waveform", "Tento typ chrániče nedetekuje zadaný tvar proudu", "Цей тип ПЗВ не виявляє заданої форми струму", "Ten typ nie wykrywa zadanego kształtu prądu", "Этот тип УЗО не обнаруживает заданную форму тока"],
"inst.noTripCorrect": ["Correctly did not trip at 0,5×IΔn", "Správně nevypnul při 0,5×IΔn", "Правильно не спрацював при 0,5×IΔn", "Prawidłowo nie zadziałał przy 0,5×IΔn", "Правильно не сработал при 0,5×IΔn"],
"inst.belowThreshold": ["Below the operating threshold", "Pod prahem zapůsobení", "Нижче порога спрацювання", "Poniżej progu zadziałania", "Ниже порога срабатывания"],
"inst.socketOk": ["Socket wired correctly", "Zásuvka je zapojena správně", "Розетку під'єднано правильно", "Gniazdo podłączone prawidłowo", "Розетка подключена правильно"],
"inst.socket.noSupply": ["No supply at the socket", "Zásuvka je bez napětí", "Розетка без напруги", "Gniazdo bez napięcia", "Розетка без напряжения"],
"inst.socket.peMissing": ["Protective conductor missing or not connected", "Chybí ochranný vodič nebo není připojen", "Захисний провідник відсутній або не приєднаний", "Brak przewodu ochronnego lub nie jest podłączony", "Защитный проводник отсутствует или не подключён"],
"inst.socket.neutralMissing": ["Neutral missing", "Chybí střední vodič", "Немає нейтралі", "Brak przewodu neutralnego", "Нет нейтрали"],
"inst.socket.neutralAndProtectiveSwapped": ["Neutral and protective conductor swapped", "Zaměněn střední a ochranný vodič", "Переплутано нейтраль і захисний провідник", "Zamieniony przewód neutralny i ochronny", "Перепутаны нейтраль и защитный проводник"],
"inst.socket.notFound": ["Socket not found", "Zásuvka nenalezena", "Розетку не знайдено", "Nie znaleziono gniazda", "Розетка не найдена"],
})

# ---------------------------------------------------------------- status bar
add({
"status.totalLoad": ["Total load", "Celkový odběr", "Загальне навантаження", "Obciążenie całkowite", "Общая нагрузка"],
"status.perPhase": ["Current per phase", "Proud po fázích", "Струм по фазах", "Prąd w fazach", "Ток по фазам"],
"status.imbalance": ["Phase imbalance", "Nesymetrie fází", "Несиметрія фаз", "Asymetria faz", "Несимметрия фаз"],
"status.installed": ["Installed power", "Instalovaný výkon", "Встановлена потужність", "Moc zainstalowana", "Установленная мощность"],
"status.simultaneous": ["Simultaneous power", "Soudobý výkon", "Одночасна потужність", "Moc szczytowa", "Одновременная мощность"],
"status.simTime": ["Simulated time", "Čas simulace", "Час симуляції", "Czas symulacji", "Время симуляции"],
"status.running": ["Running", "Běží", "Працює", "Działa", "Работает"],
"status.stopped": ["Stopped", "Zastaveno", "Зупинено", "Zatrzymano", "Остановлено"],
"status.tripped": ["{{count}} device(s) tripped", "Vypnuto přístrojů: {{count}}", "Спрацювало апаратів: {{count}}", "Zadziałało aparatów: {{count}}", "Сработало аппаратов: {{count}}"],
"status.touchVoltage": ["Highest touch voltage", "Nejvyšší dotykové napětí", "Найвища напруга дотику", "Najwyższe napięcie dotykowe", "Наибольшее напряжение прикосновения"],
"status.bodyCurrent": ["Body current", "Proud tělem", "Струм крізь тіло", "Prąd przez ciało", "Ток через тело"],
})
