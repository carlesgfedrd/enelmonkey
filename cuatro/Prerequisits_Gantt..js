// ==UserScript==
// @name           Prerequisits Gantt
// @namespace      https://accesosede.my.salesforce.com/
// @description    Gantt per la finestra de prerequisits
// @match          http*://*.force.com/*
// @match          http*://*.salesforce.com/*
// @author         Adrian Sanchez Martinez (adrian.sanchez@enel.com)
// @version        0.5
// ==/UserScript==

(function() {
    let debounceTimeout = null;
    const DEBOUNCE_DELAY = 50;

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            mostrarGanttUnaVez();
        },
        DEBOUNCE_DELAY);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function obtenerDatosGantt() {

        const datos = []; // Array per emmagatzemar les dades del Gantt
        const thTitle = getElementsByXPath("//span[@title='Nombre del Pre-requisito']"); // Obtenim el primer element th amb el títol "Nombre del Pre-requisito"

        let tabla = thTitle[0].closest('table'); // Obtenim la taula que conté aquest element th

        const posNombre = getElementsByXPath("*//span[@title='Nombre del Pre-requisito']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Nombre del Pre-requisito"

        const posInicio = getElementsByXPath("*//span[@title='Fecha de inicio']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha de inicio"

        const posFin = getElementsByXPath("*//span[@title='Fecha prevista fin']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha prevista fin"

        const posRealFin = getElementsByXPath("*//span[@title='Fecha real fin']", tabla)[0].closest('th').cellIndex; // Obtenim la posició de la columna "Fecha real fin"

        const filas = getElementsByXPath("*//a[contains(@href,'/a2c')]", tabla); // Obtenim totes les files que contenen un enllaç amb "/a2c" a la taula

        for (let i = 0; i < filas.length; i++) { //Entrem a cada prerequisit

            const fila = filas[i].closest('tr');

            if (!fila) continue;

            const nombre = fila.children[posNombre].innerText.split("\n")[0].trim();

            const inicio = fila.children[posInicio].innerText.trim();

            const prevista = fila.children[posFin].innerText.trim();

            const realFin = fila.children[posRealFin].innerText.trim();

            datos.push({
                nombre,
                inicio,
                prevista,
                realFin,
                cerrado: realFin !== ""
            });
        }

        return datos;
    }

    function parseFechaES(texto) {

        if (!texto) return null;

        const partes = texto.split("/");

        if (partes.length !== 3) return null;

        return new Date(
            parseInt(partes[2]),
            parseInt(partes[1]) - 1,
            parseInt(partes[0])
        );
    }

    function mostrarGantt() {

        const ANCHO_MAXIMO = window.innerWidth - 300;
        const hoy = new Date();
        const datos = obtenerDatosGantt();
        let minFecha = null;
        let maxFecha = null;
        let textoFecha = "";

        datos.forEach(item => {

            const ini = parseFechaES(item.inicio);
            const prevista = parseFechaES(item.prevista);
            const real = parseFechaES(item.realFin);
            const fin = real || prevista;

            if (!ini || !fin) return;

            if (!minFecha || ini < minFecha){
                minFecha = ini;
              }
            if (!maxFecha || fin > maxFecha){
                maxFecha = fin;}
        });

        const totalDias =
            Math.ceil(
                (maxFecha - minFecha) / 86400000
            ) + 1;

        const SaltoFecha =
            totalDias > 1095 ? 365 :
            totalDias > 730 ? 90 :
            totalDias > 365 ? 20 :
            totalDias > 100 ? 7 :
            totalDias > 50 ? 3 :
            1;

        //const pixDia = Math.max(0.45, Math.floor(ANCHO_MAXIMO / totalDias));
        const pixDia = ANCHO_MAXIMO / totalDias;

        let cabeceraHtml = `
        <div class="fila">
            <div class="nombre"></div>
            <div class="timeline">
        `;

        for(let i=0; i<totalDias; i++) {

            const fecha = new Date(minFecha);

            fecha.setDate(fecha.getDate() + i);

            const dia = fecha.getDate().toString().padStart(2,'0');

            const mes = (fecha.getMonth()+1).toString().padStart(2,'0');

            const any = fecha.getFullYear().toString().slice(-2);

        if (i % SaltoFecha === 0) {

            if (SaltoFecha >= 90) {
                textoFecha = `${mes}/${any}`;
            } else {
                textoFecha = `${dia}/${mes}`;
            }

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

        if (hoy >= minFecha && hoy <= maxFecha) {

            const hoyOffset =
                Math.floor((hoy - minFecha)/86400000);

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
            `;
        }

        cabeceraHtml += `
            </div>
        </div>
        `;

        let filasHtml = "";

        datos.forEach(item => {


            console.log("Min:", minFecha);
            console.log("Max:", maxFecha);
            console.log("Total días:", totalDias);
            console.log("Pixeles/día:", pixDia);


            const ini = parseFechaES(item.inicio);
            const prevista = parseFechaES(item.prevista);
            const real = parseFechaES(item.realFin);

            if (!ini || !prevista) return;

            const offset =
                Math.floor((ini - minFecha) / 86400000);

            const fechaFin = real || prevista

            const duracion =
                Math.max(
                1,
                Math.ceil((fechaFin - ini) / 86400000) + 1
            );

            let color = "#e53935"

            if (item.cerrado) {
                color = "#34a853"
            }

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
        Inicio: ${item.inicio}
        Prevista: ${item.prevista}
        Real: ${item.realFin || 'Pendiente'}
                        "
                    ></div>

                </div>

            </div>
            `;
        });

        const maxNombre =
            Math.max(...datos.map(item => item.nombre.length));

        const anchoNombre =
            Math.max(80, maxNombre * 8);

        const html = `

    <!DOCTYPE html>

    <html>

    <head>

    <style>

    body{
        font-family:Arial;
        padding:20px;
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
        width:${totalDias * pixDia}px;
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

    <p>
    <h2>Diagrama Gantt</h2>

    <p>
    🟢 Cerrado |
    🔴 Pendiente
    </p>

    ${cabeceraHtml}
    ${filasHtml}

    </body>

    </html>
    `;

    let contenedor = document.getElementById("ganttContainer");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "ganttContainer";
        contenedor.style.marginTop = "20px";

        const tabla =
            getElementsByXPath("//span[@title='Nombre del Pre-requisito']")[0]
                ?.closest("table");
        if (!tabla) return;

            tabla.parentElement.appendChild(contenedor);
        }
        contenedor.innerHTML = html;
    }

    function mostrarGanttUnaVez() {

        const url = window.location.href;

        if (!url.includes("/Prerequisites__r/") || !url.includes("/view")) {
            return;
        }

        if (document.getElementById("ganttContainer")) {
            return;
        }

        mostrarGantt();
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