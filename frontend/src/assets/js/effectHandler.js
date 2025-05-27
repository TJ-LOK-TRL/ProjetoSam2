import { useVideoEditor } from '@/stores/videoEditor';

export default class EffectHandler {
    static CUT_OBJ_EFFECT_ID = 0;
    static CUT_BKG_EFFECT_ID = 1;
    static SPLIT_OBJ_EFFECT_ID = 2;
    static SPLIT_BKG_EFFECT_ID = 3;
    static COLOR_OBJ_EFFECT_ID = 4;
    static COLOR_BKG_EFFECT_ID = 5;
    static COLOR_ALL_EFFECT_ID = 6;
    static BLEND_OBJ_EFFECT_ID = 7;
    static BLEND_BKG_EFFECT_ID = 8;
    static ERASE_OBJ_EFFECT_ID = 9;
    static ERASE_BKG_EFFECT_ID = 10;

    static CUT_EFFECT_NAME = 'cutObjectEffect'
    static COLOR_EFFECT_NAME = 'colorEffect'
    static BLEND_EFFECT_NAME = 'blendEffect'
    static ERASE_EFFECT_NAME = 'backgroundRemoveEffect'
    static OVERLAP_EFFECT_NAME = 'overlapVideo'

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
        this.otherBoxes = new Set();
        this.bkgEffectVideos = new Set();
        this.objEffectVideos = new Set();
    }

    async changeColorOfMask(video, mask, color, settings, alpha = 255, detection = 255, outputCanvas = null, getCanvasSize = null, register = true) {
        const frame = video.captureCurrentCanvasFrame();

        if (register) {
            // register for backend download and history and ctrl-z
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

    async overlapVideo(overlayVideo, refVideoId, mask, videoRect, overlayVideoRect, outputCanvas, getCanvasSize, register = true) {
        // register for backend download and history and ctrl-z
        if (register) {
            this.register.registerMaskEffect(overlayVideo.id, -2, EffectHandler.OVERLAP_EFFECT_NAME, {
                refVideoId: refVideoId,
                maskObjId: mask.objId,
            });
        }

        await this.maskHandler.overlapVideo(mask, videoRect, overlayVideoRect, outputCanvas, getCanvasSize)
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

        const effectVideos = (type === 'background' ? this.bkgEffectVideos : this.objEffectVideos)
        effectVideos.forEach(v => {
            this.videoEditor.removeElement(v)
        });

        effectVideos.clear()

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

        for (const b of this.otherBoxes) {
            for (const id of ids) {
                b.removeOnDrawVideoCallback(EffectHandler.id(id, objId));
            }
        }
    }

    static id(effectId, objId) {
        return effectId + '_' + objId
    }

    setVideoToApplyEffect(video) {
        this.videoEditor.maskHandler.video = video
        const boxOfVideo = this.videoEditor.getBoxOfElement(video)
        this.videoEditor.maskHandler.canvasToApplyColorEffect = boxOfVideo.getCanvasToApplyVideo()
        this.videoEditor.maskHandler.getCanvasSize = boxOfVideo.getBoxVideoSize
    }
}