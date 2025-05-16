import { useVideoEditor } from '@/stores/videoEditor';

export default class EffectHandler {
    static CUT_OBJ_EFFECT_ID = 0;
    static CUT_BKG_EFFECT_ID = 1;
    static SPLIT_OBJ_EFFECT_ID = 2;
    static SPLIT_BKG_EFFECT_ID = 3;
    static COLOR_OBJ_EFFECT_ID = 4;
    static COLOR_BKG_EFFECT_ID = 5;
    static BLEND_OBJ_EFFECT_ID = 6;
    static BLEND_BKG_EFFECT_ID = 7;
    static ERASE_OBJ_EFFECT_ID = 8;
    static ERASE_BKG_EFFECT_ID = 9;

    constructor(register, maskHandler) {
        this.register = register;
        this.maskHandler = maskHandler;
        this.videoEditor = useVideoEditor()
        this.otherBoxes = new Set();
        this.bkgEffectVideos = new Set();
        this.objEffectVideos = new Set();
    }

    async changeColorOfMask(video, mask, color, settings, alpha = 255, detection = 255, outputCanvas = null, getCanvasSize = null, register = true) {
        const frame = video.captureCurrentCanvasFrame();

        if (register) {
            // register for backend download and history and ctrl-z
            this.register.registerMaskEffect(video.id, mask.objId, 'colorEffect', {
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
            this.register.registerMaskEffect(video.id, mask.objId, 'backgroundRemoveEffect', null)
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

    async cutObject(video, mask, detection = 255, outputCanvas = null, getCanvasSize = null, register = true) {
        // register for backend download and history and ctrl-z
        if (register) {
            this.register.registerMaskEffect(video.id, mask.objId, 'cutObjectEffect', detection);
        }

        const frame = video.captureCurrentCanvasFrame();
        await this.maskHandler.changeColorOfMask(frame, mask, null, {}, 0, detection, outputCanvas, getCanvasSize);
    }

    async overlapVideo(overlayVideo, refVideoId, mask, videoRect, overlayVideoRect, outputCanvas, getCanvasSize, register = true) {
        // register for backend download and history and ctrl-z
        if (register) {
            this.register.registerMaskEffect(overlayVideo.id, -2, 'overlapVideo', {
                refVideoId: refVideoId,
                maskObjId: mask.objId,
            });
        }

        console.log('OVERLAP VIDEO CALLED!')

        await this.maskHandler.overlapVideo(mask, videoRect, overlayVideoRect, outputCanvas, getCanvasSize)
    }

    async resetEffects(boxOfVideo, video, mask, type = 'object') {
        await this.changeColorOfMask(video, mask, null, {})
        this.removeBoxCallbacks(
            boxOfVideo,
            type === 'background' ? [EffectHandler.CUT_BKG_EFFECT_ID, EffectHandler.SPLIT_BKG_EFFECT_ID, EffectHandler.COLOR_BKG_EFFECT_ID, EffectHandler.BLEND_BKG_EFFECT_ID, EffectHandler.ERASE_BKG_EFFECT_ID]
                                  : [EffectHandler.CUT_OBJ_EFFECT_ID, EffectHandler.SPLIT_OBJ_EFFECT_ID, EffectHandler.COLOR_OBJ_EFFECT_ID, EffectHandler.BLEND_OBJ_EFFECT_ID, EffectHandler.ERASE_OBJ_EFFECT_ID],
            mask.objId,
        );

        const effectVideos = (type === 'background' ? this.bkgEffectVideos : this.objEffectVideos)
        effectVideos.forEach(v => {
            this.videoEditor.removeElement(v)
        });

        effectVideos.clear()

        this.register.registerResetForObject(video.id, mask.objId)

        await boxOfVideo.drawVideo()
        await video.waitUntilVideoIsReady()
    }

    removeBoxCallbacks(box, ids, objId) {
        for (const id of ids) {
            box.removeOnDrawVideoCallback(EffectHandler.id(id, objId));
        }

        for (const b of this.otherBoxes) {
            for (const id of ids) {
                b.removeOnDrawVideoCallback(EffectHandler.id(id, objId));
            }
        }
    }

    static id(effectId, objId) {
        return effectId + '_' + objId
    }
}