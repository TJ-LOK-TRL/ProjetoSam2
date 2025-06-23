# 🧠 ProjetoSam2 — Editor de Vídeo com SAM2

Este projeto é um editor de vídeo que utiliza o modelo **Segment Anything 2 (SAM2)** para segmentação de objetos em vídeos. A aplicação é dividida em **frontend (Vue)** e **backend (Flask + Python)**.

---

## 🚀 Manual de Instalação

### ✅ Pré-requisitos

- Python 3.9 ou superior
- Node.js e npm instalados
- `pip` atualizado
- Git instalado
- Recomendado: Ambiente Linux/macOS ou WSL (evita problemas com OpenCV e Torch no Windows)

---

### 📦 Clonar o repositório

```bash
git clone https://github.com/TJ-LOK-TRL/ProjetoSam2.git
cd ProjetoSam2

# 📁 Estrutura esperada
Após a preparação, a estrutura deve estar assim:
ProjetoSam2/
├── backend/
│   ├── segment-anything-2/      <-- Manualmente colocar aqui
│   ├── videos/                  <-- Manualmente colocar aqui
│   │   └── frames/              <-- Manualmente colocar aqui
├── frontend/

