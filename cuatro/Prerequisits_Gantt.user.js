// ==UserScript==
// @name           Prerequisits Gantt
// @namespace      https://accesosede.my.salesforce.com/
// @description    Gantt per la finestra de prerequisits
// @match          http*://*.force.com/*
// @match          http*://*.salesforce.com/*
// @author         Adrian Sanchez Martinez (adrian.sanchez@enel.com)
// @version        0.9.9
// ==/UserScript==

(function() {
    let lastGanttSignature = null;
    let lastPageKey = null;
    const REFRESH_INTERVAL_MS = 1000;

    const refreshTimer = setInterval(() => {
        mostrarGanttUnaVez();
    }, REFRESH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
        clearInterval(refreshTimer);
    });

    function obtenerDatosGantt() {  // Funció per obtenir les dades del Gantt de la taula de prerequisits

        const datos = []; // Array per emmagatzemar les dades del Gantt
        const thTitle = getElementsByXPath("//span[@title='Nombre del Pre-requisito']"); // Obtenim el primer element th amb el títol "Nombre del Pre-requisito"
        let tabla = thTitle[0].closest('table'); // Obtenim la taula que conté aquest element th
        const posNombre = getElementsByXPath("*//span[@title='Nombre del Pre-requisito']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Nombre del Pre-requisito"
        const posInicio = getElementsByXPath("*//span[@title='Fecha de inicio']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha de inicio"
        const posFin = getElementsByXPath("*//span[@title='Fecha prevista fin']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha prevista fin"
        const posRealFin = getElementsByXPath("*//span[@title='Fecha real fin']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha real fin"
        const filas = getElementsByXPath("*//a[contains(@href,'/a2c')]", tabla); // Obtenim totes les files que contenen un enllaç amb "/a2c" a la taula

        for (let i = 0; i < filas.length; i++) { //Entrem a cada prerequisit

            const fila = filas[i].closest('tr'); // Obtenim la fila que conté aquest enllaç

            if (!fila) continue;    // Si no trobem la fila, continuem amb la següent iteració

            const nombre = fila.children[posNombre].innerText.split("\n")[0].trim();    // Obtenim el nom del prerequisit i eliminem els salts de línia i espais innecessaris
            const inicio = fila.children[posInicio].innerText.trim();       // Obtenim la data d'inici del prerequisit i eliminem els salts de línia i espais innecessaris
            const prevista = fila.children[posFin].innerText.trim();    // Obtenim la data prevista de finalització del prerequisit i eliminem els salts de línia i espais innecessaris
            const realFin = fila.children[posRealFin].innerText.trim(); // Obtenim la data real de finalització del prerequisit i eliminem els salts de línia i espais innecessaris

            datos.push({    // Afegim un objecte amb les dades del prerequisit a l'array de dades del Gantt
                nombre,
                inicio,
                prevista,
                realFin,
                cerrado: realFin !== ""
            });
        }

        return datos;
    }

    function parseFechaES(texto) {  // Funció per convertir una data en format "dd/mm/yyyy" a un objecte Date

        if (!texto) return null;    // Si el text és buit, retornem null

        const partes = texto.split("/");    // Separem el text en parts utilitzant "/" com a separador

        if (partes.length !== 3) return null; // Si no tenim tres parts, retornem null

        return new Date(    // Creem un objecte Date amb les parts corresponents (any, mes, dia)
            parseInt(partes[2]),        // Any
            parseInt(partes[1]) - 1,    // Mes (restem 1 perquè els mesos a JavaScript van de 0 a 11)
            parseInt(partes[0])         // Dia
        );
    }

    function tieneSuperposicionEnGap(current, gapStart, gapEnd, datos) {    // Funció per comprovar si hi ha superposició entre el gap d'un prerequisit i altres prerequisits amb el mateix nom
        const gapInicioMs = gapStart.getTime(); // Convertim la data d'inici del gap a mil·lisegons
        const gapFinMs = gapEnd.getTime();  // Convertim la data de finalització del gap a mil·lisegons

        for (const item of datos) { // Iterem sobre cada prerequisit per comprovar si hi ha superposició amb el gap del prerequisit actual
            if (item === current) continue; // Si el prerequisit és el mateix que l'actual, continuem amb la següent iteració

            const inicio = parseFechaES(item.inicio);   // Convertim la data d'inici del prerequisit a un objecte Date
            const fin = parseFechaES(item.realFin) || parseFechaES(item.prevista);  // Convertim la data de finalització del prerequisit a un objecte Date (si no hi ha data real, utilitzem la data prevista)
            if (!inicio || !fin) continue;  // Si no tenim una data d'inici o una data de finalització, continuem amb la següent iteració

            const inicioMs = inicio.getTime();  // Convertim la data d'inici del prerequisit a mil·lisegons
            const finMs = fin.getTime();    // Convertim la data de finalització del prerequisit a mil·lisegons

            // Consideramos superposición si cualquier parte de item ocupa fechas dentro del gap.
            if (inicioMs < gapFinMs && finMs > gapInicioMs) {   // Comprovem si hi ha superposició entre el prerequisit i el gap del prerequisit actual
                return true;
            }
        }

        return false;
    }

    function calcularGaps(datos) {  // Funció per calcular els gaps entre prerequisits amb el mateix nom i dates d'inici i finalització
        if (!datos || !datos.length) return datos;  // Si no tenim dades, retornem les dades tal qual

        const ordenados = [...datos].sort((a, b) => {   // Ordenem les dades per nom i data d'inici
            const nameComp = a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' });  // Compara els noms dels prerequisits sense tenir en compte majúscules/minúscules
            if (nameComp !== 0) return nameComp;    // Si els noms són diferents, retornem el resultat de la comparació

            const da = parseFechaES(a.inicio);  // Convertim la data d'inici del primer prerequisit a un objecte Date
            const db = parseFechaES(b.inicio);  // Convertim la data d'inici del segon prerequisit a un objecte Date
            return (da || 0) - (db || 0);   // Retornem la diferència entre les dates d'inici (si alguna és null, la considerem com a 0)
        });

        for (let i = 0; i < ordenados.length - 1; i++) {    // Iterem sobre les dades ordenades per comparar prerequisits amb el mateix nom i dates d'inici i finalització
            const current = ordenados[i];   // Obtenim el prerequisit actual
            const next = ordenados[i + 1];  // Obtenim el següent prerequisit

            if (current.nombre === next.nombre && current.realFin) {    // Si els prerequisits tenen el mateix nom i el primer té una data real de finalització, calculem el gap entre ells
                const fin = parseFechaES(current.realFin);  // Convertim la data real de finalització del primer prerequisit a un objecte Date
                const inicioNext = parseFechaES(next.inicio);   // Convertim la data d'inici del següent prerequisit a un objecte Date

                if (fin && inicioNext && inicioNext > fin) {    // Si la data d'inici del següent prerequisit és posterior a la data de finalització del primer, considerem que hi ha un gap entre ells
                    if (!tieneSuperposicionEnGap(current, fin, inicioNext, datos)) {
                        current.gapStart = fin;
                        current.gapEnd = inicioNext;
                    }
                }
            }
        }

        return datos;
    }

    function getGanttSignature(datos) {
        return datos
            .map(item => `${item.nombre}|${item.inicio}|${item.prevista}|${item.realFin}`)
            .join('||');
    }

    function getCurrentPageKey() {
        return `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }

    function mostrarGantt(datos) {   // Funció per mostrar el Gantt a la pàgina

        datos = datos || obtenerDatosGantt();
        datos = calcularGaps(datos);

        const hoy = new Date();                         // Obtenim la data actual
        const dataCOBRA = parseFechaES(window.CONTROL_PLAZOS_FECHA_EOBRA); // Obtenim la data d'entrega de la carpeta de obra des del cache global
        let minFecha = null;                            // Variable per emmagatzemar la data mínima del Gantt
        let maxFecha = null;                            // Variable per emmagatzemar la data màxima del Gantt
        let textoFecha = "";                            // Variable per emmagatzemar el text de la data que es mostrarà a la capçalera del Gantt

        const maxNombre = Math.max(...datos.map(item => item.nombre.length)); // Obtenim la longitud màxima del nom dels prerequisits
        const anchoNombre = Math.max(80, maxNombre * 8);    // Calculem l'ample de la columna de noms
        const margenLateral = 60;                          // Marges totals (padding esquerra+dreta + espai dret extra)

        const tabla = getElementsByXPath("//span[@title='Nombre del Pre-requisito']")[0]?.closest('table'); // Obtenim la taula que conté el primer element th amb el títol "Nombre del Pre-requisito"
        const contenedorWidth = tabla?.parentElement?.clientWidth || document.documentElement.clientWidth;  // Obtenim l'ample del contenidor de la taula o l'ample de la finestra si no trobem el contenidor
        const anchoDisponible = Math.max(260, contenedorWidth - margenLateral - anchoNombre); // Ample disponible per al timeline

        const PREREQ_CLIENT = new Set([
            "FASE OBRA",
            "AJUSTAT",
            "ACTA",
            "CES",
            "IE",
            "OBRA CIVIL",
            "CES OC",
            "ANULAR",
            "PART",
            "REQ ORG CLIENT",
            "PTE ACT CLIENT",
            "PTE ACT CLIENT",
            "ESCREIX",
            "REHABILITACIO",
            "DIVISIÓ"
        ])
        
        datos.forEach(item => {                         // Iterem sobre cada prerequisit per determinar les dates mínimes i màximes del Gantt

            const ini = parseFechaES(item.inicio);          // Convertim la data d'inici del prerequisit a un objecte Date
            //const prevista = parseFechaES(item.prevista);   // Convertim la data prevista de finalització del prerequisit a un objecte Date
            const prevista = hoy;
            const real = parseFechaES(item.realFin);        // Convertim la data real de finalització del prerequisit a un objecte Date
            const fin = real || prevista;                   // Si hi ha una data real de finalització, l'utilitzem; en cas contrari, utilitzem la data prevista

            if (!ini || !fin) return;                       // Si no tenim una data d'inici o una data de finalització, continuem amb la següent iteració

            if (!minFecha || ini < minFecha){               // Si no tenim una data mínima o la data d'inici del prerequisit és anterior a la data mínima actual, actualitzem la data mínima
                minFecha = ini;
              }
            if (!maxFecha || fin > maxFecha){
                maxFecha = fin;}
            if (dataCOBRA && (!maxFecha || dataCOBRA > maxFecha)) {
                maxFecha = dataCOBRA;
            }
        });

        const totalDias =                                   // Calculem el nombre total de dies entre la data mínima i la data màxima del Gantt
            Math.ceil(
                (maxFecha - minFecha) / 86400000
            ) + 1;

        const SaltoFecha =                                  // Determinem el salt de dates que es mostrarà a la capçalera del Gantt en funció del nombre total de dies
            totalDias > 1095 ? 365 :
            totalDias > 730 ? 90 :
            totalDias > 365 ? 20 :
            totalDias > 100 ? 7 :
            totalDias > 50 ? 3 :
            1;

        const hoyOffset = Math.floor((hoy - minFecha) / 86400000);
        const CObraOffset = dataCOBRA ? Math.floor((dataCOBRA - minFecha) / 86400000) : null;
        const pixDia = anchoDisponible / totalDias;                                // Calculem el nombre de píxels per dia del Gantt

                            // Creem la capçalera del Gantt amb les dates corresponents
        let cabeceraHtml = `
        <div class="fila">
            <div class="nombre"></div>
            <div class="timeline">
        `;

        for(let i=0; i<totalDias; i++) {    // Iterem sobre cada dia del Gantt per crear les dates a la capçalera

            const fecha = new Date(minFecha);
            fecha.setDate(fecha.getDate() + i);
            const dia = fecha.getDate().toString().padStart(2,'0');
            const mes = (fecha.getMonth()+1).toString().padStart(2,'0');
            const any = fecha.getFullYear().toString().slice(-2);

        if (i % SaltoFecha === 0) {     // Si el dia actual és un múltiple del salt de dates, mostrem la data a la capçalera

            if (totalDias >= 330) { // Si el nombre total de dies és superior a 330, mostrem la data amb l'any; en cas contrari, només mostrem el dia i el mes
                textoFecha = `${dia}/${mes}/${any}`;
            } else {
                textoFecha = `${dia}/${mes}`;
            }
                                // Afegim un div amb la data corresponent a la capçalera del Gantt
            cabeceraHtml += `
                <div
                    style="
                        position:absolute;
                        left:${i*pixDia}px;
                        top:0;
                        width:20px;
                        font-size:10px;
                        text-align:center;
                        border-left:1px solid #ccc;
                    "
                >
                    ${textoFecha}
                </div>
            `;}
        }

        if (hoy >= minFecha && hoy <= maxFecha) {   // Si la data actual està dins del rang de dates del Gantt, afegim una línia vermella a la capçalera per indicar la data actual

            cabeceraHtml += `
                <div
                    title="Fecha de hoy: ${hoy.toLocaleDateString('es-ES')}"
                    style="
                        position:absolute;
                        left:${hoyOffset * pixDia}px;
                        top:0;
                        bottom:0;
                        width:2px;
                        background:red;
                        z-index:1000;
                    ">
                </div>
            `;// Afegim un div amb una línia vermella a la capçalera del Gantt per indicar la data actual
        }

        if (dataCOBRA) {
            cabeceraHtml += `
                <div
                    title="Fecha entrega Carpeta de Obra: ${dataCOBRA.toLocaleDateString('es-ES')}"
                    style="
                        position:absolute;
                        left:${CObraOffset * pixDia}px;
                        top:0;
                        bottom:0;
                        width:3px;
                        background:blue;
                        z-index:1000;
                    ">
                </div>
            `;// Afegim un div amb una línia blava a la capçalera del Gantt per indicar la data de la carpeta d'obra
        }

        cabeceraHtml += `
            </div>
        </div>
        `;

        let filasHtml = ""; // Variable per emmagatzemar les files del Gantt

        datos.forEach(item => { // Iterem sobre cada prerequisit per crear les files del Gantt

            const ini = parseFechaES(item.inicio);  // Convertim la data d'inici del prerequisit a un objecte Date
            const prevista = parseFechaES(item.prevista);
            const real = parseFechaES(item.realFin);

            if (!ini || !prevista) return;  // Si no tenim una data d'inici o una data prevista de finalització, continuem amb la següent iteració

            const offset = Math.floor((ini - minFecha) / 86400000); // Calculem l'offset del prerequisit respecte a la data mínima del Gantt en dies
            const fechaFin = real || hoy    // Si hi ha una data real de finalització, l'utilitzem; en cas contrari, utilitzem la data actual
            const duracion = Math.max( 1, Math.ceil((fechaFin - ini) / 86400000) + 1); // Calculem la duració del prerequisit en dies (mínim 1 dia) i sumem 1 per incloure el dia d'inici i el dia de finalització
            const diasPlanificats = Math.max( 1, Math.ceil((prevista - ini) / 86400000) + 1); // Calculem els dies planificats entre inici i prevista
            const diasReals = real ? Math.max( 1, Math.ceil((real - ini) / 86400000) + 1) : null; // Calculem els dies reals entre inici i data real de finalització (si existeix)

            const gapStart = item.gapStart;
            const gapEnd = item.gapEnd;
            const gapOffset = gapStart ? Math.floor((gapStart - minFecha) / 86400000) : 0;
            const gapWidth = gapStart && gapEnd ? Math.max(1, Math.ceil((gapEnd - gapStart) / 86400000) + 1) * pixDia : 0;
            const gapDias = gapStart && gapEnd ? Math.round((gapEnd - gapStart) / 86400000) : 0;

            let color = "#e53935"

            if (item.cerrado) { // Si el prerequisit està tancat, utilitzem un color verd per a la barra del Gantt
                color = "#34a853"
            }

            const rallat = PREREQ_CLIENT.has(item.nombre);

            let background = rallat
                ? `repeating-linear-gradient(
                    45deg,
                    ${color},
                    ${color} 8px,
                    rgba(255,255,255,0.35) 8px,
                    rgba(255,255,255,0.35) 12px
                )`
                : color;
            ``

                            // Afegim un div amb la fila corresponent al prerequisit al Gantt
            filasHtml += `

            <div class="fila">

                <div class="nombre">
                    ${item.nombre}
                </div>

                <div class="timeline">

                    ${gapStart ? `
                    <div
                        class="barra gap"
                        style="
                            left:${gapOffset * pixDia}px;
                            width:${gapWidth}px;
                            background:#9e9e9e;
                        "
                        title="Hueco: ${gapStart.toLocaleDateString('es-ES')} - ${gapEnd.toLocaleDateString('es-ES')}
                        (${gapDias} día${gapDias === 1 ? '' : 's'})"
                    ></div>
                    ` : ''}

                    <div
                        class="barra"
                        style="
                            left:${offset * pixDia}px;
                            width:${duracion * pixDia}px;
                            background:${background};
                        "
                        title="
                        Inici: ${item.inicio}
                        Prevista: ${item.prevista}
                        Duració planificada: ${diasPlanificats} dia/s
                        Real: ${item.realFin || 'Pendent'}
                        Duració real: ${diasReals ? diasReals + ' dia/s' : 'Pendent'}
                        "
                    ></div>

                </div>

            </div>
            `;
        });

                        // Creem el codi HTML del Gantt amb la capçalera i les files corresponents
        const html = `

    <!DOCTYPE html>

    <html>

    <head>

    <style>

    body{
        font-family:Arial;
        margin:0;
        padding:0;
    }

    .ganttWrapper{
        padding:20px;
        width:100%;
        max-width:100%;
        box-sizing:border-box;
    }

    h2{
        font-weight:bold;
        font-size:20px;
        margin-bottom:10px;
    }

    .fila{
        display:flex;
        align-items:center;
        margin-bottom:10px;
    }

    .nombre{
        width:${anchoNombre}px;
        min-width:60px;
        font-weight:bold;
    }

    .timeline{
        position:relative;
        height:26px;
        width:${anchoDisponible}px;
        background:#f0f0f0;
    }

    .barra{
        position:absolute;
        top:3px;
        height:20px;
        border-radius:4px;
    }

    </style>

    </head>

    <body>

    <div class="ganttWrapper">

    <p>
    <h2>Diagrama Gantt</h2>

    <p>
    🟢 Cerrado |
    🔴 Pendiente
    </p>

    ${cabeceraHtml}
    ${filasHtml}

    </div>

    </body>

    </html>
    `;

    let contenedor = document.getElementById("ganttContainer"); // Obtenim l'element contenedor del Gantt si ja existeix

    if (!contenedor) {  // Si no existeix l'element contenedor, el creem i l'afegim a la pàgina
        contenedor = document.createElement("div"); // Creem un nou element div per contenir el Gantt
        contenedor.id = "ganttContainer";   // Assignem un id a l'element contenedor per poder-lo identificar més endavant
        contenedor.style.marginTop = "20px";    // Afegim un marge superior a l'element contenedor
        contenedor.style.overflowX = "hidden";  // Afegim un desbordament horitzontal ocult a l'element contenedor per evitar que el Gantt es desbordi de la pàgina
        contenedor.style.maxWidth = "100%"; // Afegim un ample màxim del 100% a l'element contenedor per evitar que el Gantt es desbordi de la pàgina

        const tabla = getElementsByXPath("//span[@title='Nombre del Pre-requisito']")[0]?.closest("table"); // Obtenim la taula que conté el primer element th amb el títol "Nombre del Pre-requisito"

        if (!tabla) return; // Si no trobem la taula, sortim de la funció

        tabla.parentElement.appendChild(contenedor);    // Afegim l'element contenedor a la pàgina després de la taula de prerequisits
        }

        contenedor.innerHTML = html;    // Afegim el codi HTML del Gantt a l'element contenedor
    }

    function mostrarGanttUnaVez() { // Funció per mostrar el Gantt només si estem a la pàgina de prerequisits i la taula ha canviat

        const url = window.location.href;   // Obtenim la URL actual de la pàgina
        const pageKey = getCurrentPageKey();

        if (!url.includes("/Prerequisites__r/") || !url.includes("/view")) {
            const contenedor = document.getElementById("ganttContainer");
            if (contenedor) {
                contenedor.remove();
            }
            lastPageKey = null;
            lastGanttSignature = null;
            return;
        }

        const datos = obtenerDatosGantt();  // Obtenim les dades del Gantt de la taula de prerequisits
        if (!datos.length) {
            const contenedor = document.getElementById("ganttContainer");
            if (contenedor) {
                contenedor.remove();
            }
            lastPageKey = pageKey;
            lastGanttSignature = null;
            return;
        }

        const signature = getGanttSignature(datos); // Obtenim la signatura de les dades del Gantt per comparar si han canviat
        if (pageKey === lastPageKey && signature === lastGanttSignature) {
            return;
        }

        lastPageKey = pageKey; // Actualitzem la clau de pàgina per a la propera comparació
        lastGanttSignature = signature; // Actualitzem la signatura de les dades del Gantt per a la propera comparació
        mostrarGantt(datos);    // Mostrem el Gantt amb les dades obtingudes
    }

    function getElementsByXPath(xpath, parent) {
            let results = [];
            let query = document.evaluate(xpath, parent || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0, length = query.snapshotLength; i < length; ++i) {
                results.push(query.snapshotItem(i));
            }
            return results;
        }

})();

// Modul de busqueda de carpeta de obra

    (function () {
        const LABEL = "Fecha entrega carpeta de obra";
        const ONLY_OBJECT_API = "Constructive_project__c";
        const STORAGE_KEY = "CONTROL_PLAZOS_FECHA_EOBRA";

        // RESTAURAR CACHE tras F5
        if (sessionStorage.getItem(STORAGE_KEY)) {
            window.CONTROL_PLAZOS_FECHA_EOBRA = sessionStorage.getItem(STORAGE_KEY);

        } else {
            window.CONTROL_PLAZOS_FECHA_EOBRA = null;
        }

        const clean = s => s?.replace(/\u00A0/g, " ")
        .replace(/[ \t\r\n]+/g, " ")
        .trim() || "";

        function isVisible(el) {
            if (!el || el.nodeType !== 1) return false;
            if (el.closest('[aria-hidden="true"]')) return false;
            const r = el.getClientRects();
            return r && r.length > 0;
        }

        function* walkDeep(root, cap = 20000) {
            const stack = [root];
            const seen = new Set();
            let left = cap;

            while (stack.length && left-- > 0) {
                const n = stack.pop();
                if (!n || seen.has(n)) continue;
                seen.add(n);

                yield n;

                // ShadowRoot
                try {
                    if (n.shadowRoot) stack.push(n.shadowRoot);
                } catch (_) {}

                // DOM normal
                const ch = n.children || n.childNodes;
                if (ch) for (let i = 0; i < ch.length; i++) stack.push(ch[i]);
            }
        }

        function deepQueryAll(root, selector, cap = 20000) {
            const out = [];
            for (const n of walkDeep(root, cap)) {
                try {
                    if (n.querySelectorAll) {
                        const found = n.querySelectorAll(selector);
                        for (const el of found) out.push(el);
                    }
                } catch (_) {}
            }
            return out;
        }

        function isRecordPageByUrl() {
            return /\/lightning\/r\/Constructive_project__c\/[a-zA-Z0-9]{15,18}\/view/i.test(location.href);
        }

        function getRecordIdFromUrl() {
            const m = location.href.match(/\/lightning\/r\/Constructive_project__c\/([a-zA-Z0-9]{15,18})\/view/i);
            return m ? m[1] : null;
        }

        function getVisibleTabPanel() {
            return (
                document.querySelector('.slds-tabs_default__content[aria-hidden="false"]') ||
                document.querySelector('.slds-tabs_scoped__content[aria-hidden="false"]') ||
                document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                null
            );
        }

        function getActiveRoot() {
            const tabPanel = getVisibleTabPanel();
            if (tabPanel) return tabPanel;
            return document;
        }

        function getActiveRecordIdFromDom() {
            const root = getActiveRoot();

            const layout = root.querySelector('records-record-layout');
            if (layout) {
                const rid = layout.getAttribute('record-id') ||
                      layout.getAttribute('data-recordid') ||
                      layout.getAttribute('data-record-id');
                if (rid) return rid;
            }

            const attrs = ['[record-id]', '[data-recordid]', '[data-record-id]'];
            for (const sel of attrs) {
                const el = root.querySelector(sel);
                if (el) {
                    const rid = el.getAttribute('record-id') ||
                          el.getAttribute('data-recordid') ||
                          el.getAttribute('data-record-id');
                    if (rid) return rid;
                }
            }

            const a = root.querySelector('a[href*="/lightning/r/Constructive_project__c/"]');
            if (a) {
                const m = a.getAttribute("href")?.match(/\/Constructive_project__c\/([a-zA-Z0-9]{15,18})\/view/i);
                if (m) return m[1];
            }
            return null;
        }

        function getUrlKey() {
            const rid = getRecordIdFromUrl();
            if (rid) return ONLY_OBJECT_API + ":" + rid;
            return null;
        }

        function getActiveDomKey() {
            const rid = getActiveRecordIdFromDom();
            if (rid) return ONLY_OBJECT_API + ":" + rid;
            return null;
        }

        function normLabel(s) {
            return clean(s)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        function readFechaCObra(root) {
            const blocks = deepQueryAll(root, ".slds-form-element");
            for (const el of blocks) {
                if (!isVisible(el)) continue;

                const lab = el.querySelector(".test-id__field-label, label");                
                if (!lab || !isVisible(lab)) continue;
                if (normLabel(lab.textContent) !== normLabel(LABEL)) continue;

                const valRoot = el.querySelector(".test-id__field-value, .slds-form-element__control");
                if (!valRoot || !isVisible(valRoot)) continue;
                return clean(valRoot.innerText || valRoot.textContent || "") || null;
            }
            return null;
        }

        let scanToken = 0;

        function scanForCurrent(reason) {

            const urlKey = getUrlKey();
            const domKey = getActiveDomKey();
            if (!urlKey && !domKey && !isRecordPageByUrl()) return;

            const token = ++scanToken;
            const keyForLog = domKey || urlKey || "Record__c:?";

            let attempts = 0;
            const maxAttempts = 12;
            const delayMs = 700;

            function attempt() {
                if (token !== scanToken) return;

                attempts++;
                const valor = readFechaCObra(getActiveRoot());

                if (valor) {
                    const prev = window.CONTROL_PLAZOS_FECHA_EOBRA;

                    // Actualiza cache (aunque sea el mismo valor)
                    window.CONTROL_PLAZOS_FECHA_EOBRA = valor;
                    sessionStorage.setItem(STORAGE_KEY, valor);
                    return;
                }
                if (attempts < maxAttempts) setTimeout(attempt, delayMs);
            }
            attempt();
        }

        let lastUrlKey = null;
        let lastDomKey = null;

        setInterval(() => {
            const u = getUrlKey();
            const d = getActiveDomKey();
            if ((u && u !== lastUrlKey) || (d && d !== lastDomKey)) {
                lastUrlKey = u;
                lastDomKey = d;
                scanForCurrent("cambio contexto");
            }
        }, 800);

        setTimeout(() => {
            lastUrlKey = getUrlKey();
            lastDomKey = getActiveDomKey();
            scanForCurrent("inicio");
        }, 2000);

    })();