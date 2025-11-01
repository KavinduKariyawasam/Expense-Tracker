from .logger import get_logger, configure_logging

# Ensure logging is configured when the package is imported
configure_logging()