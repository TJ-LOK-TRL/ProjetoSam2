import cv2
from typing import *
import numpy as np

class VideoProcessor:
    def __init__(self, video_path: str):
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)

    def get_num_frames(self) -> int:
        """Retorna o numero de frames do vídeo"""
        return int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))

    def get_fps(self) -> float:
        """Retorna os frames por segundo (FPS) do vídeo"""
        return self.cap.get(cv2.CAP_PROP_FPS)

    def get_frame(self, frame_number: int) -> np.ndarray:
        """Retorna um frame específico em formato numpy array"""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = self.cap.read()
        return frame if ret else None
    
    def release(self) -> None:
        """Liberta os recursos utilizados da memória"""
        if self.cap:
            self.cap.release()
            
    def get_size(self) -> Tuple[int, int]:
        """Retorna o tamanho do vídeo"""
        return int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))