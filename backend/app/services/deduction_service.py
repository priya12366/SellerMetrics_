"""
Deduction / adjustment breakdown — the single source of truth.
--------------------------------------------------------------
Every "Where did the money go?" panel (Period Analysis, Reports, Dashboard)
must show the SAME real, source-backed deduction categories. To guarantee that,
the canonical column list and the breakdown-building logic live here and are
reused everywhere instead of being re-implemented per endpoint.

Rules honoured by this module:
  * Each line is a DIRECT sum of a real column that exists in the uploaded
    payment report — never a value derived by subtraction or assumption.
  * Only non-zero categories are surfaced.
  * Amounts keep their database sign (negative = charged to the seller,
    positive = credited back).
  * Empirically (verified against the uploaded data) Gross Sales +
    Σ(all these columns) == Settlement Received, so the itemised lines
    reconcile Gross -> Settlement. If a particular report ever fails to fully
    reconcile, the leftover is shown as a single neutral, clearly-labelled
    "Other adjustments" line rather than being mislabelled or invented away.
"""
from typing import Iterable

# (payment column, plain-language label shown to the seller).
DEDUCTION_COLUMNS = [
    ("total_sale_return_amount", "Sale value reversed (returned / RTO orders)"),
    ("shipping_charge", "Shipping charges"),
    ("return_shipping_charge", "Return shipping charges"),
    ("commission_amount", "Commission"),
    ("fixed_fee", "Fixed fee"),
    ("warehousing_fee", "Warehousing fee"),
    ("gold_platform_fee", "Gold platform fee"),
    ("mall_platform_fee", "Mall platform fee"),
    ("return_premium", "Return premium"),
    ("return_premium_return", "Return premium reversal"),
    ("gst_compensation", "GST compensation"),
    ("other_support_service_charges", "Other support service charges"),
    ("net_other_support_service_charges", "Net other support service charges"),
    ("gst_on_support_service_charges", "GST on support service charges"),
    ("waivers", "Waivers"),
    ("tcs", "TCS (tax collected at source)"),
    ("tds", "TDS (tax deducted at source)"),
    ("compensation", "Compensation"),
    ("claims", "Claims"),
    ("recovery", "Recovery"),
]

# db column -> the EXACT header as it appears in the uploaded Meesho settlement
# report (payments.HEADER_MAP). Surfaced in the UI so a seller can trace each
# deduction back to the precise report column it was summed from — never relabelled.
DEDUCTION_SOURCE_HEADERS = {
    "total_sale_return_amount": "Total Sale Return Amount (Incl. Shipping & GST)",
    "shipping_charge": "Shipping Charge (Incl. GST)",
    "return_shipping_charge": "Return Shipping Charge (Incl. GST)",
    "commission_amount": "Meesho Commission (Incl. GST)",
    "fixed_fee": "Fixed Fee (Incl. GST)",
    "warehousing_fee": "Warehousing fee (Incl. GST)",
    "gold_platform_fee": "Meesho gold platform fee (Incl. GST)",
    "mall_platform_fee": "Meesho mall platform fee (Incl. GST)",
    "return_premium": "Return premium (incl GST)",
    "return_premium_return": "Return premium (incl GST) of Return",
    "gst_compensation": "GST Compensation (PRP Shipping)",
    "other_support_service_charges": "Other Support Service Charges (Excl. GST)",
    "net_other_support_service_charges": "Net Other Support Service Charges (Excl. GST)",
    "gst_on_support_service_charges": "GST on Net Other Support Service Charges",
    "waivers": "Waivers (Excl. GST)",
    "tcs": "TCS",
    "tds": "TDS",
    "compensation": "Compensation",
    "claims": "Claims",
    "recovery": "Recovery",
}


def sum_deduction_columns(payments: Iterable) -> dict:
    """Sum every real deduction/adjustment column across the given payment rows.

    Returns a {column: float} map covering exactly DEDUCTION_COLUMNS. Each value
    is a plain sum of that column — no derivation, no assumption.
    """
    sums = {col: 0.0 for col, _ in DEDUCTION_COLUMNS}
    for p in payments:
        for col in sums:
            sums[col] += float(getattr(p, col, 0) or 0)
    return sums


def build_deduction_breakdown(deduction_sums: dict, total_sales: float, total_settlement: float) -> list:
    """Turn per-column sums into an ordered, source-backed breakdown.

    Only non-zero categories are surfaced (biggest magnitude first). A residual
    line is appended ONLY if the itemised lines do not already reconcile Gross ->
    Settlement, so that gross + Σ(lines) + residual == settlement always holds.
    """
    breakdown = []
    breakdown_sum = 0.0
    for col, label in DEDUCTION_COLUMNS:
        amt = round(deduction_sums.get(col, 0.0), 2)
        if abs(amt) >= 0.01:
            breakdown.append({
                "key": col,
                "label": label,
                "amount": amt,
                "source_column": DEDUCTION_SOURCE_HEADERS.get(col),
            })
            breakdown_sum += amt
    breakdown.sort(key=lambda d: abs(d["amount"]), reverse=True)

    # residual so that gross + Σ(lines) + residual == settlement (0.00 for this data)
    residual = round(total_settlement - total_sales - round(breakdown_sum, 2), 2)
    if abs(residual) >= 0.01:
        breakdown.append({
            "key": "other",
            "label": "Other adjustments (from report, not separately categorised)",
            "amount": residual,
            "source_column": None,
        })
    return breakdown
