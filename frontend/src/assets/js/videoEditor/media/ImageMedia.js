import Media from './Media.js'

export default class ImageMedia extends Media {
    constructor(file, width, height) {
        super('image', file)
        this.width = width
        this.height = height
    }
}