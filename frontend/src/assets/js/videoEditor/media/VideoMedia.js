import Media from './Media.js'

export default class VideoMedia extends Media {
    constructor(file, fps, frames) {
        super('video', file, document.createElement('video'))
        this.fps = fps
        this.frames = frames
        this.currentTime = 0
        this.speed = 1
        this.loop = false // must be always false for now
        this.ended = false
        this.isMetadataLoaded = false
        this.onMetadataLoadedCallbacks = []
        this.onVideoUpdatedCallbacks = []
        this.onVideoEndedCallbacks = []
        this.onVideoPlayCallbacks = []
        this.onVideoPauseCallbacks = []
        this.onVideoHidedCallbacks = []
        this.onVideoShowedCallbacks = []
        this.onVideoManualTimeUpdatedCallbacks = []
        this.onVideoSeekedCallbacks = []
        this.onVideoDeletedCallbacks = []
        this.element.src = this.url
        this.isPlaying = false
        this.visible = true
        this.skipNextUpdateCallbacks = false

        // coisas de masks
        this.use_cache = null
        this.track_id = null
        this.backgroundMask = null
        this.masks = []
        this.trackMasks = {}
        this.previewTrackMasks = {}
        this.cacheTrackVideos = null; // If trackMasks already exists, we will use it to restore the state if no changes are made
        this.points = []
        this.isSelectingMask = false
        this.maskColor = null
        this.maskObjects = []
        this.currentId = 0
        this.samState = null
        this.maskRefTime = null

        // coisas de chroma key
        this.chromaKeyDetectionData = null

        // on video update new callback
        this._animationId = null
        this._lastFrameTime = 0
        this._lastPresentedFrame = null;
        this.maxFPS = 60; // ou outro valor
        this.now = 0
        this.mediaTime = 0;
        this.frameIdx = 0
        this.metadata = null
        this.onFrameUpdatedCallbacks = []
        this.onNewFrameCallback = this._onNewFrameCallback.bind(this);

        this.element.addEventListener('loadedmetadata', () => {
            this.isMetadataLoaded = true
            this.width = this.element.videoWidth
            this.height = this.element.videoHeight
            this.aspectRatio = this.width / this.height
            this.start = 0
            this.end = this.element.duration
            this.maxEnd = this.element.duration
            //if (this.duration === undefined) {
            //    Object.defineProperty(this, 'duration', {
            //        get() {
            //            return this.end - this.start;
            //        }
            //    });
            //}
            this.onMetadataLoadedCallbacks.forEach(callback => callback())
            this.onMetadataLoadedCallbacks = []
        })

        this.element.addEventListener('timeupdate', () => {
            this.currentTime = this.element.currentTime
            if (!this.skipNextUpdateCallbacks) {
                this.onVideoUpdatedCallbacks.forEach(callback => callback(this.element.currentTime))
            } else {
                this.skipNextUpdateCallbacks = false
            }
        })

        this.element.addEventListener('ended', () => {
            if (this.loop) {
                this.currentTime = 0
                this.play()
            } else {
                this.isPlaying = false
                this.ended = true
            }

            this.onVideoEndedCallbacks.forEach(callback => callback())
        })

        this.element.addEventListener('play', () => {
            this.isPlaying = true;
            this.onVideoPlayCallbacks.forEach(callback => callback());
        });

        this.element.addEventListener('pause', () => {
            this.isPlaying = false;
            this.onVideoPauseCallbacks.forEach(callback => callback());
        });

        this.element.addEventListener('seeked', (d) => {
            this.onVideoSeekedCallbacks.forEach(callback => callback(this.element.currentTime))
        })

        Object.defineProperty(this, 'volume', {
            get() {
                return this.element.volume;
            },
            set(value) {
                this.element.volume = Math.max(0, Math.min(1, value)); // garantir entre 0 e 1
            }
        });

        this.element.style.width = '100%'
        this.element.style.height = '100%'
        this.element.style.objectFit = 'cover'

        this.element.setAttribute('preload', 'auto');

        this._startFrameCallbackLoop();
    }

    _startFrameCallbackLoop() {
        if (this._animationId !== null) return;

        this._animationId = this.element.requestVideoFrameCallback(this.onNewFrameCallback);
    }

    _stopFrameCallbackLoop() {
        if (this._animationId !== null) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
    }

    _onNewFrameCallback(now, metadata) {
        this.now = now / 1000;
        const frameDuration = 1 / this.fps;
        const exactFrameTime = Math.round(metadata.mediaTime / frameDuration) * frameDuration;
        this.mediaTime = exactFrameTime
        this.frameIdx = Math.round(exactFrameTime * this.fps);
        this.metadata = metadata;
        //console.log('Frame:', this.frameIdx, this.mediaTime, exactFrameTime, this.fps, this.now)
        //console.log('CALLING!')
        //console.warn('EXECUTADO O CALLBACK!')

        const frameChanged = this._lastPresentedFrame !== metadata.presentedFrames;
        this._lastPresentedFrame = this.frameIdx;

        if (this.skipNextUpdateCallbacks) {
            this._animationId = this.element.requestVideoFrameCallback(this.onNewFrameCallback);
            this.skipNextUpdateCallbacks = false
            return;
        }

        if (this.element.paused && !frameChanged) {
            this._animationId = this.element.requestVideoFrameCallback(this.onNewFrameCallback);
            return;
        }

        const minFrameTime = 1000 / this.maxFPS;
        if (now - this._lastFrameTime < minFrameTime) {
            this._animationId = this.element.requestVideoFrameCallback(this.onNewFrameCallback);
            return;
        }

        this._lastFrameTime = now;

        this.onFrameUpdatedCallbacks.forEach(callback => callback(now, metadata));

        this._animationId = this.element.requestVideoFrameCallback(this.onNewFrameCallback);
    }

    onMetadataLoaded(callback) {
        if (this.isMetadataLoaded) {
            callback()
        } else {
            this.onMetadataLoadedCallbacks.push(callback)
        }
    }

    onVideoUpdated(callback) {
        this.onVideoUpdatedCallbacks.push(callback)
    }

    onVideoEnded(callback) {
        this.onVideoEndedCallbacks.push(callback)
    }

    onVideoPlay(callback) {
        this.onVideoPlayCallbacks.push(callback)
    }

    onVideoPause(callback) {
        this.onVideoPauseCallbacks.push(callback)
    }

    onVideoHided(callback) {
        this.onVideoHidedCallbacks.push(callback)
    }

    onVideoShowed(callback) {
        this.onVideoShowedCallbacks.push(callback)
    }

    onVideoSeeked(callback) {
        this.onVideoSeekedCallbacks.push(callback)
    }

    onVideoManualTimeUpdated(callback) {
        this.onVideoManualTimeUpdatedCallbacks.push(callback)
    }

    onVideoDeleted(callback) {
        this.onVideoDeletedCallbacks.push(callback)
    }

    onFrameUpdated(callback) {
        this.onFrameUpdatedCallbacks.push(callback)
    }

    offFrameUpdated(callback) {
        this.onFrameUpdatedCallbacks = this.onFrameUpdatedCallbacks.filter(cb => cb !== callback);
    }

    captureCurrentFrame() {
        const canvas = this.captureCurrentCanvasFrame()

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob)
            }, 'image/jpeg')
        })
    }

    captureCurrentCanvasFrame() {
        if (this.element.readyState < 2) {
            console.warn("Vídeo ainda não está pronto para captura (readyState = ", this.element.readyState, ")")
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = this.width
        canvas.height = this.height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(this.element, 0, 0, canvas.width, canvas.height)

        return canvas
    }

    isPaused() {
        return this.element.paused
    }

    //play() {
    //    if (!this.isPlaying) {
    //        this.element.play()
    //        this.isPlaying = true
    //    }
    //}

    //pause() {
    //    if (this.isPlaying) {
    //        this.element.pause()
    //        this.isPlaying = false
    //    }
    //}

    //setTime(t) {
    //    this.element.currentTime = Math.max(Math.min(t, this.duration), 0)
    //    this.ended = false
    //    this.onVideoManualTimeUpdatedCallbacks.forEach(callback => callback(this.element.currentTime))
    //}

    async play() {
        if (!this.isPlaying) {
            await this.element.play();
            this.isPlaying = true;
        }
    }

    async pause() {
        if (this.isPlaying) {
            await this.element.pause()
            this.isPlaying = false
        }
    }

    async setTime(t) {
        t = Math.max(Math.min(t, this.element.duration), 0);

        //console.log('Set time: ', t)
        this.element.currentTime = t;
        await new Promise(resolve => {
            const handler = () => {
                this.element.removeEventListener('seeked', handler);
                resolve();
            };
            this.element.addEventListener('seeked', handler);
        });

        this.ended = false;
        this.onVideoManualTimeUpdatedCallbacks.forEach(callback => callback(this.element.currentTime));
    }

    hide() {
        this.element.style.visibility = 'hidden'
        this.visible = false
        this.onVideoHidedCallbacks.forEach(callback => callback())
    }

    show() {
        this.element.style.visibility = 'visible'
        this.visible = true
        this.onVideoShowedCallbacks.forEach(callback => callback())
    }

    addMask(maskData) {
        for (const mask of maskData.masks) {
            this.masks.push(mask);
            console.log("Mask adicionada:", mask);
        }
    }

    getCurrentFrame() {
        return Math.floor(this.currentTime * this.fps)
    }

    getPixelColor(x, y) {
        const canvas = this.captureCurrentCanvasFrame()
        const ctx = canvas.getContext('2d')
        const pixelData = ctx.getImageData(x, y, 1, 1).data
        return {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
            a: pixelData[3]
        }
    }

    async waitUntilVideoIsReady(timeout = 3000) {
        // Se já estiver pronto, retorna imediatamente
        if (this.element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
        }

        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Timeout: Vídeo não ficou pronto após " + timeout + "ms"));
            }, timeout);
        });

        // Verifica periodicamente o readyState
        const readyPromise = new Promise((resolve) => {
            const checkReady = () => {
                if (this.element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    clearTimeout(timeoutId);
                    resolve();
                } else {
                    setTimeout(checkReady, 100); // Verifica a cada 100ms
                }
            };
            checkReady();
        });

        // Aguarda a primeira que resolver (loop, evento ou timeout)
        await Promise.race([readyPromise, timeoutPromise]);
    }

    async seekTo(time) {
        this.preventNextUpdateCallbacks();
        this.element.currentTime = time;

        await new Promise(resolve => {
            const onSeeked = () => {
                this.element.removeEventListener('seeked', onSeeked);
                console.warn('EXECUTADO O SEEKED!')
                resolve();
            };
            this.element.addEventListener('seeked', onSeeked);
        });
    }

    async getCanvasOfFrame(frameIdx) {
        if (!this.isMetadataLoaded) {
            await new Promise(resolve => this.onMetadataLoaded(resolve));
        }

        const targetTime = frameIdx / this.fps;
        const currentTime = this.element.currentTime;

        await this.seekTo(targetTime);

        const canvas = this.captureCurrentCanvasFrame();

        await this.seekTo(currentTime);

        console.warn('EXECUTADO O GET_CANVAS_OF_FRAME!')
        return canvas;
    }

    preventNextUpdateCallbacks() {
        this.skipNextUpdateCallbacks = true
    }

    delete() {
        this.onVideoDeletedCallbacks.forEach(callback => callback())
        this._stopFrameCallbackLoop()
        this.onMetadataLoadedCallbacks = []
        this.onVideoUpdatedCallbacks = []
        this.onVideoEndedCallbacks = []
        this.onVideoPlayCallbacks = []
        this.onVideoPauseCallbacks = []
        this.onVideoHidedCallbacks = []
        this.onVideoShowedCallbacks = []
        this.onVideoManualTimeUpdatedCallbacks = []
        this.onVideoSeekedCallbacks = []
        this.onVideoDeletedCallbacks = []
        this.onVideoUpdatedCallbacks = []
        this.onFrameUpdatedCallbacks = []
        this.element.src = ''
        this.element.load()
        this.element.remove()
    }
}
