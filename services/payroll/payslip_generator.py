"""
PeopleCore - Professional PDF Payslip Generator
Assessment 05 & 09 - ReportLab Implementation
Generates high-fidelity, auditable, downloadable A4 PDF payslips.
"""

import os
import re
import hashlib
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)


MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def num_to_words(n: Decimal, currency: str = "INR") -> str:
    """Helper to convert amount to words."""
    try:
        val = int(n)
        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                 "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                 "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

        def helper(num: int) -> str:
            if num < 20:
                return units[num]
            elif num < 100:
                return tens[num // 10] + (" " + units[num % 10] if num % 10 else "")
            elif num < 1000:
                return units[num // 100] + " Hundred" + (" and " + helper(num % 100) if num % 100 else "")
            elif num < 100000:
                return helper(num // 1000) + " Thousand" + (" " + helper(num % 1000) if num % 1000 else "")
            elif num < 10000000:
                return helper(num // 100000) + " Lakh" + (" " + helper(num % 100000) if num % 100000 else "")
            else:
                return helper(num // 10000000) + " Crore" + (" " + helper(num % 10000000) if num % 10000000 else "")

        if val == 0:
            return f"Zero {currency} Only"
        return f"{currency} {helper(val)} Only"
    except Exception:
        return f"{currency} {n} Only"


class PayslipPDFGenerator:
    """
    Renders enterprise-grade A4 PDF payslip.
    Branding: Indigo (#4F46E5), Slate (#0F172A), Border (#E2E8F0)
    """

    PRIMARY_COLOR = colors.HexColor("#4F46E5")
    DARK_HEADER = colors.HexColor("#0F172A")
    ACCENT_COLOR = colors.HexColor("#14B8A6")
    BG_LIGHT = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    TEXT_MUTED = colors.HexColor("#64748B")

    @classmethod
    def generate(
        cls,
        data: Dict[str, Any],
        output_dir: str = "./storage/payslips"
    ) -> Dict[str, Any]:
        os.makedirs(output_dir, exist_ok=True)

        emp_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(data.get("employee_id", "EMP001")))
        emp_name = str(data.get("employee_name", "Employee"))
        month = int(data.get("month", 11))
        year = int(data.get("year", 2026))
        month_name = MONTH_NAMES[month] if 1 <= month <= 12 else str(month)
        currency = str(data.get("currency", "INR"))

        # Clean filename format requested by PDF & prompt:
        # e.g., Payslip_EMP001_Rahul_Sharma_November_2026.pdf
        clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", emp_name)
        filename = f"Payslip_{emp_id}_{clean_name}_{month_name}_{year}.pdf"
        filepath = os.path.join(output_dir, filename)

        # Payslip Reference ID
        payslip_ref = data.get("payslip_number") or f"PC-PS-{year}{month:02d}-{emp_id}"

        # Verification Hash
        raw_hash_content = f"{payslip_ref}:{emp_id}:{month}:{year}:{data.get('net_salary')}"
        verification_hash = hashlib.sha256(raw_hash_content.encode("utf-8")).hexdigest()

        # Build PDF Document
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        
        title_style = ParagraphStyle(
            "OrgTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=cls.DARK_HEADER,
            leading=20
        )
        subtitle_style = ParagraphStyle(
            "OrgSubtitle",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            textColor=cls.TEXT_MUTED,
            leading=12
        )
        period_badge_style = ParagraphStyle(
            "PeriodBadge",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=cls.PRIMARY_COLOR,
            alignment=2, # Right
            leading=14
        )
        label_style = ParagraphStyle(
            "LabelStyle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=cls.TEXT_MUTED,
            leading=10
        )
        val_style = ParagraphStyle(
            "ValStyle",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            textColor=cls.DARK_HEADER,
            leading=12
        )
        sec_header_style = ParagraphStyle(
            "SecHeader",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=colors.white,
            leading=13
        )
        num_cell = ParagraphStyle(
            "NumCell",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            textColor=cls.DARK_HEADER,
            alignment=2,
            leading=12
        )
        num_bold_cell = ParagraphStyle(
            "NumBoldCell",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=cls.DARK_HEADER,
            alignment=2,
            leading=12
        )

        story = []

        # Header Table: Logo/Company Info (Left), Payslip Info (Right)
        header_data = [
            [
                Paragraph("<b>PeopleCore</b>", title_style),
                Paragraph(f"<b>PAYSLIP FOR {month_name.upper()} {year}</b>", period_badge_style)
            ],
            [
                Paragraph("PeopleCore Technologies Inc. • Enterprise Workforce Platform<br/>"
                          "100 Innovation Boulevard, Tech District • contact@peoplecore.local", subtitle_style),
                Paragraph(f"Ref: <b>{payslip_ref}</b><br/>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ParagraphStyle("SubRight", parent=subtitle_style, alignment=2))
            ]
        ]
        header_table = Table(header_data, colWidths=[340, 183])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=cls.PRIMARY_COLOR, spaceAfter=12))

        # Employee & Attendance Information Grid (4 columns)
        emp_info_data = [
            [
                Paragraph("EMPLOYEE NAME", label_style),
                Paragraph(emp_name, val_style),
                Paragraph("EMPLOYEE ID", label_style),
                Paragraph(emp_id, val_style),
            ],
            [
                Paragraph("DEPARTMENT", label_style),
                Paragraph(str(data.get("department", "Engineering")), val_style),
                Paragraph("DESIGNATION", label_style),
                Paragraph(str(data.get("designation", "Software Engineer")), val_style),
            ],
            [
                Paragraph("BANK NAME", label_style),
                Paragraph(str(data.get("bank_name", "HDFC Bank Ltd")), val_style),
                Paragraph("BANK A/C NO.", label_style),
                Paragraph(str(data.get("bank_account_number", "XXXXXXXX9481")), val_style),
            ],
            [
                Paragraph("PAN / TAX ID", label_style),
                Paragraph(str(data.get("pan_number", "ABCDE1234F")), val_style),
                Paragraph("PAY PERIOD DAYS", label_style),
                Paragraph(f"{data.get('total_working_days', 30)} Days", val_style),
            ],
            [
                Paragraph("DAYS PRESENT", label_style),
                Paragraph(f"{data.get('attendance_days', 0)}", val_style),
                Paragraph("PAID LEAVES", label_style),
                Paragraph(f"{data.get('paid_leave_days', 0)}", val_style),
            ],
            [
                Paragraph("LOSS OF PAY (LOP)", label_style),
                Paragraph(f"{data.get('lop_days', 0)}", val_style),
                Paragraph("OVERTIME HOURS", label_style),
                Paragraph(f"{data.get('overtime_hours', 0)} hrs", val_style),
            ]
        ]
        info_table = Table(emp_info_data, colWidths=[110, 150, 110, 153])
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), cls.BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 14))

        # Earnings & Deductions Dual Table
        earn_basic = Decimal(str(data.get("earned_basic", 0)))
        earn_hra = Decimal(str(data.get("earned_hra", 0)))
        earn_special = Decimal(str(data.get("earned_special_allowance", 0)))
        earn_ot = Decimal(str(data.get("overtime_pay", 0)))
        earn_bonus = Decimal(str(data.get("bonus", 0)))
        gross_pay = Decimal(str(data.get("gross_earnings", earn_basic + earn_hra + earn_special + earn_ot + earn_bonus)))

        ded_pf = Decimal(str(data.get("pf_employee_deduction", 0)))
        ded_tax = Decimal(str(data.get("tax_tds_deduction", 0)))
        ded_lop = Decimal(str(data.get("unpaid_leave_deduction", 0)))
        ded_other = Decimal(str(data.get("other_deductions", 0)))
        total_ded = Decimal(str(data.get("total_deductions", ded_pf + ded_tax + ded_other)))

        net_salary = Decimal(str(data.get("net_salary", gross_pay - total_ded)))

        breakdown_data = [
            # Headers
            [
                Paragraph("<b>EARNINGS</b>", sec_header_style),
                Paragraph(f"<b>AMOUNT ({currency})</b>", ParagraphStyle("TH_R", parent=sec_header_style, alignment=2)),
                Paragraph("<b>DEDUCTIONS</b>", sec_header_style),
                Paragraph(f"<b>AMOUNT ({currency})</b>", ParagraphStyle("TH_R2", parent=sec_header_style, alignment=2))
            ],
            # Row 1
            [
                Paragraph("Basic Salary (Earned)", val_style),
                Paragraph(f"{earn_basic:,.2f}", num_cell),
                Paragraph("Provident Fund (Employee PF)", val_style),
                Paragraph(f"{ded_pf:,.2f}", num_cell)
            ],
            # Row 2
            [
                Paragraph("House Rent Allowance (HRA)", val_style),
                Paragraph(f"{earn_hra:,.2f}", num_cell),
                Paragraph("Tax Deducted at Source (TDS)", val_style),
                Paragraph(f"{ded_tax:,.2f}", num_cell)
            ],
            # Row 3
            [
                Paragraph("Special / Flexi Allowance", val_style),
                Paragraph(f"{earn_special:,.2f}", num_cell),
                Paragraph("Loss of Pay Adjustment (LOP)", val_style),
                Paragraph(f"{ded_lop:,.2f}", num_cell)
            ],
            # Row 4
            [
                Paragraph("Performance Bonus", val_style),
                Paragraph(f"{earn_bonus:,.2f}", num_cell),
                Paragraph("Other Statutory / Loan Deductions", val_style),
                Paragraph(f"{ded_other:,.2f}", num_cell)
            ],
            # Row 5
            [
                Paragraph("Overtime Pay", val_style),
                Paragraph(f"{earn_ot:,.2f}", num_cell),
                Paragraph("", val_style),
                Paragraph("", num_cell)
            ],
            # Totals Row
            [
                Paragraph("<b>TOTAL GROSS EARNINGS</b>", ParagraphStyle("TB", parent=val_style, fontName="Helvetica-Bold")),
                Paragraph(f"<b>{gross_pay:,.2f}</b>", num_bold_cell),
                Paragraph("<b>TOTAL DEDUCTIONS</b>", ParagraphStyle("TB2", parent=val_style, fontName="Helvetica-Bold")),
                Paragraph(f"<b>{total_ded:,.2f}</b>", num_bold_cell)
            ]
        ]

        table_style = TableStyle([
            # Section Header Row
            ("BACKGROUND", (0, 0), (1, 0), cls.PRIMARY_COLOR),
            ("BACKGROUND", (2, 0), (3, 0), cls.DARK_HEADER),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            # Table body
            ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER_COLOR),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EEF2FF")),
            ("TOPPADDING", (0, 1), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])

        breakdown_table = Table(breakdown_data, colWidths=[175, 86, 175, 87])
        breakdown_table.setStyle(table_style)
        story.append(breakdown_table)
        story.append(Spacer(1, 14))

        # Net Payable Highlight Box
        net_words = num_to_words(net_salary, currency)
        net_box_data = [
            [
                Paragraph("<b>NET PAYABLE SALARY</b>", ParagraphStyle("NetL", parent=normal, fontName="Helvetica-Bold", fontSize=12, textColor=cls.DARK_HEADER)),
                Paragraph(f"<b>{currency} {net_salary:,.2f}</b>", ParagraphStyle("NetR", parent=normal, fontName="Helvetica-Bold", fontSize=14, textColor=cls.PRIMARY_COLOR, alignment=2))
            ],
            [
                Paragraph(f"<b>In Words:</b> {net_words}", ParagraphStyle("InW", parent=normal, fontName="Helvetica-Oblique", fontSize=9, textColor=cls.TEXT_MUTED)),
                Paragraph("Disbursed via Electronic Direct Deposit", ParagraphStyle("InW2", parent=normal, fontName="Helvetica", fontSize=8, textColor=cls.TEXT_MUTED, alignment=2))
            ]
        ]
        net_box = Table(net_box_data, colWidths=[330, 193])
        net_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")), # Light green accent
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#86EFAC")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(net_box)
        story.append(Spacer(1, 20))

        # Footer Notes, Signoff and Verification SHA-256 Hash
        footer_data = [
            [
                Paragraph(
                    "<i>Note: This is a system-generated payslip authenticated with cryptographic verification hash. "
                    "No physical signature required. Discrepancies must be reported to payroll@peoplecore.local within 7 days.</i>",
                    ParagraphStyle("FN", parent=normal, fontName="Helvetica", fontSize=7.5, textColor=cls.TEXT_MUTED, leading=10)
                )
            ],
            [
                Paragraph(
                    f"Cryptographic Audit Verification Hash: <b>{verification_hash}</b>",
                    ParagraphStyle("FH", parent=normal, fontName="Courier", fontSize=7, textColor=cls.TEXT_MUTED, leading=9)
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[523])
        footer_table.setStyle(TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 0.5, cls.BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(footer_table)

        # Build document
        doc.build(story)

        return {
            "filename": filename,
            "filepath": filepath,
            "payslip_number": payslip_ref,
            "verification_hash": verification_hash,
            "file_size": os.path.getsize(filepath),
            "generated_at": datetime.now().isoformat()
        }
