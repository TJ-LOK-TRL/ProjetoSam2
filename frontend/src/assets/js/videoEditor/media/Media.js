import EditorElement from '../EditorElement.js'

export default class Media extends EditorElement {
    constructor(type, file, element) {
        super(type)
        this.file = file
        this.url = file ? URL.createObjectURL(file) : null
        this.element = element
    }

    destroy() {
        if (this.url) {
            URL.revokeObjectURL(this.url)
        }
        super.destroy()
    }
}
