"""
Pytest Test Suite for Python Payroll Engine
Assessment 05 & 12 - Mandatory Tests
Tests: Decimal precision, ROUND_HALF_UP rounding, overtime, unpaid leave (LOP),
PF statutory ceiling, TDS deductions, idempotency hash, and PDF generation.
"""

import os
import pytest
from decimal import Decimal
from calculator import (
    PayrollCalculator,
    PayrollCalculationInput,
    round_curr
)
from payslip_generator import PayslipPDFGenerator
from bank_export import generate_bank_csv_export, generate_nacha_ach_file


def test_standard_payroll_calculation():
    """Verify normal employee with 100% attendance receives exact calculated pay."""
    input_data = PayrollCalculationInput(
        employee_id="EMP001",
        employee_name="Rahul Sharma",
        department="Engineering",
        designation="Lead Architect",
        base_salary_monthly=Decimal("60000.00"),
        hra_monthly=Decimal("24000.00"),
        special_allowance_monthly=Decimal("12000.00"),
        bonus=Decimal("5000.00"),
        overtime_hours=Decimal("0.00"),
        total_working_days=30,
        attendance_days=Decimal("28.00"),
        paid_leave_days=Decimal("2.00"), # total 30 paid days
        lop_days=Decimal("0.00"),
        pf_opt_in=True,
        tds_percentage=Decimal("10.00"),
        other_deductions=Decimal("0.00"),
        month=11,
        year=2026
    )

    result = PayrollCalculator.calculate(input_data)

    # Earned should match full monthly values
    assert result.earned_basic == Decimal("60000.00")
    assert result.earned_hra == Decimal("24000.00")
    assert result.earned_special_allowance == Decimal("12000.00")
    assert result.overtime_pay == Decimal("0.00")
    assert result.bonus == Decimal("5000.00")
    
    # Gross: 60k + 24k + 12k + 5k = 101,000.00
    assert result.gross_earnings == Decimal("101000.00")

    # PF on ceiling 15,000 * 0.12 = 1,800.00
    assert result.pf_employee_deduction == Decimal("1800.00")

    # TDS 10% on 101,000.00 = 10,100.00
    assert result.tax_tds_deduction == Decimal("10100.00")

    # Total Deductions: 1800 + 10100 = 11,900.00
    assert result.total_deductions == Decimal("11900.00")

    # Net Salary: 101,000 - 11,900 = 89,100.00
    assert result.net_salary == Decimal("89100.00")
    assert result.unpaid_leave_deduction == Decimal("0.00")


def test_unpaid_leave_lop_deduction():
    """Verify loss of pay prorates earnings accurately."""
    input_data = PayrollCalculationInput(
        employee_id="EMP002",
        employee_name="Ananya Verma",
        department="Human Resources",
        designation="HR Officer",
        base_salary_monthly=Decimal("45000.00"),
        hra_monthly=Decimal("18000.00"),
        special_allowance_monthly=Decimal("7000.00"),
        bonus=Decimal("0.00"),
        overtime_hours=Decimal("0.00"),
        total_working_days=30,
        attendance_days=Decimal("25.00"),
        paid_leave_days=Decimal("0.00"),
        lop_days=Decimal("5.00"), # 5 days absent without pay
        pf_opt_in=True,
        tds_percentage=Decimal("5.00"),
        other_deductions=Decimal("0.00"),
        month=11,
        year=2026
    )

    result = PayrollCalculator.calculate(input_data)

    # 25 / 30 = 0.833333333333
    # Earned basic: 45000 * (25/30) = 37,500.00
    assert result.earned_basic == Decimal("37500.00")
    # Earned HRA: 18000 * (25/30) = 15,000.00
    assert result.earned_hra == Decimal("15000.00")
    # Earned Special: 7000 * (25/30) = 5833.33 (rounded)
    assert result.earned_special_allowance == Decimal("5833.33")
    
    # Gross: 37500 + 15000 + 5833.33 = 58,333.33
    assert result.gross_earnings == Decimal("58333.33")

    # Per day rate: 45000 / 30 = 1500.00
    assert result.per_day_rate == Decimal("1500.00")
    # LOP deduction note: 1500 * 5 = 7500.00
    assert result.unpaid_leave_deduction == Decimal("7500.00")


def test_overtime_calculation():
    """Verify 1.5x hourly rate calculation for overtime hours."""
    input_data = PayrollCalculationInput(
        employee_id="EMP003",
        employee_name="Vikram Rao",
        department="Customer Support",
        designation="Support Specialist",
        base_salary_monthly=Decimal("30000.00"),
        hra_monthly=Decimal("12000.00"),
        special_allowance_monthly=Decimal("3000.00"),
        bonus=Decimal("0.00"),
        overtime_hours=Decimal("16.00"), # 16 OT hours
        total_working_days=30,
        attendance_days=Decimal("30.00"),
        paid_leave_days=Decimal("0.00"),
        lop_days=Decimal("0.00"),
        pf_opt_in=False, # opted out
        tds_percentage=Decimal("0.00"),
        other_deductions=Decimal("0.00"),
        month=11,
        year=2026
    )

    result = PayrollCalculator.calculate(input_data)

    # Per day rate: 30000 / 30 = 1000.00
    # Hourly rate: 1000 / 8 = 125.00
    # OT rate: 125 * 1.5 = 187.50
    # 16 hours * 187.50 = 3,000.00
    assert result.per_day_rate == Decimal("1000.00")
    assert result.hourly_rate == Decimal("125.00")
    assert result.overtime_pay == Decimal("3000.00")
    assert result.gross_earnings == Decimal("48000.00") # 30k + 12k + 3k + 3k


def test_rounding_precision_no_float_drift():
    """Verify that calculations preserve 2-decimal financial precision without floating point errors."""
    input_data = PayrollCalculationInput(
        employee_id="EMP004",
        employee_name="Neha Joshi",
        department="Product",
        designation="Product Manager",
        base_salary_monthly=Decimal("55555.55"),
        hra_monthly=Decimal("22222.22"),
        special_allowance_monthly=Decimal("11111.11"),
        bonus=Decimal("0.00"),
        overtime_hours=Decimal("3.33"),
        total_working_days=31, # Odd number of working days
        attendance_days=Decimal("27.50"), # Half day involved
        paid_leave_days=Decimal("1.50"),
        lop_days=Decimal("2.00"),
        pf_opt_in=True,
        tds_percentage=Decimal("12.50"),
        other_deductions=Decimal("250.75"),
        month=12,
        year=2026
    )

    result = PayrollCalculator.calculate(input_data)
    # Check that all fields are Decimal and have max 2 decimal places
    for field in [
        result.earned_basic, result.earned_hra, result.earned_special_allowance,
        result.overtime_pay, result.gross_earnings, result.pf_employee_deduction,
        result.tax_tds_deduction, result.total_deductions, result.net_salary
    ]:
        assert isinstance(field, Decimal)
        # Check string representation has at most 2 decimal places
        parts = str(field).split(".")
        if len(parts) > 1:
            assert len(parts[1]) <= 2


def test_payslip_pdf_generation(tmp_path):
    """Verify ReportLab PDF generation outputs a valid non-empty PDF file with verification hash."""
    sample_data = {
        "employee_id": "EMP001",
        "employee_name": "Rahul Sharma",
        "department": "Engineering",
        "designation": "Staff Engineer",
        "month": 11,
        "year": 2026,
        "currency": "INR",
        "total_working_days": 30,
        "attendance_days": 28,
        "paid_leave_days": 2,
        "lop_days": 0,
        "overtime_hours": 0,
        "earned_basic": Decimal("60000.00"),
        "earned_hra": Decimal("24000.00"),
        "earned_special_allowance": Decimal("12000.00"),
        "overtime_pay": Decimal("0.00"),
        "bonus": Decimal("5000.00"),
        "gross_earnings": Decimal("101000.00"),
        "pf_employee_deduction": Decimal("1800.00"),
        "tax_tds_deduction": Decimal("10100.00"),
        "unpaid_leave_deduction": Decimal("0.00"),
        "other_deductions": Decimal("0.00"),
        "total_deductions": Decimal("11900.00"),
        "net_salary": Decimal("89100.00"),
    }

    result = PayslipPDFGenerator.generate(sample_data, output_dir=str(tmp_path))

    assert os.path.exists(result["filepath"])
    assert result["filename"] == "Payslip_EMP001_Rahul_Sharma_November_2026.pdf"
    assert result["file_size"] > 1000 # Valid PDF with tables and branding
    assert len(result["verification_hash"]) == 64 # SHA-256


def test_banking_exports():
    """Verify simulated CSV and NACHA ACH generation."""
    entries = [
        {
            "employee_id": "EMP001",
            "employee_name": "Rahul Sharma",
            "bank_name": "HDFC Bank",
            "bank_account_number": "98765432001",
            "bank_ifsc_code": "HDFC0001234",
            "net_salary": Decimal("89100.00")
        },
        {
            "employee_id": "EMP002",
            "employee_name": "Ananya Verma",
            "bank_name": "ICICI Bank",
            "bank_account_number": "98765432002",
            "bank_ifsc_code": "ICIC0000002",
            "net_salary": Decimal("52150.00")
        }
    ]

    csv_out = generate_bank_csv_export("November 2026", entries)
    assert "SIMPAY-" in csv_out
    assert "Rahul Sharma" in csv_out
    assert "89100.00" in csv_out
    assert "SIMULATED_TEST_TRANSACTION" in csv_out

    nacha_out = generate_nacha_ach_file("November 2026", entries)
    lines = nacha_out.split("\n")
    assert len(lines) >= 5 # File header, Batch header, 2 Entries, Batch control, File control
    for line in lines:
        assert len(line) == 94 # NACHA standard record length
