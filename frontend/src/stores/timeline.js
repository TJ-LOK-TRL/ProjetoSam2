import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useVideoEditor } from "/src/stores/videoEditor.js"

export const useTimelineStore = defineStore('timeline', () => {
    const videoEditor = useVideoEditor()
    const videoIsReady = ref(false)
    const isPlaying = ref(false)
    const duration = ref(null)
    const minDuration = ref(0)
    const maxDuration = ref(1)
    const zoomStep = ref(0.1)
    const currentPercentage = ref(0)
    const lastUpdateOrigin = ref(null)
    const minRange = ref(1) // ou minZoom
    const maxRange = ref(null)
    const loop = ref(true)
    const fps = ref(30)
    const onPlayedCallbacks = ref([])
    const onPausedCallbacks = ref([])
    const onUpdateCallbacks = ref([])

    const currentTime = ref(0)

    const zoom = computed({
        get: () => {
            return maxDuration.value - minDuration.value
        },
        set: (value) => {
            setZoom(value)
        }
    })

    // Valor invertido para o input de range
    const zoomInverted = computed({
        get: () => {
            return maxRange.value - zoom.value + minRange.value
        },
        set: (val) => {
            const actualZoom = maxRange.value - val + minRange.value
            setZoom(actualZoom)
        }
    })

    let animationFrameId = null;
    let lastFrameTime = null;
    let accumulatedTime = 0;
    async function globalTimerUpdate(now) {
        if (!isPlaying.value) return;

        if (lastFrameTime === null) {
            lastFrameTime = now;
            animationFrameId = requestAnimationFrame(globalTimerUpdate);
            return;
        }

        const delta = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        accumulatedTime += delta;

        const frameDuration = 1 / getBestFps();
        while (accumulatedTime >= frameDuration) {
            let newTime = currentTime.value + frameDuration;
            let origin = 'timer'
            if (newTime >= duration.value && loop.value) {
                newTime = 0
                origin = 'reset'
                // Reinicia todos os vídeos sincronizadamente
                //await Promise.all(videoEditor.getVideos().map(video => {
                //    //video.setTime(video.stOffset + video.start);
                //    //return video.play();
                //    //video.pause()
                //}));
            }

            await setCurrentTime(newTime, origin);
            onUpdateCallbacks.value.forEach(callback => callback(newTime))

            accumulatedTime -= frameDuration;
        }

        animationFrameId = requestAnimationFrame(globalTimerUpdate);
    }

    function init() {
        videoEditor.onVideoMetadataLoaded((video) => {
            updateTimelineMaxDuration()
            console.log("Video duration in seconds is: " + video.duration)
        })

        videoEditor.onElementRemoved((e) => {
            if (e.type === 'video') {
                updateTimelineMaxDuration()
                if (videoEditor.getVideos().length == 0) {
                    if (isPlaying.value) {
                        togglePlay()
                    }
                }
            }
        })
    }

    function updateTimelineMaxDuration() {
        let longestDuration = 0;
        videoEditor.getVideos().forEach(video => {
            if (!video.shouldBeDraw) return

            const videoDuration = Math.max(video.maxEnd, video.duration / video.speed)
            if (video.stOffset + videoDuration > longestDuration) {
                longestDuration = video.stOffset + videoDuration;
            }
        });
    
        duration.value = longestDuration;
        maxRange.value = longestDuration;
        setTimelineInterval(minDuration.value, longestDuration)
    }

    function getBestFps() {
        if (videoEditor.fps) {
            return videoEditor.fps
        }

        let maxFps = fps.value;
        videoEditor.getVideos().forEach(video => {
            if (video.fps > maxFps) {
                maxFps = video.fps;
            }
        });
        return maxFps;
    }

    function setTimelineInterval(min, max) {
        minDuration.value = min
        maxDuration.value = max

        const range = maxDuration.value - minDuration.value
        const time = currentTime.value

        if (range <= 0) {
            setPercentage(0)
            return
        }

        if (time <= minDuration.value) {
            setPercentage(0)
        } else if (time >= maxDuration.value) {
            setPercentage(100)
        } else {
            setPercentage(((time - minDuration.value) / range) * 100)
        }
    }

    function setTimelineZoomRange(newRange) { // range ==== zoom
        const center = currentTime.value
        let newMin = center - newRange / 2
        let newMax = center + newRange / 2

        // corrige limites do vídeo
        if (newMin < 0) {
            newMax += -newMin
            newMin = 0
        }
        if (newMax > duration.value) {
            newMin -= newMax - duration.value
            newMax = duration.value
        }

        // impedir que newMin passe abaixo de 0 depois da correção
        newMin = Math.max(0, newMin)

        const diffThreshold = 0.01
        const minChanged = Math.abs(newMin - minDuration.value) > diffThreshold
        const maxChanged = Math.abs(newMax - maxDuration.value) > diffThreshold

        if (minChanged || maxChanged) {
            setTimelineInterval(newMin, newMax)
            console.log('New limit is: ' + newMin + ' ' + newMax)
        }
    }

    async function setPercentage(percentage, origin = 'user') {
        percentage = Math.max(0, Math.min(100, percentage))
        const newTime = minDuration.value + (percentage / 100) * (maxDuration.value - minDuration.value)
        syncVideos(newTime, origin)
        currentTime.value = newTime
        currentPercentage.value = percentage
        lastUpdateOrigin.value = origin
    }

    async function setCurrentTime(time, origin = 'user') {
        syncVideos(time, origin)
        
        currentTime.value = time
        const range = maxDuration.value - minDuration.value
        if (range === 0) {
            currentPercentage.value = 0
            return
        }

        currentPercentage.value = ((time - minDuration.value) / range) * 100

        lastUpdateOrigin.value = origin

        //console.log(time, range, minDuration.value, maxDuration.value, currentPercentage.value, lastUpdateOrigin.value)
    }

    async function syncVideos(time, origin = 'user') {
        const videos = videoEditor.getVideos()
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i]
            if (origin == 'timer' && isPlaying.value) {
                await syncVideo(video, time, false)
            }
            
            else /*if (origin == 'user')*/ {
                await syncVideo(video, time, true, origin === 'reset')
            }
        }

        const shouldPlay = origin === 'timer' && isPlaying.value
        if (shouldPlay) {
            for (let i = 0; i < videos.length; i++) {
                let video = videos[i]
                if (!video.isPlaying && shouldRenderVideo(video, time)) {
                    await video.play()
                }
            }
        }
    }

    async function syncVideo(video, time, setTime = true, presetTime = false) {
        const videoTime = time - video.stOffset + video.start
        if (presetTime) {
            await video.setTime(video.start)
        }

        if (shouldRenderVideo(video, time)) {
            if (setTime && !presetTime) {
                await video.setTime(videoTime)
            }
            video.show()
        } else {
            video.hide()
            await video.pause()
        }
    }
   
    function shouldRenderVideo(video, time) {
        return time >= video.stOffset && time <= video.stOffset + video.duration / video.speed
    }

    async function togglePlay() {
        if (isPlaying.value) {
            cancelAnimationFrame(animationFrameId);
            pauseAllVideos()
            onPausedCallbacks.value.forEach(async callback => await callback())
        } else {
            lastFrameTime = null;
            accumulatedTime = 0;
            animationFrameId = requestAnimationFrame(globalTimerUpdate);
            onPlayedCallbacks.value.forEach(async callback => await callback())
        }

        isPlaying.value = !isPlaying.value
    }

    function pauseAllVideos() {
        videoEditor.getVideos().forEach(video => {
            video.pause()
        })
    }

    function goBack() {
        setCurrentTime(Math.max(0, currentTime.value - 1 / fps.value))
    }

    function goForward() {
        setCurrentTime(Math.min(duration.value, currentTime.value + 1 / fps.value))
    }

    function setZoom(value) {
        setTimelineZoomRange(value)
    }

    function zoomIn() {
        setOneStepRangeByZoomDirection('in')
    }

    function zoomOut() {
        setOneStepRangeByZoomDirection('out')
    }

    function zoomFit() {
        setTimelineZoomRange(duration.value)
    }

    function setOneStepRangeByZoomDirection(zoomDirection) {
        const currentRange = maxDuration.value - minDuration.value

        let newRange
        if (zoomDirection === 'in') {
            newRange = Math.max(minRange.value, currentRange * (1 - zoomStep.value))
        } else {
            newRange = Math.min(maxRange.value, currentRange * (1 + zoomStep.value))
        }

        setTimelineZoomRange(newRange)
    }

    function onPlayed(callback) {
        onPlayedCallbacks.value.push(callback)
    }

    function onPaused(callback) {
        onPausedCallbacks.value.push(callback)
    }

    function onUpdate(callback) {
        onUpdateCallbacks.value.push(callback)
    }

    function removeOnPlayed(callback) {
        const index = onPlayedCallbacks.value.indexOf(callback)
        if (index > -1) {
            onPlayedCallbacks.value.splice(index, 1)
        }
    }

    function removeOnPaused(callback) {
        const index = onPausedCallbacks.value.indexOf(callback)
        if (index > -1) {
            onPausedCallbacks.value.splice(index, 1)
        }
    }

    function removeOnUpdate(callback) {
        const index = onUpdateCallbacks.value.indexOf(callback)
        if (index > -1) {
            onUpdateCallbacks.value.splice(index, 1)
        }
    }

    function setStOffset(video, stOffset) {
        video.stOffset = Math.max(stOffset, 0)
        updateTimelineMaxDuration()
        syncVideo(video, currentTime.value)
    }

    function setVideoStart(video, startTime) {
        video.start = Math.max(0, Math.min(startTime, video.duration));
        if (video.end && video.end < video.start) {
            video.end = video.start;
        }
        updateTimelineMaxDuration();
        syncVideo(video, currentTime.value);
    }
    
    function setVideoEnd(video, endTime) {
        video.end = Math.max(video.start || 0, Math.min(endTime, video.maxEnd));
        updateTimelineMaxDuration();
        syncVideo(video, currentTime.value);
    }

    function setVideoSpeed(video, speed) {
        //const currentSpeed = video.speed || 1;
    
        // Recalcula a duração como se estivesse a 1x
        //const baseDuration = (video.duration || video.maxEnd) * currentSpeed;
    
        // Reset para 1x
        //video.speed = 1;
        //video.element.playbackRate = 1;
    
        //video.start = video.start ?? 0;
        //video.end = video.start + baseDuration;
    
        // Agora aplica o novo speed
        video.speed = speed;
        video.element.playbackRate = speed;
    
        // Ajusta o novo end com base no novo speed
        //const logicalDuration = baseDuration / speed;
        //video.end = video.start + logicalDuration;
    
        updateTimelineMaxDuration();
        syncVideo(video, currentTime.value);
    }

    function setVideoMaxEnd(video, maxEnd) {
        video.maxEnd = Math.max(video.start || 0, Math.min(video.element.duration, maxEnd));
        updateTimelineMaxDuration();
        syncVideo(video, currentTime.value);
    }

    return {
        zoom, duration, minDuration, maxDuration, currentTime, currentPercentage, lastUpdateOrigin, videoIsReady, isPlaying,
        minRange, maxRange, zoomInverted,
        togglePlay, goBack, goForward, setZoom, zoomIn, zoomOut, init, setTimelineInterval, setPercentage, setCurrentTime,
        zoomFit, onPlayed, onPaused, onUpdate, removeOnPlayed, removeOnPaused, removeOnUpdate, setStOffset, getBestFps,
        setVideoStart, setVideoEnd, setVideoSpeed, setVideoMaxEnd,
    }
})