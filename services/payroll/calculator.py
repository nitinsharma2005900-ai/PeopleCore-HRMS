"""
PeopleCore - Python Decimal Payroll Engine
Assessment 05 - Implementation
Strict Decimal financial calculations using ROUND_HALF_UP rounding.
Never uses floating-point arithmetic for monetary calculations.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
import hashlib
import json
from pydantic import BaseModel, Field


# Precision helper for 2 decimal places (standard financial currency)
CENTS = Decimal("0.01")


def round_curr(val: Decimal) -> Decimal:
    """Rounds a Decimal value to 2 decimal places using standard ROUND_HALF_UP."""
    return val.quantize(CENTS, rounding=ROUND_HALF_UP)


class PayrollCalculationInput(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    designation: str
    base_salary_monthly: Decimal = Field(..., ge=0)
    hra_monthly: Decimal = Field(default=Decimal("0.00"), ge=0)
    special_allowance_monthly: Decimal = Field(default=Decimal("0.00"), ge=0)
    bonus: Decimal = Field(default=Decimal("0.00"), ge=0)
    overtime_hours: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_working_days: int = Field(..., gt=0)
    attendance_days: Decimal = Field(..., ge=0)
    paid_leave_days: Decimal = Field(default=Decimal("0.00"), ge=0)
    lop_days: Decimal = Field(default=Decimal("0.00"), ge=0)
    pf_opt_in: bool = True
    tds_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    other_deductions: Decimal = Field(default=Decimal("0.00"), ge=0)
    currency: str = "INR"
    month: int
    year: int


class PayrollCalculationOutput(BaseModel):
    employee_id: str
    employee_name: str
    month: int
    year: int
    currency: str
    total_working_days: int
    attendance_days: Decimal
    paid_leave_days: Decimal
    lop_days: Decimal
    overtime_hours: Decimal
    
    # Earnings Breakdown
    base_salary_monthly: Decimal
    earned_basic: Decimal
    earned_hra: Decimal
    earned_special_allowance: Decimal
    overtime_pay: Decimal
    bonus: Decimal
    gross_earnings: Decimal
    
    # Deductions Breakdown
    pf_employee_deduction: Decimal
    tax_tds_deduction: Decimal
    unpaid_leave_deduction: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    
    # Net Payable
    net_salary: Decimal
    
    # Audit & Verification
    per_day_rate: Decimal
    hourly_rate: Decimal
    input_hash: str
    calculation_details: Dict[str, Any]


class PayrollCalculator:
    """
    Standard enterprise payroll engine.
    Applies configurable policies:
    1. Daily Rate = Base Salary / Total Working Days in month
    2. Hourly Rate = Daily Rate / 8 hours
    3. Overtime = Hourly Rate * 1.5 * Overtime Hours
    4. Unpaid Leave (LOP) Deduction = Daily Rate * LOP Days
    5. PF = min(Earned Basic, 15000) * 12% if pf_opt_in else 0
    6. Tax TDS = Gross Earnings * (tds_percentage / 100)
    7. Gross = Earned Basic + Earned HRA + Earned Special Allowance + Bonus + Overtime Pay
    8. Net = Gross - Total Deductions
    """

    PF_STATUTORY_WAGE_CEILING = Decimal("15000.00")
    PF_EMPLOYEE_RATE = Decimal("0.12")
    OVERTIME_MULTIPLIER = Decimal("1.50")
    STANDARD_DAILY_HOURS = Decimal("8.00")

    @classmethod
    def calculate(cls, data: PayrollCalculationInput) -> PayrollCalculationOutput:
        working_days = Decimal(str(data.total_working_days))
        effective_paid_days = data.attendance_days + data.paid_leave_days

        # Sanity check: effective_paid_days + lop_days <= working_days
        if effective_paid_days + data.lop_days > working_days:
            # Clamp LOP to working_days - effective_paid_days if necessary
            data.lop_days = max(Decimal("0.00"), working_days - effective_paid_days)

        # 1. Per day rates
        per_day_rate = round_curr(data.base_salary_monthly / working_days)
        hourly_rate = round_curr(per_day_rate / cls.STANDARD_DAILY_HOURS)

        # 2. Prorated Earnings based on paid days
        # Ratio of paid days to total working days
        attendance_ratio = effective_paid_days / working_days
        if attendance_ratio > Decimal("1.00"):
            attendance_ratio = Decimal("1.00")

        earned_basic = round_curr(data.base_salary_monthly * attendance_ratio)
        earned_hra = round_curr(data.hra_monthly * attendance_ratio)
        earned_special = round_curr(data.special_allowance_monthly * attendance_ratio)

        # 3. Overtime pay
        overtime_pay = round_curr(hourly_rate * cls.OVERTIME_MULTIPLIER * data.overtime_hours)

        # 4. Gross Earnings
        gross_earnings = earned_basic + earned_hra + earned_special + data.bonus + overtime_pay

        # 5. Deductions
        # LOP deduction note: since basic is already prorated above, LOP deduction reflects the difference
        unpaid_leave_deduction = round_curr(per_day_rate * data.lop_days)

        # PF Calculation
        if data.pf_opt_in:
            pf_wage_base = min(earned_basic, cls.PF_STATUTORY_WAGE_CEILING)
            pf_employee_deduction = round_curr(pf_wage_base * cls.PF_EMPLOYEE_RATE)
        else:
            pf_employee_deduction = Decimal("0.00")

        # TDS Tax Calculation
        tax_tds_deduction = round_curr(gross_earnings * (data.tds_percentage / Decimal("100.00")))

        total_deductions = pf_employee_deduction + tax_tds_deduction + data.other_deductions

        # 6. Net Salary
        net_salary = gross_earnings - total_deductions
        if net_salary < Decimal("0.00"):
            net_salary = Decimal("0.00")

        # 7. Generate deterministic input hash for idempotency and audit
        raw_hash_input = f"{data.employee_id}:{data.month}:{data.year}:{data.base_salary_monthly}:{data.attendance_days}:{data.lop_days}:{data.overtime_hours}"
        input_hash = hashlib.sha256(raw_hash_input.encode("utf-8")).hexdigest()

        calculation_details = {
            "working_days": int(working_days),
            "effective_paid_days": str(effective_paid_days),
            "attendance_ratio": str(attendance_ratio),
            "per_day_rate": str(per_day_rate),
            "hourly_rate": str(hourly_rate),
            "pf_wage_base": str(min(earned_basic, cls.PF_STATUTORY_WAGE_CEILING)) if data.pf_opt_in else "0",
            "rounding_rule": "ROUND_HALF_UP",
            "precision": "2 decimal places",
            "engine": "PeopleCore Python Decimal Engine v1.0"
        }

        return PayrollCalculationOutput(
            employee_id=data.employee_id,
            employee_name=data.employee_name,
            month=data.month,
            year=data.year,
            currency=data.currency,
            total_working_days=data.total_working_days,
            attendance_days=data.attendance_days,
            paid_leave_days=data.paid_leave_days,
            lop_days=data.lop_days,
            overtime_hours=data.overtime_hours,
            base_salary_monthly=data.base_salary_monthly,
            earned_basic=earned_basic,
            earned_hra=earned_hra,
            earned_special_allowance=earned_special,
            overtime_pay=overtime_pay,
            bonus=data.bonus,
            gross_earnings=gross_earnings,
            pf_employee_deduction=pf_employee_deduction,
            tax_tds_deduction=tax_tds_deduction,
            unpaid_leave_deduction=unpaid_leave_deduction,
            other_deductions=data.other_deductions,
            total_deductions=total_deductions,
            net_salary=net_salary,
            per_day_rate=per_day_rate,
            hourly_rate=hourly_rate,
            input_hash=input_hash,
            calculation_details=calculation_details
        )
