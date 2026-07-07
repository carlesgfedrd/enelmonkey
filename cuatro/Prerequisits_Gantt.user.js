// ==UserScript==
// @name           Prerequisits Gantt
// @namespace      https://accesosede.my.salesforce.com/
// @description    Gantt per la finestra de prerequisits
// @match          http*://*.force.com/*
// @match          http*://*.salesforce.com/*
// @author         Adrian Sanchez Martinez (adrian.sanchez@enel.com)
// @version        0.9.0
// ==/UserScript==

(function() {
    let debounceTimeout = null;
    let lastGanttSignature = null;
    const DEBOUNCE_DELAY = 50;

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            mostrarGanttUnaVez();
        },
        DEBOUNCE_DELAY);
    });

    observer.observe(document.body, { childList: true, subtree: true });

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

    function getGanttSignature(datos) {
        return datos
            .map(item => `${item.nombre}|${item.inicio}|${item.prevista}|${item.realFin}`)
            .join('||');
    }

    function mostrarGantt(datos) {   // Funció per mostrar el Gantt a la pàgina
        datos = datos || obtenerDatosGantt();

        const hoy = new Date();                         // Obtenim la data actual
        let minFecha = null;                            // Variable per emmagatzemar la data mínima del Gantt
        let maxFecha = null;                            // Variable per emmagatzemar la data màxima del Gantt
        let textoFecha = "";                            // Variable per emmagatzemar el text de la data que es mostrarà a la capçalera del Gantt

        const maxNombre = Math.max(...datos.map(item => item.nombre.length)); // Obtenim la longitud màxima del nom dels prerequisits
        const anchoNombre = Math.max(80, maxNombre * 8);    // Calculem l'ample de la columna de noms
        const margenLateral = 60;                          // Marges totals (padding esquerra+dreta + espai dret extra)

        const tabla = getElementsByXPath("//span[@title='Nombre del Pre-requisito']")[0]?.closest('table'); // Obtenim la taula que conté el primer element th amb el títol "Nombre del Pre-requisito"
        const contenedorWidth = tabla?.parentElement?.clientWidth || document.documentElement.clientWidth;  // Obtenim l'ample del contenidor de la taula o l'ample de la finestra si no trobem el contenidor
        const anchoDisponible = Math.max(260, contenedorWidth - margenLateral - anchoNombre); // Ample disponible per al timeline

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
            //const fechaFin = real || prevista   // Si hi ha una data real de finalització, l'utilitzem; en cas contrari, utilitzem la data prevista
            const fechaFin = real || hoy    // Si hi ha una data real de finalització, l'utilitzem; en cas contrari, utilitzem la data actual
            const duracion = Math.max( 1, Math.ceil((fechaFin - ini) / 86400000) + 1); // Calculem la duració del prerequisit en dies (mínim 1 dia) i sumem 1 per incloure el dia d'inici i el dia de finalització
            const diasPlanificats = Math.max( 1, Math.ceil((prevista - ini) / 86400000) + 1); // Calculem els dies planificats entre inici i prevista
            const diasReals = real ? Math.max( 1, Math.ceil((real - ini) / 86400000) + 1) : null; // Calculem els dies reals entre inici i data real de finalització (si existeix)

            let color = "#e53935"

            if (item.cerrado) { // Si el prerequisit està tancat, utilitzem un color verd per a la barra del Gantt
                color = "#34a853"
            }
                            // Afegim un div amb la fila corresponent al prerequisit al Gantt
            filasHtml += ` 

            <div class="fila">

                <div class="nombre">
                    ${item.nombre}
                </div>

                <div class="timeline">

                    <div    
                        class="barra"   
                        style="
                            left:${offset * pixDia}px;
                            width:${duracion * pixDia}px;
                            background:${color};
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

        if (!url.includes("/Prerequisites__r/View")) {    // Si la URL no conté "/Prerequisites__r/View", sortim de la funció
            return;
        }

        const datos = obtenerDatosGantt();  // Obtenim les dades del Gantt de la taula de prerequisits
        if (!datos.length) return;

        const signature = getGanttSignature(datos); // Obtenim la signatura de les dades del Gantt per comparar si han canviat
        if (signature === lastGanttSignature) {
            return;
        }

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