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
    bold_str = "bold" if bold else ""
    italic_str = "italic" if italic else ""
    filename = f"{font_family}_{bold_str}_{italic_str}.ttf".replace("__", "_").strip("_")
    font_cache_path = os.path.join(FONT_DIR, filename)
    
    if not os.path.exists(font_cache_path):
        download_font(font_cache_path, font_family, bold, italic)
    
    font = ImageFont.truetype(font_cache_path, font_size)
    font.set_variation_by_axes([('wght', 400 if not bold else 700)])
    
    return font

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
    
    # Calcula a posição do texto baseado no alinhamento
    text_width, text_height = draw.textsize(text, font=font)
    x = {
        'left': 0,
        'center': (width - text_width) // 2,
        'right': width - text_width
    }.get(align, 0)
    
    y = (height - text_height) // 2  # Centralizado verticalmente
    
    # Desenha o texto
    draw.text((x, y), text, font=font, fill=color_rgb)
    
    # Converte para numpy array no formato BGRA (para OpenCV)
    if bg_transparent:
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGBA2BGRA)
    else:
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    return cv_image