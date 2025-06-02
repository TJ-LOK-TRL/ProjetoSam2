import { useVideoEditor } from '@/stores/videoEditor';
import { useTimelineStore } from '@/stores/timeline';


export default class AnimationHandler {
    constructor(register) {
        this.videoEditor = useVideoEditor()
        this.timelineStore = useTimelineStore();
        this.register = register
    }

    applyAnimation(editorElement, animationName, animationType, settings = {}) {
        const boxOfElement = this.videoEditor.getBoxOfElement(editorElement)
        if (!boxOfElement) return

        const htmlElement = boxOfElement.box.boxRef
        settings.duration ??= 1

        this.resetByType(editorElement, htmlElement, animationType)
        if (animationName === 'Fade') {
            this.register.registerAnimation(editorElement.id, animationName, animationType, settings)
            this.applyFadeEffect(editorElement, htmlElement, animationType, settings.duration)
        }
    }

    resetByType(editorElement, htmlElement, animationType) {
        htmlElement.style.animation = 'none' // reset
        void htmlElement.offsetWidth // trigger reflow
        this.register.resetAnimationByType(editorElement.id, animationType)
    }

    applyFadeEffect(editorElement, htmlElement, type, animDuration = 1) {
        if (!editorElement || !htmlElement) return

        const currentTime = this.timelineStore.currentTime
        const total = editorElement.duration / editorElement.speed

        if (type === 'in') {
            if (currentTime >= animDuration) return // já passou da animação

            const elapsed = currentTime
            const remaining = animDuration - elapsed

            this.applyFadeCSS(htmlElement, 'in', animDuration, -elapsed, remaining)
        }

        if (type === 'out') {
            const timeToEnd = total - currentTime
            if (timeToEnd >= animDuration) return // ainda não está na zona de fade out

            const elapsed = animDuration - timeToEnd
            const remaining = timeToEnd

            this.applyFadeCSS(htmlElement, 'out', animDuration, -elapsed, remaining)
        }
    }

    applyFadeCSS(element, type, fullDuration, delay, actualDuration) {
        if (!element) return

        const animName = type === 'in' ? 'fadeInAnim' : 'fadeOutAnim'
        element.style.animation = `${animName} ${fullDuration}s linear ${delay}s forwards`

        // remove tudo depois da animação
        setTimeout(() => {
            element.style.animation = 'none'
        }, actualDuration * 1000)
    }
}