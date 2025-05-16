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
    Converte um vídeo para formato compatível com browsers (H.264 + AAC).

    Args:
        input_path (str | Path): Caminho para o ficheiro de entrada.
        output_path (str | Path, optional): Caminho de saída. Se None, usa o mesmo nome com '_converted.mp4'.
        crf (int, optional): Constant Rate Factor para qualidade (0-51, onde 23 é bom).
        preset (str, optional): Velocidade de compressão (ultrafast, superfast, veryfast, faster, fast, medium...).
        audio_codec (str, optional): Codec de áudio (padrão: aac).
        video_codec (str, optional): Codec de vídeo (padrão: libx264).
        extra_flags (list, optional): Lista com flags extra para FFmpeg.

    Returns:
        Path: Caminho para o ficheiro convertido.
    """
    input_path = Path(input_path)
    if output_path is None:
        output_path = input_path.with_name(f"{input_path.stem}_converted.mp4")
    else:
        output_path = Path(output_path)

    cmd = [
        'ffmpeg',
        '-y', 
        '-i', str(input_path),
        '-c:v', video_codec,
        '-preset', preset,
        '-crf', str(crf),
        '-c:a', audio_codec,
        '-movflags', '+faststart',
        str(output_path)
    ]

    if extra_flags:
        cmd = cmd[:-1] + extra_flags + [str(output_path)]

    print("Comando FFmpeg:", " ".join(cmd))
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
    