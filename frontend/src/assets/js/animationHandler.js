import { useVideoEditor } from '@/stores/videoEditor';
import { useTimelineStore } from '@/stores/timeline';


export default class AnimationHandler {
    constructor(register) {
        this.videoEditor = useVideoEditor()
        this.timelineStore = useTimelineStore();
        this.register = register
        this.callbacksIdsByType = {}
        this.callbacksResetsByCallbackId = {}
        this.lastOpacityOriginByElementId = {}
    }

    applyAnimation(editorElement, animationName, animationType, settings = {}) {
        const boxOfElement = this.videoEditor.getBoxOfElement(editorElement)
        if (!boxOfElement) return

        const htmlElement = boxOfElement.box.boxRef

        this.resetByType(editorElement, htmlElement, animationType)

        if (animationName === 'Fade') {
            this.addUpdateCallback(editorElement.id, animationName, animationType,
                () => this.applyFadeEffect(editorElement, htmlElement, animationType, settings),
                () => htmlElement.style.opacity = 1,
            )
            this.register.registerAnimation(editorElement.id, animationName, animationType, settings)
        }
    }

    resetByType(editorElement, htmlElement, animationType) {
        this.register.resetAnimationByType(editorElement.id, animationType)

        if (this.callbacksIdsByType[animationType]) {
            for (const callbackId of this.callbacksIdsByType[animationType]) {
                this.timelineStore.removeOnUpdate(callbackId)
                this.callbacksResetsByCallbackId[callbackId]?.()
                delete this.callbacksResetsByCallbackId[callbackId]
            }

            this.callbacksIdsByType[animationType].clear()
        }
    }

    applyFadeEffect(editorElement, htmlElement, type, settings) {
        if (!editorElement || !htmlElement) return

        const currentTime = this.timelineStore.currentTime - (editorElement.stOffset ?? 0)
        const totalDuration = editorElement.duration / editorElement.speed

        const duration = settings.duration ?? 1

        if (type === 'in') {
            const start = settings.start ?? 0
            const timeSinceStart = currentTime - start

            if (timeSinceStart >= 0 && timeSinceStart < duration) {
                const opacity = timeSinceStart / duration
                this.changeOpacity(opacity, editorElement.id, htmlElement, 'animation', 'in')
            } else if (timeSinceStart >= duration) {
                this.changeOpacity(1, editorElement.id, htmlElement, 'limit', 'in')
            } else {
                this.changeOpacity(0, editorElement.id, htmlElement, 'limit', 'in')
            }
        }

        if (type === 'out') {
            const start = settings.start ?? (totalDuration - duration)
            const timeSinceStart = currentTime - start

            if (timeSinceStart >= 0 && timeSinceStart < duration) {
                const opacity = Math.max(0, 1 - (timeSinceStart / duration))
                this.changeOpacity(opacity, editorElement.id, htmlElement, 'animation', 'out')
            } else if (timeSinceStart >= duration) {
                this.changeOpacity(0, editorElement.id, htmlElement, 'limit', 'out')
            } else {
                this.changeOpacity(1, editorElement.id, htmlElement, 'limit', 'out')
            }
        }
    }

    addUpdateCallback(editorElementId, animationName, animationType, updateCallback, resetCallback) {
        updateCallback()
        const callbackId = editorElementId + animationName + animationType
        this.timelineStore.onUpdate(callbackId, updateCallback)
        this.callbacksIdsByType[animationType] ||= new Set()
        this.callbacksIdsByType[animationType].add(callbackId)
        this.callbacksResetsByCallbackId[callbackId] = resetCallback
    }

    changeOpacity(newOpacity, editorElementId, htmlElement, originType, originName) {
        if (this.lastOpacityOriginByElementId[editorElementId]) {
            const [lastOriginType, lastOriginName, oldOpacity] = this.lastOpacityOriginByElementId[editorElementId]

            if (lastOriginName !== originName) {
                if (lastOriginType === 'animation' && originType === 'limit') return;
                if (lastOriginType === originType); 
            }
        }

        htmlElement.style.opacity = newOpacity
        this.lastOpacityOriginByElementId[editorElementId] = [originType, originName, newOpacity]
    }
}