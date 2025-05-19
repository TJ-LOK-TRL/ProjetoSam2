import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useBackendStore } from "/src/stores/backend.js"
import ImageMedia from "/src/assets/js/videoEditor/media/ImageMedia.js"
import VideoMedia from "/src/assets/js/videoEditor/media/VideoMedia.js"
import AudioMedia from "/src/assets/js/videoEditor/media/AudioMedia.js"
import TextElement from "/src/assets/js/videoEditor/TextElement.js"
import MaskHandler from "/src/assets/js/maskHandler.js"
import EffectHandler from "/src/assets/js/effectHandler.js"
import EditorElementManager from "/src/assets/js/videoEditor/EditorElementManager.js"
import { base64ToBlob } from "/src/assets/js/utils.js"
import { VideoEditorRegister } from "../assets/js/videoEditorRegister"

export const useVideoEditor = defineStore('videoEditor', () => {
    const backend = useBackendStore()
    const elementManager = ref(new EditorElementManager())
    const register = ref(new VideoEditorRegister())
    const maskHandler = ref(new MaskHandler())
    const effectHandler = ref(new EffectHandler(register.value, maskHandler.value))

    const isLoadingInternal = ref(false); // Estado interno

    // Computed com getter e setter para rastrear mudanças
    const isLoading = computed({
        get() {
            return isLoadingInternal.value;
        },
        set(newValue) {
            //console.log(`isLoading está sendo alterado de ${isLoadingInternal.value} para ${newValue}`);
            //console.trace("Stack trace da modificação"); // Mostra onde a mudança ocorreu
            isLoadingInternal.value = newValue;
        }
    });

    const videoPlayerContainer = ref(null)
    const videoPlayerSpaceContainer = ref(null)
    const videoPlayerWidth = ref(null)
    const videoPlayerHeight = ref(null)
    const videoPlayerWidthResized = ref(null)
    const videoPlayerHeightResized = ref(null)

    const selectedElement = ref(null)
    const onEditorElementSelectedCallbacks = ref([])
    const onFirstVideoMetadataLoadedCallbacks = ref([])
    const onVideoMetadataLoadedCallbacks = ref([])

    const onElementRemovedCallbacks = ref([])

    const selectedTool = ref('')
    const selectedToolIcon = ref('')
    const selectedToolHistory = ref([])

    const mapperBoxVideo = ref({})
    const onAddMapBoxVideoCallbacks = ref([])
    const fps = ref(null)

    const onCompileVideoMetadataCallbacks = ref([])
    const zoomLevel = ref(1)

    const preventUnselectElementOnOutside = ref(false)

    function createVideo(file, fps, frames) {
        const video = new VideoMedia(file, fps, frames)
        elementManager.value.addElement(video)

        video.onMetadataLoaded(() => {
            if (elementManager.value.getByType('video').length == 1) {
                videoPlayerWidth.value = video.width
                videoPlayerHeight.value = video.height
                onFirstVideoMetadataLoadedCallbacks.value.forEach(callback => callback(video))
            }

            onVideoMetadataLoadedCallbacks.value.forEach(callback => callback(video))
        })

        return video
    }

    async function addVideo(file) {
        const metadata = await getVideoMetadata(file)
        return createVideo(file, metadata.fps, metadata.frames)
    }

    function addText(text, preset, font) {
        const textElement = new TextElement(text, preset, font)
        elementManager.value.addElement(textElement)

        return textElement
    }

    function removeElement(editorElement) {
        if (!editorElement) {
            console.warn('Invalid editorElement in removeElement:', editorElement)
            return
        }

        if (selectedElement?.value?.id == editorElement?.id) {
            selectedElement.value = null
        }

        elementManager.value.removeElement(editorElement)
        if (editorElement.type === 'video') {
            const video = editorElement
            delete mapperBoxVideo.value[video.id]
            video.masks.forEach(mask => {
                URL.revokeObjectURL(mask.url)
            })
            Object.values(video.trackMasks).forEach(frameObj => {
                Object.values(frameObj).forEach(trackMask => {
                    URL.revokeObjectURL(trackMask.url)
                })
            })
            console.log('Removed video id ' + video.id)

            // 📋 Debug extra: mostra todos os vídeos restantes
            const remainingVideos = getVideos()
            console.log('Remaining video IDs:', remainingVideos.map(v => v.id))

            video.delete()
        }

        onElementRemovedCallbacks.value.forEach(callback => callback(editorElement))
    }

    function cloneVideo(video) {
        const newVideo = createVideo(video.file, video.fps, video.frames)
        newVideo.trackMasks = JSON.parse(JSON.stringify(video.trackMasks))
        newVideo.track_id = video.track_id
        return newVideo
    }

    async function getVideoMetadata(file) {
        if (!file) return

        const basicData = await backend.getMediaBasicData(file)

        // Os frames vÊm em base64 naturalmente, então precisamos converter para passar no URL
        basicData.frames = basicData.frames.map(base64 => {
            const byteString = atob(base64.split(',')[1] || base64)
            const mimeString = "image/jpeg"

            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i)
            }

            const blob = new Blob([ab], { type: mimeString })
            return URL.createObjectURL(blob)
        })
        console.log("Video basic data:", basicData)

        return basicData
    }

    async function generateMasksForFrame(frameBlob) {
        const data = await backend.getMasksForFrame(frameBlob)

        const imageBlob = base64ToBlob(data.image)
        const imageURL = URL.createObjectURL(imageBlob)

        const masks = data.masks.map(mask => {
            const maskBlob = base64ToBlob(mask.mask)
            return {
                id: mask.id,
                url: URL.createObjectURL(maskBlob)
            }
        })

        return {
            imageURL,
            masks
        }
    }

    async function generateMasksForVideo(video, options = {}, usePoints = null) {
        const ann_frame_idx = Math.floor(video.currentTime * video.fps);
        const rawPoints = usePoints || video.points;

        // Agrupar pontos por objId
        const grouped = {};
        for (const point of rawPoints) {
            const objId = point.objId;  // fallback para 1 se não estiver definido
            if (!grouped[objId]) {
                grouped[objId] = [];
            }
            grouped[objId].push(point);
        }

        // Construir lista de videoObjects
        const videoObjectsInfo = Object.entries(grouped).map(([objId, groupPoints]) => {
            return {
                points: groupPoints.map(p => [p.realX, p.realY]),
                labels: groupPoints.map(p => (p.type === 'add' ? 1 : 0)),
                ann_frame_idx,
                ann_obj_id: parseInt(objId)
            };
        });

        const data = await backend.getMasksForVideo(video.file, videoObjectsInfo, options)
        video.track_id = data.track_id

        const trackMasksCopy = JSON.parse(JSON.stringify(video.trackMasks));
        Object.keys(data.result).forEach(frameIdx => {
            const frameData = data.result[frameIdx];
            const newFrameIdx = parseInt(frameIdx);

            if (!trackMasksCopy[newFrameIdx]) {
                trackMasksCopy[newFrameIdx] = {};
            }

            Object.keys(frameData).forEach(objId => {
                const maskData = frameData[objId];
                const maskBlob = base64ToBlob(maskData.data, 'image/png');
                const maskURL = URL.createObjectURL(maskBlob);

                trackMasksCopy[newFrameIdx][objId] = {
                    id: `${newFrameIdx}-${objId}`,
                    objId: objId,
                    frameIdx: newFrameIdx,
                    shape: maskData.shape,
                    url: maskURL,
                    videoId: video.id,
                };

                //console.log(video.trackMasks[newFrameIdx]);
                //console.log(`Máscara processada para frame ${newFrameIdx}, objeto ${objId}:`, maskURL);
            });
        });


        return trackMasksCopy
    }

    function getVideos() {
        return elementManager.value.getByType('video')
    }

    function getTexts() {
        return elementManager.value.getByType('text')
    }

    function setVideoPlayerContainer(e) {
        videoPlayerContainer.value = e
    }

    function setVideoPlayerSpaceContainer(e) {
        videoPlayerSpaceContainer.value = e
    }

    function setVideoPlayerSize(width, height) {
        //videoPlayerWidth.value = width
        //videoPlayerHeight.value = height
        videoPlayerWidthResized.value = width
        videoPlayerHeightResized.value = height
    }

    function selectEditorElement(editorElement) {
        selectedElement.value = editorElement
        onEditorElementSelectedCallbacks.value.forEach(callback => callback(editorElement));
    }

    function onEditorElementSelected(callback) {
        onEditorElementSelectedCallbacks.value.push(callback)
    }

    function removeEditorElementSelectedCallback(callback) {
        const index = onEditorElementSelectedCallbacks.value.indexOf(callback);
        if (index !== -1) {
            onEditorElementSelectedCallbacks.value.splice(index, 1);
        }
    }

    function onFirstVideoMetadataLoaded(callback) {
        onFirstVideoMetadataLoadedCallbacks.value.push(callback)
    }

    function onVideoMetadataLoaded(callback) {
        onVideoMetadataLoadedCallbacks.value.push(callback)
    }

    function onElementRemoved(callback) {
        onElementRemovedCallbacks.value.push(callback)
    }

    function reorderElements(currentId, targetId) {
        const allElements = elementManager.value.listElements();

        const currentElement = elementManager.value.getById(currentId);
        const targetElement = elementManager.value.getById(targetId);

        if (!currentElement || !targetElement) return;

        const elementType = currentElement.type;

        // tem que ser generico, mudar depois
        const elementsOfType = elementManager.value.getByType(elementType);
        const currentIndex = elementsOfType.findIndex(el => el.id === currentId);
        const targetIndex = elementsOfType.findIndex(el => el.id === targetId);

        if (currentIndex === -1 || targetIndex === -1) return;

        const [movedElement] = elementsOfType.splice(currentIndex, 1);
        elementsOfType.splice(targetIndex, 0, movedElement);

        elementManager.value.elementsByType.set(elementType, new Set(elementsOfType));
    }

    function changeTool(newTool, newToolIcon = null) {
        const newIcon = newToolIcon === null ? selectedToolIcon.value : newToolIcon

        // Só adiciona ao histórico se for diferente da última entrada
        const last = selectedToolHistory.value.at(-1)
        if (!last || last.selectedTool !== selectedTool.value || last.selectedToolIcon !== selectedToolIcon.value) {
            selectedToolHistory.value.push({
                selectedTool: selectedTool.value,
                selectedToolIcon: selectedToolIcon.value
            })
        }

        selectedTool.value = newTool
        console.log(selectedTool.value)
        selectedToolIcon.value = newIcon
    }

    function changeToPreviousTool() {
        if (selectedToolHistory.value.length === 0) return;

        const last = selectedToolHistory.value.pop();
        selectedTool.value = last.selectedTool;
        selectedToolIcon.value = last.selectedToolIcon;
    }

    function getBoxOfVideo(video) {
        if (!mapperBoxVideo.value[video.id]) {
            return null
        }

        return mapperBoxVideo.value[video.id]
    }

    function getRectBoxOfVideo(video, abs = false) {
        const box = getBoxOfVideo(video);
        if (!box) {
            console.warn('getRectBoxOfVideo: Nenhum box encontrado para o vídeo.', video);
            return null;
        }

        const rect = box.getRect(abs);
        if (!rect) {
            console.warn('getRectBoxOfVideo: A função getRect retornou null ou undefined.', box, abs);
            return null;
        }

        return rect;
    }

    function getFlipStateOfVideo(video) {
        const box = getBoxOfVideo(video)
        if (!box) {
            return null
        }

        const flip = box.getFlip()
        if (!flip) {
            return null
        }

        return flip
    }

    function getRotationOfVideo(video) {
        const box = getBoxOfVideo(video)
        if (!box) {
            return null
        }

        return box.getRotation()
    }

    async function getCompileVideoMetadata(metadata, video) {
        for (let i = 0; i < onCompileVideoMetadataCallbacks.value.length; i++) {
            let newMetadata = await onCompileVideoMetadataCallbacks.value[i](metadata, video)
            if (newMetadata !== null && newMetadata !== undefined) {
                metadata = newMetadata
            }
        }
        return metadata
    }

    function onCompileVideoMetadata(callback) {
        onCompileVideoMetadataCallbacks.value.push(callback)
    }

    async function compileVideos(videos, texts = [], compute_transparency = false) {
        try {
            if (!videos || videos.length === 0) {
                console.error("Nenhum vídeo encontrado para compilar.");
                return null;
            }

            isLoading.value = true;

            const output_width = videoPlayerWidthResized.value
            const output_height = videoPlayerHeightResized.value
            console.log('output_width:', output_width)
            console.log('output_height:', output_height)
            const metadata = {
                width: output_width,
                height: output_height,
                fps: fps.value,
                enable_transparency: compute_transparency,
                videos_data: {},
                text_data: {},
            };

            const videos_files = [];
            for (let index = 0; index < videos.length; index++) {
                const video = videos[index];
                const { x, y, width, height } = getRectBoxOfVideo(video);
                const flipped = getFlipStateOfVideo(video)

                metadata.videos_data[video.id] = await getCompileVideoMetadata({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    layer_idx: index,
                    st_offset: video.stOffset,
                    start_t: video.start,
                    end_t: video.end,
                    stageMasks: video.track_id,
                    effects: register.value.getLastEffectOfVideo(video.id),
                    chromaKeyDetectionData: video.chromaKeyDetectionData,
                    rotation: getRotationOfVideo(video),
                    speed: video.speed,
                    flipped: flipped,
                    draw: video.shouldBeDraw,
                }, video);

                console.log("Video data:", metadata.videos_data[video.id]);

                videos_files.push(video.file);
            }

            for (let index = 0; index < texts.length; index++) {
                const text = texts[index];
                const { x, y, width, height } = text.getRect();
                metadata.text_data[text.id] = {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    layer_idx: index + videos.length,
                    text: text.text,
                    style: text.style,
                };
            }

            const data = await backend.download(videos_files, metadata);
            return data

        } catch (error) {
            console.error('Erro durante o download:', error);
            return null; // Retorna null ou um valor padrão em caso de erro
            // Você pode adicionar tratamento de erro visual aqui
        } finally {
            isLoading.value = false;
        }
    }

    function download(data, filename = 'final_video.mp4') {
        // Cria o link de download
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    function exportProject() {
        return {
            videos: this.getVideos().map(video => {
                const box = getBoxOfVideo(video)
                return {
                    id: video.id,
                    file: video.file,
                    fps: video.fps,
                    start: video.start,
                    end: video.end,
                    position: box ? box.getRect() : null,
                    flipped: box?.getFlipStateOfVideo(video),
                    rotation: getRotationOfVideo(video),
                }
            }),
            timeline: this.timeline,
            zoomLevel: this.zoomLevel,
        }
    }
    async function importProject(projectData) {
        try {
            this.$reset()

            // limpar elementos existentes
            const videos = this.getVideos()
            videos.forEach(video => this.removeElement(video))

            const texts = this.getTexts()
            texts.forEach(text => this.removeElement(text))

            // carrega os videos do projeto
            for (const videoData of projectData.videos) {

                const video = await this.addVideo(videoData.file)

                // propriedades do video
                if(videoData.start !== undefined) video.start = videoData.start
                if(videoData.end !== undefined) video.end = videoData.end
                if(videoData.speed !== undefined) video.speed = videoData.speed

                // configurar posiçao e transformaçoes
                const box = this.mapperBoxVideo[video.id]

                if (box && videoData.position) {
                    box.setRect(videoData.position)
                    if (videoData.rotation) box.setRotation(videoData.rotation)
                    if (videoData.flipped) box.setFlip(videoData.flip)
                }

                // aplicar efeitos se existirem
                if (videoData.effects)
                    this.register.applyEffectsToVideo(video.id, videoData.effects)

                // restaurar zoom level
                if (projectData.zoomLevel) {
                    this.zoomLevel = projectData.zoomLevel
                }
            }
            return true
        } catch (error) {
            console.error('Erro ao importar projeto:', error);
            return false
        }

    }

    function onAddMapBoxVideo(callback) {
        onAddMapBoxVideoCallbacks.value.push(callback)
    }

    function removeOnAddMapBoxVideo(callback) {
        const index = onAddMapBoxVideoCallbacks.value.indexOf(callback);
        if (index !== -1) {
            onAddMapBoxVideoCallbacks.value.splice(index, 1);
        }
    }

    function registerBox(element, box) {
        mapperBoxVideo.value[element.id] = box
        onAddMapBoxVideoCallbacks.value.forEach(callback => {
            callback(element, box)
        })
    }



    return {
        elementManager, isLoading, videoPlayerWidth, videoPlayerHeight, videoPlayerContainer, fps,
        selectedElement, maskHandler, selectedTool, selectedToolIcon, mapperBoxVideo, register, effectHandler, zoomLevel,
        preventUnselectElementOnOutside, videoPlayerSpaceContainer,
        addVideo, addText, cloneVideo, getVideos, getTexts, generateMasksForFrame, selectEditorElement, setVideoPlayerContainer,
        onFirstVideoMetadataLoaded, onEditorElementSelected, onVideoMetadataLoaded, reorderElements, generateMasksForVideo,
        removeEditorElementSelectedCallback, changeTool, changeToPreviousTool, removeElement, getBoxOfVideo, download, getVideoMetadata,
        compileVideos, onElementRemoved, registerBox, onAddMapBoxVideo, removeOnAddMapBoxVideo, getRectBoxOfVideo,
        setVideoPlayerSize, onCompileVideoMetadata, getFlipStateOfVideo, exportProject, importProject, setVideoPlayerSpaceContainer,
    } 
})