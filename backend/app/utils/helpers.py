import re
from typing import Optional


def validate_phone(phone: str) -> bool:
    cleaned = re.sub(r"[\s\-\(\)\+]", "", phone)
    return cleaned.isdigit() and len(cleaned) >= 10


def validate_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def extract_domain(url: str) -> Optional[str]:
    match = re.search(r"https?://(?:www\.)?([^/\s]+)", url)
    return match.group(1) if match else None


def clean_phone(phone: str) -> str:
    return re.sub(r"[\s\-\(\)\+]", "", phone)
