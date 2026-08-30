 // Logique menus déroulants
        window.toggleDropdown = function(listId) {
            let list = document.getElementById(listId);
            if(list.classList.contains('show')) {
                list.classList.remove('show');
            } else {
                document.querySelectorAll('.dropdown-list.show').forEach(el => el.classList.remove('show'));
                list.classList.add('show');
            }
        }
        window.closeDropdown = function(containerId) {
            setTimeout(() => { 
                let list = document.querySelector(`#${containerId} .dropdown-list`);
                if(list) list.classList.remove('show');
            }, 150);
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (window.innerWidth <= 1000) {
                document.getElementById('left-panel').classList.add('collapsed');
                document.getElementById('toggleLeftBtn').style.display = 'flex';
            }
            updateStaticTexts(); populateAddDropdown(); refreshCirclesLayout(); draw();
        });

        function togglePanel(side) { 
            if (side === 'left') {
                let p = document.getElementById('left-panel');
                p.classList.toggle('collapsed');
                document.getElementById('toggleLeftBtn').style.display = p.classList.contains('collapsed') ? 'flex' : 'none';
            } 
        }

        let activeRightPanel = null;
        function toggleRightPanel(panelName) {
            const sidebar = document.getElementById('right-sidebar');
            const legendSec = document.getElementById('legend-section');
            const letrasSec = document.getElementById('letras-section');

            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                activeRightPanel = panelName;
            } else {
                if (activeRightPanel === panelName) {
                    sidebar.classList.add('collapsed');
                    activeRightPanel = null;
                    return;
                } else {
                    activeRightPanel = panelName;
                }
            }
            
            legendSec.classList.toggle('active', activeRightPanel === 'legend');
            letrasSec.classList.toggle('active', activeRightPanel === 'letras');
        }

        const i18n = {
            pt: {
                loading: "Carregando vozes...",
                mixer: "🎛️ Misturador",
                legend: "📖 Legenda",
                seqLegendTitle: "⌨️ Dicas de digitação",
                seqLegend1: "Pressione <strong>Espaço</strong> no teclado para avançar.",
                seqLegend2: "Use as <strong>Setas</strong> (←/→) para navegar.",
                voiceLegendTitle: "🎤 Vozes / Coro",
                voiceLegend1: "Clique no topo da caixa (PUX/CORO) para alterar quem canta.",
                voiceLegend2: "Puxador: Laranja (Agudo). Coro: Ciano (Grave).",
                goldRule: "💡 <strong>Regra de ouro:</strong><br>• <strong>Maiúscula</strong> = Golpe Forte<br>• <strong>Minúscula</strong> = Golpe Fraco",
                alfaiaCaixa: "🥁 Alfaia & Caixa",
                mainDroite: "Mão Direita",
                mainGauche: "Mão Esquerda",
                gongueLegend: "🔔 Gonguê",
                gongueGrave: "Grave Forte / Fraco",
                gongueAigu: "Agudo Forte / Fraco",
                agbeLegend: "🌾 Agbê",
                agbeG: "Esquerda (Forte / Fraco)",
                agbeD: "Direita (Forte / Fraco)",
                mineiroLegend: "🌾 Mineiro",
                mineiroP: "Cima (Forte / Fraco)",
                mineiroT: "Baixo (Forte / Fraco)",
                addInst: "+ Instrumento",
                clear: "Limpar a Roda",
                save: "Salvar",
                load: "Carregar",
                stepsNum: "Passos:",
                promptVoice: "Sílaba / Palavra (Use ':' para adicionar a nota. Ex: C4:Vou) :",
                selectInst: "Escolher um instrumento...",
                toggleBtn: "Mostrar painel",
                toggleLegendBtn: "Ocultar / Mostrar legenda",
                toggleLetrasBtn: "Ocultar / Mostrar letras",
                tsLabel: "Compasso:",
                tutorialBtn: "Tutorial em vídeo",
                rewindBtn: "Parar e Voltar ao início",
                confirmResize: "Deseja ajustar automaticamente o número de passos de todas as faixas?",
                letrasTitle: "📝 Letras",
                extractBtn: "🔄 Extrair do mixador",
                letrasPlaceholder: "Cole as letras completas aqui (Pressione Extrair para o Karaokê)..."
            },
            fr: {
                loading: "Chargement des voix...",
                mixer: "🎛️ Mixeur",
                legend: "📖 Légende",
                seqLegendTitle: "⌨️ Astuces Séquenceur",
                seqLegend1: "Appuyez sur <strong>Espace</strong> pour avancer et laisser un silence.",
                seqLegend2: "Utilisez les <strong>Flèches</strong> (←/→) pour naviguer.",
                voiceLegendTitle: "🎤 Voix / Chœur",
                voiceLegend1: "Cliquez en haut de la case (PUX/CORO) pour changer qui chante.",
                voiceLegend2: "Puxador: Orange (Aigu). Chœur: Cyan (Grave).",
                goldRule: "💡 <strong>Règle d'or :</strong><br>• <strong>Majuscule</strong> = Coup Fort<br>• <strong>Minuscule</strong> = Coup Faible",
                alfaiaCaixa: "🥁 Alfaia & Caixa",
                mainDroite: "Main Droite",
                mainGauche: "Main Gauche",
                gongueLegend: "🔔 Gonguê",
                gongueGrave: "Grave Fort / Faible",
                gongueAigu: "Aigu Fort / Faible",
                agbeLegend: "🌾 Agbê",
                agbeG: "Gauche (Fort / Faible)",
                agbeD: "Droite (Fort / Faible)",
                mineiroLegend: "🌾 Mineiro",
                mineiroP: "Haut (Fort / Faible)",
                mineiroT: "Bas (Fort / Faible)",
                addInst: "+ Instrument",
                clear: "Vider la Roda",
                save: "Sauvegarder",
                load: "Charger",
                stepsNum: "Pas:",
                promptVoice: "Syllabe / Mot (Utilisez ':' pour ajouter la note. Ex: C4:Vou) :",
                selectInst: "Choisir un instrument...",
                toggleBtn: "Afficher le panneau",
                toggleLegendBtn: "Afficher / Masquer la légende",
                toggleLetrasBtn: "Afficher / Masquer les paroles",
                tsLabel: "Signature:",
                tutorialBtn: "Tutoriel vidéo",
                rewindBtn: "Stop et Revenir au début",
                confirmResize: "Voulez-vous ajuster automatiquement le nombre de pas de toutes les pistes ?",
                letrasTitle: "📝 Paroles complètes",
                extractBtn: "🔄 Extraire les paroles du mixeur",
                letrasPlaceholder: "Collez vos paroles ici (Cliquez sur Extraire pour le karaoké)..."
            }
        };

        let currentLang = 'pt';
        function t(key) { return i18n[currentLang][key] || key; }

        function updateStaticTexts() {
            document.getElementById('loading-text').innerText = t('loading');
            document.getElementById('title-mixer').innerText = t('mixer');
            document.getElementById('title-legend').innerText = t('legend');
            
            document.getElementById('legend-seq-title').innerText = t('seqLegendTitle');
            document.getElementById('legend-seq-1').innerHTML = `<span>${t('seqLegend1')}</span>`;
            document.getElementById('legend-seq-2').innerHTML = `<span>${t('seqLegend2')}</span>`;

            document.getElementById('legend-voice-title').innerText = t('voiceLegendTitle');
            document.getElementById('legend-voice-1').innerHTML = `<span>${t('voiceLegend1')}</span>`;
            document.getElementById('legend-voice-2').innerHTML = `<span>${t('voiceLegend2')}</span>`;

            document.getElementById('legend-gold').innerHTML = t('goldRule');
            document.getElementById('tsLabel').innerText = t('tsLabel');
            
            document.getElementById('legend-ac-title').innerText = t('alfaiaCaixa');
            document.getElementById('legend-ac-1').innerHTML = `<span class="legend-badge" style="background:#8b0000; color:#fff;">D / d</span> <span>${t('mainDroite')}</span>`;
            document.getElementById('legend-ac-2').innerHTML = `<span class="legend-badge" style="background:#f39c12; color:#121212;">G / g</span> <span>${t('mainGauche')}</span>`;
            document.getElementById('legend-go-title').innerText = t('gongueLegend');
            document.getElementById('legend-go-1').innerHTML = `<span class="legend-badge" style="background:#222; color:#fff;">G / g</span> <span>${t('gongueGrave')}</span>`;
            document.getElementById('legend-go-2').innerHTML = `<span class="legend-badge" style="background:#bdc3c7; color:#000;">A / a</span> <span>${t('gongueAigu')}</span>`;
            document.getElementById('legend-ag-title').innerText = t('agbeLegend');
            document.getElementById('legend-ag-1').innerHTML = `<span class="legend-badge" style="background:#1b5e20; color:#fff;">G / g</span> <span>${t('agbeG')}</span>`;
            document.getElementById('legend-ag-2').innerHTML = `<span class="legend-badge" style="background:#4caf50; color:#121212;">D / d</span> <span>${t('agbeD')}</span>`;
            document.getElementById('legend-mi-title').innerText = t('mineiroLegend');
            document.getElementById('legend-mi-1').innerHTML = `<span class="legend-badge" style="background:#1b5e20; color:#fff;">P / p</span> <span>${t('mineiroP')}</span>`;
            document.getElementById('legend-mi-2').innerHTML = `<span class="legend-badge" style="background:#4caf50; color:#121212;">T / t</span> <span>${t('mineiroT')}</span>`;

            document.getElementById('clearBtn').title = t('clear');
            document.getElementById('saveBtn').title = t('save');
            document.getElementById('loadBtn').title = t('load');
            document.getElementById('toggleLeftBtn').title = t('toggleBtn');
            document.getElementById('toggleLegendBtn').title = t('toggleLegendBtn');
            document.getElementById('toggleLetrasBtn').title = t('toggleLetrasBtn');
            document.getElementById('tutorialBtn').title = t('tutorialBtn');
            document.getElementById('rewindBtn').title = t('rewindBtn');
            document.getElementById('letras-title').innerText = t('letrasTitle');
            document.getElementById('extractBtn').innerText = t('extractBtn');
            
            document.getElementById('letras-textarea').setAttribute('data-placeholder', t('letrasPlaceholder'));
        }

        function toggleLang() {
            currentLang = currentLang === 'pt' ? 'fr' : 'pt';
            document.getElementById('langBtn').innerText = currentLang === 'pt' ? '🇫🇷' : '🇧🇷';
            updateStaticTexts(); renderMixer(); populateAddDropdown();
        }

        // EXTRACTION INTELLIGENTE : Recollage des tirets et Couleurs
        window.extractLyrics = function() {
            let voiceCircles = circles.filter(c => instrumentsConfig[c.instrumentIdx].type === 'voice');
            let htmlArr = [];
            
            voiceCircles.forEach(c => {
                let trackHtml = "";
                let buffer = "";
                let currentSpanColor = "";
                let startIdx = 0;
                
                for(let i=0; i<c.steps; i++) {
                    if(c.activeSteps[i] !== 0 && c.lyrics[i]) {
                        let syl = c.lyrics[i].trim();
                        let isPux = c.activeSteps[i] === 'P';
                        let color = isPux ? '#ff9f43' : '#00d2d3'; 
                        
                        if (syl.endsWith('-')) {
                            if (!buffer) { currentSpanColor = color; startIdx = i; }
                            buffer += syl.slice(0, -1);
                        } else {
                            if (!buffer) { currentSpanColor = color; startIdx = i; }
                            buffer += syl;
                            trackHtml += `<span class="lyric-word lyric-ref-${c.id}-${startIdx}" style="color: ${currentSpanColor}; font-weight: bold;">${buffer}</span> `;
                            buffer = "";
                        }
                    }
                }
                if (buffer.length > 0) {
                     trackHtml += `<span class="lyric-word lyric-ref-${c.id}-${startIdx}" style="color: ${currentSpanColor}; font-weight: bold;">${buffer}</span> `;
                }
                if(trackHtml) htmlArr.push(trackHtml.trim());
            });

            let ta = document.getElementById('letras-textarea');
            ta.innerHTML = htmlArr.join('<br>');
        }

        let recorder = null;
        let isRecording = false;

        async function toggleRecord() {
            const btn = document.getElementById('recordBtn');
            if (!recorder) {
                recorder = new Tone.Recorder();
                Tone.Destination.connect(recorder);
            }
            if (!isRecording) {
                recorder.start();
                isRecording = true;
                btn.classList.add('recording');
            } else {
                const recording = await recorder.stop();
                isRecording = false;
                btn.classList.remove('recording');
                
                const url = URL.createObjectURL(recording);
                const anchor = document.createElement("a");
                anchor.download = "Baquemix_Gravacao.webm"; 
                anchor.href = url;
                anchor.click();
            }
        }

        const vouVadiarPreset = {
            bpm: 83, timeSig: "4/4",
            circles: [
                {"id":1,"steps":16,"repeats":1,"activeSteps":["g","D",0,"d","G",0,"D",0,"g","D",0,"d","G",0,0,0],"instrumentIdx":0,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":4,"steps":16,"repeats":1,"activeSteps":["D","D","g","D","D","g","D","g","D","D","g","D","D","g","D","g"],"instrumentIdx":3,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":90},
                {"id":5,"steps":16,"repeats":1,"activeSteps":[0,"GRV",0,0,"GRV",0,"GRV",0,0,"GRV",0,0,"GRV",0,"GRV",0],"instrumentIdx":4,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":62},
                {"id":6,"steps":16,"repeats":1,"activeSteps":["G",0,"d","g","D",0,"g","d","G",0,"d","g","D",0,"g","d"],"instrumentIdx":5,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":8,"steps":16,"repeats":1,"activeSteps":["P",0,"P",0,"P",0,"P",0,0,"C",0,"C","C",0,0,0],"instrumentIdx":7,"lyrics":["Vou","","va-","","di-","","ar","","Car-","Car-","na-","na-","val","","!",""],"notes":["C4","","C4","","D4","","D4","","","E4","","E4","F4","","",""],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":1779,"steps":16,"repeats":1,"activeSteps":["P",0,"P",0,"P",0,"P",0,0,"C",0,"C","C",0,"C",0],"instrumentIdx":7,"lyrics":["Vou","","Pra","","Ba-","","hi-","","","a","","Brin-","car","","Eu",""],"notes":["","","","","","","","","","","","","","","",""],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100}
            ]
        };

        const baqueDeImalePreset = {
            bpm: 77, timeSig: "4/4",
            circles: [
                {"id":1,"steps":16,"repeats":1,"activeSteps":["D",0,0,0,"g",0,"D",0,"g","D",0,0,"g","D",0,0],"instrumentIdx":0,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":2,"steps":16,"repeats":1,"activeSteps":["G",0,0,"d","g",0,"D",0,"g","D",0,"d","g","D",0,"d"],"instrumentIdx":1,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":4,"steps":16,"repeats":1,"activeSteps":["D","D","g","D","D","g","D","g","D","D","g","D","D","g","D","g"],"instrumentIdx":3,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":5,"steps":16,"repeats":1,"activeSteps":["GRV",0,"AIG",0,"GRV",0,"AIG",0,"GRV","AIG",0,"aig","GRV",0,"AIG",0],"instrumentIdx":4,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100},
                {"id":6,"steps":16,"repeats":1,"activeSteps":["G",0,"d","g","D",0,"g","d","G",0,"d","g","D",0,"g","d"],"instrumentIdx":5,"lyrics":[],"notes":[],"isMute":false,"isSolo":false,"isHidden":false,"volumeVal":100}
            ]
        };

        let circles = [];
        let timeSignature = "4/4";
        let maxTicks = 96; 
        let flashAlpha = 0; 
        let currentAngle = -Math.PI / 2; // STOCKÉ GLOBALEMENT (Garantit que la baguette se fige à la bonne place)
        
        let isPlaying = false;
        let isMetroOn = false;
        let measureCount = 0;

        Tone.context.lookAhead = 0.04; 
        Tone.context.latencyHint = "interactive"; 
        Tone.Transport.swing = 0.0; 
        Tone.Destination.volume.value = -6;

        const channels = {}; const meters = {}; const samplers = {}; const voiceSynths = {};

        // VRAIS CHEMINS DES ICONES (.SVG) DANS LE DOSSIER ICONES
        const instrumentsConfig = [
            { id: 'marcante', iconImg: 'icones/alfaia.svg', name: 'Alfaia Marcante', type: 'hands', mixerBg: '#3a1010', path: 'Alfaia/Marcante', colors: { 'd': '#5a0000', 'D': '#8b0000', 'g': '#ff7676', 'G': '#ff4d4d', text: '#fff' } },
            { id: 'meiao', iconImg: 'icones/alfaia.svg', name: 'Alfaia Meião', type: 'hands', mixerBg: '#3a2010', path: 'Alfaia/Meiao', colors: { 'd': '#a04000', 'D': '#d35400', 'g': '#fbc531', 'G': '#f39c12', text: '#fff' } },
            { id: 'repique', iconImg: 'icones/alfaia.svg', name: 'Alfaia Repique', type: 'hands', mixerBg: '#3a3010', path: 'Alfaia/Repique', colors: { 'd': '#b59510', 'D': '#f1c40f', 'g': '#fff5cc', 'G': '#ffeaa7', text: '#121212' } },
            { id: 'caixa', iconImg: 'icones/caixa.svg', name: 'Caixa', type: 'hands', mixerBg: '#2a103a', path: 'Caixa', colors: { 'd': '#320b61', 'D': '#4a148c', 'g': '#be5be0', 'G': '#9c27b0', text: '#fff' } },
            { id: 'gongue', iconImg: 'icones/gongue.svg', name: 'Gonguê', type: 'gongue', mixerBg: '#1a1a1a', path: 'Gongue', colors: { 'grv': '#222222', 'GRV': '#000000', 'aig': '#7f8c8d', 'AIG': '#bdc3c7', text: '#fff' } },
            { id: 'agbe', iconImg: 'icones/agbe.svg', name: 'Agbê', type: 'shake', mixerBg: '#103a10', path: 'Graines/Agbe', colors: { 'g': '#113b14', 'G': '#1b5e20', 'd': '#74d478', 'D': '#4caf50', text: '#fff' } },
            { id: 'mineiro', iconImg: 'icones/mineiro.svg', name: 'Mineiro', type: 'shake', mixerBg: '#203a10', path: 'Graines/Mineiro', colors: { 'p': '#113b14', 'P': '#1b5e20', 't': '#74d478', 'T': '#4caf50', text: '#fff' } },
            { id: 'chant', iconImg: 'icones/micro.svg', name: 'Voz / Coro', type: 'voice', mixerBg: '#10203a', path: 'internal', colors: { 'C': '#00d2d3', 'P': '#ff9f43', text: '#121212' } }
        ];

        const bMetroClick = new Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 },
            volume: 4 
        }).toDestination();

        instrumentsConfig.forEach(inst => {
            channels[inst.id] = new Tone.Channel({ volume: 0 }).toDestination();
            meters[inst.id] = new Tone.Meter();
            channels[inst.id].connect(meters[inst.id]);

            if (inst.type === 'voice') {
                voiceSynths[inst.id] = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2 }, volume: -10 }).connect(channels[inst.id]);
            } else {
                let urls = inst.type === 'gongue' ? { "faible-grave": "faible-grave.wav", "fort-grave": "fort-grave.wav", "faible-aigue": "faible-aigue.wav", "fort-aigue": "fort-aigue.wav" } : { "faible": "faible.wav", "fort": "fort.wav" };
                samplers[inst.id] = new Tone.Players({ urls: urls, baseUrl: `sons-maracatu/${inst.path}/`, onload: () => checkAllLoaded() }).connect(channels[inst.id]);
            }
        });

        let loadedCount = 0; const totalAudioInstruments = instrumentsConfig.filter(i => i.type !== 'voice').length;
        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount >= totalAudioInstruments) { const o = document.getElementById('loading-overlay'); if (o) o.style.display = 'none'; }
        }
        setTimeout(() => { const o = document.getElementById('loading-overlay'); if (o) o.style.display = 'none'; }, 1500);

        const bgImg = new Image(); bgImg.src = 'Pictures/tambour.png'; let bgLoaded = false; bgImg.onload = () => { bgLoaded = true; };
        const canvas = document.getElementById('canvas'); const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2; const centerY = canvas.height / 2;

        window.updateTimeSig = function(val, forceResize = false) {
            timeSignature = val;
            if (val === "4/4") maxTicks = 96;
            else if (val === "3/4") maxTicks = 72;
            else if (val === "2/4") maxTicks = 48;
            else if (val === "6/8") maxTicks = 72; 
            else if (val === "12/8") maxTicks = 144; 
            
            document.getElementById('timeSigSelect').value = val;
            currentStepIndex = -1; measureCount = 0;
            
            if (forceResize !== 'skip') {
                let targetSteps = 16;
                if (val === "3/4" || val === "6/8") targetSteps = 12;
                if (val === "2/4") targetSteps = 8;
                if (val === "12/8") targetSteps = 24;

                let shouldResize = forceResize === true || confirm(t('confirmResize'));
                if (shouldResize) { circles.forEach(c => updateSteps(c.id, targetSteps)); }
            }
            renderMixer();
        };

        function getMarkers() {
            if (timeSignature === "4/4") return [0, 24, 48, 72];
            if (timeSignature === "3/4") return [0, 24, 48];
            if (timeSignature === "2/4") return [0, 24];
            if (timeSignature === "6/8") return [0, 12, 24, 36, 48, 60]; 
            if (timeSignature === "12/8") return [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132]; 
            return [0, 24, 48, 72];
        }

        function updateRadii() {
            if (circles.length === 0) return;
            const minRadius = 120;
            const maxRadius = 495; 
            
            if (circles.length === 1) { circles[0].radius = (minRadius + maxRadius) / 2; } 
            else {
                const step = (maxRadius - minRadius) / (circles.length - 1);
                circles.forEach((c, i) => { c.radius = minRadius + (i * step); });
            }
        }
        
        function refreshCirclesLayout() { updateRadii(); renderMixer(); }

        window.moveCircleUp = function(id) {
            let idx = circles.findIndex(c => c.id === id);
            if (idx > 0) {
                let temp = circles[idx]; circles[idx] = circles[idx - 1]; circles[idx - 1] = temp;
                refreshCirclesLayout();
            }
        };

        window.moveCircleDown = function(id) {
            let idx = circles.findIndex(c => c.id === id);
            if (idx > -1 && idx < circles.length - 1) {
                let temp = circles[idx]; circles[idx] = circles[idx + 1]; circles[idx + 1] = temp;
                refreshCirclesLayout();
            }
        };

        // Fonction extrêmement protectrice pour les anciens JSON
        function normalizeCircleData(c) {
            if (c.repeats === undefined) c.repeats = 1; 
            if (!c.notes) c.notes = Array(c.steps).fill("");
            if (!c.lyrics) c.lyrics = Array(c.steps).fill("");
            if (!c.activeSteps) c.activeSteps = Array(c.steps).fill(0);
            
            let inst = instrumentsConfig[c.instrumentIdx];
            if (inst && inst.type === 'voice') {
                for (let i = 0; i < c.steps; i++) {
                    let st = c.activeSteps[i];
                    if (st !== 0 && st !== 'P' && st !== 'C' && st !== 'X') {
                        c.notes[i] = String(st); 
                        c.activeSteps[i] = 'C'; 
                    } else if (st === 'X') {
                        c.activeSteps[i] = 'C';
                    }
                }
            }
        }

        function getActiveCircleIdForInstrument(instIdx) {
            let group = circles.filter(c => c.instrumentIdx === instIdx);
            if (group.length === 0) return null;
            if (group.length === 1) return group[0].id;
            
            let totalRepeats = group.reduce((sum, c) => sum + (parseInt(c.repeats) || 1), 0);
            if (totalRepeats <= 0) return group[0].id;
            
            let currentPos = measureCount % totalRepeats;
            
            let runningSum = 0;
            for (let c of group) {
                runningSum += (parseInt(c.repeats) || 1);
                if (currentPos < runningSum) { return c.id; }
            }
            return group[0].id; 
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save(); ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'; ctx.shadowBlur = 32; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 12;
            ctx.beginPath(); ctx.arc(centerX, centerY, 560, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill(); ctx.restore();

            if (bgLoaded) {
                ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, 560, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(bgImg, centerX - 560, centerY - 560, 1120, 1120); ctx.restore();
                ctx.beginPath(); ctx.arc(centerX, centerY, 560, 0, Math.PI * 2); ctx.fillStyle = 'rgba(15, 15, 15, 0.5)'; ctx.fill();
            } else {
                ctx.fillStyle = '#1c1c1c'; ctx.beginPath(); ctx.arc(centerX, centerY, 560, 0, Math.PI * 2); ctx.fill();
            }

            if (flashAlpha > 0) {
                ctx.save();
                ctx.beginPath(); ctx.arc(centerX, centerY, 568, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(241, 196, 15, ${flashAlpha})`; 
                ctx.lineWidth = 4 + (flashAlpha * 6);
                ctx.shadowColor = 'rgba(241, 196, 15, 1)';
                ctx.shadowBlur = 20;
                ctx.stroke();
                ctx.restore();
                flashAlpha -= 0.05; 
            }

            ctx.beginPath(); ctx.arc(centerX, centerY, 565, 0, Math.PI * 2); ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 8; ctx.stroke();

            const markers = getMarkers();
            markers.forEach((tick, idx) => {
                const angle = -Math.PI / 2 + ((tick / maxTicks) * Math.PI * 2);
                const inRad = 525, outRad = 538;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(angle)*inRad, centerY + Math.sin(angle)*inRad);
                ctx.lineTo(centerX + Math.cos(angle)*outRad, centerY + Math.sin(angle)*outRad);
                ctx.strokeStyle = (tick === 0) ? 'var(--accent-gold)' : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = (tick === 0) ? 4 : 2; ctx.stroke();

                const textRad = 548;
                ctx.fillStyle = (tick === 0) ? 'var(--accent-gold)' : 'rgba(255,255,255,0.7)';
                ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText((idx + 1).toString(), centerX + Math.cos(angle)*textRad, centerY + Math.sin(angle)*textRad);
            });

            if (isPlaying && Tone.Transport.state === "started") {
                const bpm = Tone.Transport.bpm.value;
                const beats = maxTicks / 24; 
                const measureDuration = (60 / bpm) * beats;
                const progress = (Tone.Transport.seconds % measureDuration) / measureDuration;
                currentAngle = -Math.PI / 2 + (progress * Math.PI * 2);
            }

            ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(currentAngle);
            const stickLength = circles.length > 0 ? circles[circles.length - 1].radius + 35 : 120;
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(stickLength - 20, -4); ctx.lineTo(stickLength - 20, 4); ctx.lineTo(0, 8);
            ctx.closePath(); ctx.fillStyle = '#e0ae6f'; ctx.fill();
            ctx.beginPath(); ctx.ellipse(stickLength - 10, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#c69552'; ctx.fill();
            ctx.restore();

            circles.forEach((circle) => {
                if (circle.isHidden) return;

                const inst = instrumentsConfig[circle.instrumentIdx];
                let hasActiveSolo = circles.some(c => c.isSolo);
                let isTargeted = hasActiveSolo ? circle.isSolo : !circle.isMute;
                
                let activeGroupId = getActiveCircleIdForInstrument(circle.instrumentIdx);
                if (circle.id !== activeGroupId) isTargeted = false; 
                
                ctx.save(); ctx.globalAlpha = isTargeted ? 1.0 : 0.15;
                ctx.beginPath(); ctx.arc(centerX, centerY, circle.radius, 0, Math.PI * 2);
                ctx.strokeStyle = circle.isSolo ? '#f1c40f' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();

                const currentStep = (isPlaying && currentStepIndex >= 0) ? Math.floor((currentStepIndex / maxTicks) * circle.steps) : -1;

                for (let i = 0; i < circle.steps; i++) {
                    const stepAngle = -Math.PI / 2 + (i * (Math.PI * 2 / circle.steps));
                    const x = centerX + Math.cos(stepAngle) * circle.radius; const y = centerY + Math.sin(stepAngle) * circle.radius;
                    
                    let state = circle.activeSteps[i]; 
                    let fillColor = 'rgba(255,255,255,0.2)'; 
                    let radiusSize = 6; 
                    let isAccent = false;
                    let textSymbol = String(state); // FORCE STRING TO PREVENT CRASH !

                    if (state !== 0) {
                        radiusSize = 13;
                        if (inst.type === 'voice') {
                            fillColor = (state === 'P') ? inst.colors['P'] : inst.colors['C']; 
                            let syl = (circle.lyrics && circle.lyrics[i]) ? circle.lyrics[i] : 'X';
                            textSymbol = String(syl);
                            if(textSymbol.endsWith('-')) textSymbol = textSymbol.slice(0, -1);
                        } else {
                            let sStr = String(state);
                            fillColor = inst.colors[state] || '#fff'; 
                            isAccent = (sStr === sStr.toUpperCase()); 
                            radiusSize = isAccent ? 15 : 12;
                            if (inst.type === 'gongue') {
                                if (state === 'GRV') textSymbol = 'G'; else if (state === 'grv') textSymbol = 'g';
                                else if (state === 'AIG') textSymbol = 'A'; else if (state === 'aig') textSymbol = 'a';
                            } else if (inst.id === 'mineiro') {
                                if (sStr.toLowerCase() === 'p') textSymbol = '↑'; else if (sStr.toLowerCase() === 't') textSymbol = '↓';
                            } else if (inst.id === 'agbe') {
                                if (sStr.toLowerCase() === 'g') textSymbol = '←'; else if (sStr.toLowerCase() === 'd') textSymbol = '→'; 
                            }
                        }
                    }

                    if (i === currentStep) {
                        ctx.beginPath(); ctx.arc(x, y, radiusSize + 5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(46, 204, 113, 0.7)'; ctx.lineWidth = 2.5; ctx.stroke();
                    }
                    if (isAccent) {
                        ctx.beginPath(); ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2; ctx.stroke();
                    }

                    ctx.beginPath(); ctx.arc(x, y, radiusSize, 0, Math.PI * 2); ctx.fillStyle = fillColor; ctx.fill(); ctx.strokeStyle = '#121212'; ctx.lineWidth = 1.5; ctx.stroke();
                    
                    if (state !== 0) {
                        let txtColor = inst.colors.text || '#fff';
                        if (inst.id === 'gongue' && (state === 'aig' || state === 'AIG')) txtColor = '#000000';
                        if (inst.type === 'voice') txtColor = '#121212'; 
                        ctx.fillStyle = txtColor;
                        ctx.font = (inst.type === 'shake' || inst.id === 'agbe') ? 'bold 16px sans-serif' : 'bold 14px sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
                        ctx.fillText(String(textSymbol).substring(0, 15), x, y + 1);
                    }
                    if (i === 0) {
                        ctx.save(); ctx.globalAlpha = 1.0; ctx.fillStyle = '#bbb'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
                        let displayName = inst.name;
                        let sameInst = circles.filter(c => c.instrumentIdx === circle.instrumentIdx);
                        if (sameInst.length > 1) displayName += ` ${sameInst.indexOf(circle) + 1}`;
                        ctx.fillText(displayName, x + 20, y + 3); ctx.restore();
                    }
                }
                ctx.restore();
            });

            ctx.beginPath(); ctx.arc(centerX, centerY, 55, 0, Math.PI * 2);
            ctx.fillStyle = isPlaying ? 'rgba(231, 76, 60, 0.9)' : 'rgba(46, 204, 113, 0.9)';
            ctx.fill(); ctx.strokeStyle = '#121212'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#000'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(isPlaying ? "⏸" : "▶", isPlaying ? centerX : centerX + 5, centerY + 2);

            requestAnimationFrame(draw);
        }

        let currentStepIndex = -1;
        
        const mainLoop = new Tone.Loop((time) => {
            if (currentStepIndex === maxTicks - 1) measureCount++; 
            currentStepIndex = (currentStepIndex + 1) % maxTicks;
            
            const markers = getMarkers();
            if (isMetroOn && markers.includes(currentStepIndex)) { 
                flashAlpha = 1.0; 
                let note = (currentStepIndex === 0) ? "A5" : "E5"; 
                bMetroClick.triggerAttackRelease(note, "32n", time); 
            }

            Tone.Draw.schedule(function(){
                document.querySelectorAll('.lyric-word.highlight').forEach(el => el.classList.remove('highlight'));
            }, time);

            const hasActiveSolo = circles.some(c => c.isSolo);
            circles.forEach(circle => {
                let canPlay = hasActiveSolo ? circle.isSolo : !circle.isMute;
                if (canPlay) {
                    let inst = instrumentsConfig[circle.instrumentIdx];
                    let activeGroupId = getActiveCircleIdForInstrument(circle.instrumentIdx);
                    if (circle.id !== activeGroupId) return;

                    const stepIdx = Math.floor((currentStepIndex / maxTicks) * circle.steps);
                    const expectedTick = Math.floor((stepIdx * maxTicks) / circle.steps);
                    
                    if (currentStepIndex === expectedTick) {
                        let state = circle.activeSteps[stepIdx];
                        if (state !== 0) {
                            if (inst.type === 'voice') {
                                Tone.Draw.schedule(function(){
                                    document.querySelectorAll(`.lyric-ref-${circle.id}-${stepIdx}`).forEach(el => {
                                        el.classList.add('highlight');
                                        setTimeout(() => { el.classList.remove('highlight'); }, 300);
                                    });
                                }, time);

                                let note = "C5"; 
                                if (circle.notes && circle.notes[stepIdx] && circle.notes[stepIdx].trim() !== '') {
                                    note = circle.notes[stepIdx];
                                } else if (state === 'P') {
                                    note = "E5"; 
                                }
                                try {
                                    if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerAttackRelease(note, "8n", time);
                                } catch(err) {
                                    if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerAttackRelease("C5", "8n", time);
                                }
                            } else if (samplers[inst.id]) {
                                let playerGroup = samplers[inst.id]; let targetKey = null;
                                if (inst.type === 'gongue') {
                                    if (state === 'GRV') targetKey = 'fort-grave'; else if (state === 'grv') targetKey = 'faible-grave';
                                    else if (state === 'AIG') targetKey = 'fort-aigue'; else if (state === 'aig') targetKey = 'faible-aigue';
                                } else {
                                    if (['D', 'G', 'P', 'T'].includes(state)) targetKey = 'fort'; else if (['d', 'g', 'p', 't'].includes(state)) targetKey = 'faible';
                                }
                                
                                if (targetKey && playerGroup.has(targetKey)) {
                                    try { let player = playerGroup.player(targetKey); if (player.loaded) player.start(time); } catch (err) {}
                                }
                            }
                        }
                    }
                }
            });
        }, "96n");

        function drawMeters() {
            const dbToPct = (db) => { if (db < -50) return 0; if (db > 0) return 100; return Math.floor(((db + 50) / 50) * 100); };
            circles.forEach(c => {
                let inst = instrumentsConfig[c.instrumentIdx];
                let bar = document.getElementById(`meter-bar-${c.id}`); let meter = meters[inst.id];
                if (bar && meter) bar.style.width = isPlaying ? dbToPct(meter.getValue()) + '%' : '0%'; 
            });
        }
        setInterval(drawMeters, 40);

        function populateAddDropdown() {
            const list = document.getElementById('list-add');
            if(!list) return;
            list.innerHTML = '';
            instrumentsConfig.forEach((inst, idx) => {
                let div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `<img src="${inst.iconImg}" onerror="this.style.display='none'"> <span>${inst.name}</span>`;
                div.onmousedown = () => { addInstrumentFromIdx(idx); };
                list.appendChild(div);
            });
        }

        window.addInstrumentFromIdx = function(instIdx) {
            if (circles.length >= 20) { alert(t('save') === 'Salvar' ? "Limite máxima atingida!" : "Limite maximale atteinte !"); return; }
            let defaultSteps = 16;
            if (timeSignature === "3/4" || timeSignature === "6/8") defaultSteps = 12;
            if (timeSignature === "2/4") defaultSteps = 8;
            if (timeSignature === "12/8") defaultSteps = 24;

            circles.push({ id: Date.now(), steps: defaultSteps, repeats: 1, activeSteps: Array(defaultSteps).fill(0), instrumentIdx: instIdx, lyrics: Array(defaultSteps).fill(""), notes: Array(defaultSteps).fill(""), isMute: false, isSolo: false, isHidden: false, volumeVal: 100 });
            refreshCirclesLayout();
            closeDropdown('dropdown-add');
        }

        function renderMixer() {
            const container = document.getElementById('tracks-mixer-container'); if (!container) return;
            container.innerHTML = "";
            circles.forEach((circle, index) => {
                const inst = instrumentsConfig[circle.instrumentIdx];
                
                let instSelectHtml = `<select onchange="updateInstrument(${circle.id}, this.value)" style="display:none;"></select>`;

                let inputHtml = "";
                if (inst.type === 'voice') {
                    inputHtml = `<div class="step-boxes" id="voice-boxes-${circle.id}">`;
                    for(let i=0; i<circle.steps; i++) {
                        let state = circle.activeSteps[i];
                        let isActive = state !== 0;
                        let isPux = state === 'P';
                        let syl = circle.lyrics[i] || '';
                        let note = (circle.notes && circle.notes[i]) ? circle.notes[i] : '';
                        
                        let typeClass = isActive ? (isPux ? 'pux' : 'coro') : 'empty';
                        let typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';

                        inputHtml += `
                        <div class="v-card ${isActive ? '' : 'inactive'}">
                            <div class="v-type ${typeClass}" onclick="toggleVoiceType(${circle.id}, ${i})">${typeText}</div>
                            <input type="text" class="v-syl" value="${syl}" placeholder="-" oninput="updateVoiceSyl(${circle.id}, ${i}, this.value, this)" onkeydown="navVoiceBox(this, event, 'syl')">
                            <input type="text" class="v-note" value="${note}" placeholder="Ex:C4" oninput="updateVoiceNote(${circle.id}, ${i}, this.value)" onblur="formatNoteBlur(${circle.id}, ${i}, this)" onkeydown="navVoiceBox(this, event, 'note')">
                        </div>`;

                        if ((i + 1) % 4 === 0 && i !== circle.steps - 1) {
                             inputHtml += `<div style="flex-basis: 100%; height: 2px;"></div>`;
                        }
                    }
                    inputHtml += `</div>`;

                } else {
                    inputHtml = `<div class="step-boxes" id="step-boxes-${circle.id}">`;
                    for(let i=0; i<circle.steps; i++) {
                        let val = circle.activeSteps[i];
                        let displayVal = val === 0 ? '' : val;
                        if(val !== 0 && inst.type === 'gongue') {
                            if(val === 'GRV') displayVal = 'G'; else if(val === 'grv') displayVal = 'g';
                            else if(val === 'AIG') displayVal = 'A'; else if(val === 'aig') displayVal = 'a';
                        }
                        
                        let extraStyle = "";
                        let isBeatEnd = false;
                        if (timeSignature === "6/8" || timeSignature === "12/8") {
                            if ((i + 1) % 3 === 0) isBeatEnd = true;
                        } else if (timeSignature === "3/4") {
                            let div = circle.steps === 12 ? 4 : Math.floor(circle.steps / 3);
                            if ((i + 1) % div === 0) isBeatEnd = true;
                        } else { 
                            let div = Math.floor(circle.steps / (timeSignature === "4/4" ? 4 : 2));
                            if (div === 0) div = 4;
                            if ((i + 1) % div === 0) isBeatEnd = true;
                        }
                        
                        if (isBeatEnd && i !== circle.steps - 1) { extraStyle = "margin-right: 10px;"; }

                        let colorStyle = "";
                        if (val !== 0 && val !== '') {
                            let bgColor = inst.colors[val] || '#111';
                            let txtColor = inst.colors.text || '#fff';
                            if (inst.id === 'gongue' && (val === 'AIG' || val === 'aig')) txtColor = '#000';
                            colorStyle = `background-color: ${bgColor}; color: ${txtColor}; border-color: ${bgColor};`;
                        }
                        
                        inputHtml += `<input type="text" maxlength="1" class="step-box" style="${extraStyle} ${colorStyle}" data-circle="${circle.id}" data-step="${i}" value="${displayVal}" onfocus="this.select()" oninput="onStepBoxInput(this, event)" onkeydown="onStepBoxKey(this, event)">`;
                        
                        let breakAt = circle.steps;
                        if (circle.steps === 16) breakAt = 8;
                        if (circle.steps === 24) breakAt = 12;
                        if ((i + 1) % breakAt === 0 && i !== circle.steps - 1) {
                             inputHtml += `<div style="flex-basis: 100%; height: 2px;"></div>`;
                        }
                    }
                    inputHtml += `</div>`;
                }

                const div = document.createElement('div'); div.className = "track-mixer";
                div.style.background = `linear-gradient(145deg, var(--control-bg) 40%, ${inst.mixerBg} 150%)`;
                div.innerHTML = `
                    <div class="track-mixer-header">
                        <div style="display:flex; align-items:center;">
                            <div class="track-order-btns">
                                <button class="order-btn" onclick="moveCircleUp(${circle.id})" ${index === 0 ? 'disabled' : ''}>▲</button>
                                <button class="order-btn" onclick="moveCircleDown(${circle.id})" ${index === circles.length - 1 ? 'disabled' : ''}>▼</button>
                            </div>
                            
                            <div class="custom-dropdown" id="dropdown-inst-${circle.id}" tabindex="0" onblur="closeDropdown('dropdown-inst-${circle.id}')">
                                <div class="dropdown-selected" onclick="toggleDropdown('list-inst-${circle.id}')">
                                    <img src="${inst.iconImg}" onerror="this.style.display='none'"> <span>${index + 1}. ${inst.name}</span> <span style="font-size:8px;">▼</span>
                                </div>
                                <div class="dropdown-list" id="list-inst-${circle.id}">
                                    ${instrumentsConfig.map((opt, idx) => `
                                        <div class="dropdown-item" onmousedown="updateInstrument(${circle.id}, ${idx})">
                                            <img src="${opt.iconImg}" onerror="this.style.display='none'"> <span>${opt.name}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="track-mute-solo">
                            <button class="btn-mute-solo ${circle.isMute ? 'mute-on' : ''}" onclick="toggleMute(${circle.id})">M</button>
                            <button class="btn-mute-solo ${circle.isSolo ? 'solo-on' : ''}" onclick="toggleSolo(${circle.id})">S</button>
                            <button class="btn-mute-solo ${circle.isHidden ? 'hidden-on' : ''}" onclick="toggleHide(${circle.id})">${circle.isHidden ? '🙈' : '👁️'}</button>
                            <button class="btn-mute-solo btn-delete" onclick="deleteCircle(${circle.id})">🗑️</button>
                        </div>
                    </div>
                    <div class="fader-group">
                        <input type="range" class="fader" min="0" max="100" value="${circle.volumeVal}" oninput="updateVolume(${circle.id}, this.value)">
                        <div class="vol-meter-bg"><div class="vol-meter-bar" id="meter-bar-${circle.id}"></div></div>
                    </div>
                    <div class="steps-config">
                        <div class="steps-config-right">
                            <span>${t('stepsNum')}</span>
                            <input type="number" value="${circle.steps}" min="2" max="32" onchange="updateSteps(${circle.id}, this.value)">
                        </div>
                        <div class="steps-config-right">
                            <span title="Repetições / Boucles">🔄 x</span>
                            <input type="number" value="${circle.repeats || 1}" min="1" max="64" style="width:30px;" onchange="updateRepeats(${circle.id}, this.value)">
                        </div>
                    </div>
                    <div class="pattern-row">
                        ${inputHtml}
                    </div>
                `;
                container.appendChild(div);
            });
        }

        window.updateRepeats = function(id, val) {
            let c = circles.find(x => x.id === id);
            if (c) { c.repeats = parseInt(val) || 1; renderMixer(); }
        }

        window.toggleVoiceType = function(id, sIdx) {
            let c = circles.find(x => x.id === id);
            if(c.activeSteps[sIdx] === 0) return; 
            c.activeSteps[sIdx] = c.activeSteps[sIdx] === 'P' ? 'C' : 'P';
            renderMixer(); 
        }

        window.updateVoiceSyl = function(id, sIdx, val, el) {
            let c = circles.find(x => x.id === id);
            c.lyrics[sIdx] = val;
            let card = el.closest('.v-card');
            let typeEl = card.querySelector('.v-type');

            if (val.trim() !== '') {
                card.classList.remove('inactive');
                if(c.activeSteps[sIdx] === 0) {
                    c.activeSteps[sIdx] = 'C'; 
                    if (!c.notes[sIdx]) c.notes[sIdx] = 'C4';
                }
                typeEl.className = c.activeSteps[sIdx] === 'P' ? 'v-type pux' : 'v-type coro';
                typeEl.innerText = c.activeSteps[sIdx] === 'P' ? 'PUX' : 'CORO';
            } else {
                c.activeSteps[sIdx] = 0;
                card.classList.add('inactive');
                typeEl.className = 'v-type empty';
                typeEl.innerText = '---';
            }
        }

        window.updateVoiceNote = function(id, sIdx, val) {
            let c = circles.find(x => x.id === id);
            c.notes[sIdx] = val;
        }

        window.formatNoteBlur = function(id, sIdx, el) {
            let val = el.value.trim();
            if (val.length === 1 || (val.length === 2 && (val.includes('#') || val.includes('b')))) {
                if (/^[a-gA-G][#b]?$/.test(val)) {
                    val = val.toUpperCase() + "4";
                    el.value = val;
                    let c = circles.find(x => x.id === id);
                    c.notes[sIdx] = val;
                }
            }
        }

        window.navVoiceBox = function(el, e, type) {
            if (e.key === 'ArrowRight') {
                let cards = Array.from(el.closest('.step-boxes').querySelectorAll('.v-card'));
                let idx = cards.indexOf(el.closest('.v-card'));
                if(idx < cards.length - 1) cards[idx+1].querySelector(type === 'syl' ? '.v-syl' : '.v-note').focus();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                let cards = Array.from(el.closest('.step-boxes').querySelectorAll('.v-card'));
                let idx = cards.indexOf(el.closest('.v-card'));
                if(idx > 0) cards[idx-1].querySelector(type === 'syl' ? '.v-syl' : '.v-note').focus();
                e.preventDefault();
            }
        }

        window.onStepBoxInput = function(el, e) {
            let char = el.value.slice(-1);
            let cId = parseInt(el.getAttribute('data-circle'));
            let sIdx = parseInt(el.getAttribute('data-step'));
            let c = circles.find(x => x.id === cId); if(!c) return;
            let inst = instrumentsConfig[c.instrumentIdx];
            
            let parsed = 0;
            if (char && char.trim() !== '') {
                if (inst.type === 'gongue') {
                    if (char === 'G') parsed = 'GRV'; else if (char === 'g') parsed = 'grv';
                    else if (char === 'A') parsed = 'AIG'; else if (char === 'a') parsed = 'aig';
                } else if (inst.id === 'mineiro') { 
                    if (char === 'P' || char === 'T' || char === 'p' || char === 't') parsed = char;
                } else { 
                    if (char === 'D' || char === 'G' || char === 'd' || char === 'g') parsed = char;
                }
            }
            
            if (parsed !== 0) {
                c.activeSteps[sIdx] = parsed;
                let displayVal = parsed;
                if(inst.type === 'gongue') {
                    if(parsed === 'GRV') displayVal = 'G'; else if(parsed === 'grv') displayVal = 'g';
                    else if(parsed === 'AIG') displayVal = 'A'; else if(parsed === 'aig') displayVal = 'a';
                }
                el.value = displayVal;

                let bgColor = inst.colors[parsed] || '#111';
                let txtColor = inst.colors.text || '#fff';
                if (inst.id === 'gongue' && (parsed === 'AIG' || parsed === 'aig')) txtColor = '#000';
                el.style.backgroundColor = bgColor;
                el.style.borderColor = bgColor;
                el.style.color = txtColor;
                
                let next = el.nextElementSibling;
                while (next && next.tagName !== 'INPUT') next = next.nextElementSibling;
                if (next && next.tagName === 'INPUT') { next.focus(); next.select(); }
            } else {
                c.activeSteps[sIdx] = 0; el.value = '';
                el.style.backgroundColor = '#111'; el.style.borderColor = '#555'; el.style.color = 'var(--accent-gold)';
                if (char === ' ') { 
                    let next = el.nextElementSibling; 
                    while (next && next.tagName !== 'INPUT') next = next.nextElementSibling;
                    if (next && next.tagName === 'INPUT') { next.focus(); next.select(); } 
                }
            }
        };

        window.onStepBoxKey = function(el, e) {
            if (e.key === 'Backspace' && el.value === '') {
                let prev = el.previousElementSibling; 
                while (prev && prev.tagName !== 'INPUT') prev = prev.previousElementSibling;
                if(prev && prev.tagName === 'INPUT') { prev.focus(); prev.select(); } e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                let next = el.nextElementSibling; 
                while (next && next.tagName !== 'INPUT') next = next.nextElementSibling;
                if(next && next.tagName === 'INPUT') { next.focus(); next.select(); } e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                let prev = el.previousElementSibling; 
                while (prev && prev.tagName !== 'INPUT') prev = prev.previousElementSibling;
                if(prev && prev.tagName === 'INPUT') { prev.focus(); prev.select(); } e.preventDefault();
            }
        };

        window.toggleMute = function(id) { let c = circles.find(x => x.id === id); if(c) c.isMute = !c.isMute; renderMixer(); };
        window.toggleSolo = function(id) { let c = circles.find(x => x.id === id); if(c) c.isSolo = !c.isSolo; renderMixer(); };
        window.toggleHide = function(id) { let c = circles.find(x => x.id === id); if (c) c.isHidden = !c.isHidden; renderMixer(); };
        window.deleteCircle = function(id) { circles = circles.filter(x => x.id !== id); refreshCirclesLayout(); };

        window.updateInstrument = function(id, instIdx) {
            let c = circles.find(x => x.id === id);
            if (c) {
                c.instrumentIdx = parseInt(instIdx); c.activeSteps = Array(c.steps).fill(0); c.lyrics = Array(c.steps).fill(""); c.notes = Array(c.steps).fill("");
                let instId = instrumentsConfig[c.instrumentIdx].id; let db = Tone.gainToDb(c.volumeVal / 100); 
                if (c.volumeVal <= 4) db = -Infinity; channels[instId].volume.value = db;
                renderMixer();
            }
        };

        window.updateVolume = function(id, v) {
            let c = circles.find(x => x.id === id);
            if(c) { c.volumeVal = parseInt(v); let instId = instrumentsConfig[c.instrumentIdx].id; let db = Tone.gainToDb(v / 100); if(v <= 4) db = -Infinity; channels[instId].volume.value = db; }
        };
        
        window.updateSteps = function(id, s) {
            let c = circles.find(x => x.id === id);
            if (c) { 
                let sn = parseInt(s) || 4; c.steps = sn; 
                let na = Array(sn).fill(0); let nl = Array(sn).fill(""); let nn = Array(sn).fill("");
                for(let i=0; i<Math.min(sn, c.activeSteps.length); i++) { na[i] = c.activeSteps[i]; nl[i] = c.lyrics[i]; nn[i] = c.notes[i]; }
                c.activeSteps = na; c.lyrics = nl; c.notes = nn;
                renderMixer(); 
            }
        };

        // --- GESTION DU CLIC SUR LA RODA ---
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect(); 
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width); 
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
            const dx = mouseX - centerX; const dy = mouseY - centerY; const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 55) { togglePlay(); return; }

            circles.forEach((circle) => {
                if (circle.isHidden) return;
                if (Math.abs(distance - circle.radius) < 18) {
                    let clickAngle = Math.atan2(dy, dx) + Math.PI / 2; if (clickAngle < 0) clickAngle += Math.PI * 2;
                    const stepAngleSize = (Math.PI * 2) / circle.steps;
                    
                    for (let i = 0; i < circle.steps; i++) {
                        const targetAngle = i * stepAngleSize; let angleDiff = Math.abs(clickAngle - targetAngle);
                        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                        if (angleDiff < stepAngleSize / 2) {
                            const inst = instrumentsConfig[circle.instrumentIdx]; let current = circle.activeSteps[i];
                            
                            if (inst.id === 'mineiro') {
                                if (current === 0) circle.activeSteps[i] = 'p'; else if (current === 'p') circle.activeSteps[i] = 'P'; else if (current === 'P') circle.activeSteps[i] = 't'; else if (current === 't') circle.activeSteps[i] = 'T'; else circle.activeSteps[i] = 0;
                            } else if (inst.id === 'agbe') {
                                if (current === 0) circle.activeSteps[i] = 'g'; else if (current === 'g') circle.activeSteps[i] = 'G'; else if (current === 'G') circle.activeSteps[i] = 'd'; else if (current === 'd') circle.activeSteps[i] = 'D'; else circle.activeSteps[i] = 0;
                            } else if (inst.type === 'gongue') {
                                if (current === 0) circle.activeSteps[i] = 'grv'; else if (current === 'grv') circle.activeSteps[i] = 'GRV'; else if (current === 'GRV') circle.activeSteps[i] = 'aig'; else if (current === 'aig') circle.activeSteps[i] = 'AIG'; else circle.activeSteps[i] = 0;
                            } else if (inst.type === 'voice') {
                                // POPUP INTELLIGENT POUR LE CHANT (Note:Syllabe)
                                let notePart = (circle.notes && circle.notes[i]) ? circle.notes[i] + ":" : "";
                                let currentText = notePart + (current === 'P' ? '*' : '') + (circle.lyrics[i] || "");
                                let lyric = prompt(t('promptVoice'), currentText);
                                
                                if (lyric !== null) {
                                    lyric = lyric.trim();
                                    if (lyric === '') {
                                        circle.activeSteps[i] = 0; circle.lyrics[i] = ""; circle.notes[i] = "";
                                    } else {
                                        let noteVal = ""; let sylVal = lyric;
                                        if (lyric.includes(':')) {
                                            let parts = lyric.split(':');
                                            noteVal = parts[0].trim(); sylVal = parts[1].trim();
                                            if (/^[a-gA-G][#b]?$/.test(noteVal)) noteVal += "4";
                                        }
                                        
                                        if (sylVal.startsWith('*')) {
                                            circle.activeSteps[i] = 'P';
                                            circle.lyrics[i] = sylVal.substring(1).substring(0, 15);
                                        } else {
                                            circle.activeSteps[i] = 'C';
                                            circle.lyrics[i] = sylVal.substring(0, 15);
                                        }
                                        circle.notes[i] = noteVal.toUpperCase();
                                    }
                                }
                            } else {
                                if (current === 0) circle.activeSteps[i] = 'd'; else if (current === 'd') circle.activeSteps[i] = 'D'; else if (current === 'D') circle.activeSteps[i] = 'g'; else if (current === 'g') circle.activeSteps[i] = 'G'; else circle.activeSteps[i] = 0;
                            }
                            renderMixer();
                            return;
                        }
                    }
                }
            });
        });

        async function togglePlay() {
            if (!isPlaying) {
                await Tone.start(); 
                mainLoop.start(0); Tone.Transport.start(); isPlaying = true;
            } else {
                mainLoop.stop(); Tone.Transport.pause(); 
                instrumentsConfig.forEach(inst => { if (samplers[inst.id]) samplers[inst.id].stopAll(); if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease(); });
                isPlaying = false;
            }
        }

        document.getElementById('rewindBtn').addEventListener('click', () => {
            mainLoop.stop(); Tone.Transport.stop(); 
            instrumentsConfig.forEach(inst => { if (samplers[inst.id]) samplers[inst.id].stopAll(); if (voiceSynths[inst.id]) voiceSynths[inst.id].triggerRelease(); });
            isPlaying = false;
            currentStepIndex = -1; measureCount = 0; Tone.Transport.seconds = 0; currentAngle = -Math.PI / 2;
        });

        document.getElementById('bpm').addEventListener('change', (e) => { 
            let val = Math.round(Number(e.target.value));
            if (val < 40) val = 40; if (val > 240) val = 240;
            e.target.value = val; Tone.Transport.bpm.value = val;
        });
        
        document.getElementById('masterVol').addEventListener('input', (e) => { let val = parseFloat(e.target.value); Tone.Destination.volume.value = val === -40 ? -Infinity : val; });
        const metroBtn = document.getElementById('metroBtn'); metroBtn.addEventListener('click', () => { isMetroOn = !isMetroOn; metroBtn.classList.toggle('metro-on', isMetroOn); });
        document.getElementById('clearBtn').addEventListener('click', () => { circles = []; document.getElementById('letras-textarea').innerHTML = ""; refreshCirclesLayout(); });

        document.getElementById('saveBtn').addEventListener('click', () => {
            let letrasText = document.getElementById('letras-textarea').innerHTML;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ bpm: Tone.Transport.bpm.value, timeSig: timeSignature, letras: letrasText, circles: circles }));
            const dl = document.createElement('a'); dl.href = dataStr; dl.download = "rythme_samambaia.json"; dl.click();
        });

        const fileInput = document.getElementById('fileInput'); document.getElementById('loadBtn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
            reader.onload = function(evt) {
                try { 
                    const d = JSON.parse(evt.target.result); 
                    if (d.bpm) { document.getElementById('bpm').value = Math.round(d.bpm); Tone.Transport.bpm.value = Math.round(d.bpm); } 
                    if (d.circles) { circles = d.circles; circles.forEach(c => normalizeCircleData(c)); } 
                    if (d.timeSig) { updateTimeSig(d.timeSig, 'skip'); } else { updateTimeSig("4/4", 'skip'); }
                    if (d.letras !== undefined) { document.getElementById('letras-textarea').innerHTML = d.letras; }
                    refreshCirclesLayout(); 
                } catch (err) { alert("Fichier invalide !"); }
            }; reader.readAsText(file);
        });

        function onPresetChange(value) { if (value.endsWith('.json')) loadPresetFile(value); else loadFallbackPreset(value); }

        function loadPresetFile(fileName) {
            fetch(fileName).then(res => { if (!res.ok) throw new Error("Fichier introuvable"); return res.json(); })
                .then(data => { 
                    if (data.circles) { circles = JSON.parse(JSON.stringify(data.circles)); circles.forEach(c => normalizeCircleData(c)); }
                    if (data.bpm) { document.getElementById('bpm').value = Math.round(data.bpm); Tone.Transport.bpm.value = Math.round(data.bpm); } 
                    if (data.timeSig) { updateTimeSig(data.timeSig, 'skip'); } else { updateTimeSig("4/4", 'skip'); }
                    if (data.letras !== undefined) { document.getElementById('letras-textarea').innerHTML = data.letras; } else { document.getElementById('letras-textarea').innerHTML = ""; }
                    refreshCirclesLayout(); 
                })
                .catch(err => { loadFallbackPreset(fileName.includes("Imale") ? 'baque-de-imale' : 'vou-vadiar'); });
        }

        function loadFallbackPreset(name) {
            let p = name === 'baque-de-imale' ? baqueDeImalePreset : vouVadiarPreset;
            if (p) { 
                circles = JSON.parse(JSON.stringify(p.circles)); circles.forEach(c => normalizeCircleData(c));
                document.getElementById('bpm').value = Math.round(p.bpm); Tone.Transport.bpm.value = Math.round(p.bpm); 
                updateTimeSig(p.timeSig || "4/4", 'skip');
            }
            document.getElementById('letras-textarea').innerHTML = "";
            refreshCirclesLayout(); measureCount = 0; 
        }

        fetch('catalog.json')
            .then(response => { if (!response.ok) throw new Error("Fichier manquant"); return response.json(); })
            .then(presets => {
                const select = document.getElementById('presetSelect'); select.innerHTML = ''; 
                presets.forEach(p => { const opt = document.createElement('option'); opt.value = p.file; opt.textContent = p.name; select.appendChild(opt); });
                if (presets.length > 0) loadPresetFile(presets[0].file);
            })
            .catch(err => { loadFallbackPreset('vou-vadiar'); document.getElementById('presetSelect').value = 'vou-vadiar'; });

        window.addEventListener('keydown', (e) => { 
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.id !== 'letras-textarea') { 
                e.preventDefault(); togglePlay(); 
            } 
        });