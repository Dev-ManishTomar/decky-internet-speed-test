import os
import json

import decky

MAX_HISTORY = 5


class Plugin:
    _history: list = []
    _settings_path: str = ""

    async def _main(self) -> None:
        self._settings_path = os.path.join(
            os.environ.get("DECKY_PLUGIN_SETTINGS_DIR", "/tmp"), "history.json"
        )
        self._load_history()
        decky.logger.info("SpeedTest plugin loaded")

    async def _unload(self) -> None:
        decky.logger.info("SpeedTest plugin unloaded")

    async def _uninstall(self) -> None:
        pass

    async def _migration(self) -> None:
        pass

    async def save_result(self, result: dict) -> None:
        self._history.insert(0, result)
        if len(self._history) > MAX_HISTORY:
            self._history = self._history[:MAX_HISTORY]
        self._save_history()

    async def get_history(self) -> list:
        return self._history

    async def clear_history(self) -> list:
        self._history = []
        self._save_history()
        return self._history

    def _load_history(self) -> None:
        try:
            if os.path.isfile(self._settings_path):
                with open(self._settings_path, "r") as f:
                    self._history = json.load(f)
        except Exception as exc:
            decky.logger.warning(f"Failed to load history: {exc}")
            self._history = []

    def _save_history(self) -> None:
        try:
            os.makedirs(os.path.dirname(self._settings_path), exist_ok=True)
            with open(self._settings_path, "w") as f:
                json.dump(self._history, f)
        except Exception as exc:
            decky.logger.warning(f"Failed to save history: {exc}")
