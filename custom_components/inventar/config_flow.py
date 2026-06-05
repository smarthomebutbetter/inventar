from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import (
    DOMAIN,
    CONF_PRODUKT_ORDNER,
    CONF_DASHBOARD_NAME,
    DEFAULT_PRODUKT_ORDNER,
    DEFAULT_DASHBOARD_NAME,
)

CONF_EXTERNE_URL = "externe_url"


class InventarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="Inventar", data=user_input)

        schema = vol.Schema({
            vol.Required(CONF_DASHBOARD_NAME, default=DEFAULT_DASHBOARD_NAME): str,
            vol.Required(CONF_PRODUKT_ORDNER, default=DEFAULT_PRODUKT_ORDNER): str,
            vol.Optional(CONF_EXTERNE_URL, default=""): str,
        })

        return self.async_show_form(step_id="user", data_schema=schema)

    @staticmethod
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        return InventarOptionsFlow(config_entry)


class InventarOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        data = self._entry.data
        opts = self._entry.options

        schema = vol.Schema({
            vol.Required(
                CONF_DASHBOARD_NAME,
                default=opts.get(CONF_DASHBOARD_NAME, data.get(CONF_DASHBOARD_NAME, DEFAULT_DASHBOARD_NAME)),
            ): str,
            vol.Required(
                CONF_PRODUKT_ORDNER,
                default=opts.get(CONF_PRODUKT_ORDNER, data.get(CONF_PRODUKT_ORDNER, DEFAULT_PRODUKT_ORDNER)),
            ): str,
            vol.Optional(
                CONF_EXTERNE_URL,
                default=opts.get(CONF_EXTERNE_URL, data.get(CONF_EXTERNE_URL, "")),
            ): str,
        })

        return self.async_show_form(step_id="init", data_schema=schema)
