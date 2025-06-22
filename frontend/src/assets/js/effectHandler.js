import { useVideoEditor } from '@/stores/videoEditor';
import { useTimelineStore } from '@/stores/timeline'

export default class EffectHandler {
    static OVERLAY_EFFECT_ID = 0;
    static CUT_OBJ_EFFECT_ID = 1;
    static CUT_BKG_EFFECT_ID = 2;
    static SPLIT_OBJ_EFFECT_ID = 3;
    static SPLIT_BKG_EFFECT_ID = 4;
    static COLOR_OBJ_EFFECT_ID = 5;
    static COLOR_BKG_EFFECT_ID = 6;
    static COLOR_ALL_EFFECT_ID = 7;
    static BLEND_OBJ_EFFECT_ID = 8;
    static BLEND_BKG_EFFECT_ID = 9;
    static ERASE_OBJ_EFFECT_ID = 10;
    static ERASE_BKG_EFFECT_ID = 11;
    static OVERLAY_TYPE_EFFECT_ID = 12;
    static ZOOM_TYPE_EFFECT_ID = 13;

    static CUT_EFFECT_NAME = 'cutObjectEffect'
    static COLOR_EFFECT_NAME = 'colorEffect'
    static BLEND_EFFECT_NAME = 'blendEffect'
    static ERASE_EFFECT_NAME = 'backgroundRemoveEffect'
    static OVERLAP_EFFECT_NAME = 'overlapVideo'
    static ZOOM_EFFECT_NAME = 'zoomEffect'

    static OBJ_CALLBACKS_ID = [
        this.CUT_OBJ_EFFECT_ID,
        this.SPLIT_OBJ_EFFECT_ID,
        this.COLOR_OBJ_EFFECT_ID,
        this.BLEND_OBJ_EFFECT_ID,
        this.ERASE_OBJ_EFFECT_ID,
        this.COLOR_ALL_EFFECT_ID
    ]

    static BKG_CALLBACKS_ID = [
        this.CUT_BKG_EFFECT_ID,
        this.SPLIT_BKG_EFFECT_ID,
        this.COLOR_BKG_EFFECT_ID,
        this.BLEND_BKG_EFFECT_ID,
        this.ERASE_BKG_EFFECT_ID,
        this.COLOR_ALL_EFFECT_ID
    ]

    static NON_TRANSPARENCY_OBJ_EFFECTS = [
        this.COLOR_OBJ_EFFECT_ID,
        this.BLEND_OBJ_EFFECT_ID,
        this.ERASE_OBJ_EFFECT_ID,
        this.COLOR_ALL_EFFECT_ID
    ]

    static NON_TRANSPARENCY_BKG_EFFECTS = [
        this.COLOR_BKG_EFFECT_ID,
        this.BLEND_BKG_EFFECT_ID,
        this.ERASE_BKG_EFFECT_ID,
        this.COLOR_ALL_EFFECT_ID
    ]

    static ALL_EFFECTS = [
        this.CUT_EFFECT_NAME,
        this.COLOR_EFFECT_NAME,
        this.BLEND_EFFECT_NAME,
        this.ERASE_EFFECT_NAME,
        this.OVERLAP_EFFECT_NAME
    ]

    static REQUIRE_COMPILE_EFFECTS = [
        this.COLOR_EFFECT_NAME,
        this.BLEND_EFFECT_NAME,
        this.ERASE_EFFECT_NAME
    ]

    static TRANSPARENT_EFFECTS = [
        this.CUT_EFFECT_NAME,
    ]

    constructor(register, maskHandler) {
        this.register = register;
        this.maskHandler = maskHandler;
        this.videoEditor = useVideoEditor()
        this.timelineStore = useTimelineStore();
        this.originalVideo = null
        this.relatedVideos = {};
        this.bkgEffectVideos = new Map(); // Map<videoId, Set<effectVideo>>
        this.objEffectVideos = new Map(); // Map<videoId, Set<effectVideo>>
    }

    async changeColorOfMask(video, mask, color, settings, alpha = 255, detection = 255, outputCanvas = null, getCanvasSize = null, register = true) {
        const frame = video.captureCurrentCanvasFrame();

        if (register) {
            // register to allow sending this effects to the backend for compilation
            this.register.registerMaskEffect(video.id, mask.objId, EffectHandler.COLOR_EFFECT_NAME, {
                color: color,
                alpha: alpha,
                settings: settings
            });
        }

        // frontend
        await this.maskHandler.changeColorOfMask(frame, mask, color, settings, alpha, detection, outputCanvas, getCanvasSize);
    }

    async eraseWithBackgroundReplacement(video, mask, outputCanvas = null, getCanvasSize = null, register = true) {
        if (register) {
            this.register.registerMaskEffect(video.id, mask.objId, EffectHandler.ERASE_EFFECT_NAME, null)
        }

        const extractedMasks = []
        Object.keys(video.trackMasks).forEach((frameIdx) => {
            Object.keys(video.trackMasks[frameIdx]).forEach((objId) => {
                if (video.trackMasks[frameIdx][objId].objId === mask.objId) {
                    const mask = video.trackMasks[frameIdx][objId]
                    extractedMasks.push({
                        url: mask.url,
                        frameIdx: frameIdx,
                    })
                }
            })
        });

        const getCanvasOfFrame = async (frameIdx) => {
            return await video.getCanvasOfFrame(frameIdx)
        }

        return await this.maskHandler.eraseWithBackgroundReplacement(mask, extractedMasks, getCanvasOfFrame, outputCanvas, getCanvasSize);
    }

    async cutObject(video, mask, detection = 255, outputCanvas = null, getCanvasSize = null, register = true, can_be_reset = true) {
        // register for backend download and history and ctrl-z
        if (register) {
            this.register.registerMaskEffect(video.id, mask.objId, EffectHandler.CUT_EFFECT_NAME, detection, can_be_reset);
        }

        const frame = video.captureCurrentCanvasFrame();
        await this.maskHandler.changeColorOfMask(frame, mask, null, {}, 0, detection, outputCanvas, getCanvasSize);
    }

    async overlapVideo(overlayVideo, refVideoId, mask, videoRect, overlayVideoRect, type, outputCanvas, getCanvasSize, register = true) {
        // register for backend download and history and ctrl-z
        if (register) {
            this.register.registerMaskEffect(overlayVideo.id, -2, EffectHandler.OVERLAP_EFFECT_NAME, {
                refVideoId: refVideoId,
                maskObjId: mask.objId,
                type,
            });
        }

        if (type === 'Front') {
            return
        }

        await this.maskHandler.overlapVideo(mask, videoRect, overlayVideoRect, outputCanvas, getCanvasSize)
    }

    async zoomObjectByMask(video, mask, settings, backgroundColor = [0, 0, 0, 0], detection = 255, register = true) {
        const blocks = this.register.getAllBlocksBetweenResets(video.id, mask.objId, EffectHandler.ZOOM_EFFECT_NAME);
        const oldZoomData = blocks?.[blocks.length - 1] || [];

        if (register) {
            this.register.registerMaskEffect(video.id, mask.objId, EffectHandler.ZOOM_EFFECT_NAME, settings);
        }

        const zoomDataList = [settings, ...oldZoomData];
        const boxOfVideo = this.videoEditor.getBoxOfElement(video)
        const callbackId = video.id + mask.objId + EffectHandler.ZOOM_TYPE_EFFECT_ID

        let lastZoomLevel = 1
        boxOfVideo.addOnDrawVideoCallback(callbackId, async (img) => {
            const currentTime = this.timelineStore.currentTime;
            let zoomLevel = lastZoomLevel; // mantém o último nível de zoom

            for (const zoomData of zoomDataList) {
                const { start = 0, end = 1, destZoom = 1 } = zoomData;

                if (currentTime >= start && currentTime <= end) {
                    // interpolação linear entre lastZoomLevel e destZoom
                    const t = (currentTime - start) / (end - start);
                    zoomLevel = lastZoomLevel + (destZoom - lastZoomLevel) * t;
                    break;
                }

                // Atualiza lastZoomLevel se passou o final deste bloco
                if (currentTime > end) {
                    lastZoomLevel = destZoom;
                }
            }

            const currentMask = video.trackMasks?.[video.frameIdx]?.[mask.objId]
            if (!currentMask) return img

            return await this.maskHandler.zoomObjectByMask(img, currentMask, zoomLevel, ...boxOfVideo.getBoxVideoSize(), backgroundColor, detection);
        });

        this.timelineStore.onUpdate(callbackId, (time, origin) => {
            if (time === 0 && origin === 'reset') {
                lastZoomLevel = 1
            }
        })

        await boxOfVideo.drawVideo()
        await video.waitUntilVideoIsReady()
    }

    async resetZoomObject(video, mask) {
        const boxOfVideo = this.videoEditor.getBoxOfElement(video)
        const callbackId = video.id + mask.objId + EffectHandler.ZOOM_TYPE_EFFECT_ID

        boxOfVideo.removeOnDrawVideoCallback(callbackId)
        this.timelineStore.removeOnUpdate(callbackId)
        
        await boxOfVideo.drawVideo()
        await video.waitUntilVideoIsReady()
    }

    async resetEffects(boxOfVideo, video, mask, type = 'object', exclude_transparency = false) {
        await this.changeColorOfMask(video, mask, null, {})

        const bkg_effects = exclude_transparency ? EffectHandler.NON_TRANSPARENCY_BKG_EFFECTS : EffectHandler.BKG_CALLBACKS_ID
        const obj_effects = exclude_transparency ? EffectHandler.NON_TRANSPARENCY_OBJ_EFFECTS : EffectHandler.OBJ_CALLBACKS_ID

        this.removeBoxCallbacks(
            boxOfVideo,
            type === 'background' ? bkg_effects : obj_effects,
            mask.objId,
        );

        const effectMap = type === 'background' ? this.bkgEffectVideos : this.objEffectVideos;
        const effectSet = effectMap.get(video.id);

        if (effectSet) {
            effectSet.forEach(v => {
                this.videoEditor.removeElement(v);
            });
            effectSet.clear();
        }

        this.register.registerResetForObject(video.id, mask.objId, exclude_transparency ? [EffectHandler.CUT_EFFECT_NAME] : [])

        await boxOfVideo.drawVideo()
        await video.waitUntilVideoIsReady()
    }

    getSettedEffects(video_id, mask_id) {
        const result = []

        for (const effectName of EffectHandler.ALL_EFFECTS) {
            const state = this.register.getLastStateOfEffect(video_id, mask_id, effectName)
            if (state !== undefined) {
                result.push(effectName)
            }
        }

        return result
    }

    removeBoxCallbacks(box, ids, objId) {
        for (const id of ids) {
            box.removeOnDrawVideoCallback(EffectHandler.id(id, objId));
        }
    }

    static id(effectId, objId) {
        return effectId + '_' + objId
    }

    setVideoToApplyEffect(video, isOriginalVideo = false) {
        if (isOriginalVideo && this.originalVideo?.id !== video.id) {
            this.originalVideo = video
        }

        this.videoEditor.maskHandler.video = video
        const boxOfVideo = this.videoEditor.getBoxOfElement(video)
        this.videoEditor.maskHandler.canvasToApplyColorEffect = boxOfVideo.getCanvasToApplyVideo()
        this.videoEditor.maskHandler.getCanvasSize = boxOfVideo.getBoxVideoSize
    }

    addEffectVideo(videoId, type, effectVideo) {
        const map = type === 'background' ? this.bkgEffectVideos : this.objEffectVideos;

        if (!map.has(videoId)) {
            map.set(videoId, new Set());
        }

        map.get(videoId).add(effectVideo);
    }

    addRelatedVideo(video) {
        this.relatedVideos[this.originalVideo.id] ||= new Set()
        this.relatedVideos[this.originalVideo.id].add(video)

        const callbackId = `${video.id}_addRelatedVideo_callback_id`
        this.videoEditor.onEditorElementSelected(callbackId, (selectedElement) => {
            if (selectedElement?.id === video?.id) {
                this.setVideoToApplyEffect(video)
            }
        })

        this.videoEditor.onElementRemoved(callbackId, (elementRemoved) => {
            if (elementRemoved?.id === video?.id) {
                this.relatedVideos[this.originalVideo.id].delete(video)
                this.videoEditor.removeOnEditorElementSelected(callbackId)
                this.videoEditor.removeOnElementRemoved(callbackId)
            }
        })
    }

    getAllEffectVideos() {
        return [this.originalVideo, ...(this.relatedVideos[this.originalVideo.id] || [])].filter(Boolean)
    }

    getOriginalVideo(video) {
        for (const [originalId, relatedSet] of Object.entries(this.relatedVideos)) {
            if (relatedSet.has(video)) {
                const videos = this.videoEditor.getVideos();
                const originalVideo = videos.find(v => v.id === originalId);
                if (originalVideo) {
                    return originalVideo;
                }

                // Caso estranho de não encontrar o original no vídeoEditor, nem sei se é possivel sequer acontecer mas seria só ir ver
                break;
            }
        }

        // Se não está em nenhum relatedSet então ele já é o original
        return video;
    }

    deleteRelatedVideos(originalVideo) {
        const related = this.relatedVideos[originalVideo.id];
        if (related) {
            related.forEach(video => this.videoEditor.removeElement(video));
            related.clear();
        }
    }

    async handleVideoFollowMask(video, mask) {
        const objId = mask.objId;
        const videoOfMask = this.videoEditor.getVideos().find(v => v.id === mask.videoId);
        const trackMasks = videoOfMask.trackMasks;

        const boxOfMask = this.videoEditor.getBoxOfElement(videoOfMask);
        const boxOfVideo = this.videoEditor.getBoxOfElement(video);

        const callbackId = `${video.id}_handleVideoFollowMask_callback_id`

        let lastMaskPosition = null;

        const getMaskPosition = async (boxOfMask, objId) => {
            const rectMask = boxOfMask.getRect();
            const currentFrame = Math.floor(this.timelineStore.currentTime * boxOfMask.video.fps);
            const currentMask = trackMasks?.[currentFrame]?.[objId];
            if (!currentMask) {
                return null;
            }

            const position = await this.videoEditor.maskHandler.getCenterPositionOfBinaryMask(currentMask, rectMask.width, rectMask.height);
            return position
        }

        const functionFollow = async () => {
            if (!boxOfVideo?.box) return;

            const position = await getMaskPosition(boxOfMask, objId)
            if (!position) {
                video.hide()
                return;
            };

            if (!video.visible) video.show()

            const [x, y] = position;
            const rectVideo = boxOfVideo.box.getRect();

            // Se é a primeira execução, apenas armazena a posição
            if (!lastMaskPosition) {
                const cx = x - (rectVideo.width / 2)
                const cy = y - (rectVideo.height / 2)
                boxOfVideo.box.setPosition(cx, cy);
                lastMaskPosition = { x, y };
                return;
            }

            // Calcula quanto a máscara se moveu desde a última posição
            const dx = x - lastMaskPosition.x;
            const dy = y - lastMaskPosition.y;

            // Atualiza a posição do vídeo aplicando o mesmo deslocamento
            const newX = rectVideo.x + dx;
            const newY = rectVideo.y + dy;

            boxOfVideo.box.setPosition(newX, newY);
            lastMaskPosition = { x, y };
        }

        boxOfMask.addOnDrawVideoCallback(callbackId, async (img) => {
            await functionFollow()
            return img
        }, false)

        this.videoEditor.register.registerMaskEffect(video.id, -2, EffectHandler.OVERLAP_EFFECT_NAME, {
            refVideoId: videoOfMask.id,
            maskObjId: mask.objId,
        });

        /* 
         * This is important because we need to preserve the spatial 
         * offset between the effect and the reference object.
         * The offset is calculated relative to the current frame, 
         * so if the frame changes, the original offset may be lost. 
        */
        this.videoEditor.onCompileVideoMetadata(callbackId, async (metadata, compileVideo) => {
            if (compileVideo.id !== video.id) { return }

            // Get the center position of the reference mask in the current frame
            const position = await getMaskPosition(boxOfMask, objId)
            if (!position || !boxOfVideo?.box) { return }

            const [x, y] = position;
            const rect = boxOfVideo.box.getRect();

            // Compute the relative offset between the video effect and the reference object
            metadata.x = rect.x - x
            metadata.y = rect.y - y

            return metadata
        })

        this.videoEditor.onElementRemoved(callbackId, (e) => {
            if (e.id === video.id || e.id === videoOfMask.id) {
                boxOfMask?.removeOnDrawVideoCallback(callbackId)
                this.videoEditor.removeOnCompileVideoMetadataCallback(callbackId)
                this.videoEditor.removeOnElementRemoved(callbackId)
                this.videoEditor.register.removeEffect(video.id, -2, EffectHandler.OVERLAP_EFFECT_NAME)
                return
            }
        })

        await functionFollow()
    }
}