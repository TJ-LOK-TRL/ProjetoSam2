# 🧠 ProjetoSam2 — Editor de Vídeo com SAM2

Este projeto é um editor de vídeo que utiliza o modelo **Segment Anything 2 (SAM2)** para segmentação de objetos em vídeos. A aplicação é dividida em **frontend (Vue.js)** e **backend (Flask + Python)**.

---

## 🚀 Manual de Instalação

### ✅ Pré-requisitos
- Python 3.9 ou superior
- Node.js (v16+) e npm
- Git instalado
- Ambiente recomendado: Linux/macOS ou WSL2 (para evitar problemas com dependências no Windows)

---

### 📥 Configuração do Projeto

1. **Clonar o repositório**:

# Projeto SAM2

## Clonagem do Repositório

```bash
git clone https://github.com/TJ-LOK-TRL/ProjetoSam2.git
cd ProjetoSam2
```

## Estrutura de Diretórios Necessária

```plaintext
ProjetoSam2/
├── backend/
│   ├── segment-anything-2/  # ← Deve ser adicionado manualmente
│   ├── videos/
│   │   └── frames/
├── frontend/
```

## Preparar o SAM2

1. **Baixe manualmente o Segment Anything 2**
2. **Extraia para:** `backend/segment-anything-2`

---

## 🌐 Frontend (Vue.js)

```bash
cd frontend
npm install
npm run dev
```

---

## 🖥️ Backend (Flask + Python)

### Criar pastas e ambiente virtual:

```bash
cd backend
mkdir -p videos/frames
python -m venv venv
source venv/bin/activate  # Linux/macOS
# OU
venv\Scripts\activate     # Windows
```

### Instalar dependências:

```bash
pip install -r requirements.txt
```

### Executar servidor Flask:

```bash
python app.py
```

---

## 📝 Arquivo `requirements.txt`

```
flask==3.1.0
flask-cors==5.0.1
flask-sqlalchemy==3.1.1
opencv-python==4.11.0.86
numpy==2.2.4
torch==2.6.0
Pillow==11.2.0
supervision==0.25.1
matplotlib==3.10.1
dill==0.3.9
torch==2.6.0
torchvision==0.21.0
nvidia-cuda-runtime-cu12==12.4.127
nvidia-cudnn-cu12==9.1.0.70
triton==3.2.0
```

---

## ⚠️ Notas Importantes

### Para GPU (CUDA):

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

- Verifique se todas as dependências foram instaladas corretamente.
- Mantenha a estrutura exata de pastas especificada.
