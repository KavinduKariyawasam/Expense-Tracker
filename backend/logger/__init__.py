from .logger import configure_logging, get_logger

__all__ = ["get_logger", "configure_logging"]

# Ensure logging is configured when the package is imported
configure_logging()
