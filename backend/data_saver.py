import os
import dill
from typing import *

class DataSaver:
    _FOLDER_PATH = 'stages'
    if not os.path.exists(_FOLDER_PATH):
        os.mkdir(_FOLDER_PATH)

    @staticmethod
    def add_stage(stage_name: str, data: object) -> None:
        temp_path = os.path.join(DataSaver._FOLDER_PATH, stage_name + '.tmp')
        final_path = os.path.join(DataSaver._FOLDER_PATH, stage_name)
        try:
            with open(temp_path, 'wb') as file:
                dill.dump(data, file)

            if os.path.exists(final_path):  # Verifica se o arquivo final já existe
                os.remove(final_path)       # Remove o arquivo final se existir

            os.rename(temp_path, final_path)  # Renomeia o arquivo temporário para o final
        except Exception as e:
            if os.path.exists(temp_path):    # Limpa o arquivo temporário em caso de falha
                os.remove(temp_path)
            raise Exception(f"Failed to save data: {str(e)}")

    @staticmethod
    def get_stage(stage_name: str) -> Optional[object]:
        try:
            with open(os.path.join(DataSaver._FOLDER_PATH, stage_name), 'rb') as file:  
                try:
                    return dill.load(file)
                except EOFError:
                    pass
        except FileNotFoundError:
            pass

    @staticmethod
    def end_stage(stage_name: str) -> None:
        if os.path.exists(os.path.join(DataSaver._FOLDER_PATH, stage_name)):
            open(os.path.join(DataSaver._FOLDER_PATH, stage_name), 'wb').close()

    @staticmethod
    def end_stages(stage_names: List[str]) -> None:
        for stage_name in stage_names:
            DataSaver.end_stage(stage_name)
