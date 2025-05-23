export class VideoEditorRegister {
    constructor() {
        this.maskEffects = {};
        this.preventResets = new Set();
    }

    registerMaskEffect(video_id, obj_id, effect_id, effectData, can_be_reset = true) {
        if (!this.maskEffects[video_id]) {
            this.maskEffects[video_id] = {};
        }

        if (!this.maskEffects[video_id][obj_id]) {
            this.maskEffects[video_id][obj_id] = {};
        }

        if (!this.maskEffects[video_id][obj_id][effect_id]) {
            this.maskEffects[video_id][obj_id][effect_id] = [];
        }

        this.maskEffects[video_id][obj_id][effect_id].push(effectData);
        console.warn('Can_be_reset', can_be_reset);
        if (!can_be_reset) {
            console.warn('Effect cannot be reset', video_id, obj_id, effect_id);
            this.preventResets.add(`${video_id}_${obj_id}_${effect_id}`);
        }
    }

    getLastEffectOfVideo(video_id) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return undefined;
    
        const lastEffects = {};
        
        // Percorre todos os object_ids do vídeo
        for (const obj_id in videoEffects) {
            lastEffects[obj_id] = {};
            
            // Percorre todos os effectIds do objeto
            for (const effect_id in videoEffects[obj_id]) {
                const effectHistory = videoEffects[obj_id][effect_id];
                
                // Pega apenas o último elemento do array (histórico)
                if (effectHistory.length > 0) {
                    const value = effectHistory[effectHistory.length - 1]
                    if (value !== 'reset') {
                        lastEffects[obj_id][effect_id] = effectHistory[effectHistory.length - 1];
                    }
                }
            }
        }
    
        return lastEffects;
    }

    registerReset(video_id) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return;
    
        for (const obj_id in videoEffects) {
            for (const effect_id in videoEffects[obj_id]) {
                this.maskEffects[video_id][obj_id][effect_id].push('reset');
            }
        }
    }

    registerResetForObject(video_id, obj_id) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return;

        const objectEffects = videoEffects[obj_id];
        if (!objectEffects) return;

        for (const effect_id in objectEffects) {
            if (this.preventResets.has(`${video_id}_${obj_id}_${effect_id}`)) {
                console.warn('Effect cannot be reset', video_id, obj_id, effect_id);
                continue;
            }

            console.warn('Effect can be reset', video_id, obj_id, effect_id);
            this.maskEffects[video_id][obj_id][effect_id].push('reset');
        }
    }
}