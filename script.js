document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================

    const CHECKPOINT_INICIO = [-3.1190, -60.0217]; // Manaus
    const DURACAO_VIAGEM = 4 * 24 * 60 * 60 * 1000; // 4 dias em ms
    const CHAVE_INICIO = "inicio_viagem";

    // ================= ROTAS =================

    const ROTAS = {
        "58036": {
            destinoNome: "57750-000 - AL",
            destinoDesc: "Rota: Manaus → Alagoas",

            waypoints: [
                [-60.0217, -3.1190], // Manaus
                [-37.2069, -9.5928]  // CEP 57750-000 (Aprox Alagoas)
            ]
        }
    };

    // ================= VARIÁVEIS =================

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;
    let rotaAtual = null;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    // ================= LOGIN =================

    function verificarCodigo() {

        const code = document.getElementById('access-code').value.trim();

        if (!ROTAS[code]) {
            alert("Código não encontrado.");
            return;
        }

        localStorage.setItem("codigoAtivo", code);

        if (!localStorage.getItem(CHAVE_INICIO)) {
            localStorage.setItem(CHAVE_INICIO, Date.now());
        }

        carregarInterface(code);
    }

    function verificarSessaoSalva() {

        const codigo = localStorage.getItem("codigoAtivo");

        if (codigo && ROTAS[codigo]) {

            document.getElementById("access-code").value = codigo;

            carregarInterface(codigo);
        }
    }

    // ================= CARREGAR =================

    function carregarInterface(codigo) {

        rotaAtual = ROTAS[codigo];

        buscarRota(rotaAtual.waypoints).then(() => {

            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';

            iniciarMapa();
            iniciarAnimacao();
        });
    }

    // ================= BUSCAR ROTA =================

    async function buscarRota(pontos) {

        const coordenadas = pontos.map(p => `${p[0]},${p[1]}`).join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(CHECKPOINT_INICIO, 5);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        L.polyline(fullRoute, {
            color: '#94a3b8',
            weight: 4,
            opacity: 0.5
        }).addTo(map);

        polyline = L.polyline([], {
            color: '#2563eb',
            weight: 5
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size:34px;">🚛</div>`,
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        carMarker = L.marker(fullRoute[0], {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);
    }

    // ================= ANIMAÇÃO =================

    function iniciarAnimacao() {

        const inicio = Number(localStorage.getItem(CHAVE_INICIO));

        setInterval(() => {

            const agora = Date.now();

            let progresso = (agora - inicio) / DURACAO_VIAGEM;

            if (progresso > 1) progresso = 1;

            const posReal = progresso * (fullRoute.length - 1);

            const idx = Math.floor(posReal);

            const t = posReal - idx;

            const p1 = fullRoute[idx];
            const p2 = fullRoute[idx + 1] || p1;

            const lat = p1[0] + (p2[0] - p1[0]) * t;
            const lng = p1[1] + (p2[1] - p1[1]) * t;

            const pos = [lat, lng];

            carMarker.setLatLng(pos);

            polyline.setLatLngs(fullRoute.slice(0, idx + 1));

            map.panTo(pos, { animate:true });

            atualizarTempoRestante(progresso);

        }, 5000);
    }

    // ================= TEMPO RESTANTE =================

    function atualizarTempoRestante(progresso) {

        const badge = document.getElementById("time-badge");

        if (!badge) return;

        const restante = DURACAO_VIAGEM * (1 - progresso);

        if (restante <= 0) {

            badge.innerText = "ENTREGUE";

            return;
        }

        const dias = Math.floor(restante / 86400000);
        const horas = Math.floor((restante % 86400000) / 3600000);
        const minutos = Math.floor((restante % 3600000) / 60000);

        badge.innerText = `${dias}d ${horas}h ${minutos}m`;
    }

});
