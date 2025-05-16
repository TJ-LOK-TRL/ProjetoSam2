export default class EditorElement {
    constructor(type) {
        this.type = type
        this.id = crypto.randomUUID()
        this.stOffset = 0
    }

    destroy() {
        console.log(`Destroying element: ${this.id} (${this.type})`)
    }
}
