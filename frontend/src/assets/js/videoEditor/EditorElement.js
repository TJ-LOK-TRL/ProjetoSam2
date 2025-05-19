export default class EditorElement {
    constructor(type) {
        this.type = type
        this.id = crypto.randomUUID()
        this.stOffset = 0
        this.start = 0
        this.end = 5 // Default duration
        this.shouldBeDraw = true

        Object.defineProperty(this, 'duration', {
            get() {
                return this.end - this.start;
            }
        });
    }

    destroy() {
        console.log(`Destroying element: ${this.id} (${this.type})`)
    }
}
