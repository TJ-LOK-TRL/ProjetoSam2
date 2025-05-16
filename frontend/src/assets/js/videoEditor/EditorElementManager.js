export default class EditorElementManager {
    constructor() {
        this.elementsById = new Map(); // Busca rápida por ID
        this.elementsByType = new Map(); // Busca eficiente por Tipo
    }

    addElement(editorElement) {
        this.elementsById.set(editorElement.id, editorElement);
        
        if (!this.elementsByType.has(editorElement.type)) {
            this.elementsByType.set(editorElement.type, new Set());
        }
        this.elementsByType.get(editorElement.type).add(editorElement);
    }

    removeElement(editorElement) {
        if (this.elementsById.has(editorElement.id)) {
            this.elementsById.delete(editorElement.id);

            const typeSet = this.elementsByType.get(editorElement.type);
            if (typeSet) {
                typeSet.delete(editorElement);
                if (typeSet.size === 0) {
                    this.elementsByType.delete(editorElement.type);
                }
            }

            editorElement.destroy();
        }
    }

    getById(id) {
        return this.elementsById.get(id) || null;
    }

    getByType(type) {
        return Array.from(this.elementsByType.get(type) || []);
    }

    listElements() {
        return Array.from(this.elementsById.values());
    }
}
