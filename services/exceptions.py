from __future__ import annotations


class PipelineError(Exception):
    error_code: str = "PIPELINE_ERROR"
    is_retryable: bool = False

    def __init__(
        self,
        message: str,
        *,
        error_code: str | None = None,
        is_retryable: bool | None = None,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if error_code is not None:
            self.error_code = error_code
        if is_retryable is not None:
            self.is_retryable = is_retryable
        self.details: dict[str, object] = details or {}

    def to_dict(self) -> dict[str, object]:
        return {
            "error_type": self.__class__.__name__,
            "error_code": self.error_code,
            "message": self.message,
            "is_retryable": self.is_retryable,
            "details": self.details,
        }


class MediaError(PipelineError):
    error_code = "MEDIA_ERROR"
    is_retryable = False


class VideoReadError(MediaError):
    error_code = "VIDEO_READ_ERROR"


class MediaEncodingError(MediaError):
    error_code = "MEDIA_ENCODING_ERROR"


class ModelServiceError(PipelineError):
    error_code = "MODEL_SERVICE_ERROR"


class ModelConnectionError(ModelServiceError):
    error_code = "MODEL_CONNECTION_ERROR"
    is_retryable = True


class ModelRateLimitError(ModelServiceError):
    error_code = "MODEL_RATE_LIMIT_ERROR"
    is_retryable = True


class ModelParseError(ModelServiceError):
    error_code = "MODEL_PARSE_ERROR"
    is_retryable = False


class StorageError(PipelineError):
    error_code = "STORAGE_ERROR"
    is_retryable = True
