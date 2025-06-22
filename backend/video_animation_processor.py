from typing import List, Tuple, Dict, Union, Optional
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

            # Check if the opacity was previously changed by a different origin
            if (last_origin_name != origin_name):
                # Animation changes have priority over limit changes,
                if last_origin_type == 'animation' and origin_type == 'limit': return frame
                if last_origin_type == origin_type: pass

        self.opacity_info[key] = [origin_type, origin_name, new_opacity]
        
        # Apply the new opacity to the frame and return the modified frame
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
            # Calculate the elapsed time since the animation start
            animation_start = settings.get('start', 0)
            time_since_start = video_current_time - animation_start
            
            # If animation is in progress, increase opacity gradually from 0 to 1
            if time_since_start >= 0 and time_since_start < animation_duration:
                opacity = time_since_start / animation_duration
                return self.change_opacity(frame, _id, opacity, 'animation', 'in')
            # If animation is finished, keep opacity at 1 (fully visible)
            elif time_since_start >= animation_duration:
                return self.change_opacity(frame, _id, 1, 'limit', 'in')
            # If animation hasn't started yet, keep opacity at 0 (fully transparent)
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
    
    @staticmethod
    def get_position(time: float, points: List[Dict[str, float]]) -> Optional[Tuple[float, float]]:
        """
        Returns the interpolated position (x, y) of an element at a given time,
        based on a list of keyframe points.

        :param time: The time at which to calculate the position.
        :param points: A list of Point(x, y, time) keyframes sorted by time.
        :return: Tuple of (x, y) or (None, None) if no points exist.
        """
        if not points:
            return None, None

        if len(points) == 1:
            return points[0]['x'], points[0]['y']

        # If time is before the first point, return the first position
        if time < points[0]['time']:
            return points[0]['x'], points[0]['y']

        # If time is after the last point, return the last position
        if time > points[-1]['time']:
            return points[-1]['x'], points[-1]['y']

        # Find two keyframes between which the current time falls
        for i in range(len(points) - 1):
            p0 = points[i]
            p1 = points[i + 1]

            if p0['time'] <= time <= p1['time']:
                # Linear interpolation
                alpha = (time - p0['time']) / (p1['time'] - p0['time']) # Linear interpolation factor
                x = p0['x'] + alpha * (p1['x'] - p0['x']) # Interpolated x position
                y = p0['y'] + alpha * (p1['y'] - p0['y']) # Interpolated y position
                return x, y

        # Fallback (should not happen)
        return points[-1]['x'], points[-1]['y']
    
    def apply_movement_animation(self, render_info: RenderInfo, settings: Dict, current_time: float) -> None:
        points = settings.get('points', [])

        if not points:
            return

        x, y = VideoAnimationProcessor.get_position(current_time, points)

        render_info.layer.rect.x = x if x != None else render_info.layer.rect.x
        render_info.layer.rect.y = y if y != None else render_info.layer.rect.y
    
    def process_animation(
        self, 
        frame: np.ndarray, 
        animation_name: str, 
        settings: Dict,
        current_time: float, 
        render_info: RenderInfo
    ) -> np.ndarray:
        if (animation_name == 'Fade_in'):
            return self.apply_fade_effect(frame, 'in', settings, current_time, render_info)
        
        if (animation_name == 'Fade_out'):
            return self.apply_fade_effect(frame, 'out', settings, current_time, render_info)
        
        if (animation_name == 'Movement_mov'):
            self.apply_movement_animation(render_info, settings, current_time)
        
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