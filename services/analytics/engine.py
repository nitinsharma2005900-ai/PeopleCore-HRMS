"""
PeopleCore - FastAPI Workforce Analytics Engine
Assessment 06 - Implementation
Calculates transparent workforce metrics using Pandas and statistical summaries:
Headcount, Department Distribution, Attendance %, Absenteeism %, Leave Utilization,
Hiring & Attrition Trends, Aggregated Payroll Expenditure, and Performance Ratings.
"""

from datetime import datetime, date
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np


class WorkforceAnalyticsEngine:
    """
    Analytics calculation engine.
    Ensures safe, aggregated, auditable computation with explicit formulas.
    """

    @staticmethod
    def calculate_workforce_summary(employees: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates total headcount, active, onboarding, and attrition stats."""
        if not employees:
            return {
                "total_headcount": 0,
                "active_count": 0,
                "onboarding_count": 0,
                "notice_period_count": 0,
                "inactive_count": 0,
                "retention_rate_pct": 100.0
            }

        df = pd.DataFrame(employees)
        status_col = df["employmentStatus"] if "employmentStatus" in df else pd.Series(["ACTIVE"] * len(df))

        total = len(df)
        active = int((status_col == "ACTIVE").sum())
        onboarding = int((status_col == "ONBOARDING").sum())
        notice = int((status_col == "NOTICE_PERIOD").sum())
        resigned = int((status_col == "RESIGNED").sum())
        terminated = int((status_col == "TERMINATED").sum())
        inactive = resigned + terminated

        retention_rate = round(((total - inactive) / total * 100), 2) if total > 0 else 100.0

        return {
            "total_headcount": total,
            "active_count": active,
            "onboarding_count": onboarding,
            "notice_period_count": notice,
            "inactive_count": inactive,
            "resigned_count": resigned,
            "terminated_count": terminated,
            "retention_rate_pct": retention_rate
        }

    @staticmethod
    def calculate_department_distribution(
        employees: List[Dict[str, Any]],
        departments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Calculates employee count and percentage share per department."""
        if not employees:
            return []

        df_emp = pd.DataFrame(employees)
        dept_map = {d["id"]: d["name"] for d in departments}
        dept_code_map = {d["id"]: d.get("code", "") for d in departments}

        df_emp["dept_name"] = df_emp["departmentId"].map(dept_map).fillna("Unassigned")
        df_emp["dept_code"] = df_emp["departmentId"].map(dept_code_map).fillna("NA")

        total = len(df_emp)
        counts = df_emp.groupby(["dept_name", "dept_code"]).size().reset_index(name="headcount")
        counts["percentage"] = (counts["headcount"] / total * 100).round(1)

        result = []
        for _, row in counts.iterrows():
            result.append({
                "department": row["dept_name"],
                "code": row["dept_code"],
                "headcount": int(row["headcount"]),
                "percentage": float(row["percentage"])
            })
        return sorted(result, key=lambda x: x["headcount"], reverse=True)

    @staticmethod
    def calculate_attendance_trends(
        attendance_events: List[Dict[str, Any]],
        active_employee_count: int,
        total_working_days: int = 22
    ) -> Dict[str, Any]:
        """
        Calculates attendance rates and absenteeism.
        Formula:
        Absenteeism Rate (%) = (Total Absent Days / (Active Employees * Working Days)) * 100
        """
        if not attendance_events or active_employee_count == 0:
            return {
                "total_events": 0,
                "present_count": 0,
                "absent_count": 0,
                "late_count": 0,
                "half_day_count": 0,
                "attendance_rate_pct": 100.0,
                "absenteeism_rate_pct": 0.0,
                "total_overtime_hours": 0.0,
                "daily_breakdown": []
            }

        df = pd.DataFrame(attendance_events)
        total_events = len(df)
        
        present_cnt = int((df["status"] == "PRESENT").sum())
        absent_cnt = int((df["status"] == "ABSENT").sum())
        late_cnt = int((df["status"] == "LATE").sum())
        half_day_cnt = int((df["status"] == "HALF_DAY").sum())
        leave_cnt = int((df["status"] == "ON_LEAVE").sum())

        effective_present = present_cnt + late_cnt + (half_day_cnt * 0.5)
        attendance_rate = round((effective_present / total_events * 100), 2) if total_events > 0 else 100.0

        # Absenteeism denominator
        potential_workdays = active_employee_count * total_working_days
        absenteeism_rate = round((absent_cnt / potential_workdays * 100), 2) if potential_workdays > 0 else 0.0

        ot_mins = df["overtimeMinutes"].sum() if "overtimeMinutes" in df else 0
        total_ot_hours = round(float(ot_mins) / 60.0, 2)

        # Daily trends
        daily_list = []
        if "date" in df.columns:
            df["date_str"] = df["date"].astype(str).str[:10]
            daily_grp = df.groupby(["date_str", "status"]).size().unstack(fill_value=0)
            for d_str, row in daily_grp.iterrows():
                daily_list.append({
                    "date": d_str,
                    "present": int(row.get("PRESENT", 0) + row.get("LATE", 0)),
                    "absent": int(row.get("ABSENT", 0)),
                    "on_leave": int(row.get("ON_LEAVE", 0)),
                    "half_day": int(row.get("HALF_DAY", 0))
                })

        return {
            "total_events": total_events,
            "present_count": present_cnt,
            "absent_count": absent_cnt,
            "late_count": late_cnt,
            "half_day_count": half_day_cnt,
            "leave_count": leave_cnt,
            "attendance_rate_pct": attendance_rate,
            "absenteeism_rate_pct": absenteeism_rate,
            "total_overtime_hours": total_ot_hours,
            "daily_breakdown": daily_list[-30:] # Last 30 recorded dates
        }

    @staticmethod
    def calculate_leave_utilization(leave_requests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates leave utilization by leave category."""
        if not leave_requests:
            return {"total_requests": 0, "approved_days": 0.0, "by_type": []}

        df = pd.DataFrame(leave_requests)
        approved = df[df["status"] == "APPROVED"] if "status" in df else df
        tot_days = float(approved["totalDays"].sum()) if "totalDays" in approved else 0.0

        by_type = []
        if "leaveTypeCode" in approved.columns:
            grp = approved.groupby("leaveTypeCode")["totalDays"].sum()
            for code, days in grp.items():
                by_type.append({
                    "leave_type": str(code),
                    "days_taken": round(float(days), 1),
                    "percentage": round(float(days) / tot_days * 100, 1) if tot_days > 0 else 0.0
                })

        return {
            "total_requests": len(df),
            "approved_requests": len(approved),
            "total_approved_days": round(tot_days, 1),
            "by_type": by_type
        }

    @staticmethod
    def calculate_hiring_and_attrition_trends(employees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculates month-over-month hiring and attrition trends over the last 12 months."""
        if not employees:
            return []

        df = pd.DataFrame(employees)
        # Parse joining dates
        df["joining_month"] = pd.to_datetime(df["joiningDate"]).dt.strftime("%Y-%m")
        hires_series = df.groupby("joining_month").size()

        # Parse exit dates where available
        exits_series = pd.Series(dtype=int)
        if "exitDate" in df.columns:
            exits = df[df["exitDate"].notna()].copy()
            if not exits.empty:
                exits["exit_month"] = pd.to_datetime(exits["exitDate"]).dt.strftime("%Y-%m")
                exits_series = exits.groupby("exit_month").size()

        all_months = sorted(list(set(hires_series.index.tolist() + exits_series.index.tolist())))
        # Take up to last 12 months
        recent_months = all_months[-12:] if len(all_months) > 12 else all_months

        trends = []
        for m in recent_months:
            h = int(hires_series.get(m, 0))
            e = int(exits_series.get(m, 0))
            net = h - e
            trends.append({
                "period": m,
                "hires": h,
                "exits": e,
                "net_change": net
            })
        return trends

    @staticmethod
    def calculate_payroll_expenditure_summary(payroll_runs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculates aggregate payroll cost trends over periods.
        PRIVACY NOTICE: Aggregates ONLY. Never returns individual employee compensation.
        """
        if not payroll_runs:
            return []

        summaries = []
        for pr in payroll_runs:
            summaries.append({
                "period_id": pr.get("id"),
                "month": pr.get("month"),
                "year": pr.get("year"),
                "label": f"{pr.get('month', 11)}/{pr.get('year', 2026)}",
                "total_gross": float(pr.get("totalGross", 0)),
                "total_deductions": float(pr.get("totalDeductions", 0)),
                "total_net": float(pr.get("totalNet", 0)),
                "status": pr.get("status", "FINALIZED")
            })
        return summaries
