from typing import List, Tuple, Dict, Union
from video_compositor import RenderInfo
import numpy as np

class VideoAnimationProcessor:
    def __init__(self):
        self.opacity_info = {}
    
    @staticmethod
    def apply_opacity_on_frame(frame: np.ndarray, opacity: float) -> np.ndarray:
        if opacity < 1.0:
            if frame.shape[2] == 4:
                frame[..., 3] = (frame[..., 3] * opacity).astype(np.uint8)
            else:
                # Se não tiver canal alfa, adiciona um com opacidade
                alpha = np.full(frame.shape[:2], int(255 * opacity), dtype=np.uint8)
                frame = np.dstack((frame, alpha))
        return frame
    
    def change_opacity(
        self, 
        frame: np.ndarray, 
        key: Union[int, str],
        new_opacity: float, 
        origin_type: str, 
        origin_name: str
    ) -> np.ndarray:
        if key in self.opacity_info:
            last_origin_type, last_origin_name, old_opacity = self.opacity_info[key]

            if (last_origin_name != origin_name):
                if last_origin_type == 'animation' and origin_type == 'limit': return frame
                if last_origin_type == origin_type: pass

        self.opacity_info[key] = [origin_type, origin_name, new_opacity]
        return VideoAnimationProcessor.apply_opacity_on_frame(frame, new_opacity)
    
    def apply_fade_effect(
        self,
        frame: np.ndarray, 
        type: str,
        settings: Dict, 
        current_time: float, 
        render_info: RenderInfo
    ) -> np.ndarray: 
        video_current_time = current_time - render_info.layer.st_offset
        video_total_duration = render_info.duration / render_info.layer.speed
        
        animation_duration = settings.get('duration', 1) 
        
        _id = render_info.layer.layer_idx
        
        if type == 'in':
            animation_start = settings.get('start', 0)
            time_since_start = video_current_time - animation_start
            
            if time_since_start >= 0 and time_since_start < animation_duration:
                opacity = time_since_start / animation_duration
                return self.change_opacity(frame, _id, opacity, 'animation', 'in')
            elif time_since_start >= animation_duration:
                return self.change_opacity(frame, _id, 1, 'limit', 'in')
            else:
                return self.change_opacity(frame, _id, 0, 'limit', 'in')
        
        elif type == 'out':
            animation_start = settings.get('start', video_total_duration - animation_duration)
            time_since_start = video_current_time - animation_start

            if 0 <= time_since_start < animation_duration:
                opacity = max(0, 1 - (time_since_start / animation_duration))
                return self.change_opacity(frame, _id, opacity, 'animation', 'out')
            elif time_since_start >= animation_duration:
                return self.change_opacity(frame, _id, 0, 'limit', 'out')
            else:
                return self.change_opacity(frame, _id, 1, 'limit', 'out')
        
        return frame
    
    def process_animation(
        self, 
        frame: np.ndarray, 
        animation_name: str, 
        settings: Dict,
        current_time: float, 
        render_info: RenderInfo
    ) -> np.ndarray:
        if (animation_name == 'Fadein'):
            return self.apply_fade_effect(frame, 'in', settings, current_time, render_info)
        
        if (animation_name == 'Fadeout'):
            return self.apply_fade_effect(frame, 'out', settings, current_time, render_info)
        
        return frame
            
    def process_animations(
        self, 
        frame: np.ndarray, 
        animations: List[Dict[str, Union[str, Dict]]],
        current_time: float, 
        render_info: RenderInfo
    ) -> np.ndarray:
        for animation in animations:
            name = animation['name']
            settings = animation.get('settings', {})
            frame = self.process_animation(frame, name, settings, current_time, render_info)
        return frame