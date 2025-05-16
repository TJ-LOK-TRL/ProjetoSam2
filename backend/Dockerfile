# Usar imagem base com CUDA 12.1.1-runtime-ubuntu22.04
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Definir variáveis de ambiente para evitar interações durante a instalação de pacotes
ENV DEBIAN_FRONTEND=noninteractive

# Atualizar o apt-get e instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instalar PyTorch, torchvision, torchaudio com suporte CUDA 12.1
RUN pip install torch==2.6.0+cu118 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Instalar o Segment Anything Model (SAM)
RUN pip install git+https://github.com/facebookresearch/segment-anything.git

# Criar diretório para armazenar o modelo SAM
WORKDIR /app/models

# Baixar o modelo SAM2 (se não existir)
RUN curl -o sam_vit_h_4b8939.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth

# Criar diretório de trabalho principal
WORKDIR /app

# Copiar apenas o backend para dentro do container
COPY backend /app/backend

# Expor portas (se necessário no futuro)
EXPOSE 80
EXPOSE 8080

# Definir um comando padrão para manter o container ativo
CMD ["bash"]
