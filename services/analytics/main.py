"""
PeopleCore - FastAPI Workforce Analytics Service
Assessment 06 - Implementation
Port: 8002
"""

import os
import time
import secrets
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import WorkforceAnalyticsEngine


app = FastAPI(
    title="PeopleCore Workforce Analytics Service",
    description="Statistical workforce metrics, headcount, attendance, and attrition analytics engine",
    version="1.0.0"
)

@app.middleware("http")
async def internal_auth(request, call_next):
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if request.url.path not in ("/health", "/ready"):
        from fastapi.responses import JSONResponse
        if not expected or not secrets.compare_digest(request.headers.get("x-internal-token", ""), expected):
            return JSONResponse(status_code=401, content={"error": "Internal authentication required"})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WorkforceSummaryRequest(BaseModel):
    employees: List[Dict[str, Any]]


class DepartmentDistributionRequest(BaseModel):
    employees: List[Dict[str, Any]]
    departments: List[Dict[str, Any]]


class AttendanceTrendsRequest(BaseModel):
    attendance_events: List[Dict[str, Any]]
    active_employee_count: int
    total_working_days: int = 22


class LeaveUtilizationRequest(BaseModel):
    leave_requests: List[Dict[str, Any]]


class HiringAttritionRequest(BaseModel):
    employees: List[Dict[str, Any]]


class PayrollExpenditureRequest(BaseModel):
    payroll_runs: List[Dict[str, Any]]


@app.get("/health")
def health_check():
    return {
        "service": "workforce-analytics",
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }


@app.get("/ready")
def readiness_check():
    return {"ready": True}


@app.post("/api/v1/analytics/workforce-summary")
def get_workforce_summary(payload: WorkforceSummaryRequest):
    """Computes total headcount, active, onboarding, and retention rate."""
    return WorkforceAnalyticsEngine.calculate_workforce_summary(payload.employees)


@app.post("/api/v1/analytics/department-distribution")
def get_department_distribution(payload: DepartmentDistributionRequest):
    """Computes breakdown of headcount and percentages across departments."""
    return WorkforceAnalyticsEngine.calculate_department_distribution(
        payload.employees,
        payload.departments
    )


@app.post("/api/v1/analytics/attendance-trends")
def get_attendance_trends(payload: AttendanceTrendsRequest):
    """Computes attendance percentage, absenteeism rate, and daily trends."""
    return WorkforceAnalyticsEngine.calculate_attendance_trends(
        payload.attendance_events,
        payload.active_employee_count,
        payload.total_working_days
    )


@app.post("/api/v1/analytics/leave-utilization")
def get_leave_utilization(payload: LeaveUtilizationRequest):
    """Computes total leaves taken by category."""
    return WorkforceAnalyticsEngine.calculate_leave_utilization(payload.leave_requests)


@app.post("/api/v1/analytics/hiring-attrition")
def get_hiring_attrition_trends(payload: HiringAttritionRequest):
    """Computes monthly hiring vs attrition rates over last 12 months."""
    return WorkforceAnalyticsEngine.calculate_hiring_and_attrition_trends(payload.employees)


@app.post("/api/v1/analytics/payroll-expenditure")
def get_payroll_expenditure_summary(payload: PayrollExpenditureRequest):
    """Computes aggregate payroll expenditures by pay period."""
    return WorkforceAnalyticsEngine.calculate_payroll_expenditure_summary(payload.payroll_runs)


@app.post("/api/v1/analytics/benchmark")
def run_analytics_benchmark(sample_size: int = 500):
    """Runs high-volume benchmark testing calculation speed across hundreds of employees."""
    import random
    from datetime import timedelta, date

    depts = [
        {"id": "d1", "name": "Engineering", "code": "ENG"},
        {"id": "d2", "name": "Product", "code": "PRD"},
        {"id": "d3", "name": "Human Resources", "code": "HR"},
        {"id": "d4", "name": "Finance", "code": "FIN"},
        {"id": "d5", "name": "Marketing", "code": "MKT"}
    ]
    statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ONBOARDING", "NOTICE_PERIOD", "RESIGNED"]

    emps = []
    base_date = date(2025, 1, 1)
    for i in range(sample_size):
        dept = random.choice(depts)
        status = random.choice(statuses)
        join_d = base_date + timedelta(days=random.randint(0, 600))
        emps.append({
            "id": f"emp_{i}",
            "departmentId": dept["id"],
            "employmentStatus": status,
            "joiningDate": join_d.isoformat(),
            "exitDate": (join_d + timedelta(days=200)).isoformat() if status == "RESIGNED" else None
        })

    t0 = time.perf_counter()
    sum_res = WorkforceAnalyticsEngine.calculate_workforce_summary(emps)
    dept_res = WorkforceAnalyticsEngine.calculate_department_distribution(emps, depts)
    hire_res = WorkforceAnalyticsEngine.calculate_hiring_and_attrition_trends(emps)
    t1 = time.perf_counter()

    return {
        "sample_size": sample_size,
        "elapsed_seconds": round(t1 - t0, 4),
        "summary": sum_res,
        "department_count": len(dept_res),
        "trend_cohorts": len(hire_res),
        "status": "PASSED"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
