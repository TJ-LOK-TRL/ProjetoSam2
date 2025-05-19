import cv2
import numpy as np
from typing import Dict, Any, Optional
from utils import *
from video_compositor import RenderInfo, RoiInfo, Rect
import math

class VideoEffectsProcessor:
    @staticmethod
    def apply_blend(
        frame: np.ndarray, 
        blend_frame: np.ndarray, 
        mask: np.ndarray, 
        detection: int = 255
    ) -> np.ndarray:
        h, w = frame.shape[:2]  # altura/largura do frame principal
        bh, bw = blend_frame.shape[:2]  # altura/largura do blend_frame

        # Se o blend_frame for menor que o frame, redimensiona (ou lança erro)
        if bh < h or bw < w:
            blend_frame = cv2.resize(blend_frame, (w, h))
        
        # Aplica a máscara (pega apenas os pixels onde mask == detection)
        frame[mask == detection] = blend_frame[:h, :w][mask == detection]
        
        return frame
    
    @staticmethod
    def apply_follow_overlap(frame: np.ndarray, rect: Rect, destX: int, destY: int) -> np.ndarray:
        # Lógica para seguir a máscara (similar ao JavaScript)
        width = frame.shape[1]
        height = frame.shape[0]
    
        # Se for BGRA, converte para BGR para processamento
        if frame.shape[2] == 4:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
        else:
            frame_bgr = frame.copy()
        
        # Calcula a posição do vídeo para centralizar na máscara
        pos_x = destX - (width // 2)
        pos_y = destY - (height // 2)
        
        # Cria uma matriz de transformação para reposicionar o frame
        M = np.float32([[1, 0, pos_x - rect.x], [0, 1, pos_y - rect.y]])
        
        # Aplica a transformação
        rows, cols = frame_bgr.shape[:2]
        translated_frame = cv2.warpAffine(frame_bgr, M, (cols, rows))
        
        # Mantém a transparência se existir
        if frame.shape[2] == 4:
            alpha_channel = frame[:, :, 3]
            translated_alpha = cv2.warpAffine(alpha_channel, M, (cols, rows))
            translated_frame = cv2.merge((translated_frame[:, :, 0], 
                                          translated_frame[:, :, 1], 
                                          translated_frame[:, :, 2], 
                                          translated_alpha))
        
        return translated_frame
    
    @staticmethod
    def get_center_of_binary_mask(mask: np.ndarray) -> tuple:
        """
        Calcula o centro geométrico de uma máscara binária de forma otimizada.
        
        Args:
            mask: Array numpy (H, W) ou (H, W, 3) representando a máscara binária
                (Valores brancos (255) são considerados parte da máscara)
        
        Returns:
            Tupla (center_x, center_y) ou None se não encontrar pixels brancos
        """
        # Converte para escala de cinza se necessário
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        
        # Cria uma máscara binária (255 onde é branco)
        _, binary_mask = cv2.threshold(mask, 254, 255, cv2.THRESH_BINARY)
        
        # Encontra coordenadas de todos os pixels brancos
        y_coords, x_coords = np.where(binary_mask == 255)
        
        if len(x_coords) == 0:
            return None
        
        # Calcula o centroide usando média das coordenadas
        center_x = int(np.round(np.mean(x_coords)))
        center_y = int(np.round(np.mean(y_coords)))
        
        return (center_x, center_y)
    
    @staticmethod
    def apply_overlap2(
        frame: np.ndarray, 
        mask: np.ndarray, 
        video_rect: Rect, 
        overlap_video_rect: Rect, 
        video_rotation: float, 
        overlap_video_rotation: float
    ):
        """
        Versão final e testada do efeito de sobreposição
        
        Args:
            frame: Frame BGRA (4 canais) do vídeo de sobreposição
            mask: Máscara binária (1 canal) ou colorida (será convertida)
            video_rect: Dicionário com x, y, width, height do vídeo de referência
            overlap_video_rect: Dicionário com x, y, width, height do vídeo de sobreposição
            
        Returns:
            Frame com sobreposição aplicada (BGRA)
        """
        # 1. Pré-processamento do frame (garante BGRA)
        if frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        
        height, width = frame.shape[:2]
        
        # 2. Pré-processamento da máscara (garante 1 canal)
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        mask = mask.astype(np.uint8)
        
        # 3. Calcula posicionamento
        offset_x = video_rect.x - overlap_video_rect.x
        offset_y = video_rect.y - overlap_video_rect.y
        
        # 4. Cria máscara de destino
        full_mask = np.zeros((height, width), dtype=np.uint8)
        
        # 5. Calcula regiões de cópia (com tratamento de bordas)
        src_y_start = max(0, -offset_y)
        src_y_end = min(mask.shape[0], height - offset_y)
        src_x_start = max(0, -offset_x)
        src_x_end = min(mask.shape[1], width - offset_x)
        
        dst_y_start = max(0, offset_y)
        dst_y_end = min(height, offset_y + mask.shape[0])
        dst_x_start = max(0, offset_x)
        dst_x_end = min(width, offset_x + mask.shape[1])
        
        # 6. Copia apenas a região válida
        if (src_y_end > src_y_start) and (src_x_end > src_x_start):
            mask_region = mask[src_y_start:src_y_end, src_x_start:src_x_end]
            full_mask[dst_y_start:dst_y_end, dst_x_start:dst_x_end] = mask_region
        
        # 7. Aplica transparência (forma mais eficiente)
        frame[full_mask == 255, 3] = 0
        
        return frame
    
    @staticmethod
    def apply_overlap3(
        frame: np.ndarray, 
        mask: np.ndarray, 
        video_rect: Rect, 
        overlap_video_rect: Rect, 
        video_rotation: float, 
        overlap_video_rotation: float
    ) -> np.ndarray:
        """
        Versão definitiva com:
        - Corte correto mantendo movimento contínuo nos limites
        - Rotações sincronizadas entre máscara e vídeo
        - Debug consistente
        
        Args:
            frame: Frame BGRA do vídeo de sobreposição (já rotacionado)
            mask: Máscara binária do vídeo de referência
            video_rect: Retângulo do vídeo de referência
            overlap_video_rect: Retângulo do vídeo de sobreposição
            video_rotation: Rotação do vídeo de referência
            overlap_video_rotation: Rotação do vídeo de sobreposição
            
        Returns:
            Frame com sobreposição aplicada (BGRA)
        """
        # 1. Garante BGRA
        if frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        
        height, width = frame.shape[:2]
        
        # 2. Pré-processamento da máscara
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        mask = mask.astype(np.uint8)
        
        # 3. Rotaciona a máscara para corresponder ao vídeo de referência
        if video_rotation != 0:
            h, w = mask.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, -video_rotation, 1.0)
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_NEAREST,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # 4. Redimensiona a máscara para o tamanho do vídeo de referência
        mask = cv2.resize(mask, (int(video_rect.width), int(video_rect.height)))
        
        # 5. Calcula o deslocamento CORRETO (considerando movimento contínuo)
        offset_x = video_rect.x - overlap_video_rect.x
        offset_y = video_rect.y - overlap_video_rect.y
        
        # 6. Cria máscara de destino
        final_mask = np.zeros((height, width), dtype=np.uint8)
        
        # 7. Calcula as regiões de forma que o movimento continue fluido
        # Região da máscara que será visível
        mask_left = max(0, offset_x)
        mask_top = max(0, offset_y)
        mask_right = min(mask.shape[1], offset_x + width)
        mask_bottom = min(mask.shape[0], offset_y + height)
        
        # Região no frame de destino onde a máscara será aplicada
        frame_left = max(0, -offset_x)
        frame_top = max(0, -offset_y)
        frame_right = min(width, mask.shape[1] - offset_x)
        frame_bottom = min(height, mask.shape[0] - offset_y)
        
        # Aplica apenas se houver área visível
        if (mask_right > mask_left) and (mask_bottom > mask_top):
            # Corta a parte visível da máscara
            visible_mask = mask[mask_top:mask_bottom, mask_left:mask_right]
            
            # Posiciona no frame de destino
            final_mask[frame_top:frame_bottom, frame_left:frame_right] = visible_mask
        
        # 7. Modo debug: mostra máscara semi-transparente
        if True:
            # Cria uma imagem de debug (vermelha semi-transparente)
            debug_overlay = np.zeros((height, width, 4), dtype=np.uint8)
            debug_overlay[final_mask == 255] = [255, 255, 255, 128]  # Vermelho com 50% de opacidade
            debug_overlay[final_mask == 0] = [0, 0, 0, 128]
            
            # Combina com o frame original
            alpha = 0.5  # Transparência da máscara de debug
            frame = cv2.addWeighted(frame, 1, debug_overlay, alpha, 0)
        else:
            # Modo normal: aplica transparência onde a máscara é branca
            frame[final_mask == 255, 3] = 0
        
        return frame
    
    @staticmethod
    def apply_overlap4(
        frame: np.ndarray, 
        mask: np.ndarray, 
        video_rect: Rect, 
        overlap_video_rect: Rect, 
        video_rotation: float, 
        overlap_video_rotation: float
    ) -> np.ndarray:
        """
        Versão final que corrige ambos os problemas:
        - Usa sistema de coordenadas absolutas para a máscara
        - Considera corretamente os limites do frame
        - Mantém alinhamento perfeito em todas as posições
        
        Args:
            frame: Frame BGRA do vídeo de sobreposição
            mask: Máscara binária do vídeo de referência
            video_rect: Retângulo do vídeo de referência
            overlap_video_rect: Retângulo do vídeo de sobreposição
            video_rotation: Rotação do vídeo de referência
            overlap_video_rotation: Rotação do vídeo de sobreposição
            
        Returns:
            Frame com sobreposição aplicada (BGRA)
        """
        # 1. Garante BGRA
        if frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        
        height, width = frame.shape[:2]
        
        # 2. Pré-processamento da máscara
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        mask = mask.astype(np.uint8)
        
        # 3. Rotaciona a máscara para corresponder ao vídeo de referência
        if video_rotation != 0:
            h, w = mask.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, -video_rotation, 1.0)
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_NEAREST,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # 4. Redimensiona a máscara para o tamanho do vídeo de referência
        mask = cv2.resize(mask, (int(video_rect.width), int(video_rect.height)))
        
        # 5. Calcula a posição ABSOLUTA da máscara no canvas geral
        # (Não relativa ao vídeo de sobreposição)
        mask_global_x = video_rect.x
        mask_global_y = video_rect.y
        
        # 6. Calcula a posição RELATIVA ao vídeo de sobreposição
        # (Para verificar se está dentro dos limites)
        offset_in_overlap_x = mask_global_x - overlap_video_rect.x
        offset_in_overlap_y = mask_global_y - overlap_video_rect.y
        
        # 7. Cria máscara de destino
        final_mask = np.zeros((height, width), dtype=np.uint8)
        
        # 8. Calcula a área visível
        # Se a máscara estiver totalmente fora do vídeo de sobreposição, ignora
        if (offset_in_overlap_x + mask.shape[1] > 0 and 
            offset_in_overlap_x < overlap_video_rect.width and
            offset_in_overlap_y + mask.shape[0] > 0 and 
            offset_in_overlap_y < overlap_video_rect.height):
            
            # Coordenadas da máscara no espaço global
            mask_x1 = mask_global_x
            mask_y1 = mask_global_y
            mask_x2 = mask_global_x + mask.shape[1]
            mask_y2 = mask_global_y + mask.shape[0]
            
            # Área de interseção com o frame
            intersect_x1 = max(0, mask_x1 - overlap_video_rect.x)
            intersect_y1 = max(0, mask_y1 - overlap_video_rect.y)
            intersect_x2 = min(width, mask_x2 - overlap_video_rect.x)
            intersect_y2 = min(height, mask_y2 - overlap_video_rect.y)
            
            # Apenas se houver área visível
            if intersect_x2 > intersect_x1 and intersect_y2 > intersect_y1:
                # Calcula regiões correspondentes
                src_x1 = intersect_x1 - (mask_x1 - overlap_video_rect.x)
                src_y1 = intersect_y1 - (mask_y1 - overlap_video_rect.y)
                src_x2 = src_x1 + (intersect_x2 - intersect_x1)
                src_y2 = src_y1 + (intersect_y2 - intersect_y1)
                
                dst_x1 = intersect_x1
                dst_y1 = intersect_y1
                dst_x2 = intersect_x2
                dst_y2 = intersect_y2
                
                # Copia apenas a área visível
                final_mask[dst_y1:dst_y2, dst_x1:dst_x2] = mask[src_y1:src_y2, src_x1:src_x2]
            
        # 8. Modo debug: mostra máscara semi-transparente
        if True:
            # Cria uma imagem de debug (vermelha semi-transparente)
            debug_overlay = np.zeros((height, width, 4), dtype=np.uint8)
            debug_overlay[final_mask == 255] = [255, 255, 255, 128]  # Vermelho com 50% de opacidade
            debug_overlay[final_mask == 0] = [0, 0, 0, 128]
            
            # Combina com o frame original
            alpha = 0.5  # Transparência da máscara de debug
            frame = cv2.addWeighted(frame, 1, debug_overlay, alpha, 0)
        
        # Aplica transparência
        frame[final_mask == 255, 3] = 0
        
        return frame
    
    @staticmethod
    def apply_overlap5(
        frame: np.ndarray, 
        mask: np.ndarray, 
        video_rect: Rect, 
        overlap_video_rect: Rect, 
        video_rotation: float, 
        overlap_video_rotation: float
    ) -> np.ndarray:
        """
        Versão corrigida que trata corretamente os casos de borda.
        
        Principais correções:
        1. Considera corretamente quando a máscara está parcialmente fora do frame
        2. Ajusta as coordenadas de origem e destino para alinhamento perfeito
        3. Mantém o sistema de coordenadas consistente em todas as transformações
        """
        # 1. Garante BGRA
        if frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        
        height, width = frame.shape[:2]
        
        # 2. Pré-processamento da máscara
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        mask = mask.astype(np.uint8)
        
        # 3. Rotaciona a máscara para corresponder ao vídeo de referência
        if video_rotation != 0:
            h, w = mask.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, -video_rotation, 1.0)
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_NEAREST,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # 4. Redimensiona a máscara para o tamanho do vídeo de referência
        mask = cv2.resize(mask, (int(video_rect.width), int(video_rect.height)))
        
        # 5. Calcula as coordenadas absolutas da máscara no canvas
        mask_global_x = video_rect.x
        mask_global_y = video_rect.y
        
        # 6. Calcula a posição relativa ao vídeo de sobreposição
        offset_in_overlap_x = mask_global_x - overlap_video_rect.x
        offset_in_overlap_y = mask_global_y - overlap_video_rect.y
        
        # 7. Cria máscara de destino
        final_mask = np.zeros((height, width), dtype=np.uint8)
        
        # 8. Calcula a área de interseção CORRETAMENTE
        # Limites da máscara no sistema de coordenadas do vídeo de sobreposição
        mask_in_overlap_x1 = offset_in_overlap_x
        mask_in_overlap_y1 = offset_in_overlap_y
        mask_in_overlap_x2 = offset_in_overlap_x + mask.shape[1]
        mask_in_overlap_y2 = offset_in_overlap_y + mask.shape[0]
        
        # Área visível do vídeo de sobreposição
        overlap_visible_x1 = 0
        overlap_visible_y1 = 0
        overlap_visible_x2 = width
        overlap_visible_y2 = height
        
        # Calcula interseção
        intersect_x1 = max(mask_in_overlap_x1, overlap_visible_x1)
        intersect_y1 = max(mask_in_overlap_y1, overlap_visible_y1)
        intersect_x2 = min(mask_in_overlap_x2, overlap_visible_x2)
        intersect_y2 = min(mask_in_overlap_y2, overlap_visible_y2)
        
        # Apenas se houver área visível
        if intersect_x2 > intersect_x1 and intersect_y2 > intersect_y1:
            # Calcula regiões correspondentes na máscara original
            src_x1 = intersect_x1 - mask_in_overlap_x1
            src_y1 = intersect_y1 - mask_in_overlap_y1
            src_x2 = src_x1 + (intersect_x2 - intersect_x1)
            src_y2 = src_y1 + (intersect_y2 - intersect_y1)
            
            # Região de destino no frame final
            dst_x1 = intersect_x1
            dst_y1 = intersect_y1
            dst_x2 = intersect_x2
            dst_y2 = intersect_y2
            
            # Copia apenas a área visível
            final_mask[dst_y1:dst_y2, dst_x1:dst_x2] = mask[src_y1:src_y2, src_x1:src_x2]
        
        # Debug: mostra máscara semi-transparente
        if True:
            debug_overlay = np.zeros((height, width, 4), dtype=np.uint8)
            debug_overlay[final_mask == 255] = [0, 0, 255, 128]  # Vermelho com 50% de opacidade
            frame = cv2.addWeighted(frame, 1, debug_overlay, 0.5, 0)
        
        # Aplica transparência onde a máscara é branca
        frame[final_mask == 255, 3] = 0
        
        return frame
    
    @staticmethod
    def apply_overlap6(
        frame: np.ndarray, 
        mask: np.ndarray, 
        video_rect: Rect, 
        overlap_video_rect: Rect, 
        video_rotation: float, 
        overlap_video_rotation: float
    ) -> np.ndarray:
        """
        Versão definitiva que corrige o problema de alinhamento nos limites.
        - Mantém a máscara sempre alinhada com o objeto de referência
        - Considera corretamente o recorte do overlay
        - Preserva o movimento relativo mesmo nos limites
        """
        # 1. Garante BGRA
        if frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        
        height, width = frame.shape[:2]
        
        # 2. Pré-processamento da máscara
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        mask = mask.astype(np.uint8)
        
        # 3. Rotaciona a máscara para corresponder ao vídeo de referência
        if video_rotation != 0:
            h, w = mask.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, -video_rotation, 1.0)
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_NEAREST,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # 4. Redimensiona a máscara para o tamanho do vídeo de referência
        mask = cv2.resize(mask, (int(video_rect.width), int(video_rect.height)))
        
        # 5. Cria máscara de destino do tamanho do frame de overlay
        final_mask = np.zeros((height, width), dtype=np.uint8)
        
        # 6. Calcula o deslocamento relativo entre os dois vídeos
        # Isso mantém a posição relativa mesmo quando o overlay é cortado
        rel_x = video_rect.x - overlap_video_rect.x
        rel_y = video_rect.y - overlap_video_rect.y
        
        # 7. Calcula a área visível da máscara no overlay
        # Limites da máscara no sistema de coordenadas do overlay
        mask_x1 = max(0, rel_x)
        mask_y1 = max(0, rel_y)
        mask_x2 = min(width, rel_x + mask.shape[1])
        mask_y2 = min(height, rel_y + mask.shape[0])
        
        # 8. Se houver área visível
        if mask_x2 > mask_x1 and mask_y2 > mask_y1:
            # Calcula a região correspondente na máscara original
            src_x1 = mask_x1 - rel_x
            src_y1 = mask_y1 - rel_y
            src_x2 = src_x1 + (mask_x2 - mask_x1)
            src_y2 = src_y1 + (mask_y2 - mask_y1)
            
            # Aplica a região visível da máscara
            final_mask[mask_y1:mask_y2, mask_x1:mask_x2] = mask[src_y1:src_y2, src_x1:src_x2]
        
        # Debug: mostra máscara semi-transparente (vermelha)
        debug_overlay = np.zeros((height, width, 4), dtype=np.uint8)
        debug_overlay[final_mask > 0] = [0, 0, 255, 128]  # Vermelho semi-transparente
        frame = cv2.addWeighted(frame, 1, debug_overlay, 0.5, 0)
        
        # Aplica transparência onde a máscara é branca
        frame[final_mask > 0, 3] = 0
        
        return frame
    
    @staticmethod
    def apply_overlap(
        frame: np.ndarray,  # Frame JÁ transformado (rotação/escala aplicada)
        mask: np.ndarray,   # Máscara original
        video_rect: Rect,   # Posição/tamanho da máscara no vídeo final
        video_rotation: float,
        overlap_rect: Rect, # Posição/tamanho do overlap no vídeo final
        final_width: int,   # Tamanho total do vídeo final
        final_height: int,
        roi_info: RoiInfo,  # Informações de clipping já calculadas
        debug: bool = False,
    ) -> np.ndarray:
        # 1. Criar canvas do tamanho do vídeo final
        canvas = np.zeros((final_height, final_width, 4), dtype=np.uint8)
        
        # 2. Posicionar o frame no canvas usando as coordenadas do RoiInfo
        # Usamos as mesmas coordenadas que já foram calculadas para garantir consistência
        canvas[roi_info.y1:roi_info.y2, roi_info.x1:roi_info.x2] = frame
        
        # 3. Processar a máscara (aplicar rotação)
        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        
        if video_rotation:
            h, w = mask.shape
            center = (w//2, h//2)
            M = cv2.getRotationMatrix2D(center, -video_rotation, 1.0)
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # 4. Posicionar máscara no canvas usando as mesmas coordenadas de ROI
        mask_h, mask_w = mask.shape[:2]
        mask_x, mask_y = video_rect.x, video_rect.y
        
        # Coordenadas com clipping - podemos usar as mesmas do frame ou calcular específicas para máscara
        mask_canvas_x1 = max(0, mask_x)
        mask_canvas_y1 = max(0, mask_y)
        mask_canvas_x2 = min(final_width, mask_x + mask_w)
        mask_canvas_y2 = min(final_height, mask_y + mask_h)
        
        if mask_canvas_x1 < mask_canvas_x2 and mask_canvas_y1 < mask_canvas_y2:
            # Região da máscara que será copiada
            mx1 = max(0, -mask_x)
            my1 = max(0, -mask_y)
            mx2 = mx1 + (mask_canvas_x2 - mask_canvas_x1)
            my2 = my1 + (mask_canvas_y2 - mask_canvas_y1)
            
            # 5. Aplicar efeito de transparência nas áreas brancas
            canvas_roi = canvas[mask_canvas_y1:mask_canvas_y2, mask_canvas_x1:mask_canvas_x2]
            mask_roi = mask[my1:my2, mx1:mx2]
            
            # Onde a máscara é branca, torna transparente
            canvas_roi[mask_roi == 255, 3] = 0
            
            # Debug: desenhar máscara em vermelho semi-transparente
            if debug:
                debug_mask = np.zeros_like(canvas_roi)
                debug_mask[mask_roi > 0] = [0, 0, 255, 128]  # Vermelho semi-transparente
                canvas_roi[:] = cv2.addWeighted(canvas_roi, 1, debug_mask, 0.5, 0)
        
        # 6. Cortar apenas a região do overlap usando as mesmas coordenadas do RoiInfo
        # Isso garante que o resultado terá exatamente as mesmas dimensões do frame de entrada
        result = canvas[roi_info.y1:roi_info.y2, roi_info.x1:roi_info.x2].copy()
        
        return result
    
    @staticmethod
    def apply_chroma_key(frame: np.ndarray, chroma_key_data: Dict):
        if not chroma_key_data or frame is None:
            return frame
        
        # Obter parâmetros da configuração
        detection_type = chroma_key_data.get('detectionType', 'Position')
        tolerance = int(chroma_key_data.get('tolerance', 100))
        
        # Determinar a cor alvo (agora usando BGR consistentemente)
        if detection_type == 'Color':
            hex_color = chroma_key_data.get('selectedColor', '#00FF00')
            target_color = hexToRgb(hex_color)
            target_b, target_g, target_r = target_color['b'], target_color['g'], target_color['r']  # RGB to BGR
        elif detection_type == 'Position':
            x, y = map(int, chroma_key_data.get('position', (0, 0)))
            y = min(max(0, y), frame.shape[0] - 1)
            x = min(max(0, x), frame.shape[1] - 1)
            target_b, target_g, target_r = frame[y, x]  # Já está em BGR
        else:
            print(f"Tipo de detecção desconhecido: {detection_type}")
            return frame
        
        # Converter frame para BGRA (não RGBA)
        if frame.shape[2] == 3:
            frame_bgra = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        else:
            frame_bgra = frame.copy()
        
        # Calcular distância no espaço BGR (sem conversão para RGB)
        diff = frame.astype(np.float32) - np.array([target_b, target_g, target_r], dtype=np.float32)
        distance_sq = np.sum(diff**2, axis=2)
        
        # Criar máscara de transparência idêntica ao método que funciona
        alpha_channel = np.ones(frame.shape[:2], dtype=np.uint8) * 255
        alpha_channel[distance_sq <= (tolerance ** 2)] = 0
        frame_bgra[:, :, 3] = alpha_channel
        
        return frame_bgra
        
    @staticmethod
    def get_background_mask(other_masks: list, width: int, height: int) -> np.ndarray:
        """Cria uma máscara de fundo RGB (3 canais) combinando outras máscaras"""
        # Inicia com fundo preto (3 canais)
        combined_mask = np.zeros((height, width, 3), dtype=np.uint8)
        
        for mask in other_masks:
            if mask is not None:
                # Redimensiona se necessário
                if mask.shape[0] != height or mask.shape[1] != width:
                    mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
                
                # Converte para RGB se necessário
                if len(mask.shape) == 2:  # Se for grayscale (2D)
                    mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
                elif mask.shape[2] == 4:   # Se for RGBA
                    mask = cv2.cvtColor(mask, cv2.COLOR_BGRA2BGR)
                elif mask.shape[2] == 1:   # Se for single channel
                    mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
                
                # Binariza (garante branco puro nos objetos)
                mask[(mask[..., 0] == 255) & (mask[..., 1] == 255) & (mask[..., 2] == 255)] = 255
                
                # Combina com a máscara acumulada
                combined_mask = np.maximum(combined_mask, mask)
        
        # Inverte para obter o background (branco)
        background_mask = 255 - combined_mask
        
        return background_mask
    
    @staticmethod
    def find_best_replacement_mask(
        main_mask: np.ndarray,
        other_masks: Dict[int, Dict[int, np.ndarray]],  # {frame_idx: {obj_id: mask}}
        width: int,
        height: int,
        main_frame_idx: int,
        obj_id: int,
        dilation_radius: int = 15  # Adicionado o mesmo parâmetro de dilatação
    ) -> Optional[Tuple[int, np.ndarray]]:
        """
        Encontra a melhor máscara de substituição baseada na proximidade do frame_idx
        e áreas pretas onde a máscara principal tem branco.
        
        Args:
            main_mask: Array NumPy da máscara principal (255 = branco, 0 = preto)
            other_masks: Dicionário de máscaras organizadas por frame_idx e obj_id
            width: Largura das máscaras (não usado diretamente, já que as máscaras são arrays)
            height: Altura das máscaras (idem)
            main_frame_idx: Frame index da máscara principal
            obj_id: ID do objeto para filtrar máscaras correspondentes
        
        Returns:
            A máscara de substituição ideal ou None se nenhuma for adequada
        """
        if main_mask is None or not other_masks:
            return None
        
        main_mask = cv2.resize(main_mask, (width, height), interpolation=cv2.INTER_NEAREST)

        if dilation_radius > 0:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*dilation_radius+1, 2*dilation_radius+1))
            main_mask = cv2.dilate(main_mask, kernel)  # Dilatação idêntica

        # Converte para binário (255 ou 0) se necessário
        main_bin = (main_mask > 254).astype(np.uint8) * 255

        # Ordena outros frames pela proximidade ao frame principal
        sorted_frames = sorted(
            other_masks.keys(),
            key=lambda x: abs(x - main_frame_idx)
        )

        for frame_idx in sorted_frames:
            # Pega apenas máscaras do mesmo objeto
            if obj_id not in other_masks[frame_idx]:
                continue
                
            other_mask = other_masks[frame_idx][obj_id]
            other_mask = cv2.resize(other_mask, (width, height), interpolation=cv2.INTER_NEAREST)
            other_bin = (other_mask > 254).astype(np.uint8) * 255

            # Verifica se TODAS as áreas brancas da principal são pretas na outra máscara
            overlap = np.logical_and(main_bin == 255, other_bin == 255)
            if not np.any(overlap):
                return (frame_idx, other_mask)

        return None
    
    @staticmethod
    def erase_object_with_replacement(
        frame: np.ndarray,
        mask: np.ndarray,
        replacement_mask: np.ndarray,
        replacement_frame: np.ndarray,
        width: int,
        height: int,
        dilation_radius: int = 15
    ) -> np.ndarray:
        """
        Substitui o objeto na área branca da máscara pelo conteúdo do replacement_frame.
        
        Args:
            frame: Frame atual (BGR)
            mask: Máscara principal do objeto (255 = objeto, 0 = fundo)
            replacement_mask: Máscara de substituição (255 = áreas válidas)
            replacement_frame: Frame de substituição (BGR)
            width: Largura do frame
            height: Altura do frame
            dilation_radius: Raio de dilatação para a máscara principal (default: 2)
        Returns:
            Frame com o objeto substituído
        """
        # Redimensiona todas as entradas para garantir compatibilidade
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
        replacement_mask = cv2.resize(replacement_mask, (width, height), interpolation=cv2.INTER_NEAREST)
        replacement_frame = cv2.resize(replacement_frame, (width, height))
        
        # Aplica dilatação na máscara principal
        if dilation_radius > 0:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*dilation_radius+1, 2*dilation_radius+1))
            mask = cv2.dilate(mask, kernel)
        
        # Cria máscara binária (objeto = 1, fundo = 0)
        obj_mask = (mask > 254).astype(np.uint8)
        
        # Cria máscara de substituição válida (onde podemos pegar pixels)
        valid_replace_mask = (replacement_mask < 1).astype(np.uint8)  # Invertido (0 = válido)
        
        # Combina as condições: área do objeto E área válida na replacement_mask
        combined_mask = obj_mask * valid_replace_mask
        
        # Aplica a substituição apenas nas áreas combinadas
        result = frame.copy()
        result[combined_mask == 1] = replacement_frame[combined_mask == 1]
        return result
    
    @staticmethod
    def cut_object(
        frame: np.ndarray,
        mask: np.ndarray,
        width: int,
        height: int
    ) -> np.ndarray:
        """
        Remove a parte do frame correspondente à área branca da máscara.
        Retorna frame BGRA (com canal alpha).
        """
        # Garante que a máscara está no tamanho correto
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
        
        # Converte para BGRA se necessário
        if frame.shape[2] == 3:
            frame_bgra = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        else:
            frame_bgra = frame.copy()
        
        # Aplica a máscara no canal alpha (invertida)
        frame_bgra[:, :, 3] = np.where(mask > 254, 0, 255)
        
        return frame_bgra
    
    @staticmethod
    def change_color(frame, mask, width, height, color, settings, detection_color: int = 255):
        if frame is None or mask is None:
            print('frame, mask, or size not set')
            return None

        # 1. Redimensiona tudo de uma vez (mais eficiente)
        frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)

        # 2. Cria máscara binária
        mask_binary = (mask[:,:,0] == detection_color) & (mask[:,:,1] == detection_color) & (mask[:,:,2] == detection_color)
        
        # 3. Cria cópia do frame original para trabalhar
        output = frame.copy()
        
        # 4. Aplica blur apenas na região da máscara se necessário
        if settings.get('blur', 0) > 0:
            blurred = VideoEffectsProcessor.apply_blur_effect(frame, settings['blur'])
            output[mask_binary] = blurred[mask_binary]

        # 5. Aplica cor base se especificada
        #if color:
        #    intensity = np.mean(frame[mask_binary], axis=1) / 255.0
        #    output[mask_binary, 0] = (color['b'] * intensity).astype(np.uint8)
        #    output[mask_binary, 1] = (color['g'] * intensity).astype(np.uint8)
        #    output[mask_binary, 2] = (color['r'] * intensity).astype(np.uint8)
        if color:
            # Calcula a intensidade média por pixel (R+G+B)/3, normalizada para [0, 1]
            intensity = np.mean(frame[mask_binary], axis=1) / 255.0

            # Converte a cor para array numpy para vetorizar
            solid_color = np.array([color['b'], color['g'], color['r']], dtype=np.float32)

            # Comportamento base (como se factor = 1)
            base = solid_color * intensity[:, np.newaxis]

            # Interpola usando o factor (controla o quanto a cor sólida cobre os detalhes)
            factor = settings.get('factor', 1)
            result = base * (2 - factor) + solid_color * (factor - 1)

            # Create output values matching the input format
            if output.shape[2] == 4:
                # For RGBA output
                output_vals = np.empty((len(result), 4), dtype=np.uint8)
                output_vals[:, :3] = np.clip(result, 0, 255).astype(np.uint8)  # RGB channels
                output_vals[:, 3] = output[mask_binary][:, 3]  # Preserve original alpha channel
            else:
                # For RGB output
                output_vals = np.clip(result, 0, 255).astype(np.uint8)

            # Apply to output
            output[mask_binary] = output_vals

        # 6. Aplica outros efeitos
        if any(k in settings for k in ['exposure', 'brightness', 'contrast', 'hue', 'saturation', 'sharpen', 'noise', 'vignette']):
            output = VideoEffectsProcessor.apply_color_effects(output, mask_binary, settings)

        return output

    @staticmethod
    def apply_color_effects(frame, mask, settings):
        """Aplica efeitos de cor de forma organizada e modular"""
        output = frame.copy()
        roi = output[mask]
        
        if roi.size == 0:
            return frame

        # Converter para float e processar
        rgb = roi.astype(np.float32) / 255.0
        height, width = frame.shape[:2]
        
        y_indices, x_indices = np.where(mask)
        roi_width = x_indices.max() - x_indices.min() + 1
        roi_height = y_indices.max() - y_indices.min() + 1
        
        # Pipeline de processamento
        rgb = VideoEffectsProcessor._apply_exposure(rgb, settings)
        rgb = VideoEffectsProcessor._apply_brightness(rgb, settings)
        rgb = VideoEffectsProcessor._apply_contrast(rgb, settings)
        rgb = VideoEffectsProcessor._apply_hue(rgb, settings)
        rgb = VideoEffectsProcessor._apply_saturation(rgb, settings)
        rgb = VideoEffectsProcessor._apply_sharpen(rgb, settings)
        rgb = VideoEffectsProcessor._apply_noise(rgb, height, width, mask, settings)
        #rgb = VideoEffectsProcessor._apply_vignette(rgb, height, width, settings)

        # Aplicar vinheta apenas se necessário
        if 'vignette' in settings and settings['vignette'] > 0:
            # Obter coordenadas dos pixels da ROI
            y_indices, x_indices = np.where(mask)
            
            # Normalizar coordenadas para [-1, 1]
            x_norm = (x_indices - x_indices.mean()) / (x_indices.max() - x_indices.min()) * 2
            y_norm = (y_indices - y_indices.mean()) / (y_indices.max() - y_indices.min()) * 2
            
            # Calcular distância do centro
            distance = np.sqrt(x_norm**2 + y_norm**2)
            distance = distance / np.max(distance)  # Normalizar para [0, 1]
            
            # Aplicar curva de vinheta
            vignette_strength = np.power(distance, 1.5) * settings['vignette']
            vignette_factor = 1 - vignette_strength
            vignette_factor = np.clip(vignette_factor, 0.2, 1.0)
            
            # Aplicar o fator a cada canal
            rgb[:, 0] *= vignette_factor
            rgb[:, 1] *= vignette_factor
            rgb[:, 2] *= vignette_factor


        # Aplicar resultado final
        # Versão simplificada que mantém alpha se existir
        rgb_result = np.clip(rgb * 255, 0, 255).astype(np.uint8)
        if roi.ndim == 3 and roi.shape[2] == 4:  # Se for RGBA
            roi[..., :3] = rgb_result.reshape(roi.shape[0], roi.shape[1], 3)  # Mantém alpha
        else:  # Para RGB ou grayscale
            roi[:] = rgb_result.reshape(roi.shape)
            
        output[mask] = roi
        return output
    
    @staticmethod
    def _apply_exposure(rgb, settings):
        """Aplica exposição"""
        if 'exposure' in settings and settings['exposure'] != 0:
            rgb *= 2 ** settings['exposure']
        return rgb
    
    @staticmethod
    def _apply_brightness(rgb, settings):
        """Aplica brilho"""
        if 'brightness' in settings and settings['brightness'] != 0:
            hls = cv2.cvtColor(rgb.reshape(1, -1, 3), cv2.COLOR_RGB2HLS).reshape(-1, 3)
            h, l, s = hls[:, 0], hls[:, 1], hls[:, 2]
            
            brightness = settings['brightness']
            if brightness > 0:
                l = l + (1 - l) * brightness  # Clarear (não-linear)
            else:
                l = l * (1 + brightness)     # Escurecer (não-linear)
            l = np.clip(l, 0, 1)
            
            hls = np.stack([h, l, s], axis=1)
            rgb = cv2.cvtColor(hls.reshape(1, -1, 3), cv2.COLOR_HLS2RGB).reshape(-1, 3)
        return rgb
    
    @staticmethod
    def _apply_contrast(rgb, settings):
        """Aplica contraste"""
        if 'contrast' in settings and settings['contrast'] != 0:
            contrast = settings['contrast'] + 1
            v = np.clip((rgb - 0.5) * contrast + 0.5, 0, 1)
            rgb = v
        return rgb

    @staticmethod
    def _apply_hue(rgb, settings):
        """Aplica ajuste de matiz (hue)"""
        if 'hue' in settings and settings['hue'] != 0:
            hsv = cv2.cvtColor(rgb.reshape(1, -1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
            hsv[:, 0] = (hsv[:, 0] - settings['hue']) % 360
            rgb = cv2.cvtColor(hsv.reshape(1, -1, 3), cv2.COLOR_HSV2RGB).reshape(-1, 3)
        return rgb

    @staticmethod
    def _apply_saturation(rgb, settings):
        """Ajuste de saturação idêntico ao frontend"""
        if 'saturation' in settings and settings['saturation'] != 1:
            # Converter para HSV (H:0-180, S:0-255, V:0-255)
            hsv = cv2.cvtColor(rgb.reshape(1, -1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
            
            # Normalizar saturação para 0-1 como no frontend
            s_normalized = hsv[:, 1] / 255.0
            
            # Aplicar fórmula idêntica ao JS
            saturation_factor = 2 ** (settings['saturation'] - 1)
            s_normalized = np.clip(s_normalized * saturation_factor, 0, 1)
            
            # Converter de volta para escala OpenCV (0-255)
            hsv[:, 1] = s_normalized * 255
            
            # Converter de volta para RGB
            rgb = cv2.cvtColor(hsv.reshape(1, -1, 3), cv2.COLOR_HSV2RGB).reshape(-1, 3)
        return rgb
    
    @staticmethod
    def _apply_sharpen(rgb, settings):
        """Aplica nitidez de forma idêntica ao frontend"""
        if 'sharpen' in settings and settings['sharpen'] > 0:
            # Converter para escala 0-255 temporariamente (como no JS)
            rgb_255 = rgb * 255
            
            # Calcular luminância (igual ao frontend)
            luminance = 0.299 * rgb_255[:,0] + 0.587 * rgb_255[:,1] + 0.114 * rgb_255[:,2]
            
            # Fator de nitidez (não-linear como no JS)
            sharpen_amount = settings['sharpen'] * 0.3
            sharp_factor = 1 + (sharpen_amount * (1 + np.sin(sharpen_amount * np.pi)))
            
            # Aplicar a cada canal
            for i in range(3):
                # Fórmula idêntica ao frontend
                adjustment = (rgb_255[:,i] - luminance) * sharp_factor * \
                            (0.5 + (np.abs(128 - luminance) / 256))
                rgb_255[:,i] = np.clip(rgb_255[:,i] + adjustment, 0, 255)
            
            # Converter de volta para 0-1
            rgb = rgb_255 / 255.0
            
        return rgb
    
    @staticmethod
    def _apply_noise(rgb, height, width, mask, settings):
        """Aplica ruído granular"""
        if 'noise' in settings and settings['noise'] > 0:
            noise_seed = settings.get('noiseSeed', 0)
            intensity = (settings['noise'] ** 1.5) * 0.5
            
            # Geração de coordenadas
            pixel_indices = np.arange(len(rgb))
            x_coords = (pixel_indices % width).astype(np.int32)
            y_coords = (pixel_indices // width).astype(np.int32)
            
            # Gerador de ruído JS compatível
            def js_random(x, y, seed):
                seed_arr = (x * 12345 + y) ^ seed
                return np.abs(np.sin(seed_arr * 12.9898 + seed_arr * 78.233) * 43758.5453) % 1
            
            # Cálculo do ruído
            noise_values = (js_random(x_coords, y_coords, noise_seed) - 0.5) * 2 * intensity * 255
            luminance = 0.299 * (rgb[:, 0] * 255) + 0.587 * (rgb[:, 1] * 255) + 0.114 * (rgb[:, 2] * 255)
            noise_factor = 1 + (noise_values / (luminance + 50))
            
            # Aplicação canal por canal
            for i in range(3):
                rgb[:, i] = np.clip((rgb[:, i] * 255 * noise_factor), 0, 255) / 255

        return rgb

    @staticmethod
    def _apply_vignette(rgb, height, width, settings):
        """Aplica vinheta mantendo consistência com o pipeline"""
        if 'vignette' in settings and settings['vignette'] > 0:
            # Garantir que estamos trabalhando com valores 0-255
            is_normalized = np.max(rgb) <= 1.0
            if is_normalized:
                rgb = rgb * 255.0

            # Criar coordenadas
            pixel_indices = np.arange(rgb.shape[0])
            x_coords = (pixel_indices % width).astype(np.float32)
            y_coords = (pixel_indices // width).astype(np.float32)
            
            # Calcular centro
            center_x = width / 2
            center_y = height / 2
            
            # Calcular distâncias normalizadas
            dx = (x_coords - center_x) / center_x
            dy = (y_coords - center_y) / center_y
            distance = np.sqrt(dx**2 + dy**2)
            
            # Aplicar vinheta com suavização
            vignette_strength = distance * settings['vignette']
            vignette_factor = 1 - vignette_strength
            
            # Suavização adicional para evitar bordas duras
            vignette_factor = np.clip(vignette_factor, 0.3, 1.0)  # Mínimo de 30% de luminosidade
            
            # Aplicar a cada canal
            for i in range(3):
                rgb[:, i] *= vignette_factor
            
            # Garantir valores válidos
            rgb = np.clip(rgb, 0, 255)
            
            # Retornar no mesmo formato de entrada
            if is_normalized:
                return rgb / 255.0
            return rgb
        
        return rgb
        
    @staticmethod
    def apply_blur_effect(image_data: np.ndarray, radius: int) -> np.ndarray:
        if radius <= 0:
            return image_data
        
        # Calcula o tamanho do kernel igual ao JS (radius*2+1)
        ksize = int(radius) * 2 + 1
        
        # Calcula sigma baseado no radius (para equivalência com JS)
        sigma = radius / 2.0  # Ajuste empírico para equivalência visual
        
        # Aplica blur separadamente em cada canal para maior controle
        blurred = np.zeros_like(image_data)
        for channel in range(3):  # Aplica para R, G, B
            blurred[:, :, channel] = cv2.GaussianBlur(
                image_data[:, :, channel], 
                (ksize, ksize), 
                sigmaX=sigma,
                sigmaY=sigma,
                borderType=cv2.BORDER_REFLECT
            )
        
        # Mantém o canal alpha se existir
        if image_data.shape[2] == 4:
            blurred[:, :, 3] = image_data[:, :, 3]
        
        return blurred

    @staticmethod
    def other_frame_masks(frame_idx: int, obj_id: int, masks: Dict[int, Dict]) -> Dict[int, Dict[int, np.ndarray]]:
        result = {}
        for other_frame_idx, objs in masks.items():
            if frame_idx != other_frame_idx:
                for other_obj_id, mask in objs.items():
                    if obj_id == other_obj_id:
                        if other_frame_idx not in result:
                            result[other_frame_idx] = {}
                        result[other_frame_idx][other_obj_id] = mask
        return result

    @staticmethod
    def process_pre_transform(
        render_info: RenderInfo, 
        frame: np.ndarray, 
        masks: Dict[int, Dict[int, np.ndarray]], 
        effects_config: Dict,
        chroma_key_data: Dict,
        enable_transparency: bool,
        frame_idx: int,
        layer_width: int,
        layer_height: int,
        rect: Rect,
        video_data: Dict,
        extra_info: Dict,
        flipped: bool,
        render_infos: List[RenderInfo],
    ) -> np.ndarray:
        """Aplica efeitos a um frame individual."""
        if (not masks or not effects_config) and (not chroma_key_data):
            #print('EFFECTS_CONFIG:', effects_config, bool(masks))
            return frame

        current_frame_masks = masks.get(frame_idx, {})
        processed_frame = frame
        
        width = frame.shape[1]
        height = frame.shape[0]
        
        if enable_transparency and chroma_key_data:
            processed_frame = VideoEffectsProcessor.apply_chroma_key(frame, chroma_key_data)
        
        # Processa máscaras de objetos
        for obj_id, mask in current_frame_masks.items():
            effects = effects_config.get(str(obj_id), {})
            
            # Corta a máscara para o ROI atual
            mask = cv2.resize(mask, (layer_width, layer_height))
            mask = cv2.flip(mask, 1) if flipped else mask
            
            # Remove object with background replacement effect
            if 'backgroundRemoveEffect' in effects:
                other_masks = VideoEffectsProcessor.other_frame_masks(frame_idx, obj_id, masks) 
                replacement_mask_info = VideoEffectsProcessor.find_best_replacement_mask(
                    mask, 
                    other_masks, 
                    width, 
                    height,
                    frame_idx,
                    obj_id,
                )
                if replacement_mask_info:
                    other_frame_idx, replacement_mask = replacement_mask_info
                    ret, replacement_frame = render_info.get_frame_by_idx(other_frame_idx)
                    if ret:
                        processed_frame = VideoEffectsProcessor.erase_object_with_replacement(
                            frame=processed_frame,
                            mask=mask,
                            replacement_mask=replacement_mask,
                            replacement_frame=replacement_frame,
                            width=width,
                            height=height
                        )

            if enable_transparency:
                if 'cutObjectEffect' in effects:
                    detection = effects.get('cutObjectEffect', 255)
                    # 1. Garante que a máscara tem apenas 1 canal
                    _mask = mask
                    if _mask.ndim == 3:
                        _mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
                    
                    # 2. Cria máscara binária (objeto = 255, fundo = 0)
                    _, obj_mask = cv2.threshold(_mask, 254, 255, cv2.THRESH_BINARY)
                    
                    if detection == 0:
                        obj_mask = cv2.bitwise_not(obj_mask) # Black turns white and white turns black
                    
                    # 3. Converte para BGRA se necessário
                    if processed_frame.shape[2] == 3:
                        processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2BGRA)
                    
                    # 4. Aplica transparência - método mais robusto
                    alpha_channel = np.ones((height, width), dtype=np.uint8) * 255
                    alpha_channel[obj_mask == 255] = 0
                    processed_frame[:, :, 3] = alpha_channel

            # Color effects
            effect = effects.get('colorEffect', None)
            if effect:
                color = hexToRgb(effect.get('color'))
                settings = effect.get('settings', {})
                
                if mask is not None:
                    original_alpha = None

                    # Verifica se a imagem tem 4 canais (RGBA)
                    if processed_frame.shape[2] == 4:
                        original_alpha = processed_frame[:, :, 3].copy()  # guarda o canal alfa
                        processed_frame = processed_frame[:, :, :3]       # usa apenas os 3 canais RGB

                    result = VideoEffectsProcessor.change_color(
                        processed_frame,
                        mask,
                        width,
                        height,
                        color,
                        settings,
                    )

                    if result is not None:
                        processed_frame = result

                        # Recoloca o canal alfa se ele existia
                        if original_alpha is not None and processed_frame.shape[2] == 3:
                            processed_frame = np.dstack((processed_frame, original_alpha)) 

            effect = effects.get('blendEffect', None)
            if effect:
                ref_video_id = effect.get('blendVideoId')
                ref_video_data = next((v for v in video_data.values() if v.get('video_id') == ref_video_id), None)
                if ref_video_data:
                    ref_video_idx = ref_video_data.get('idx')
                    if ref_video_idx:
                        ref_video_ri: RenderInfo = render_infos[ref_video_idx]
                        ref_video_layer = ref_video_ri.layer
                        ret, ref_video_frame = ref_video_ri.get_frame_by_idx(frame_idx)
                        if ret:
                            ref_video_frame = cv2.resize(ref_video_frame, (int(ref_video_layer.width), int(ref_video_layer.height)))
                            ref_video_frame = cv2.flip(ref_video_frame, 1) if ref_video_layer.flipped else ref_video_frame
                            processed_frame = VideoEffectsProcessor.apply_blend(frame, ref_video_frame, mask)

        effects = effects_config.get('-1', {})
        if effects:
            other_masks = [m for m in current_frame_masks.values()]
            background_mask = VideoEffectsProcessor.get_background_mask(other_masks, layer_width, layer_height)
            background_mask = cv2.resize(background_mask, (layer_width, layer_height))
            background_mask = cv2.flip(background_mask, 1) if flipped else background_mask
            if background_mask is not None:
                if enable_transparency:
                    if 'cutObjectEffect' in effects:
                        detection = effects.get('cutObjectEffect', 255)
                        # 1. Garante que a máscara tem apenas 1 canal
                        _background_mask = background_mask
                        if _background_mask.ndim == 3:
                            #_background_mask = cv2.cvtColor(background_mask, cv2.COLOR_BGR2GRAY)
                            _background_mask = background_mask[:, :, 0]
                        
                        # 2. Cria máscara binária (objeto = 255, fundo = 0)
                        _, obj_mask = cv2.threshold(_background_mask, 254, 255, cv2.THRESH_BINARY)
                        
                        if detection == 0:
                            obj_mask = cv2.bitwise_not(obj_mask) # Black turns white and white turns black
                        
                        # 3. Converte para BGRA se necessário
                        if processed_frame.shape[2] == 3:
                            processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2BGRA)
                        
                        # 4. Aplica transparência - método mais robusto
                        alpha_channel = np.ones((height, width), dtype=np.uint8) * 255
                        alpha_channel[obj_mask == 255] = 0
                        processed_frame[:, :, 3] = alpha_channel

                # Processa fundo se necessário
                background_effect = effects.get('colorEffect', None)
                if background_effect:
                    settings = background_effect.get('settings', {})
                    color = hexToRgb(background_effect.get('color'))
                    
                    original_alpha = None

                    # Verifica se a imagem tem 4 canais (RGBA)
                    if processed_frame.shape[2] == 4:
                        original_alpha = processed_frame[:, :, 3].copy()  # guarda o canal alfa
                        processed_frame = processed_frame[:, :, :3]       # usa apenas os 3 canais RGB
                    
                    result = VideoEffectsProcessor.change_color(
                        processed_frame,
                        background_mask,
                        frame.shape[1],
                        frame.shape[0],
                        color,
                        settings,
                    )
                    
                    if result is not None:
                        processed_frame = result
                        
                        # Recoloca o canal alfa se ele existia
                        if original_alpha is not None and processed_frame.shape[2] == 3:
                            processed_frame = np.dstack((processed_frame, original_alpha)) 

                effect = effects.get('blendEffect', None)
                if effect:
                    ref_video_id = effect.get('blendVideoId')
                    ref_video_data = next((v for v in video_data.values() if v.get('video_id') == ref_video_id), None)
                    if ref_video_data:
                        ref_video_idx = ref_video_data.get('idx')
                        if ref_video_idx:
                            ref_video_ri: RenderInfo = render_infos[ref_video_idx]
                            ref_video_layer = ref_video_ri.layer
                            ret, ref_video_frame = ref_video_ri.get_frame_by_idx(frame_idx)
                            if ret:
                                ref_video_frame = cv2.resize(ref_video_frame, (int(ref_video_layer.width), int(ref_video_layer.height)))
                                ref_video_frame = cv2.flip(ref_video_frame, 1) if ref_video_layer.flipped else ref_video_frame
                                processed_frame = VideoEffectsProcessor.apply_blend(frame, ref_video_frame, background_mask)


        effects = effects_config.get('-2', {})
        if effects and 'overlapVideo' in effects:
            overlap_video_info = effects.get('overlapVideo', {})
            ref_video_id = overlap_video_info.get('refVideoId', None)
            mask_obj_id = overlap_video_info.get('maskObjId', None)
            if ref_video_id and mask_obj_id:
                ref_video = next(
                    (v for v in video_data.values() if v.get('video_id') == ref_video_id),
                    None
                )
                ref_video_masks = ref_video['masks']
                ref_video_rect: Rect = ref_video['rect']
                ref_video_flipped: bool = ref_video['flipped']
                if not ref_video_masks:
                    return None
                
                ref_frame_masks = ref_video_masks.get(frame_idx, {})
                if not ref_frame_masks:
                    return None
                
                ref_mask = ref_frame_masks.get(int(mask_obj_id), None)
                if ref_mask is None:
                    return None
                
                ref_mask = cv2.resize(ref_mask, (int(ref_video_rect.width), int(ref_video_rect.height)))
                ref_mask = cv2.flip(ref_mask, 1) if ref_video_flipped else ref_mask
                center_xy = VideoEffectsProcessor.get_center_of_binary_mask(ref_mask)
                if not center_xy:
                    return None
                            
                center_x, center_y = center_xy
                prev_position = extra_info.get('previous_position')

                if prev_position is None:
                    # No primeiro frame, sem deslocamento
                    dx, dy = 0, 0
                    offsetX = rect.x
                    offsetY = rect.y
                    print('OffsetX:', offsetX)
                    print('OffsetY:', offsetY)
                    print('CenterX:', center_x)
                    print('CenterY:', center_y)
                    print('X:', center_x + offsetX)
                    print('Y:', center_y + offsetY)
                    rect.x = center_x + offsetX
                    rect.y = center_y + offsetY
                else:
                    prev_cx, prev_cy = prev_position
                    dx, dy = center_x - prev_cx, center_y - prev_cy

                # move o rect apenas pelo delta atual
                rect.x += dx
                rect.y += dy
            
                # guarda o centro deste frame como referência para o próximo
                extra_info['previous_position'] = (center_x, center_y)

        return processed_frame
   
    @staticmethod
    def process_post_transform(
        render_info: RenderInfo, 
        frame: np.ndarray, 
        masks: Dict[int, Dict[int, np.ndarray]], 
        effects_config: Dict,
        chroma_key_data: Dict,
        enable_transparency: bool,
        frame_idx: int,
        layer_width: int,
        layer_height: int,
        roi_info: RoiInfo,
        rect: Rect,
        video_data: Dict,
        extra_info: Dict,
        rotation: float,
        flipped: bool,
        render_infos: List[RenderInfo],
    ):
        """Aplica efeitos a um frame individual."""
        if (not masks or not effects_config) and (not chroma_key_data):
            return frame

        current_frame_masks = masks.get(frame_idx, {})
        processed_frame = frame
        
        width = frame.shape[1]
        height = frame.shape[0]
        
        effects = effects_config.get('-2', {})
        if effects and 'overlapVideo' in effects:
            overlap_video_info = effects.get('overlapVideo', {})
            ref_video_id = overlap_video_info.get('refVideoId', None)
            mask_obj_id = overlap_video_info.get('maskObjId', None)
            if ref_video_id and mask_obj_id:
                ref_video = next(
                    (v for v in video_data.values() if v.get('video_id') == ref_video_id),
                    None
                )
                ref_video_masks = ref_video['masks']
                ref_video_rect: Rect = ref_video['rect']
                ref_video_rotation: float = ref_video.get('rotation', 0)
                ref_video_flipped: bool = ref_video['flipped']
                if not ref_video_masks:
                    return None
                
                ref_frame_masks = ref_video_masks.get(frame_idx, {})
                if not ref_frame_masks:
                    return None
                
                ref_mask = ref_frame_masks.get(int(mask_obj_id), None)
                if ref_mask is None:
                    return None
                
                ref_mask = cv2.resize(ref_mask, (int(ref_video_rect.width), int(ref_video_rect.height)))
                ref_mask = cv2.flip(ref_mask, 1) if ref_video_flipped else ref_mask
                processed_frame = VideoEffectsProcessor.apply_overlap(
                    processed_frame, 
                    ref_mask, 
                    ref_video_rect, 
                    ref_video_rotation,
                    rect,
                    *render_info.size,
                    roi_info
                )
        
        return processed_frame
