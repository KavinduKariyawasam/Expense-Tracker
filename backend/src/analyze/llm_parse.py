import json
import logging
import os
import re
import sys

from dotenv import load_dotenv
from groq import Groq
from src.utils import ColorFormatter

load_dotenv()

# Initialize Groq client using environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

handler = logging.StreamHandler(sys.stdout)
formatter = ColorFormatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logging.basicConfig(level=LOG_LEVEL, handlers=[handler])

if not GROQ_API_KEY:
    logging.error("GROQ_API_KEY is not set in the environment variables.")
    raise ValueError("Please set the GROQ_API_KEY environment variable")

client = Groq(api_key=GROQ_API_KEY)


def parse_invoice(ocr_text):
    logging.info("Starting invoice parsing with GroqChat...")
    INVOICE_SCHEMA = {
        "vendor": "string",
        "invoice_date": "YYYY-MM-DD",
        "items": [
            {
                "description": "string",
                "quantity": "number",
                "unit_price": "number",
                "line_total": "number",
            }
        ],
        "invoice_total": "number",
    }

    # System prompt: ask for raw JSON only, no fences\ n
    SYSTEM_PROMPT = (
        "You are an invoice parsing assistant. "
        "Output only raw JSON without any markdown formatting or code fences, strictly following this schema: "
        f"{json.dumps(INVOICE_SCHEMA)}"
    )

    # User prompt template
    USER_PROMPT_TEMPLATE = (
        "Here is the OCR text from an invoice:\n\n{ocr_text}\n\n"
        "Extract the data and return ONLY the JSON object with keys: vendor, invoice_date, items, invoice_total."
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_PROMPT_TEMPLATE.format(ocr_text=ocr_text)},
    ]

    response = client.chat.completions.create(
        model=GROQ_MODEL, messages=messages, max_tokens=1024, temperature=0.4
    )

    content = response.choices[0].message.content

    content_clean = re.sub(r"^```(?:json)?\s*", "", content, flags=re.MULTILINE)
    content_clean = re.sub(r"```$", "", content_clean, flags=re.MULTILINE)
    content_clean = content_clean.strip()

    try:
        parsed = json.loads(content_clean)
    except json.JSONDecodeError:
        raise ValueError(
            f"Failed to parse JSON from GroqChat response: {content_clean}"
        )
    return parsed


def categorize_and_sum_items(items):
    logging.info("Starting item categorization with GroqChat...")
    items_text = json.dumps(items, indent=2)

    CATEGORY_PROMPT = (
        "You are an invoice assistant. Your job is to categorize each line item.\n"
        "Use these categories: food, apperal, others.\n\n"
        "Here is a list of invoice items:\n"
        f"{items_text}\n\n"
        "Return ONLY a JSON list of items with added 'category' field. Format:\n"
        '[{"description": ..., "category": ..., "line_total": ...}, ...]'
    )

    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant that categorizes grocery items for invoice processing. Output strictly raw JSON. Do not add any explanations, labels, or introductory text",
        },
        {"role": "user", "content": CATEGORY_PROMPT},
    ]

    response = client.chat.completions.create(
        model=GROQ_MODEL, messages=messages, max_tokens=1024, temperature=0.6
    )

    content = response.choices[0].message.content.strip()

    logging.debug("LLM response content: %s", content)

    content_clean = re.sub(r"^```(?:json)?\s*", "", content, flags=re.MULTILINE)
    content_clean = re.sub(r"```$", "", content_clean, flags=re.MULTILINE)

    try:
        categorized_items = json.loads(content_clean)
    except json.JSONDecodeError:
        logging.error("Failed to parse LLM response as JSON: %s", content_clean)
        raise ValueError(f"Could not parse LLM response as JSON:\n{content_clean}")

    totals = {}
    for item in categorized_items:
        category = item.get("category", "other").lower()
        line_total = float(item.get("line_total", 0))
        totals[category] = round(totals.get(category, 0) + round(line_total, 2), 2)
    return totals


if __name__ == "__main__":
    sample_text = """""CTRADER JOE'S", '2001 Greenville Ave', 'Dallas TX 75206', 'Store#403-(469)334-0614', 'OPEN 8:00AM T0 9:00PMDAILY', 'R-CARROTS SHREDDED 10 OZ', '1.29', 'R-CUCUMBERS PERSIAN1LB', '1.99', 'TOMATOES CRUSHED NO SALT', '1.59', 'TOMATOES WHOLENO SALT W/BASIL', '1.59', 'ORGANICOLDFASHIONEDOATMEAL', '2.69', 'MINI-PEARL TOMATOES..', '2.49', 'PKGSHREDDEDMOZZARELLALITET', '3.99', 'EGGS 1DOZ ORGANIC BROWN.', '3.79', 'BEANS GARBANZO', '0.89', 'SPROUTED CA STYLE', 'A-AVOCADOS HASS BAG4CT', '2.99', 'A-APPLE BAG JAZZ 2LB', '3.99', 'A-PEPPER BELL EACH XL RED', '2.99', 'GROCERY NONTAXABLE', '0.99', '2 @ 0.49', '0.98', 'BANANAS ORGANIC', '3EA', '@0.29/EA', '0.87', 'CREAMYSALTED PEANUT BUTTER', 'WHL WHT PITA BREAD', '2.49', 'GROCERYNONTAXABLE', '1.69', '2 @0.69', '1.38', 'SUBTOTAL', '$38.68', 'TOTAL', '$38.68', 'CASH', '$40.00', 'CHANGE', '$1.32', 'ITEMS 22', 'Higgins, Ryan', '06-28-2014', '12:34PM', '04030413464683', 'THANK YOU FOR SHOPPING AT', "TRADER JOE'S", 'www.traderjoes.com'"""
    parsed = parse_invoice(sample_text)
    invoice = json.dumps(parsed, indent=2)
    # breakpoint()

    print("Parsed Invoice Data:\n", invoice)

    categorized = categorize_and_sum_items(parsed.get("items", []))
    print("Categorized Totals:\n", json.dumps(categorized, indent=2))
