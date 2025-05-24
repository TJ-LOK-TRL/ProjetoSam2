import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useBackendStore = defineStore('backend', () => {
    const images = ref([])
    const error = ref(null)
    //const ip = ref('192.168.1.231')
    const ip = ref('127.0.0.1')
    const port = ref('38080')

    async function test() {
        try {
            console.log(`http://${ip.value}:${port.value}/test`)
            const response = await axios.get(`http://${ip.value}:${port.value}/test`)
            console.log(response.data)
        } catch (err) {
            error.value = err.message
        }
    }

    async function getMediaBasicData(file) {
        const formData = new FormData()
        formData.append('video', file)

        const response = await axios.post(`http://${ip.value}:${port.value}/video/basic_data`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    }

    async function getMasksForFrame(frame) {
        const formData = new FormData()
        formData.append('frame', frame)

        const response = await axios.post(`http://${ip.value}:${port.value}/video/frame/mask`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    }

    async function getMasksForVideo(videoFile, videoObjectsInfo, options = {}) {
        const formData = new FormData();

        if (!(videoFile instanceof File)) {
            throw new Error("O parâmetro videoFile deve ser um objeto File");
        }
        formData.append('video', videoFile);

        // Adicione outros parâmetros como strings
        formData.append('scale_factor', (options.scale_factor || 0.5).toString());
        formData.append('start_frame', (options.start_frame || 0).toString());
        formData.append('end_frame', (options.end_frame || -1).toString());
        formData.append('video_objects', JSON.stringify(videoObjectsInfo));

        if (options.stage_name) {
            formData.append('stage_name', options.stage_name.toString());
        }

        try {
            console.log("Enviando requisição com:", {
                video: videoFile.name,
                video_objects: videoObjectsInfo,
                scale: (options.scale_factor || 0.5),
                start_frame: (options.start_frame || 0),
                end_frame: (options.end_frame || -1),
                stage_name: (options.stage_name || null),
            });
            const response = await axios.post(`http://${ip.value}:${port.value}/video/mask`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro na requisição:", error);
            throw error;
        }
    }
    // FALTA botao guardar 
    
    async function download(video_files, metadata) {
        try {
            const formData = new FormData();
            // 1. Adiciona os vídeos como arquivos separados
            video_files.forEach(file => {
                formData.append('videos[]', file);
            });
            // 2. Adiciona todos os metadados em um único JSON
            formData.append('metadata', JSON.stringify(metadata));
            const response = await axios.post(`http://${ip.value}:${port.value}/download`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error('Erro no download:', error);
            throw error;
        }
    }


    return { test, images, error, getMediaBasicData, getMasksForFrame, 
        getMasksForVideo, download }
})

