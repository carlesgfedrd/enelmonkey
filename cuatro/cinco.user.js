// ==UserScript==
// @name           CINCO
// @namespace      https://accesosede.my.salesforce.com/
// @description    Mejoras en CUATRO
// @match          http*://*.force.com/*
// @match          http*://*.salesforce.com/*
// @author         Carles Garcia Floriach (carles.garcia@enel.com)
// @version        1.2.1
// ==/UserScript==

(function() {
    let debounceTimeout = null;
    const DEBOUNCE_DELAY = 50;

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            tablaPrerrequisitos();
            tablaEstudios();
            tablaDocumentosEstado();
            tablaDocumentosNombre();
            highlightAddressPin();
            //expedienteNNSS();
            //expedienteSAT();

        }, DEBOUNCE_DELAY);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function tablaPrerrequisitos() {
        const thTitle = getElementsByXPath("//span[@title = 'Nombre del Pre-requisito']");

        for (let i = 0; i < thTitle.length; i++) {
            let tabla = thTitle[i].closest('table');

            let spanFrf = getElementsByXPath("*//span[@title = 'Fecha real fin']", tabla)[0];
            if (!spanFrf) continue;
            let posicionFrf = spanFrf.closest('th').cellIndex;

            let filas = getElementsByXPath("*//a[contains(@href,'/a2c')]", tabla);

            for (let j = 0; j < filas.length; j++) {
                let fila = filas[j].closest('tr');

                if (fila) {
                    if (fila.children[posicionFrf].innerText == "") {
                        fila.style.backgroundColor = '#AA000055';
                    } else {
                        fila.style.backgroundColor = '#00AA0055';
                    }
                }
            }
        }
    }

    function tablaEstudios() {
        const thTitle = getElementsByXPath("//span[@title = 'Nombre de la oportunidad']");

        for (let i = 0; i < thTitle.length; i++) {
            let tabla = thTitle[i].closest('table');

            let spanEstado = getElementsByXPath("*//span[@title = 'Estado']", tabla)[0];
            if (!spanEstado) continue;
            let posicionEstado = spanEstado.closest('th').cellIndex;

            let filas = getElementsByXPath("*//a[contains(@href,'/006')]", tabla);

            for (let j = 0; j < filas.length; j++) {
                let fila = filas[j].closest('tr');

                if (fila) {
                    if (fila.children[posicionEstado].innerText == "Seleccionado") {
                        fila.style.backgroundColor = '#00AA0055';
                    } else {
                        fila.style.backgroundColor = '#AA000055';
                    }
                }
            }
        }
    }

    function tablaDocumentosEstado() {
        const thTitle = getElementsByXPath("//span[@title = 'Código de Documento']");

        for (let i = 0; i < thTitle.length; i++) {
            let tabla = thTitle[i].closest('table');

            let spanEstado = getElementsByXPath("*//span[@title = 'Estado']", tabla)[0];
            if (!spanEstado) continue;
            let posicionEstado = spanEstado.closest('th').cellIndex;

            let filas = getElementsByXPath("*//a[contains(@href,'/a1x')]", tabla);

            for (let j = 0; j < filas.length; j++) {
                let fila = filas[j].closest('tr');

                if (fila) {
                    if (fila.children[posicionEstado].innerText.startsWith("Válido")) {
                        fila.style.backgroundColor = '#00AA0055';
                    } else {
                        fila.style.backgroundColor = '#AA000055';
                    }
                }
            }
        }
    }

    function tablaDocumentosNombre() {
        const thTitle = getElementsByXPath("//span[@title = 'Código de Documento']");

        for (let i = 0; i < thTitle.length; i++) {
            let tabla = thTitle[i].closest('table');

            let filas = getElementsByXPath("//span[contains(., 'DAT') and contains(., 'EST')]", tabla);

            for (let j = 0; j < filas.length; j++) {
                let fila = filas[j].closest('td');

                if (fila) {
                    fila.style.backgroundColor = '#7F7FFF7F';
                    fila.style.fontWeight = 700;
                }
            }

            filas = getElementsByXPath("//span[contains(., 'EXPLOT') or contains(., 'EXECUT') or contains(., 'EJECUT') or (contains(., 'INICI') and contains(., 'TERC'))]", tabla);

            for (let j = 0; j < filas.length; j++) {
                let fila = filas[j].closest('td');

                if (fila) {
                    fila.style.backgroundColor = '#00AAAA7F';
                    fila.style.fontWeight = 700;
                }
            }
        }
    }

    function expedienteNNSS() {
        if (window.location.href.includes('a2f'))
        {
            resaltar("Estado", "#FFFF5055");

            resaltar("Descripción del expediente", "#FFFF5055");
            resaltar("Tipo de solicitud", "#FFFF5055");
            resaltar("Subtipo de solicitud", "#FFFF5055");
            resaltar("Potencia Solicitada consumo (kW)", "#FFFF5055");

            resaltar("Fecha de Aceptación", "#FFFF5055");

            let header = getElementsByXPath("//div[contains(@class, 'ge-header_record-home')]");

            for (let i = 0; i < header.length; i++) {
                header[i].style.backgroundColor = "#FFAAAAFF"
            }
        }
    }

    function expedienteSAT() {
        if (window.location.href.includes('a36'))
        {
            resaltar("Dirección Normalizada", "#FFFF5055");
        }
    }

    function resaltar(label, color) {
        let campos = getElementsByXPath("//records-record-layout-item[@field-label = '" + label + "']/div[1]");

        for (let i = 0; i < campos.length; i++) {
            campos[i].style.backgroundColor = color
        }
    }

    function getElementsByXPath(xpath, parent) {
        let results = [];
        let query = document.evaluate(xpath, parent || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0, length = query.snapshotLength; i < length; ++i) {
            results.push(query.snapshotItem(i));
        }
        return results;
    }

    function highlightAddressPin() {
        const titlePs = getElementsByXPath("//p[@title = 'Descripción del expediente']");

        const titleP = titlePs[0];
        const container = titleP.closest('div');
        if (!container) return;

        let addrNode = container.querySelector('lightning-formatted-text') || container.querySelector('p.fieldComponent') || titleP.nextElementSibling;
        if (!addrNode) return;

        let address = addrNode.innerText.trim();
        if (!address) return;

        address = address.replace('CL ', 'Calle ')
            .replace('PS ', 'Paseo ')
            .replace('RB ', 'Rambla ')
            .replace('UR ', 'Urbanización ')
            .replace('PJ ', 'Pasaje ')
            .replace('PZ ', 'Plaza ')
            .replace('CR ', 'Carretera')
            .replace('AV ', 'Avenida ')
            .replace('Variante ', ' ')
            .replace('Suelo', ' ');

        // evita duplicados
        if (titleP.querySelector('.enel-pin-icon')) return;

        const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'enel-pin-icon';
        a.setAttribute('title', 'Abrir en Google Maps');
        a.style.marginLeft = '6px';
        a.style.cursor = 'pointer';
        a.style.display = 'inline-block';
        a.style.verticalAlign = 'middle';
        a.style.color = '#d22';
        a.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="red" stroke="red"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path><circle cx="12" cy="9" r="2" fill="white"/></svg>';

        titleP.appendChild(a);
    }
})();