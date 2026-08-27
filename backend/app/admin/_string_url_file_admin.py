import io
from typing import Any

from sqladmin import Admin
from starlette.datastructures import FormData, UploadFile
from starlette.requests import Request


class StringUrlFileAdmin(Admin):
    """Allow SQLAdmin FileField to preserve an existing string URL on edit.

    SQLAdmin normally recreates an empty upload from the model value by calling
    ``.name`` and ``.open()``. Our image columns intentionally store public
    Blob URLs as strings, so supply the equivalent in-memory UploadFile instead.
    """

    async def _handle_form_data(
        self, request: Request, obj: Any = None
    ) -> FormData:
        form = await request.form()
        form_data: list[tuple[str, str | UploadFile]] = []
        for key, value in form.multi_items():
            if not isinstance(value, UploadFile):
                form_data.append((key, value))
                continue

            should_clear = form.get(key + "_checkbox")
            empty_upload = len(await value.read(1)) != 1
            await value.seek(0)
            if should_clear:
                form_data.append((key, UploadFile(io.BytesIO(b""))))
            elif empty_upload and obj and isinstance(getattr(obj, key, None), str):
                existing = getattr(obj, key)
                form_data.append(
                    (key, UploadFile(filename=existing, file=io.BytesIO(b"")))
                )
            elif empty_upload and obj and getattr(obj, key, None):
                current = getattr(obj, key)
                form_data.append(
                    (key, UploadFile(filename=current.name, file=current.open()))
                )
            else:
                form_data.append((key, value))
        return FormData(form_data)
