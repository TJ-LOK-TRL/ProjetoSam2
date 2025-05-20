# -*- coding: utf-8 -*-

# External imports
import os
import sys
import cv2
import base64
import tempfile
import subprocess


from flask import Flask, jsonify, send_from_directory, request, send_file
from flask_cors import CORS
import json
import traceback
import shutil
from werkzeug.security import generate_password_hash, check_password_hash


segment_anything_path = os.path.join(os.path.dirname(__file__), 'segment-anything-2')
if segment_anything_path not in sys.path:
    sys.path.append(segment_anything_path)

# Local imports
from video_processor import VideoProcessor
from video_effects_processor import VideoEffectsProcessor
from video_compositor import *
from sam2.build_sam import build_sam2
from sam2_segmenter import SAM2Segmenter, VideoObjectData
from data_saver import DataSaver
from utils import *
from text_generator import create_text_frame

app = Flask(__name__)

app.debug = True  # Ativa o modo debug
CORS(app)

# Definição da pasta de imagens
IMAGES_FOLDER = 'images'
SEGMENTED_FOLDER = 'segmented'

# Criar pastas se não existirem
os.makedirs(IMAGES_FOLDER, exist_ok=True)
os.makedirs(SEGMENTED_FOLDER, exist_ok=True)

@app.route('/test')
def test():
    """Rota de teste para verificar se a API está funcionando"""
    return jsonify({'message': 'API funcionando'})

@app.route('/images')
def get_images():
    """Lista todas as imagens disponíveis na pasta"""
    try:
        images = [f for f in os.listdir(IMAGES_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        return jsonify({'images': images})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/images/<image_name>')
def get_image(image_name):
    """Serve um arquivo de imagem"""
    try:
        return send_from_directory(IMAGES_FOLDER, image_name)
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar a imagem: {str(e)}'}), 500

@app.route('/segmentar/<image_name>', methods=['POST'])
def segmentar_image(image_name):
    """Executa a segmentação na imagem e retorna a versão segmentada"""
    input_path = os.path.join(IMAGES_FOLDER, image_name)
    output_path = os.path.join(SEGMENTED_FOLDER, f'seg_{image_name}')

    if not os.path.exists(input_path):
        return jsonify({'error': 'Imagem não encontrada'}), 404

    try:
        # Executa o script SAM2 para segmentação
        subprocess.run(['python', 'run_sam2.py', input_path, output_path])
        return jsonify({'segmented_image': f'seg_{image_name}'})
    except Exception as e:
        return jsonify({'error': f'Erro ao segmentar imagem: {str(e)}'}), 500
    
@app.route('/video/basic_data', methods=['POST'])
def get_basic_video_data():
    file = request.files['video']

    # Arquivo temporário com sufixo mp4 para o OpenCV abrir
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    processor = None

    try:
        processor = VideoProcessor(temp_path)
        num_frames = processor.get_num_frames()
        fps = processor.get_fps()

        frames_indices = get_interpolated_numbers(0, num_frames - 1, 10)
        frames = []

        for i in frames_indices:
            frame = processor.get_frame(i)
            if frame is None:
                continue
            frame = resize_frame(frame, width=100)
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            frames.append(f"data:image/jpeg;base64,{frame_base64}")

        print('Fps: ', fps)
        print('Frames: ', len(frames))
        return jsonify({'fps': fps, 'frames': frames})

    finally:
        if processor:
            processor.release()
        try:
            os.remove(temp_path)
        except PermissionError:
            print(f"Não foi possível remover o arquivo: {temp_path}")

@app.route('/video/frame/mask', methods=['POST'])
def get_masks_of_frame():
    file = request.files['frame']

    # Guardar imagem temporária
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    try:
        segmenter = SAM2Segmenter()
        image_bgr, image_rgb, sam_result = segmenter.generate_mask_for_image(temp_path)
        #segmenter.show_sam_result(image_bgr, sam_result)

        # Codificar imagem original para base64
        _, buffer = cv2.imencode('.jpg', image_bgr)
        image_base64 = base64.b64encode(buffer).decode('utf-8')

        # Extrair apenas as masks
        masks = []
        for idx, mask_data in enumerate(sam_result):
            mask = mask_data['segmentation'].astype(np.uint8) * 255
            _, buffer = cv2.imencode('.png', mask)
            mask_base64 = base64.b64encode(buffer).decode('utf-8')
            masks.append({
                'id': idx,
                'mask': f"data:image/png;base64,{mask_base64}"
            })

        return jsonify({
            'image': f"data:image/jpeg;base64,{image_base64}",
            'masks': masks
        })
    finally:
        try:
            os.remove(temp_path)
        except PermissionError:
            print(f"Não foi possível remover o arquivo: {temp_path}")

@app.route('/video/mask', methods=['POST'])
def get_masks_of_video():
    # Verificar se o vídeo foi enviado
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    # Obter o arquivo de vídeo
    file = request.files['video']
    
    # Arquivo temporário com sufixo mp4 para o OpenCV abrir
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        file.save(tmp.name)
        temp_path = tmp.name
        
    try:
        # Extrair parâmetros do JSON
        stage_name = request.form.get('stage_name')
        start_frame = int(request.form.get('start_frame', 0))
        end_frame = int(request.form.get('end_frame', -1))  # -1 significa até o final
        scale_factor = float(request.form.get('scale_factor', 0.5))
        
        #points = np.array(json.loads(request.form.get('points')), dtype=np.float32)
        #labels = np.array(json.loads(request.form.get('labels')), dtype=np.int32)
        #ann_frame_idx = int(request.form.get('ann_frame_idx', 0))
        #ann_obj_id = int(request.form.get('ann_obj_id', 1))    
        
        # Validar os pontos e labels
        #if len(points) == 0 or len(labels) == 0:
        #    return jsonify({'error': 'Points and labels cannot be empty'}), 400
        #
        #if len(points) != len(labels):
        #    return jsonify({'error': 'Points and labels must have the same length'}), 400
        
        video_objects_json = json.loads(request.form.get("video_objects"))
        video_objects: List[VideoObjectData] = []
        for idx, obj in enumerate(video_objects_json):
            points_raw = obj.get("points")
            labels_raw = obj.get("labels")

            # Validação
            if not points_raw or not labels_raw:
                return jsonify({'error': f'Points and labels cannot be empty (object index {idx})'}), 400

            if len(points_raw) != len(labels_raw):
                return jsonify({'error': f'Points and labels must have the same length (object index {idx})'}), 400

            # Aplicar fator de escala aos pontos
            points_scaled = np.array(points_raw, dtype=np.float32) * scale_factor
            labels = np.array(labels_raw, dtype=np.int32)

            vod = VideoObjectData(
                points=points_scaled,
                labels=labels,
                ann_frame_idx=int(obj.get("ann_frame_idx", 0)),
                ann_obj_id=int(obj.get("ann_obj_id", 1)),
            )
            video_objects.append(vod)

            # Print de debug por objeto
            print(f"\n[DEBUG] VideoObjectData #{idx}:")
            print(f"  ann_frame_idx: {vod.ann_frame_idx}")
            print(f"  ann_obj_id: {vod.ann_obj_id}")
            print(f"  points.shape: {vod.points.shape if vod.points is not None else 'None'}")
            print(f"  points (scaled):\n{vod.points}")
            print(f"  labels:\n{vod.labels}")
        
                 
        # Obter as dimensões originais do vídeo para calcular o scaling
        processor = VideoProcessor(temp_path)
        original_width, original_height = processor.get_size()
        processor.release()
                    
        print(f'Stage name: {stage_name}')
        print(f"Fator de escala: {scale_factor}")
        print(f"Dimensões originais: {original_width}x{original_height}")
        print(f"Dimensões escaladas: {int(original_width*scale_factor)}x{int(original_height*scale_factor)}")
        print(f"Frame inicial: {start_frame}")
        print(f"Frame final: {end_frame}")
        print(f"Arquivo temporário: {temp_path}")
                
        # Criar diretório temporário para os frames processados
        output_dir = os.path.join('videos', 'frames', stage_name or 'reg_stage')
        if stage_name is None:
            if os.path.exists(output_dir):
                shutil.rmtree(output_dir)
        
        # Processar o vídeo com SAM2 #video2_test
        serialized_result = (DataSaver.get_stage(stage_name) or {}) if stage_name else {}
        if not serialized_result:
            segmenter = SAM2Segmenter()
            print('Gerando máscaras para o vídeo...')
            result = segmenter.generate_masks_for_video(
                video_path=temp_path,
                video_objects_data=video_objects,
                output_dir=output_dir,
                scale_factor=scale_factor,
                start_frame=start_frame,
                end_frame=end_frame if end_frame != -1 else None,
                debug_points=False,
            )
            
            print('Size:', len(result.items()))
            # Converter o resultado para um formato que pode ser enviado por JSON
            for frame_idx, frame_data in result.items():
                frame_idx = frame_idx + start_frame
                serialized_frame = {}
                for obj_id, mask in frame_data.items():
                    try:
                        # Verificação inicial
                        if mask is None or mask.size == 0:
                            print(f"Frame {frame_idx}: Máscara vazia")
                            continue
                            
                        # Conversão e codificação
                        mask_base64 = encode_mask(mask)
                        
                        serialized_frame[obj_id] = {
                            "shape": mask.shape,
                            "data": f"data:image/png;base64,{mask_base64}"
                        }
                                
                    except Exception as e:
                        print(f"ERRO no frame {frame_idx}: {str(e)}")
                        continue
                
                serialized_result[frame_idx] = serialized_frame
            
            stage_name = stage_name or unique_filename('stages', prefix='track_masks_stage_', ext='')
            print('Máscaras geradas salvadas no stage:', stage_name)
            DataSaver.add_stage(stage_name, serialized_result)    
        
        return jsonify({
            'result': serialized_result,  # Enviar o resultado inteiro
            'track_id': stage_name
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        try:
            os.remove(temp_path)
        except PermissionError:
            print(f"Não foi possível remover o arquivo: {temp_path}")

@app.route('/download', methods=['POST'])
def download():
    print("\n=== INÍCIO DA REQUISIÇÃO DE DOWNLOAD ===")
    
    try:
        user_id = request.form.get('user_id')

        # Verificar se o user_id é válido
        if not user_id:
            print("\n[ERRO] user_id não fornecido")
            #return jsonify({'error': 'user_id não fornecido'}), 401
        
        # Log de cabeçalhos da requisição
        print("\n[HEADERS]")
        for key, value in request.headers.items():
            print(f"{key}: {value}")

        # Verificar se há vídeos
        if 'videos[]' not in request.files:
            print("\n[ERRO] Nenhum vídeo encontrado nos arquivos enviados")
            return jsonify({'error': 'Nenhum vídeo enviado'}), 400

        # Obter todos os vídeos
        videos = request.files.getlist('videos[]')
        print(f"\n[VIDEOS ENVIADOS] {len(videos)} vídeo(s) recebido(s)")
        
        for idx, video in enumerate(videos):
            print(f"\nVideo {idx + 1}:")
            print(f"Nome: {video.filename}")
            print(f"Tipo: {video.content_type}")
            print(f"Tamanho: {len(video.read())} bytes")
            video.seek(0)  # Volta ao início do arquivo após ler

        # Obter metadados (se existirem)
        metadata = {}
        if 'metadata' in request.form:
            metadata = json.loads(request.form['metadata'])
            print("\n[METADADOS RECEBIDOS]")
            print(json.dumps(metadata, indent=2))
        else:
            print("\n[AVISO] Nenhum metadado recebido")

        fps = metadata.get('fps', None)
        width = metadata.get('width', None)
        height = metadata.get('height', None)
        enable_transparency = metadata.get('enable_transparency', True)
        if not width or not height:
            print("\n[AVISO] Nenhuma largura ou altura especificada nos metadados")
            return jsonify({'error': 'Largura ou altura não especificada nos metadados'}), 400

        # Cria pasta de projetos para o user_id
        user_folder = os.path.join('projects', str(user_id))
        os.makedirs(user_folder, exist_ok=True)

        # Criar diretório temporário
        temp_dir = tempfile.mkdtemp()
        compositor = VideoCompositor(
            output_path=os.path.join(temp_dir, f'output.mp4'),
            output_width=width,  # Ajuste conforme necessário
            output_height=height,
            fps=fps
        )
        processor = VideoEffectsProcessor()

        elements_metadata = metadata.get('elements_data', {})
        video_data = {}
        #for idx, video_file in enumerate(videos):
        for idx, video_id in enumerate(elements_metadata.keys()):
            #video_id = list(elements_metadata.keys())[idx] if elements_metadata else str(idx)
            element_metadata = elements_metadata.get(video_id, {})
            if not element_metadata:
                print(f"\n[AVISO] Nenhum metadado encontrado para o vídeo {video_id}")
                print('\tVideos data:', elements_metadata)
                print('\tVideo metadata:', element_metadata)
                continue
            
            element_type = element_metadata.get('type', 'video')
            rotation = element_metadata.get('rotation', 0)
            flipped = element_metadata.get('flipped', False)
            speed = element_metadata.get('speed', 1)
            draw = element_metadata.get('draw', True)
            st_offset = element_metadata.get('st_offset', 0)
            start_t = element_metadata.get('start_t', 0)
            end_t = element_metadata.get('end_t', None)
            rect = Rect(
                int(element_metadata.get('x', 0)),
                int(element_metadata.get('y', 0)),
                int(element_metadata.get('width', None)),
                int(element_metadata.get('height', None))
            )
            
            if element_type == 'video':
                effects = element_metadata.get('effects', {})
                chromaKeyData = element_metadata.get('chromaKeyDetectionData', {})
                stageMasks = element_metadata.get('stageMasks', None)
                masks = decode_masks(DataSaver.get_stage(stageMasks) or {}) if stageMasks else None    
                video_file = videos[idx]                    
                video_data[idx] = {
                    'idx': idx,
                    'video_id': video_id,
                    'video_file': video_file,
                    'effects': effects,
                    'stageMasks': stageMasks,
                    'masks': masks,
                    'chromaKeyData': chromaKeyData,
                    'rect': rect,
                    'extra_data': {},
                    'rotation': rotation,
                    'flipped': flipped,
                    'draw': draw,
                }
                video_input = os.path.join(temp_dir, f'input_{video_id}.mp4')
                video_file.save(video_input)
                
            elif element_type == 'text':
                text = element_metadata.get('text', '')
                style = element_metadata.get('style', {})
                font_family = style.get('fontFamily', 'Raleway')
                font_size = style.get('fontSize', 20)
                color = style.get('color', '#FFFFFF')
                bold = style.get('fontWeight', 'normal')
                italic = style.get('fontStyle', '')
                align = style.get('textAlign', 'left')
                
                duration = end_t - start_t if start_t and end_t else 5
                text_fps = fps or 1
                is_bold = bold == int(bold) >= 700 if isinstance(bold, int) else bold == 'bold'
                is_italic = 'italic' in italic
                text_frame = create_text_frame(text, font_family, font_size, color, is_bold, is_italic, align, rect.width, rect.height)
                text_frames = replicate_frame_as_video_array(text_frame, duration, text_fps)
                video_input = VideoArray(text_frames, text_fps)
              
            # Adiciona layer com configurações
            compositor.add_layer(LayerInfo(
                video=video_input,
                rect=rect,
                layer_idx=idx,
                st_offset=st_offset,
                start_t=start_t,
                end_t=end_t,
                rotation=rotation,
                speed=speed,
                flipped=flipped,
                draw=draw,
            ))
        
        def process_frame(
            render_info: RenderInfo, 
            frame: np.ndarray, 
            frame_idx: int, 
            fps: int, 
            layer_width: int, 
            layer_height: int, 
            roi_info: RoiInfo,
            render_infos: List[RenderInfo],
            processing_stage: int,
        ) -> np.ndarray:
            """Função de callback para processar cada frame"""
            video_idx = render_info.layer.layer_idx
            if video_idx not in video_data:
                return frame
            
            rect = video_data[video_idx].get('rect', None)
            masks = video_data[video_idx].get('masks', None)
            effects_config = video_data[video_idx].get('effects', {})
            chromaKeyData = video_data[video_idx].get('chromaKeyData', {})
            extra_data = video_data[video_idx].get('extra_data', None)
            rotation = video_data[video_idx].get('rotation', 0)
            flipped = video_data[video_idx].get('flipped', False)
                        
            if processing_stage == PROCESS_STAGE_POST_TRANSFORM:
                return processor.process_post_transform(
                    render_info, frame, masks, effects_config, 
                    chromaKeyData, enable_transparency, frame_idx,
                    layer_width, layer_height, roi_info,
                    rect, video_data, extra_data, rotation, flipped, render_infos
                )
            else:
                return processor.process_pre_transform(
                    render_info, frame, masks, effects_config, 
                    chromaKeyData, enable_transparency, frame_idx,
                    layer_width, layer_height,
                    rect, video_data, extra_data, flipped, render_infos
                )
                
        compositor.render(on_frame=process_frame)


        # Retorna o primeiro vídeo processado
        print("\n[RESPOSTA] Enviando vídeo processado:", compositor.output_path)
            
        fd, path = tempfile.mkstemp(suffix='.mp4')
        os.close(fd)  # Fecha o file descriptor

        temp_path = Path(path)

        comp_browser(
            input_path=compositor.output_path,
            output_path=temp_path,
            crf=23,
            preset='fast',
            audio_codec='aac',
            video_codec='libx264'
        )

        return send_file(
            temp_path,
            as_attachment=True,
            download_name='video_processado.mp4'
        )

    except Exception as e:
        traceback.print_exc("\n[ERRO CRÍTICO]", str(e))
        return jsonify({'error': str(e)}), 500

    finally:
        # Limpeza dos arquivos temporários
        try:
            os.remove(compositor.output_path)
            os.remove(temp_path)
        except Exception as e:
            print("Erro na limpeza:", str(e))
        
        print("\n=== FIM DA REQUISIÇÃO ===")

# app.register_blueprint(auth_bp, url_prefix='/auth')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=38080)
