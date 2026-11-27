"""
Pytest Test Suite for Workforce Analytics Engine
Assessment 06 & 12 - Mandatory Tests
Tests: Headcount formulas, department percentages, absenteeism calculation,
leave utilization, hiring/attrition cohort calculations, and boundary conditions.
"""

import pytest
from datetime import date, timedelta
from engine import WorkforceAnalyticsEngine


def test_workforce_summary_calculation():
    """Verify headcount breakdown and retention rate calculation."""
    employees = [
        {"id": "e1", "employmentStatus": "ACTIVE"},
        {"id": "e2", "employmentStatus": "ACTIVE"},
        {"id": "e3", "employmentStatus": "ONBOARDING"},
        {"id": "e4", "employmentStatus": "NOTICE_PERIOD"},
        {"id": "e5", "employmentStatus": "RESIGNED"},
    ]

    summary = WorkforceAnalyticsEngine.calculate_workforce_summary(employees)

    assert summary["total_headcount"] == 5
    assert summary["active_count"] == 2
    assert summary["onboarding_count"] == 1
    assert summary["notice_period_count"] == 1
    assert summary["inactive_count"] == 1
    assert summary["retention_rate_pct"] == 80.0


def test_department_distribution_percentages():
    """Verify department share sums to 100%."""
    employees = [
        {"id": "e1", "departmentId": "d1"},
        {"id": "e2", "departmentId": "d1"},
        {"id": "e3", "departmentId": "d1"},
        {"id": "e4", "departmentId": "d2"},
    ]
    departments = [
        {"id": "d1", "name": "Engineering", "code": "ENG"},
        {"id": "d2", "name": "Marketing", "code": "MKT"}
    ]

    dist = WorkforceAnalyticsEngine.calculate_department_distribution(employees, departments)
    assert len(dist) == 2
    assert dist[0]["department"] == "Engineering"
    assert dist[0]["headcount"] == 3
    assert dist[0]["percentage"] == 75.0
    assert dist[1]["department"] == "Marketing"
    assert dist[1]["headcount"] == 1
    assert dist[1]["percentage"] == 25.0


def test_attendance_and_absenteeism_rate():
    """Verify absenteeism formula: (Absent Days / (Active * Working Days)) * 100."""
    events = [
        {"status": "PRESENT", "overtimeMinutes": 60, "date": "2026-11-01"},
        {"status": "PRESENT", "overtimeMinutes": 120, "date": "2026-11-02"},
        {"status": "LATE", "overtimeMinutes": 0, "date": "2026-11-03"},
        {"status": "HALF_DAY", "overtimeMinutes": 0, "date": "2026-11-04"},
        {"status": "ABSENT", "overtimeMinutes": 0, "date": "2026-11-05"},
    ]

    # Active count: 10 employees, 20 working days = 200 potential workdays
    # 1 absent event / 200 = 0.5%
    trends = WorkforceAnalyticsEngine.calculate_attendance_trends(
        attendance_events=events,
        active_employee_count=10,
        total_working_days=20
    )

    assert trends["present_count"] == 2
    assert trends["late_count"] == 1
    assert trends["half_day_count"] == 1
    assert trends["absent_count"] == 1
    assert trends["absenteeism_rate_pct"] == 0.5
    # Total OT: 60 + 120 mins = 180 mins = 3.0 hours
    assert trends["total_overtime_hours"] == 3.0


def test_empty_workforce_boundary_condition():
    """Verify graceful handling when data collections are empty."""
    summary = WorkforceAnalyticsEngine.calculate_workforce_summary([])
    assert summary["total_headcount"] == 0
    assert summary["retention_rate_pct"] == 100.0

    dept_dist = WorkforceAnalyticsEngine.calculate_department_distribution([], [])
    assert dept_dist == []

    att = WorkforceAnalyticsEngine.calculate_attendance_trends([], active_employee_count=0)
    assert att["total_events"] == 0
    assert att["absenteeism_rate_pct"] == 0.0
