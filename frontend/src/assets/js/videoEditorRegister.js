export class VideoEditorRegister {
    constructor() {
        this.maskEffects = {};
        this.preventResets = new Set();
        this.animations = {};
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

    getLastValidStateOfEffect(video_id, obj_id, effect_id) {
        const effectHistory = this.maskEffects?.[video_id]?.[obj_id]?.[effect_id];
        if (!effectHistory || effectHistory.length === 0) return undefined;

        // Percorre o histórico de trás para frente, ignorando resets
        for (let i = effectHistory.length - 1; i >= 0; i--) {
            const value = effectHistory[i];
            if (value !== 'reset') {
                return value;
            }
        }

        return undefined; // Apenas resets ou nenhum valor válido
    }

    getLastStateOfEffect(video_id, obj_id, effect_id) {
        const effectHistory = this.maskEffects?.[video_id]?.[obj_id]?.[effect_id];
        if (!effectHistory || effectHistory.length === 0) return undefined;

        const lastValue = effectHistory[effectHistory.length - 1];
        return lastValue === 'reset' ? undefined : lastValue;
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

    registerResetForObject(video_id, obj_id, exceptionsEffectId = []) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return;

        const objectEffects = videoEffects[obj_id];
        if (!objectEffects) return;

        for (const effect_id in objectEffects) {
            // Pula se o efeito estiver nas exceções
            if (exceptionsEffectId.includes(effect_id)) {
                console.warn('Skipping reset for exception effect:', video_id, obj_id, effect_id);
                continue;
            }

            if (this.preventResets.has(`${video_id}_${obj_id}_${effect_id}`)) {
                console.warn('Effect cannot be reset', video_id, obj_id, effect_id);
                continue;
            }

            console.warn('Effect can be reset', video_id, obj_id, effect_id);
            this.maskEffects[video_id][obj_id][effect_id].push('reset');
        }
    }

    registerResetForEffect(video_id, obj_id, effect_id) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return;

        const objectEffects = videoEffects[obj_id];
        if (!objectEffects) return;

        if (!objectEffects[effect_id]) return;

        if (this.preventResets.has(`${video_id}_${obj_id}_${effect_id}`)) {
            console.warn('Effect cannot be reset', video_id, obj_id, effect_id);
            return;
        }

        console.warn('Effect can be reset', video_id, obj_id, effect_id);
        this.maskEffects[video_id][obj_id][effect_id].push('reset');
    }

    removeEffect(video_id, obj_id, effect_id) {
        const videoEffects = this.maskEffects?.[video_id];
        if (!videoEffects) return;

        const objectEffects = videoEffects[obj_id];
        if (!objectEffects) return;

        if (!objectEffects[effect_id]) return;

        // Remove o efeito
        delete this.maskEffects[video_id][obj_id][effect_id];

        // Se quiser, pode limpar objetos vazios para evitar lixo:
        if (Object.keys(this.maskEffects[video_id][obj_id]).length === 0) {
            delete this.maskEffects[video_id][obj_id];
        }
        if (Object.keys(this.maskEffects[video_id]).length === 0) {
            delete this.maskEffects[video_id];
        }
    }

    registerAnimation(elementId, animationName, animationType, settings = {}) {
        this.animations[elementId] ||= {}
        this.animations[elementId][animationType] ||= new Map()
        this.animations[elementId][animationType].set(animationName, { settings })
    }

    resetAnimationByType(elementId, animationType) {
        if (this.animations[elementId]?.[animationType]) {
            this.animations[elementId][animationType] = new Map()
        }
    }

    getLastAnimationByType(elementId, animationType) {
        const map = this.animations[elementId]?.[animationType]
        if (!map || map.size === 0) return null

        const lastKey = Array.from(map.keys()).at(-1)
        const { settings } = map.get(lastKey)
        return { name: lastKey, settings }
    }

    getAnimations(elementId) {
        const animationsByType = this.animations[elementId]
        if (!animationsByType) return []

        const allAnimations = []

        for (const type in animationsByType) {
            const map = animationsByType[type]
            for (const [name, { settings }] of map) {
                allAnimations.push({ name: `${name}${type}` , settings })
            }
        }

        return allAnimations
    }
}