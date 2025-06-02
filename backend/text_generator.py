from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np
import os
import requests

FONT_DIR = 'fonts'  # Diretório onde as fontes estão armazenadas

google_fonts_links = {
    "Raleway": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/raleway/Raleway[wght].ttf",
        "italic": "https://github.com/google/fonts/raw/main/ofl/raleway/Raleway-Italic[wght].ttf",
    },
    "Inter": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/inter/Inter[opsz,wght].ttf",
        "italic": "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Italic[opsz,wght].ttf",
    },
    "Pacifico": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf",
    },
    "Merriweather": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather[opsz,wdth,wght].ttf",
        "italic": "https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Italic[opsz,wdth,wght].ttf",
    },
    "Courier Prime": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-Regular.ttf",
        "bold": "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-Bold.ttf",
        "italic": "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-Italic.ttf",
        "bold_italic": "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-BoldItalic.ttf",
    },
    "Playfair Display": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay[wght].ttf",
        "italic": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic[wght].ttf",
    },
    "Orbitron": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/orbitron/Orbitron[wght].ttf",
    },
    "Monoton": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/monoton/Monoton-Regular.ttf",
    },
    "Fredoka": {
        "regular": "https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka[wdth,wght].ttf",
    },
    "Permanent Marker": {
        "regular": "https://github.com/google/fonts/tree/main/apache/permanentmarker/PermanentMarker-Regular.ttf",
    }
}

fonts_italic_not_support = [
    font 
    for font, variants in google_fonts_links.items()
    if 'italic' not in variants
]

def select_font_link(font_family: str, bold: bool, italic: bool) -> str:
    """
    Seleciona a fonte correta com base na família, negrito e itálico.
    
    Args:
        font_family: Nome da família da fonte
        bold: Se a fonte deve ser negrito
        italic: Se a fonte deve ser itálico
    
    Returns:
        O nome do arquivo da fonte
    """
    if font_family not in google_fonts_links:
        raise ValueError(f'Fonte {font_family} não suportada.')
    
    font_variants = google_fonts_links[font_family]
    if bold and italic:
        if 'bold_italic' in font_variants:
            return font_variants['bold_italic']
        elif 'italic' in font_variants and '[wght]' in font_variants['italic']:
            return font_variants['italic']
    elif bold:
        if 'bold' in font_variants:
            return font_variants['bold']
        elif 'regular' in font_variants and '[wght]' in font_variants['regular']:
            return font_variants['regular']
        elif 'italic' in font_variants and '[wght]' in font_variants['italic']:
            return font_variants['italic']
    elif italic:
        if 'italic' in font_variants:
            return font_variants['italic']
    
    return google_fonts_links[font_family]['regular']

def download_font(font_path: str, font_family: str, bold: bool, italic: bool) -> None:
    link_font_download = select_font_link(font_family, bold, italic)
    
    response = requests.get(link_font_download)
    response.raise_for_status()

    with open(font_path, "wb") as f:
        f.write(response.content)

def get_font(font_family: str, font_size: int, bold: bool, italic: bool) -> ImageFont.truetype:
    bold_str = 'bold' if bold else ''
    italic_str = 'italic' if italic else ''
    filename = f'{font_family}_{bold_str}_{italic_str}.ttf'.replace('__', '_').strip('_')
    font_cache_path = os.path.join(FONT_DIR, filename)
    
    if not os.path.exists(font_cache_path):
        download_font(font_cache_path, font_family, bold, italic)
    
    font = ImageFont.truetype(font_cache_path, font_size)
    
    # Valores padrão: [weight, width, italic, slant, optical_size, etc.]
    axes = [400, 100, 0, 0, font_size]  # Valores iniciais padrão
    
    # Ajustar para negrito
    if bold:
        axes[0] = 700  # wght (400=normal, 700=bold)
    
    # Ajustar para itálico
    #if italic:
    #    axes[2] = 1    # ital (0=normal, 1=italic)
    
    try:
        font.set_variation_by_axes(axes)
    except Exception as e:
        print(f"Erro ao aplicar variações na fonte: {e}")
    
    return font

def skew_image(image: Image.Image, angle_degrees: float = 10) -> Image.Image:
    import math
    width, height = image.size
    angle = math.radians(angle_degrees)
    offset = int(height * math.tan(angle))
    new_width = width + abs(offset)
    return image.transform(
        (new_width, height),
        Image.AFFINE,
        (1, math.tan(angle), -offset if angle > 0 else 0, 0, 1, 0),
        resample=Image.BICUBIC,
        fillcolor=(0, 0, 0, 0)
    )

def create_text_frame(
    text: str,
    font_family: str,
    font_size: int,
    color: str,  # Formato HEX: '#RRGGBB'
    bold: bool,
    italic: bool,
    align: str,  # 'left', 'center', 'right'
    width: int,
    height: int,
    bg_transparent: bool = True
) -> np.ndarray:
    """
    Cria um frame de texto como uma imagem numpy array (RGBA)
    
    Args:
        text: O texto a ser renderizado
        font_family: Nome da fonte (deve estar instalada no sistema ou no path fornecido)
        font_size: Tamanho da fonte em pixels
        color: Cor do texto em formato HEX
        bold: Se o texto deve ser negrito
        italic: Se o texto deve ser itálico
        align: Alinhamento do texto
        width: Largura da imagem de saída
        height: Altura da imagem de saída
        bg_transparent: Se o fundo deve ser transparente
    
    Returns:
        Um numpy array no formato BGRA (para uso com OpenCV)
    """
    # Cria uma imagem PIL vazia (transparente ou branca)
    if bg_transparent:
        pil_image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    else:
        pil_image = Image.new('RGB', (width, height), (255, 255, 255))
    
    draw = ImageDraw.Draw(pil_image)
        

    # Obtém a fonte
    font = get_font(font_family, font_size, bold, italic)
    
    # Converte cor HEX para RGB
    color_rgb = tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    
    ascent, descent = font.getmetrics()  # ascent, descent em pixels
    line_height = ascent + descent
    line_height *= 1
    
    # Calcula a posição do texto baseado no alinhamento
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    padding_x = 10
    padding_y = 10
    x = {
        'left': padding_x,
        'center': (width - text_width) // 2,
        'right': width - text_width - padding_x
    }.get(align, 0)
    
    #y = (height - text_height) // 2 - bbox[1]  # Centralizado verticalmente
    y = (height - line_height) // 2 + ascent - text_height
    
    # Desenha o texto
    draw.text((x, y), text, font=font, fill=color_rgb)
    
    if italic and font_family in fonts_italic_not_support:
        pil_image = skew_image(pil_image, 15)
    
    # DEBUG VISUAL
    if False:
        # Caixa total da imagem
        draw.rectangle([0, 0, width - 1, height - 1], outline='red', width=1)

        # Bounding box do texto (ajustada à posição final)
        bbox_translated = [x + bbox[0], y + bbox[1], x + bbox[2], y + bbox[3]]
        draw.rectangle(bbox_translated, outline='blue', width=1)

        # Ponto no centro da imagem
        cx = width // 2
        cy = height // 2
        draw.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill='green')
    
    
    
    # Converte para numpy array no formato BGRA (para OpenCV)
    if bg_transparent:
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGBA2BGRA)
    else:
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
    return cv_image