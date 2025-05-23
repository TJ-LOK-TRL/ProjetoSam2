import { loadImageFromCache, hexToRgb, rgbToHsl, hslToRgb, getGaussianKernel } from '@/assets/js/utils.js';

export default class MaskHandler {
    constructor() {
        this.video = null
        this.overlayVideos = []

        this.selectMaskType = null // add or remove
        this.selectedMaskObjectId = null

        this.activeMask = null
        this.selectedMask = null

        this.unselectedMaskColor = [255, 255, 255, 255]
        this.hoverMaskColor = [255, 0, 0, 128]
        this.selectedMaskColor = [0, 255, 0, 128]

        this.getCanvasSize = null
        this.canvasToApplyColorEffect = null
        this.maskToEdit = null
    }

    async preprocessImage(mask, maskColor, borderOptions = { width: 0, color: [0, 255, 0, 255] }) {
        const img = await loadImageFromCache(mask.url);

        // Criar um canvas temporário para manipular pixels
        const tempCanvas = document.createElement('canvas', { willReadFrequently: true });
        const tempCtx = tempCanvas.getContext('2d');

        // Ajusta o tamanho do canvas
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        tempCtx.drawImage(img, 0, 0, img.width, img.height);

        // Obter os pixels da imagem
        let imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const [rNew, gNew, bNew, aNew] = maskColor;

        // Percorrer os pixels e ajustar transparência
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];     // Red
            const g = data[i + 1]; // Green
            const b = data[i + 2]; // Blue

            if (r < 50 && g < 50 && b < 50) {
                // Se for preto, tornamos transparente
                data[i + 3] = 0; // Alpha = 0 (transparente)
            } else {
                // Aplica a cor da máscara ativa
                data[i] = rNew;   // Red
                data[i + 1] = gNew; // Green
                data[i + 2] = bNew; // Blue
                data[i + 3] = aNew; // Alpha
            }
        }

        // Adiciona borda se configurado
        if (borderOptions.width > 0) {
            tempCtx.putImageData(imageData, 0, 0); // Atualiza antes de adicionar borda
            imageData = this.addBorderToMask(
                tempCtx.getImageData(0, 0, img.width, img.height),
                borderOptions.width,
                borderOptions.color
            );
        }

        // Atualiza o canvas temporário com as novas cores
        tempCtx.putImageData(imageData, 0, 0);

        return tempCanvas; // Retorna o canvas manipulado com os pixels já ajustados
    }

    async drawImage(canvas, image) {
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'lighten';
        await ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    clearCanvas(canvas, width, height) {
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    addBorderToMask(imageData, borderWidth = 2, borderColor = [255, 0, 0, 255]) {
        const { width, height, data } = imageData;
        const newData = new Uint8ClampedArray(data);
        const [r, g, b, a] = borderColor;

        // Cria uma cópia dos pixels originais para verificação
        const originalAlpha = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            originalAlpha[i / 4] = data[i + 3];
        }

        // Verifica pixels vizinhos para bordas
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Se o pixel atual é transparente, verifica vizinhos
                if (originalAlpha[y * width + x] === 0) {
                    for (let dy = -borderWidth; dy <= borderWidth; dy++) {
                        for (let dx = -borderWidth; dx <= borderWidth; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;

                            // Se estiver dentro dos limites e for parte da máscara
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                                originalAlpha[ny * width + nx] > 0) {
                                // Aplica a cor da borda
                                newData[idx] = r;
                                newData[idx + 1] = g;
                                newData[idx + 2] = b;
                                newData[idx + 3] = a;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return new ImageData(newData, width, height);
    }

    getIndexedColor(index) {
        const step = 20; // Quanto cada componente de cor deve aumentar
        let r = ((index * step * 1) % 255);
        let g = ((index * step * 2) % 255);
        let b = ((index * step * 3) % 255);

        b += 10 // Começa em 10 para evitar preto absoluto

        return [r, g, b];
    }

    drawVideoFrame(canvas, img, width, height) {
        if (!canvas || !img) {
            console.warn('Canvas or videoElement not set');
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    drawDetectionMasks2(canvas, masks, width, height) {
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = width
        canvas.height = height

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa antes de redesenhar

        masks.forEach(async mask => {
            const img = await loadImageFromCache(mask.url);
            // Criar um canvas temporário para manipular pixels
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Obter os pixels da imagem
            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Cor única para esta máscara
            const [rNew, gNew, bNew] = mask.indexColor

            // Percorrer os pixels e ajustar as cores
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];     // Red
                const g = data[i + 1]; // Green
                const b = data[i + 2]; // Blue

                if (r < 50 && g < 50 && b < 50) {
                    // Se for preto, fica transparente
                    data[i + 3] = 0; // Alpha = 0 (transparente)
                } else {
                    // Se for branco, colocar cor única para a máscara
                    data[i] = rNew;
                    data[i + 1] = gNew;
                    data[i + 2] = bNew;
                }
            }

            // Atualizar os pixels do canvas temporário
            tempCtx.putImageData(imageData, 0, 0);

            // Agora desenhamos no canvas principal
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(tempCanvas, 0, 0);
        });
    }

    async drawDetectionMasks(canvas, masks, width, height) {
        if (!canvas || !masks?.length) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Calcular área baseada em pixels brancos
        const masksWithArea = await Promise.all(masks.map(async mask => {
            const img = await loadImageFromCache(mask.url);
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = img.naturalWidth || img.width;
            tempCanvas.height = img.naturalHeight || img.height;
            tempCtx.drawImage(img, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            // Contar pixels brancos (RGB >= 200 para tolerância)
            let whitePixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
                    whitePixels++;
                }
            }

            console.log(`Máscara ${mask.id} - Pixels brancos: ${whitePixels}`);
            return { mask, img, area: whitePixels };
        }));

        // 2. Ordenar máscaras pela área (menores primeiro)
        masksWithArea.sort((a, b) => b.area - a.area);

        // 3. Desenhar em ordem (menores por último, ficando por cima)
        for (const { mask, img, area } of masksWithArea) {
            console.log('Desenhando máscara:', mask.id, area);
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.drawImage(img, 0, 0, width, height);

            const imageData = tempCtx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const [rNew, gNew, bNew] = mask.indexColor;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { // Se não for transparente
                    if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) {
                        data[i + 3] = 0; // Preto → transparente
                    } else {
                        data[i] = rNew;
                        data[i + 1] = gNew;
                        data[i + 2] = bNew;
                    }
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }

    drawVisibleMasks(canvas, masks, width, height) {
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        masks.forEach(mask => {
            let color
            let lineWidth

            if (mask.id === this.selectedMask?.id) {
                color = this.selectedMaskColor;
                lineWidth = 3; // Mais espesso para máscara selecionada
            } else if (mask.id === this.activeMask?.id) {
                color = this.hoverMaskColor;
                lineWidth = 2;
            } else {
                color = this.unselectedMaskColor;
                lineWidth = 1;
            }

            //this.drawVisibleMask(ctx, canvas, mask, color)
            this.drawMaskBoundingBox(ctx, canvas, mask, color, lineWidth)
        });
    }

    async drawVisibleMask(ctx, canvas, mask, maskColor) {
        const img = await loadImageFromCache(mask.url);

        // Criar um canvas temporário para manipular pixels
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Obter os pixels da imagem
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const [rNew, gNew, bNew, aNew] = maskColor
        // Percorrer os pixels e ajustar transparência
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];     // Red
            const g = data[i + 1]; // Green
            const b = data[i + 2]; // Blue

            if (r === 0 && g === 0 && b === 0) {
                // Se for preto, tornamos transparente
                data[i + 3] = 0; // Alpha = 0 (transparente)
            } else {
                // Aplica a cor da máscara ativa (exemplo: vermelho)
                data[i] = rNew;   // Red
                data[i + 1] = gNew; // Green
                data[i + 2] = bNew; // Blue
                data[i + 3] = aNew; // Alpha
            }
        }

        // Atualiza o canvas temporário com as novas cores
        tempCtx.putImageData(imageData, 0, 0);

        // Agora desenhamos no canvas principal
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(tempCanvas, 0, 0);
    }

    async drawMaskBoundingBox(ctx, canvas, mask, color, lineWidth = 2) {
        const img = await loadImageFromCache(mask.url);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Inicializa com valores extremos
        let left = tempCanvas.width
        let right = 0
        let top = tempCanvas.height
        let bottom = 0
        let found = false;

        // Varredura eficiente para encontrar os limites do branco (255)
        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const i = (y * tempCanvas.width + x) * 4;
                // Verifica se é branco puro (255) nos 3 canais
                if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                    found = true;
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
        }

        if (!found) return; // Não desenha se não encontrar pixels brancos

        // Adiciona margem
        const margin = 5;
        left = Math.max(0, left - margin);
        right = Math.min(tempCanvas.width, right + margin);
        top = Math.max(0, top - margin);
        bottom = Math.min(tempCanvas.height, bottom + margin);

        // Desenha o retângulo de seleção
        ctx.save();
        ctx.strokeStyle = `rgba(${color.join(',')})`;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 3]);

        // Retângulo principal
        ctx.beginPath();
        ctx.rect(left, top, right - left, bottom - top);
        ctx.stroke();

        // Cantos destacados (opcional)
        const cornerSize = 12;
        ctx.setLineDash([]); // Linha sólida para os cantos

        // Desenha os 4 cantos
        [[left, top], [right, top], [left, bottom], [right, bottom]].forEach(([x, y], idx) => {
            ctx.beginPath();
            // Cantos superiores
            if (idx < 2) {
                ctx.moveTo(x, y + (idx % 2 === 0 ? cornerSize : 0));
                ctx.lineTo(x, y);
                ctx.lineTo(x + (idx % 2 === 0 ? 0 : -cornerSize), y);
            }
            // Cantos inferiores
            else {
                ctx.moveTo(x, y - (idx % 2 === 0 ? cornerSize : 0));
                ctx.lineTo(x, y);
                ctx.lineTo(x + (idx % 2 === 0 ? 0 : -cornerSize), y);
            }
            ctx.stroke();
        });

        ctx.restore();
    }

    maskEvent(event, canvas, masks, rotation, flipped, onMouseHover, onMouseNotHover) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();



        // 1. Guarda o estado atual como imagem (não como ImageData)
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);

        // 2. Redimensiona o canvas principal temporariamente
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 3. Redesenha o conteúdo redimensionado
        ctx.drawImage(tempCanvas,
            0, 0, originalWidth, originalHeight,  // dimensões origem
            0, 0, canvas.width, canvas.height     // dimensões destino
        );



        // Calcula a razão entre dimensões lógicas e físicas, Não é mais necessário pois dá sempre 1
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Aplica o zoom e o scaling
        let x = (event.clientX - rect.left) * scaleX
        let y = (event.clientY - rect.top) * scaleY

        // Bola de debug no centro
        //ctx.clearRect(0, 0, canvas.width, canvas.height);
        //ctx.beginPath();
        //ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, 2 * Math.PI);
        //ctx.fillStyle = 'blue';
        //ctx.fill();

        // Aplica flip horizontal se houver
        if (flipped) {
            x = canvas.width - x;
        }

        // 4. Aplicar rotação
        if (rotation !== 0) {
            // Isto é classico, sempre a mesma formula para rotacionar x e y
            const angleRad = -rotation * (Math.PI / 180);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            const relX = x - centerX;
            const relY = y - centerY;

            x = centerX + (relX * Math.cos(angleRad) - relY * Math.sin(angleRad));
            y = centerY + (relX * Math.sin(angleRad) + relY * Math.cos(angleRad));
        }

        // Bola de debug em (x, y)
        //ctx.beginPath();
        //ctx.arc(x, y, 5, 0, 2 * Math.PI);
        //ctx.fillStyle = 'red';
        //ctx.fill();

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;

        let detected = false;
        //console.log(x, y, event.clientX, event.clientY, rect.left, rect.top, zoom);
        //console.log(`Pixel at (${x}, ${y}): RGB(${r}, ${g}, ${b})`, 'Extra info:', rect.left, rect.top);
        masks.forEach((mask, index) => {
            //const expectedColor = [(index * 50) % 255, (index * 80) % 255, (index * 120) % 255]; // MAX DE 51 cores ou seja mascaras
            const expectedColor = this.getIndexedColor(index) // Deve ser mais mas não calculei ainda
            if (r === expectedColor[0] && g === expectedColor[1] && b === expectedColor[2]) {
                detected = true
                onMouseHover(mask, index)
                //console.log(`Pixel Hover: R:${r} G:${g} B:${b}`, expectedColor, true, mask.id);
            } else {
                onMouseNotHover(mask, index)
                //console.log(`Pixel Hover: R:${r} G:${g} B:${b}`, expectedColor, false);
            }
        });

        return detected
    }

    async changeColor(img, outputCanvas, maskUrl, width, height, color, alpha, settings, detection = 255) {
        if (!outputCanvas || !maskUrl || !width || !height) {
            console.warn('Canvas, mask, or getCanvasSize not set');
            return;
        }

        // 1. Primeiro capture os dados originais ANTES de redimensionar
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const refCtx = frameCanvas.getContext('2d');
        refCtx.drawImage(img, 0, 0, width, height);

        let refImageData = refCtx.getImageData(0, 0, width, height);

        const backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.width = width;
        backgroundCanvas.height = height;
        const backgroundCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
        backgroundCtx.drawImage(outputCanvas, 0, 0, width, height);
        const backgroundImageData = backgroundCtx.getImageData(0, 0, width, height);

        // Configura o canvas de saída
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');

        // Carrega a máscara
        const maskImage = await loadImageFromCache(maskUrl);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(maskImage, 0, 0, width, height);
        const maskData = maskCtx.getImageData(0, 0, width, height);

        // Cria imagem de saída
        const outputData = outputCtx.createImageData(width, height);

        // Blur effect
        if (settings.blur !== undefined && settings.blur > 0) {
            refImageData = this.applyBlurEffect(refImageData, settings.blur);
        }

        for (let i = 0; i < maskData.data.length; i += 4) {
            const rMask = maskData.data[i];
            const gMask = maskData.data[i + 1];
            const bMask = maskData.data[i + 2];

            if (rMask === detection && gMask === detection && bMask === detection) {
                const r = refImageData.data[i];
                const g = refImageData.data[i + 1];
                const b = refImageData.data[i + 2];

                const factor = settings?.factor ?? 1

                // Aplica a cor base primeiro
                let [newR, newG, newB] = color ? this.applyBaseColor(r, g, b, color, factor) : [r, g, b];

                // Aplica correções de cor
                [newR, newG, newB] = this.applyColorSettings(newR, newG, newB, i, width, refImageData, settings);

                outputData.data[i] = newR;
                outputData.data[i + 1] = newG;
                outputData.data[i + 2] = newB;
                outputData.data[i + 3] = alpha;
            } else {
                // Transparente para áreas fora da máscara
                //outputData.data[i + 3] = 0;
                outputData.data[i] = backgroundImageData.data[i]
                outputData.data[i + 1] = backgroundImageData.data[i + 1]
                outputData.data[i + 2] = backgroundImageData.data[i + 2]
                outputData.data[i + 3] = backgroundImageData.data[i + 3]
            }
        }

        outputCtx.putImageData(outputData, 0, 0);
    }

    async changeColorOfMask(frameCanvas, mask, colorHex, settings, alpha = 255, detection = 255, outputCanvas = null, getCanvasSize = null) {
        outputCanvas = outputCanvas || this.canvasToApplyColorEffect
        getCanvasSize = getCanvasSize || this.getCanvasSize
        if (!outputCanvas || !mask || !getCanvasSize) {
            console.warn('Canvas, mask, or getCanvasSize not set', outputCanvas, mask, getCanvasSize);
            return;
        }

        const [width, height] = getCanvasSize();
        const color = colorHex ? hexToRgb(colorHex) : null;
        await this.changeColor(frameCanvas, outputCanvas, mask.url, width, height, color, alpha, settings, detection)
    }

    applyBaseColor(r, g, b, color, factor = 1) {
        const intensity = (r + g + b) / (3 * 255);

        // Resultado do comportamento original (fator = 1)
        const base = [
            color.r * intensity,
            color.g * intensity,
            color.b * intensity
        ];

        // Interpolação com base no factor
        // factor < 1 → mais detalhe (mais escuro)
        // factor = 1 → valor original (sem alteração)
        // factor > 1 → aproxima da cor sólida
        return [
            Math.round(base[0] * (2 - factor) + color.r * (factor - 1)),
            Math.round(base[1] * (2 - factor) + color.g * (factor - 1)),
            Math.round(base[2] * (2 - factor) + color.b * (factor - 1))
        ];
    }

    applyColorSettings(r, g, b, i, width, imageData, settings = {}) {
        // 1. Aplicar EXPOSURE (primeiro, antes de outros ajustes)
        if (settings.exposure !== undefined) {
            const exposure = Math.pow(2, settings.exposure);
            r = Math.min(255, r * exposure);
            g = Math.min(255, g * exposure);
            b = Math.min(255, b * exposure);
        }

        // Converter para HSL
        let [h, s, l] = rgbToHsl(r, g, b);

        // 2. Aplicar BRIGHTNESS (em HSL space)
        if (settings.brightness !== undefined) {
            // Ajuste não-linear para melhor resposta visual
            // brightness = 0 → neutro (nada muda)
            // brightness > 0 → mais claro (até +1)
            // brightness < 0 → mais escuro (até -1)
            if (settings.brightness > 0) {
                l = l + (1 - l) * settings.brightness;
            } else {
                l = l * (1 + settings.brightness);
            }
            l = Math.max(0, Math.min(1, l));
            [r, g, b] = hslToRgb(h, s, l);
        }

        // 3. Aplicar CONTRASTE (em RGB space)
        if (settings.contrast !== undefined) {
            const contrast = (settings.contrast + 1); // [0-2]
            const intercept = 128 * (1 - contrast);
            r = Math.max(0, Math.min(255, r * contrast + intercept));
            g = Math.max(0, Math.min(255, g * contrast + intercept));
            b = Math.max(0, Math.min(255, b * contrast + intercept));
            // Converter para HSL novamente para ajustes de cor
            [h, s, l] = rgbToHsl(r, g, b);
        }

        // 4. Aplicar HUE (rotação no círculo cromático)
        if (settings.hue !== undefined) {
            h = (h + (settings.hue / 360)) % 1;
            if (h < 0) h += 1;
        }

        // 5. Aplicar SATURATION
        if (settings.saturation !== undefined) {
            // Curva não-linear para melhor controle
            s = Math.max(0, Math.min(1, s * Math.pow(2, settings.saturation - 1)));
        }

        [r, g, b] = hslToRgb(h, s, l);

        // 6. Aplicar Sharpen simplificado
        if (settings.sharpen !== undefined && settings.sharpen > 0) {
            const sharpenAmount = settings.sharpen * 0.3; // Aumentei o fator base

            // Calcula a luminância do pixel (forma perceptualmente correta)
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // Fórmula não-linear para maior impacto visual
            const sharpFactor = 1 + (sharpenAmount * (1 + Math.sin(sharpenAmount * Math.PI)));

            // Aplica o sharpen de forma mais agressiva nos tons médios
            r = r + (r - luminance) * sharpFactor * (0.5 + (Math.abs(128 - luminance) / 256));
            g = g + (g - luminance) * sharpFactor * (0.5 + (Math.abs(128 - luminance) / 256));
            b = b + (b - luminance) * sharpFactor * (0.5 + (Math.abs(128 - luminance) / 256));

            // Garante que os valores permaneçam dentro do range RGB
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
        }

        // 7. Aplicar Noise
        if (settings.noise !== undefined && settings.noise > 0) {
            // Gerador de ruído pseudo-aleatório (repetível por pixel)
            const random = (x, y) => {
                const seed = (x * 12345 + y) ^ settings.noiseSeed; // noiseSeed pode ser um número fixo ou aleatório
                return Math.abs(Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453) % 1;
            };

            // Calcula coordenadas do pixel
            const x = i % (width * 4) / 4;
            const y = Math.floor(i / (width * 4));

            // Intensidade baseada nas configurações (não-linear para melhor controle)
            const intensity = Math.pow(settings.noise, 1.5) * 0.5;

            // Ruído perceptual (leva em conta a sensibilidade humana)
            const noiseValue = (random(x, y) - 0.5) * 2 * intensity * 255;
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const noiseFactor = 1 + (noiseValue / (luminance + 50)); // Protege contra divisão por zero

            // Aplica o ruído de forma não-uniforme (mais visível em tons médios)
            r = r * noiseFactor;
            g = g * noiseFactor;
            b = b * noiseFactor;

            // Garante os limites do RGB
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
        }

        // 9. Vignette
        if (settings.vignette !== undefined && settings.vignette > 0) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            const centerX = width / 2;
            const centerY = imageData.height / 2;

            const dx = (x - centerX) / centerX;
            const dy = (y - centerY) / centerY;
            const distance = Math.sqrt(dx * dx + dy * dy); // 0 (centro) → ~1.41 (canto)

            const vignetteStrength = Math.min(1, distance * settings.vignette);
            const vignetteFactor = 1 - vignetteStrength;

            r *= vignetteFactor;
            g *= vignetteFactor;
            b *= vignetteFactor;
        }

        return [r, g, b];
    }

    applyBlurEffect(imageData, radius) {
        if (radius <= 0) return imageData;

        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        const kernel = getGaussianKernel(Math.floor(radius));
        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);

        // Aplica blur horizontal
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;

                for (let k = 0; k < kernelSize; k++) {
                    const px = Math.max(0, Math.min(width - 1, x + k - halfKernel));
                    const idx = (y * width + px) * 4;

                    r += imageData.data[idx] * kernel[k];
                    g += imageData.data[idx + 1] * kernel[k];
                    b += imageData.data[idx + 2] * kernel[k];
                }

                const idx = (y * width + x) * 4;
                output.data[idx] = r;
                output.data[idx + 1] = g;
                output.data[idx + 2] = b;
                output.data[idx + 3] = imageData.data[idx + 3];
            }
        }

        // Aplica blur vertical (usando o resultado do horizontal)
        const tempData = new ImageData(width, height);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let r = 0, g = 0, b = 0;

                for (let k = 0; k < kernelSize; k++) {
                    const py = Math.max(0, Math.min(height - 1, y + k - halfKernel));
                    const idx = (py * width + x) * 4;

                    r += output.data[idx] * kernel[k];
                    g += output.data[idx + 1] * kernel[k];
                    b += output.data[idx + 2] * kernel[k];
                }

                const idx = (y * width + x) * 4;
                tempData.data[idx] = r;
                tempData.data[idx + 1] = g;
                tempData.data[idx + 2] = b;
                tempData.data[idx + 3] = output.data[idx + 3];
            }
        }

        return tempData;
    }

    async getBackgroundMask(masks, width, height) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = width;
        canvas.height = height;

        // Começa com tudo preto
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        for (const mask of masks) {
            const img = await loadImageFromCache(mask.url);

            // Canvas temporário para processar cada máscara
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(img, 0, 0, width, height);
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Vamos pintar de branco onde a máscara estiver
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const isWhite = r == 255 && g == 255 && b == 255;

                if (isWhite) {
                    // Marca como branco total (área da máscara)
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = 255;
                } else {
                    // Fora da máscara: transparente (não sobrepõe o fundo)
                    data[i + 3] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);

            // Compositar a máscara branca por cima do canvas preto
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // Agora inverte as cores: branco (máscara) vira preto; preto (background) vira branco
        const finalImageData = ctx.getImageData(0, 0, width, height);
        const d = finalImageData.data;

        for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];       // R
            d[i + 1] = 255 - d[i + 1]; // G
            d[i + 2] = 255 - d[i + 2]; // B
            d[i + 3] = 255; // força opacidade
        }

        ctx.putImageData(finalImageData, 0, 0);

        return { id: 'background', objId: -1, url: canvas.toDataURL() };
    }

    applyChromaKeyOnCanvas(originalImage, outputCanvas, color, tolerance, width, height) {
        // Criar um canvas temporário para redimensionar a imagem original
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(originalImage, 0, 0, width, height);

        const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
        outputCanvas.height = height;
        outputCanvas.width = width;
        outputCtx.drawImage(tempCanvas, 0, 0, width, height);

        // Obter os dados da imagem do canvas de saída
        const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const data = imageData.data;

        // Extrair componentes RGB da cor alvo
        const targetR = color.r;
        const targetG = color.g;
        const targetB = color.b;

        // Calcular a tolerância ao quadrado (para comparação mais eficiente)
        const toleranceSq = tolerance * tolerance;

        // Processar cada pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calcular distância quadrática (evita usar Math.sqrt para melhor performance)
            const distanceSq =
                (r - targetR) * (r - targetR) +
                (g - targetG) * (g - targetG) +
                (b - targetB) * (b - targetB);

            // Se a distância for menor que a tolerância, torna o pixel transparente
            if (distanceSq <= toleranceSq) {
                data[i + 3] = 0; // Alpha = 0 (transparente)
            }
        }

        // Aplicar os dados modificados de volta ao canvas de saída
        outputCtx.putImageData(imageData, 0, 0);
    }

    async getCenterPositionOfBinaryMask(mask, width, height) {
        const img = await loadImageFromCache(mask.url);

        // Criar um canvas temporário para manipular pixels
        const tempCanvas = document.createElement('canvas', { willReadFrequently: true });
        const tempCtx = tempCanvas.getContext('2d');

        // Ajusta o tamanho do canvas
        tempCanvas.width = width;
        tempCanvas.height = height;

        tempCtx.drawImage(img, 0, 0, width, height);

        // Obter os dados dos pixels
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        let totalX = 0;
        let totalY = 0;
        let count = 0;

        // Percorrer todos os pixels
        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                // Calcular o índice do pixel no array de dados
                const index = (y * tempCanvas.width + x) * 4;

                // Verificar se o pixel é branco (considerando canal alpha se existir)
                // Em uma máscara binária, branco geralmente é (255, 255, 255)
                if (data[index] === 255 && data[index + 1] === 255 && data[index + 2] === 255) {
                    totalX += x;
                    totalY += y;
                    count++;
                }
            }
        }

        if (count === 0) {
            return null
        }

        // Calcular o centroide
        const centerX = Math.round(totalX / count);
        const centerY = Math.round(totalY / count);

        return [centerX, centerY];
        //return { x: centerX, y: centerY };
    }

    async findBestReplacementMask(mainMask, otherMasks, width, height) {
        if (!mainMask || !otherMasks || otherMasks.length === 0) return null;

        // Carrega a máscara principal
        const mainMaskImage = await loadImageFromCache(mainMask.url);
        const mainMaskCanvas = document.createElement('canvas');
        mainMaskCanvas.width = width;
        mainMaskCanvas.height = height;
        const mainMaskCtx = mainMaskCanvas.getContext('2d');
        mainMaskCtx.drawImage(mainMaskImage, 0, 0, width, height);
        const mainMaskData = mainMaskCtx.getImageData(0, 0, width, height);

        // Ordena outras máscaras pela proximidade ao frameIdx principal
        const sortedMasks = [...otherMasks].sort((a, b) => {
            const diffA = Math.abs(a.frameIdx - mainMask.frameIdx);
            const diffB = Math.abs(b.frameIdx - mainMask.frameIdx);
            return diffA - diffB;
        });

        // Procura a primeira máscara que tenha áreas pretas onde a principal tem branco
        for (const otherMask of sortedMasks) {
            const otherMaskImage = await loadImageFromCache(otherMask.url);
            const otherMaskCanvas = document.createElement('canvas');
            otherMaskCanvas.width = width;
            otherMaskCanvas.height = height;
            const otherMaskCtx = otherMaskCanvas.getContext('2d');
            otherMaskCtx.drawImage(otherMaskImage, 0, 0, width, height);
            const otherMaskData = otherMaskCtx.getImageData(0, 0, width, height);

            let hasReplacementAreas = true;

            // Verifica rapidamente se há pelo menos um pixel que atende aos critérios
            for (let i = 0; i < mainMaskData.data.length; i += 4) {
                const rMain = mainMaskData.data[i];
                const gMain = mainMaskData.data[i + 1];
                const bMain = mainMaskData.data[i + 2];

                if (rMain === 255 && gMain === 255 && bMain === 255) {
                    const rOther = otherMaskData.data[i];
                    const gOther = otherMaskData.data[i + 1];
                    const bOther = otherMaskData.data[i + 2];

                    if (rOther === 255 && gOther === 255 && bOther === 255) {
                        hasReplacementAreas = false;
                        break;
                    }
                }
            }

            if (hasReplacementAreas) {
                return otherMask;
            }
        }

        return null;
    }

    async eraseWithBackgroundReplacement(mask, otherMasks, getCanvasOfFrame, outputCanvas = null, getCanvasSize = null) {
        outputCanvas = outputCanvas || this.canvasToApplyColorEffect;
        getCanvasSize = getCanvasSize || this.getCanvasSize;
        if (!outputCanvas || !mask || !getCanvasSize) {
            console.warn('Canvas, mask, or getCanvasSize not set', outputCanvas, mask, getCanvasSize);
            return;
        }

        const [width, height] = getCanvasSize();

        // Encontra a melhor máscara para substituição
        const bestReplacementMask = await this.findBestReplacementMask(mask, otherMasks, width, height);
        if (!bestReplacementMask) {
            console.warn('Background magic did not work, masks:', otherMasks, ' and main mask:', mask)
            return false
        }

        const backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.width = width;
        backgroundCanvas.height = height;
        const backgroundCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
        backgroundCtx.clearRect(0, 0, width, height);
        backgroundCtx.drawImage(outputCanvas, 0, 0, width, height);
        const backgroundImageData = backgroundCtx.getImageData(0, 0, width, height);

        // Configura os canvases
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');

        // Carrega a máscara principal
        const mainMaskImage = await loadImageFromCache(mask.url);
        const mainMaskCanvas = document.createElement('canvas');
        mainMaskCanvas.width = width;
        mainMaskCanvas.height = height;
        const mainMaskCtx = mainMaskCanvas.getContext('2d');
        mainMaskCtx.drawImage(mainMaskImage, 0, 0, width, height);

        // Aplica dilatação na máscara principal
        this.dilateMask(mainMaskCanvas, 5); // 2 pixels de dilatação
        const mainMaskData = mainMaskCtx.getImageData(0, 0, width, height);

        // Carrega a máscara de substituição
        const replacementMaskImage = await loadImageFromCache(bestReplacementMask.url);
        const replacementMaskCanvas = document.createElement('canvas');
        replacementMaskCanvas.width = width;
        replacementMaskCanvas.height = height;
        const replacementMaskCtx = replacementMaskCanvas.getContext('2d');
        replacementMaskCtx.drawImage(replacementMaskImage, 0, 0, width, height);
        //const replacementMaskData = replacementMaskCtx.getImageData(0, 0, width, height);

        // Obtém o frame da máscara de substituição
        const replacementFrameCanvas = await getCanvasOfFrame(bestReplacementMask.frameIdx);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = replacementFrameCanvas.width;
        tempCanvas.height = replacementFrameCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(replacementFrameCanvas, 0, 0);
        replacementFrameCanvas.width = width;
        replacementFrameCanvas.height = height;
        const replacementFrameCtx = replacementFrameCanvas.getContext('2d');
        replacementFrameCtx.drawImage(tempCanvas, 0, 0, width, height);
        const replacementFrameData = replacementFrameCtx.getImageData(0, 0, width, height);

        // Prepara a imagem de saída
        const outputImageData = outputCtx.createImageData(width, height);

        // Processa os pixels
        for (let i = 0; i < mainMaskData.data.length; i += 4) {
            const rMain = mainMaskData.data[i];
            const gMain = mainMaskData.data[i + 1];
            const bMain = mainMaskData.data[i + 2];

            if (rMain === 255 && gMain === 255 && bMain === 255) {
                outputImageData.data[i] = replacementFrameData.data[i];
                outputImageData.data[i + 1] = replacementFrameData.data[i + 1];
                outputImageData.data[i + 2] = replacementFrameData.data[i + 2];
                outputImageData.data[i + 3] = replacementFrameData.data[i + 3];
            }

            else {
                outputImageData.data[i] = backgroundImageData.data[i]
                outputImageData.data[i + 1] = backgroundImageData.data[i + 1]
                outputImageData.data[i + 2] = backgroundImageData.data[i + 2]
                outputImageData.data[i + 3] = backgroundImageData.data[i + 3]
            }
        }

        // Aplica as alterações
        outputCtx.putImageData(outputImageData, 0, 0);
        console.warn('EXECUTADO O ERASE!')

        return true
    }


    // Função para dilatar a máscara
    dilateMask(canvas, radius) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Cria uma cópia dos dados originais
        const originalData = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Se o pixel atual não é branco, verifica os vizinhos
                if (originalData[idx] !== 255 || originalData[idx + 1] !== 255 || originalData[idx + 2] !== 255) {
                    let hasWhiteNeighbor = false;

                    // Verifica os pixels vizinhos dentro do raio
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;

                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIdx = (ny * width + nx) * 4;
                                if (originalData[nIdx] === 255 &&
                                    originalData[nIdx + 1] === 255 &&
                                    originalData[nIdx + 2] === 255) {
                                    hasWhiteNeighbor = true;
                                    break;
                                }
                            }
                        }
                        if (hasWhiteNeighbor) break;
                    }

                    // Se encontrou um vizinho branco, torna este pixel branco
                    if (hasWhiteNeighbor) {
                        data[idx] = 255;
                        data[idx + 1] = 255;
                        data[idx + 2] = 255;
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async overlapVideo(mask, videoRect, overlayVideoRect, canvas, getCanvasSize) {
        if (!canvas || !mask || !getCanvasSize) {
            console.warn('Canvas, mask, or getCanvasSize not set', canvas, mask, getCanvasSize);
            return;
        }

        const [width, height] = getCanvasSize()

        // 1. Carrega a máscara
        const maskImage = await loadImageFromCache(mask.url);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = overlayVideoRect.width;
        maskCanvas.height = overlayVideoRect.height;
        const maskCtx = maskCanvas.getContext('2d');

        // Desenha a máscara ajustada ao offset
        this.drawImageWithRotation(
            maskCtx,
            maskImage,
            (videoRect.x - overlayVideoRect.x),
            (videoRect.y - overlayVideoRect.y),
            videoRect.width,
            videoRect.height,
            overlayVideoRect.width / 2,
            overlayVideoRect.height / 2,
            videoRect.rotation - overlayVideoRect.rotation // INVERSE overlayVideoRect.rotation?
        )

        const maskData = maskCtx.getImageData(
            0,
            0,
            overlayVideoRect.width,
            overlayVideoRect.height
        );

        // 2. Cria um canvas temporário para o overlay
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = overlayVideoRect.width;
        tempCanvas.height = overlayVideoRect.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 3. Desenha o overlay em (0, 0, width, height) (cobrindo todo o canvas)
        this.drawImageWithRotation(
            tempCtx,
            canvas,
            0,
            0,
            overlayVideoRect.width,
            overlayVideoRect.height,
            overlayVideoRect.width / 2,
            overlayVideoRect.height / 2,
            0,
        )

        const overlayData = tempCtx.getImageData(0, 0, overlayVideoRect.width, overlayVideoRect.height);

        for (let y = 0; y < overlayVideoRect.height; y++) {
            for (let x = 0; x < overlayVideoRect.width; x++) {
                const idx = Math.round((y * overlayVideoRect.width + x) * 4);

                if (maskData.data[idx] === undefined) {
                    //console.log('IdxInvalidForMask')
                    continue
                }

                if (overlayData.data[idx] === undefined) {
                    console.log('IdxInvalidForOverlay')
                    continue
                }

                if (maskData.data[idx] === 255) {
                    overlayData.data[idx + 3] = 0;
                }
            }
        }

        console.log('OverlayRectSize:', overlayVideoRect.width, overlayVideoRect.height)
        console.log('OverlayDataSize:', overlayData.width, overlayData.height)
        console.log('MaskRectSize:', videoRect.width, videoRect.height)
        console.log('MaskDataSize:', maskData.width, maskData.height)


        // THIS IS DEBUGGING
        const alphaMask = 0.5; // transparência da máscara (0.0 a 1.0)
        if (alphaMask > 0) {
            for (let y = 0; y < overlayVideoRect.height; y++) {
                for (let x = 0; x < overlayVideoRect.width; x++) {
                    const idx = Math.round((y * overlayVideoRect.width + x) * 4);

                    const r1 = overlayData.data[idx];
                    const g1 = overlayData.data[idx + 1];
                    const b1 = overlayData.data[idx + 2];
                    const a1 = overlayData.data[idx + 3];

                    const r2 = maskData.data[idx];
                    const g2 = maskData.data[idx + 1];
                    const b2 = maskData.data[idx + 2];
                    const a2 = maskData.data[idx + 3] * alphaMask;

                    const alphaTotal = a2 + a1 * (1 - alphaMask);

                    overlayData.data[idx] = (r2 * a2 + r1 * a1 * (1 - alphaMask)) / alphaTotal;
                    overlayData.data[idx + 1] = (g2 * a2 + g1 * a1 * (1 - alphaMask)) / alphaTotal;
                    overlayData.data[idx + 2] = (b2 * a2 + b1 * a1 * (1 - alphaMask)) / alphaTotal;
                    overlayData.data[idx + 3] = alphaTotal;
                }
            }
        }

        // 5. Atualiza o canvas principal
        const ctx = canvas.getContext('2d');
        ctx.putImageData(overlayData, 0, 0);

        // Agora desenha uma bola no centro
        const centerX = overlayVideoRect.width / 2;
        const centerY = overlayVideoRect.height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI); // raio 5
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    drawImageWithRotation(ctx, img, x, y, width, height, rotOriginX, rotOriginY, rotation = 0) {
        if (!rotation) {
            ctx.drawImage(img, x, y, width, height);
            return;
        }

        ctx.save();

        ctx.translate(rotOriginX, rotOriginY);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-rotOriginX, -rotOriginY);

        ctx.drawImage(img, x, y, width, height);
        ctx.restore();
    }
}   