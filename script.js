document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const imageInput = document.getElementById('imageInput');
    const asciiOutput = document.getElementById('asciiOutput');
    const canvas = document.getElementById('imageCanvas');
    const context = canvas.getContext('2d', { willReadFrequently: true }); // Optimización útil aquí
    const maxWidthInput = document.getElementById('maxWidth');
    const charSetSelect = document.getElementById('charSet');
    const invertCheckbox = document.getElementById('invertColors');
    const uploadButton = document.getElementById('uploadButton');
    const initialMessage = document.getElementById('initialMessage');
    const dropZone = document.getElementById('dropZone');
    const copyButton = document.getElementById('copyButton');
    const aspectRatioCorrectionInput = document.getElementById('aspectRatioCorrection');

    // --- Variables Globales ---
    let lastLoadedImage = null;

    // --- Función para procesar un archivo de imagen (desde input, paste o drop) ---
    function processImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showError("Por favor, proporciona un archivo de imagen válido.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                lastLoadedImage = img; // Guarda la referencia
                generateAscii(img); // Llama a la función principal
                initialMessage.style.display = 'none'; // Oculta mensaje inicial
                asciiOutput.style.display = 'block';  // Muestra output
            }
            img.onerror = function() {
                showError('Error al cargar la imagen.');
            }
            img.src = event.target.result;
        }
        reader.onerror = function() {
            showError('Error al leer el archivo.');
        }
        reader.readAsDataURL(file);
    }

    // --- Función para mostrar errores (simple) ---
    function showError(message) {
        asciiOutput.textContent = `Error: ${message}`;
        asciiOutput.style.display = 'block';
        initialMessage.style.display = 'none';
        console.error(message);
    }


    // --- Listener para el Input de Archivo (ahora disparado por botón) ---
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    });

    // --- Listener para el Botón de Carga ---
    uploadButton.addEventListener('click', () => {
        imageInput.click(); // Abre el selector de archivos real
    });

    // --- Listener para Pegar desde Portapapeles ---
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    console.log("Imagen pegada:", file.name);
                    e.preventDefault(); // Evita que el navegador maneje el pegado por defecto
                    processImageFile(file);
                    break; // Procesa solo la primera imagen encontrada
                }
            }
        }
    });

    // --- Listeners para Drag & Drop ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necesario para permitir el drop
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
             console.log("Imagen soltada:", files[0].name);
            processImageFile(files[0]); // Procesa el primer archivo soltado
        }
    });


    // --- Listeners para cambios en las opciones ---
    maxWidthInput.addEventListener('change', regenerateAscii);
    charSetSelect.addEventListener('change', regenerateAscii);
    invertCheckbox.addEventListener('change', regenerateAscii);
    aspectRatioCorrectionInput.addEventListener('change', regenerateAscii); // Nuevo control

    // --- Función para regenerar ASCII cuando cambian las opciones ---
    function regenerateAscii() {
        if (lastLoadedImage) {
            generateAscii(lastLoadedImage);
        } else {
            // Opcional: si no hay imagen, no hacer nada o mostrar mensaje
            // console.log("No hay imagen cargada para regenerar.");
        }
    }

     // --- Botón Copiar al Portapapeles ---
     copyButton.addEventListener('click', () => {
        if (asciiOutput.textContent && asciiOutput.textContent !== 'El arte ASCII aparecerá aquí...' && !asciiOutput.textContent.startsWith('Error:')) {
            navigator.clipboard.writeText(asciiOutput.textContent)
                .then(() => {
                   // Feedback visual opcional (cambiar texto del botón temporalmente)
                   const originalText = copyButton.innerHTML;
                   copyButton.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                   setTimeout(() => { copyButton.innerHTML = originalText; }, 1500);
                })
                .catch(err => {
                    console.error('Error al copiar al portapapeles: ', err);
                    alert('No se pudo copiar el texto.'); // Feedback simple
                });
        } else {
            console.log("Nada que copiar.");
        }
    });


    // --- Función principal para generar el ASCII ---
    function generateAscii(img) {
        const maxWidth = parseInt(maxWidthInput.value) || 100;
        let asciiChars = charSetSelect.value;
        const invert = invertCheckbox.checked;
        const characterAspectRatioCorrection = parseFloat(aspectRatioCorrectionInput.value) || 0.6; // Obtener de input

        const aspectRatio = img.width / img.height;

        let canvasWidth = maxWidth;
        let canvasHeight = Math.round(maxWidth / aspectRatio * characterAspectRatioCorrection);

        // Evitar dimensiones 0 o negativas si algo va mal
        canvasWidth = Math.max(1, canvasWidth);
        canvasHeight = Math.max(1, canvasHeight);


        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Limpiar canvas antes de dibujar (importante si se regenera)
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        let imageData;
        try {
            imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            showError(`Error al obtener ImageData: ${e.message}. Puede ser un problema de CORS o tamaño.`);
            return;
        }
        const data = imageData.data;
        let asciiArt = '';

        if (invert) {
            asciiChars = asciiChars.split('').reverse().join('');
        }

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                // const a = data[index + 3]; // Alfa

                // Formula de luminancia (más precisa)
                const gray = 0.21 * r + 0.71 * g + 0.07 * b;

                const grayNormalized = gray / 255; // Valor entre 0 y 1
                const charIndex = Math.floor(grayNormalized * asciiChars.length);
                // Asegurarse de no exceder el índice máximo (importante si gray es 255)
                const finalCharIndex = Math.min(charIndex, asciiChars.length - 1);

                asciiArt += asciiChars[finalCharIndex];
            }
            asciiArt += '\n'; // Nueva línea al final de cada fila
        }

        asciiOutput.textContent = asciiArt; // Mostrar el resultado
    }

    // --- Estado Inicial ---
    asciiOutput.style.display = 'none'; // Asegura que esté oculto al inicio
    initialMessage.style.display = 'block'; // Muestra el mensaje inicial

}); // Fin del DOMContentLoaded
