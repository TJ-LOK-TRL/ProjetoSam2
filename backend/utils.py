import os
import numpy as np
import cv2
import base64
import subprocess
import base64
import uuid
from PIL import Image
from io import BytesIO
from pathlib import Path
from typing import List, Optional, Dict, Union, Tuple

def get_interpolated_numbers(min: int, max: int, interpolation_value: int) -> List[int]:
    """Retorna uma lista de números inteiros interpolados entre min e max"""
    return np.linspace(min, max, num=interpolation_value).astype(int).tolist()

def resize_frame(frame: np.ndarray, width: Optional[int] = None, height: Optional[int] = None) -> np.ndarray:
    """
    Redimensiona um frame mantendo a proporção se apenas um dos parâmetros for fornecido.
    """
    
    original_height, original_width = frame.shape[:2]

    if width is None and height is None:
        return frame

    if width is not None and height is not None:
        return cv2.resize(frame, (width, height))

    if width is not None:
        ratio = width / original_width
        height = int(original_height * ratio)
        return cv2.resize(frame, (width, height))

    if height is not None:
        ratio = height / original_height
        width = int(original_width * ratio)
        return cv2.resize(frame, (width, height))
    
def prepare_mask(mask: np.ndarray) -> np.ndarray:
    """Converte a máscara para o formato 2D adequado"""
    # Remove dimensões extras
    mask = np.squeeze(mask)
    
    # Garante que é 2D
    if len(mask.shape) == 3:
        # Se for (1,H,W) ou (H,W,1)
        if mask.shape[0] == 1:
            mask = mask[0]
        elif mask.shape[2] == 1:
            mask = mask[:,:,0]
        else:
            raise ValueError("Formato 3D inválido para máscara")
    
    # Conversão final para uint8
    return mask.astype(np.uint8) * 255

def encode_mask(mask: np.ndarray) -> np.ndarray:
    try:
        # Pré-processamento
        mask_uint8 = prepare_mask(mask)
        
        # Verificação final
        if len(mask_uint8.shape) != 2:
            raise ValueError(f"Formato inválido pós-processamento: {mask_uint8.shape}")
        
        # Codificação com OpenCV
        success, buffer = cv2.imencode('.png', mask_uint8)
        if not success:
            raise ValueError("OpenCV não conseguiu codificar a máscara")
            
        return base64.b64encode(buffer).decode('utf-8')
        
    except Exception as e:
        print(f"Erro na codificação: {str(e)}")
        print(f"Shape da máscara: {mask.shape if hasattr(mask, 'shape') else 'N/A'}")
        print(f"Tipo da máscara: {type(mask)}")
        raise
    
def comp_browser(
    input_path,
    output_path=None,
    crf=23,
    preset='fast',
    audio_codec='aac',
    video_codec='libx264',
    extra_flags=None
):
    """
    Converts a video to a browser-compatible format (H.264 + AAC).

    Args:
        input_path (str | Path): Input video file path.
        output_path (str | Path, optional): Output path. If None, appends '_converted.mp4' to the original name.
        crf (int, optional): Constant Rate Factor (0-51, where 23 is a good default).
        preset (str, optional): Compression speed (ultrafast, superfast, veryfast, faster, fast, medium...).
        audio_codec (str, optional): Audio codec to use (default: aac).
        video_codec (str, optional): Video codec to use (default: libx264).
        extra_flags (list, optional): List of additional FFmpeg flags.

    Returns:
        Path: Path to the converted file.
    """
    input_path = Path(input_path)
    if output_path is None:
        output_path = input_path.with_name(f"{input_path.stem}_converted.mp4")
    else:
        output_path = Path(output_path)

    cmd = [
        'ffmpeg',
        '-y', # Overwrite output file without asking
        '-i', str(input_path), # Input file
        '-c:v', video_codec, # Video codec
        '-preset', preset, # Compression speed/efficiency trade-off
        '-crf', str(crf),  # Constant Rate Factor (lower is better quality)
        '-c:a', audio_codec, # Audio codec
        '-movflags', '+faststart', # Enables progressive streaming (start video before full download)
        str(output_path) # Output file path
    ]

    if extra_flags:
        cmd = cmd[:-1] + extra_flags + [str(output_path)]

    subprocess.run(cmd, check=True)
    return output_path

def hexToRgb(hex_color: Optional[str]) -> Optional[dict]:
    color = {
        'r': int(hex_color[1:3], 16),
        'g': int(hex_color[3:5], 16),
        'b': int(hex_color[5:7], 16)
    } if hex_color else None
    
    return color

def decode_mask(mask_data: str) -> Optional[np.ndarray]:
    """Converte uma máscara serializada de volta para numpy array RGB"""
    if not mask_data:
        return None

    try:
        header, data = mask_data.split(',', 1)
        if 'base64' not in header:
            return None

        mask_bytes = base64.b64decode(data)
        img = Image.open(BytesIO(mask_bytes)).convert('RGB')  # Garante RGB
        mask = np.array(img)

        return mask  # Já está em RGB

    except Exception as e:
        print(f"Erro ao decodificar máscara: {str(e)}")
        return None
    
def decode_masks(masks: Dict[int, Dict[int, Dict[str, Union[Tuple[int, int, int], str]]]]) -> Dict[int, Dict[int, np.ndarray]]:
    """
    Decodifica todas as máscaras serializadas para arrays numpy, evitando decodificar repetidamente.
    """
    decoded = {}
    for frame_idx, group in masks.items():
        decoded[frame_idx] = {}
        for obj_id, mask_info in group.items():
            # Cada mask_info deve ter pelo menos a chave 'data'
            if isinstance(mask_info, dict) and 'data' in mask_info:
                decoded_mask = decode_mask(mask_info['data'])
                decoded[frame_idx][obj_id] = decoded_mask
            else:
                decoded[frame_idx][obj_id] = None  # Ou deixar sem máscara se não tiver 'data'
    
    return decoded

def unique_filename(folder: str, prefix: str = "file_", ext: str = ".txt") -> str:
    """
    Gera um nome de ficheiro único que ainda não exista no diretório fornecido.
    
    Args:
        folder (str): Caminho da pasta onde o ficheiro será salvo.
        prefix (str): Prefixo opcional para o nome do ficheiro.
        ext (str): Extensão do ficheiro, incluindo o ponto (ex: '.txt').

    Returns:
        str: Nome de ficheiro único (apenas o nome, não o caminho completo).
    """
    while True:
        filename = f"{prefix}{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(folder, filename)
        if not os.path.exists(full_path):
            return filename
   
def convert_frame_to_video(frame: np.ndarray, duration: float, output_path: str, fps: int = 30) -> None:
    """
    Converte um frame numpy array para um vídeo MP4 com duração especificada e salva em arquivo.

    Args:
        frame (np.ndarray): O frame a ser convertido.
        duration (float): Duração do vídeo em segundos.
        output_path (str): Caminho para salvar o arquivo de vídeo.
        fps (int): Frames por segundo do vídeo.

    Returns:
        None
    """
    if len(frame.shape) == 2:
        frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    elif frame.shape[2] == 4:
        frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
    
    num_frames = int(duration * fps)
    height, width = frame.shape[:2]

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    for _ in range(num_frames):
        out.write(frame)

    out.release()
    
def replicate_frame_as_video_array(frame: np.ndarray, duration: float, fps: int = 30) -> List[np.ndarray]:
    """
    Retorna uma lista de frames duplicados a partir de um frame único,
    respeitando a duração e fps fornecidos.

    Args:
        frame (np.ndarray): Frame base.
        duration (float): Duração total em segundos.
        fps (int): Frames por segundo.

    Returns:
        List[np.ndarray]: Lista de frames.
    """
    num_frames = int(duration * fps)
    return [frame.copy() for _ in range(num_frames)]