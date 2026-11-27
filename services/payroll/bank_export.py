"""
PeopleCore - Simulated Banking & Direct Deposit File Generator
Assessment 08 & 12 - Implementation
Generates standardized simulated ACH / NACHA and CSV bank payment instruction files.
Does not transmit real funds. Strictly for enterprise payroll simulation and audit.
"""

import csv
import io
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any


def generate_bank_csv_export(
    payroll_period_label: str,
    entries: List[Dict[str, Any]],
    origin_account: str = "HDFC0001234999",
    currency: str = "INR"
) -> str:
    """
    Generates standard corporate banking batch payment CSV file.
    Headers: TransactionRef, EmployeeID, EmployeeName, BankName, AccountNumber, IFSC, Amount, Currency, Description, Status
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow([
        "PaymentReference",
        "EmployeeID",
        "BeneficiaryName",
        "BeneficiaryBank",
        "BeneficiaryAccountNumber",
        "RoutingOrIFSC",
        "DisbursementAmount",
        "Currency",
        "PaymentRemarks",
        "ValueDate",
        "SimulationFlag"
    ])

    today_str = datetime.now().strftime("%Y-%m-%d")

    for idx, e in enumerate(entries, start=1):
        ref = f"SIMPAY-{today_str.replace('-', '')}-{idx:04d}"
        amount = Decimal(str(e.get("net_salary", "0.00")))
        writer.writerow([
            ref,
            e.get("employee_id", f"EMP{idx:03d}"),
            e.get("employee_name", "Employee"),
            e.get("bank_name", "HDFC Bank Ltd"),
            e.get("bank_account_number", f"98765432{idx:04d}"),
            e.get("bank_ifsc_code", "HDFC0001234"),
            f"{amount:.2f}",
            currency,
            f"Salary for {payroll_period_label}",
            today_str,
            "SIMULATED_TEST_TRANSACTION"
        ])

    return output.getvalue()


def generate_nacha_ach_file(
    payroll_period_label: str,
    entries: List[Dict[str, Any]],
    company_name: str = "PEOPLECORE INC",
    company_id: str = "1987654321"
) -> str:
    """
    Generates simulated 94-character fixed-width NACHA ACH payment file.
    Follows ACH File Header (1), Batch Header (5), Entry Detail (6), Batch Control (8), File Control (9).
    """
    lines = []
    now = datetime.now()
    today_yymmdd = now.strftime("%y%m%d")
    hhmm = now.strftime("%H%M")

    # 1. File Header Record (Type 1)
    # Priority Code: 01, Immediate Dest: 121000358, Immediate Origin: 1987654321, File ID Modifier: A
    file_header = f"101 121000358 {company_id:<10}{today_yymmdd}{hhmm}A094101{company_name:<23}PEOPLECORE BANK      "
    lines.append(file_header[:94].ljust(94))

    # 2. Company / Batch Header Record (Type 5)
    # Service Class Code: 220 (Credits Only), Standard Entry Class: PPD
    batch_header = f"5220{company_name:<16}                    {company_id}PPDDIRECT PAY{payroll_period_label[:7]:<7}{today_yymmdd}{today_yymmdd}   1121000350000001"
    lines.append(batch_header[:94].ljust(94))

    # 3. Entry Detail Records (Type 6)
    total_credit_cents = 0
    entry_count = 0
    routing_sum = 0

    for idx, e in enumerate(entries, start=1):
        entry_count += 1
        amount_cents = int(Decimal(str(e.get("net_salary", "0.00"))) * 100)
        total_credit_cents += amount_cents
        routing = "12100035"
        routing_sum += int(routing)
        check_digit = "8"
        account = str(e.get("bank_account_number", f"98765432{idx:04d}"))[:17]
        name = str(e.get("employee_name", "Employee"))[:15]
        emp_id = str(e.get("employee_id", f"EMP{idx:03d}"))[:15]

        # Transaction Code: 22 (Checking Credit)
        entry_line = f"622{routing}{check_digit}{account:<17}{amount_cents:010d}{emp_id:<15}{name:<15}  012100035{entry_count:07d}"
        lines.append(entry_line[:94].ljust(94))

    # 4. Batch Control Record (Type 8)
    hash_str = str(routing_sum)[-10:].zfill(10)
    batch_control = f"8220{entry_count:06d}{hash_str}000000000000{total_credit_cents:012d}{company_id:<10}                         121000350000001"
    lines.append(batch_control[:94].ljust(94))

    # 5. File Control Record (Type 9)
    block_count = (len(lines) + 1 + 9) // 10
    file_control = f"9000001{block_count:06d}{entry_count:08d}{hash_str}000000000000{total_credit_cents:012d}                                       "
    lines.append(file_control[:94].ljust(94))

    return "\n".join(lines)
