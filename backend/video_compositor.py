import cv2
import numpy as np
import math
from typing import List, Dict, Optional, Tuple, Callable, Union
from dataclasses import dataclass

PROCESS_STAGE_PRE_TRANSFORM = 0
PROCESS_STAGE_POST_TRANSFORM = 1

@dataclass
class LayerInfo:
    """Classe para armazenar informações de cada layer (vídeo/imagem)."""
    video: Union[str, 'VideoArray']  # Caminho do vídeo ou objeto VideoArray
    rect: 'Rect'
    layer_idx: int
    st_offset: int = 0.0 # Offset de início (em segundos)
    start_t: float = 0.0  # Tempo de início (em segundos)
    end_t: Optional[float] = None  # Tempo de fim (em segundos, None=até o final)
    rotation: int = 0
    speed: float = 1
    flipped: bool = False
    draw: bool = True
    fps: int = 30
    
    @property
    def x(self) -> float:
        return self.rect.x

    @property
    def y(self) -> float:
        return self.rect.y
    
    @property
    def width(self) -> float:
        return self.rect.width
    
    @property
    def height(self) -> float:
        return self.rect.height

    @x.setter
    def x(self, value: float):
        self.rect.x = value

    @y.setter
    def y(self, value: float):
        self.rect.y = value

    @width.setter
    def width(self, value: float):
        self.rect.width = value

    @height.setter
    def height(self, value: float):
        self.rect.height = value

class VideoArray:
    """Mock de um vídeo como lista de frames (np.ndarray)."""
    def __init__(self, frames: List[np.ndarray], fps: float = 30.0):
        self.frames = frames
        self._fps = fps

    def __len__(self):
        return len(self.frames)

    def __getitem__(self, idx):
        return self.frames[idx]

    @property
    def shape(self):
        return self.frames[0].shape if self.frames else (0, 0, 0)

    @property
    def fps(self):
        return self._fps

class VideoCaptureObject:
    """Classe base abstrata com interface comum."""
    @property
    def fps(self) -> float:
        raise NotImplementedError

    @property
    def width(self) -> int:
        raise NotImplementedError

    @property
    def height(self) -> int:
        raise NotImplementedError

    @property
    def frame_count(self) -> int:
        """Retorna o número total de frames do vídeo."""
        raise NotImplementedError

    def set_frame(self, frame_idx: int) -> None:
        raise NotImplementedError

    def read(self) -> Tuple[bool, np.ndarray]:
        raise NotImplementedError

    def release(self) -> None:
        """Libera os recursos do vídeo."""
        raise NotImplementedError

class VideoCapturePath(VideoCaptureObject):
    def __init__(self, video_path: str):
        self.cap: cv2.VideoCapture = cv2.VideoCapture(video_path)
    
    @property
    def fps(self) -> float:
        """Retorna o FPS do vídeo."""
        return self.cap.get(cv2.CAP_PROP_FPS)
    
    @property
    def width(self) -> int:
        """Retorna a largura do vídeo."""
        return int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    
    @property
    def height(self) -> int:
        """Retorna a altura do vídeo."""
        return int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    @property
    def frame_count(self) -> int:
        """Retorna o número total de frames do vídeo."""
        return int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    def set_frame(self, fram_idx: int) -> None:
        """Define a posição do frame atual."""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, fram_idx)
    
    def read(self) -> Tuple[bool, np.ndarray]:
        return self.cap.read()
    
    def release(self):
        self.cap.release()
    
class VideoCaptureArray(VideoCaptureObject):
    def __init__(self, video: VideoArray):
        self.video = video
        self.index = 0

    @property
    def fps(self) -> float:
        return self.video.fps

    @property
    def width(self) -> int:
        return self.video.shape[1]

    @property
    def height(self) -> int:
        return self.video.shape[0]

    @property
    def frame_count(self) -> int:
        return len(self.video)

    def set_frame(self, frame_idx: int) -> None:
        self.index = frame_idx

    def read(self) -> Tuple[bool, np.ndarray]:
        if 0 <= self.index < len(self.video):
            frame = self.video[self.index]
            self.index += 1
            return True, frame
        return False, None

    def release(self) -> None:
        self.index = 0
        self.video = None

class RenderInfo:
    def __init__(self, video: Union[str, VideoArray], layer_info: LayerInfo, size: Tuple[int, int]):
        if isinstance(video, str):
            self.capture: VideoCaptureObject = VideoCapturePath(video)
        elif isinstance(video, VideoArray):
            self.capture: VideoCaptureObject = VideoCaptureArray(video)
        else:
            raise ValueError('Tipo de vídeo inválido. Deve ser str ou VideoArray.')
        
        self.frame_position: int = 0
        self.layer: LayerInfo = layer_info
        self.cached_mask: Optional[np.ndarray] = None  # Máscara atual (se houver)
        self.cached_frame: Optional[np.ndarray] = None  # Frame atual
        self.cached_frame_pos: int = -1  # Posição do frame atual no cache
        self.size = size
        
        if self.layer.width == None:
            self.layer.width = int(self.capture.width)
        if self.layer.height == None:
            self.layer.height = int(self.capture.height)
            
    def get_frame_by_idx(self, frame_idx: int) -> Tuple[int, np.ndarray]:
        self.capture.set_frame(frame_idx)
        ret, frame = self.capture.read()
        return ret, frame
    
    @property
    def fps(self) -> float:
        """Retorna o FPS do vídeo."""
        return self.capture.fps

class RoiInfo:
    def __init__(self, roi: np.ndarray, y1: int, y2: int, x1: int, x2: int, fy1: int, fy2: int, fx1: int, fx2: int,):
        self.roi = roi
        self.y1 = y1
        self.y2 = y2
        self.x1 = x1
        self.x2 = x2
        self.fy1 = fy1
        self.fy2 = fy2
        self.fx1 = fx1
        self.fx2 = fx2

class Rect:
    def __init__(self, x: int, y: int, width: int, height: int) -> None:
        self.x = x
        self.y = y
        self.width = width
        self.height = height

class VideoCompositor:
    def __init__(self, output_path: str, output_width: int, output_height: int, fps: Optional[float] = None):
        self.output_path = output_path
        self.output_width = output_width
        self.output_height = output_height
        self.fps = fps
        self.layers: List[LayerInfo] = []

    def add_layer(self, layer: LayerInfo) -> None:
        """Adiciona uma layer à composição, ordenando-a pelo layer_idx."""
        self.layers.append(layer)
        self.layers.sort(key=lambda x: x.layer_idx)  # Garante ordem correta

    def _get_duration(self, video_capture: VideoCaptureObject) -> float:
        """Retorna a duração total do vídeo."""
        fps = video_capture.fps
        frame_count = video_capture.frame_count
        return frame_count / max(fps, 1)

    def _get_effective_duration(self, layer: LayerInfo, cap: cv2.VideoCapture) -> float:
        """Calcula a duração máxima entre todos os vídeos (considerando os offsets)."""
        total_duration = self._get_duration(cap)
        end_t = layer.end_t if layer.end_t is not None else total_duration
        effective_duration = (end_t - layer.start_t) / layer.speed
        return effective_duration + layer.st_offset
    
    def _should_render_layer(self, render_info: RenderInfo, current_time: float) -> bool:
        """Determina se a layer deve ser renderizada no tempo atual."""
        # Se o tempo atual é antes do offset de início
        if current_time < render_info.layer.st_offset:
            return False
            
        # Verifica se já passou do tempo final
        video_time = render_info.layer.start_t + (current_time * render_info.layer.speed) - render_info.layer.st_offset
        end_time = render_info.layer.end_t if render_info.layer.end_t is not None else self._get_duration(render_info.capture)
        
        return render_info.layer.start_t <= video_time < end_time
            
    def _apply_layer(
        self, 
        render_infos: List[RenderInfo], 
        composite: np.ndarray, 
        layer: LayerInfo, 
        frame_idx: int, 
        fps: int,
        on_frame: Optional[Callable[[RenderInfo, np.ndarray, int, int], np.ndarray]] = None
    ) -> bool:
        """
        Aplica uma layer ao frame composto, respeitando a máscara.
        Retorna True se o frame foi aplicado, False se o vídeo já terminou.
        """
        render_info = render_infos[layer.layer_idx]
        global_time = frame_idx / fps
        
        if not self._should_render_layer(render_info, global_time):
            #print('Not rendering at:', global_time)
            return False
        
        video_time = layer.start_t + (global_time  * layer.speed) - layer.st_offset
        target_frame_pos = int(video_time * render_info.fps)
        
        width, height = int(layer.width), int(layer.height)
        x, y = int(layer.x), int(layer.y)
        
        if render_info.cached_frame_pos != target_frame_pos:
            ret, frame = render_info.get_frame_by_idx(target_frame_pos)
            if not ret:
                return False
                
            frame = cv2.resize(frame, (width, height))
            
            if layer.flipped:
                frame = cv2.flip(frame, 1)
            
            render_info.cached_frame = frame
            render_info.cached_frame_pos = target_frame_pos
        
        frame = on_frame(
            render_info, 
            render_info.cached_frame, 
            target_frame_pos, 
            fps, 
            width,
            height,
            None,#RoiInfo(roi, y1, y2, x1, x2, fy1, fy2, fx1, fx2)
            render_infos,
            PROCESS_STAGE_PRE_TRANSFORM,
        ) if on_frame else frame
        
        if frame is None:
            return False
                
        # Aplica rotação ao frame
        if layer.rotation:
            if frame.shape[2] == 3:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
                
            h, w = frame.shape[:2]
            center = (w // 2, h // 2)
            
            # Calcula a nova bounding box após a rotação
            radians = math.radians(layer.rotation)
            sin = math.sin(radians)
            cos = math.cos(radians)
            new_w = int((h * abs(sin)) + (w * abs(cos)))
            new_h = int((h * abs(cos)) + (w * abs(sin)))
            
            # Ajusta a matriz de transformação para incluir a translação
            M = cv2.getRotationMatrix2D(center, -layer.rotation, 1.0)
            M[0, 2] += (new_w - w) / 2
            M[1, 2] += (new_h - h) / 2
            
            # Aplica a rotação com as novas dimensões
            frame = cv2.warpAffine(frame, M, (new_w, new_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
            
            # Atualiza as coordenadas para manter o centro na mesma posição
            x -= (new_w - w) // 2
            y -= (new_h - h) // 2
            width, height = new_w, new_h
        
        # Coordenadas visíveis no canvas
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(composite.shape[1], x + width)
        y2 = min(composite.shape[0], y + height)
        
        if x1 >= x2 or y1 >= y2:
            return False
        
        fx1 = x1 - x
        fy1 = y1 - y
        fx2 = fx1 + (x2 - x1)
        fy2 = fy1 + (y2 - y1)
        
        # Região de interesse (ROI) no frame composto
        roi = composite[y1:y2, x1:x2]
        frame = frame[fy1:fy2, fx1:fx2]
                       
        frame = on_frame(
            render_info, 
            frame, 
            target_frame_pos, 
            fps, 
            width,
            height,
            RoiInfo(roi, y1, y2, x1, x2, fy1, fy2, fx1, fx2),
            render_infos,
            PROCESS_STAGE_POST_TRANSFORM,
        ) if on_frame else frame
        
        if frame is None:
            return False
                    
        if frame.shape[2] == 4:  # Se tem alpha channel
            alpha = frame[..., 3] / 255.0
            for c in range(3):
                roi[..., c] = (
                    frame[..., c] * alpha +
                    roi[..., c] * (1 - alpha)
            ).astype(np.uint8)
        else:
            roi[:] = frame
                    
        return True
        
    def render(
        self, 
        on_frame: Optional[Callable[[RenderInfo, np.ndarray, int, int], np.ndarray]] = None,
        on_progress: Callable[[float], None] = None, 
        progress_interval: int = 30
    ) -> None:
        """Renderiza o vídeo composto e salva em `output_path`."""
        output_width = int(self.output_width)
        output_height = int(self.output_height)
        
        render_infos = { layer.layer_idx: RenderInfo(layer.video, layer, (output_width, output_height)) for layer in self.layers }
        fps = self.fps if self.fps is not None else (max(ri.capture.fps for ri in render_infos.values()) or 30.0)
        max_duration = max(self._get_effective_duration(layer, ri.capture) for layer, ri in zip(self.layers, render_infos.values()) if layer.draw)
        
        total_frames = int(max_duration * fps)  
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(
            self.output_path,
            fourcc,
            fps,
            (output_width, output_height)
        )

        for frame_idx in range(total_frames):
            composite = np.zeros((output_height, output_width, 3), dtype=np.uint8)
            
            for layer in self.layers:
                if layer.draw:
                    self._apply_layer(render_infos, composite, layer, frame_idx, fps, on_frame)
            
            out.write(composite)
            
            # Mostra progresso
            if on_progress and frame_idx % progress_interval == 0:  # A cada ~1 segundo
                on_progress(frame_idx / total_frames * 100.0)

        # Libera todos os recursos
        out.release()
        for ri in render_infos.values():
            ri.capture.release()
            
if __name__ == "__main__":
    # Exemplo de uso
    compositor = VideoCompositor("output.mp4", 1280, 720, fps=30.0)
    
    # Adiciona layers (exemplo com vídeos fictícios)
    compositor.add_layer(LayerInfo("videos\\video1.mp4", 0, 0, 640, 720, layer_idx=1))
    compositor.add_layer(LayerInfo("videos\\video1.mp4", 640, 0, 640, 720, layer_idx=2))
    
    compositor.render(on_progress=lambda p: print(f"Progresso: {p:.2f}%"), progress_interval=30)
    print("Composição concluída e salva em 'output.mp4'.")