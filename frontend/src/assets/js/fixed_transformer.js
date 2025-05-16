export default class FixedTransformer {
    constructor() {
        this.originalStyles = {};
        this.target = null;
    }

    transform(element) {
        if (!element) return;

        this.target = element;

        const computedStyle = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        // Guardar os estilos importantes
        this.originalStyles = {
            position: computedStyle.position,
            left: element.style.left,
            top: element.style.top,
            zIndex: element.style.zIndex,
            width: element.style.width,
            height: element.style.height,
            pointerEvents: element.style.pointerEvents,
        };

        // Ajustar para posição fixa mantendo tamanho
        element.style.position = 'fixed';
        element.style.left = rect.left + 'px';
        element.style.top = rect.top + 'px';
        element.style.width = rect.width + 'px';
        element.style.height = rect.height + 'px';
        element.style.pointerEvents = 'none';
        element.style.zIndex = '9999'; // opcional
    }

    restore() {
        if (!this.target) return;

        const { position, left, top, zIndex, width, height, pointerEvents } = this.originalStyles;

        this.target.style.position = position || '';
        this.target.style.left = left || '';
        this.target.style.top = top || '';
        this.target.style.zIndex = zIndex || '';
        this.target.style.width = width || '';
        this.target.style.height = height || '';
        this.target.style.pointerEvents = pointerEvents || '';

        this.target = null;
        this.originalStyles = {};
    }
}
