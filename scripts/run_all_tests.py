"""
PeopleCore - Unified Test Suite Runner & Evidence Collector
Assessment 12 Mandatory Execution Script
Runs Python Payroll & Analytics tests, Node.js API integration tests, and compiles evidence.
"""

import subprocess
import sys
import time
from datetime import datetime

def run_command(cmd, cwd=None):
    print(f"\n=======================================================")
    print(f"▶ RUNNING: {cmd}")
    if cwd:
        print(f"📁 DIRECTORY: {cwd}")
    print(f"=======================================================")
    t0 = time.time()
    res = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    elapsed = time.time() - t0
    print(res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    print(f"⏱️ ELAPSED: {elapsed:.2f}s | EXIT CODE: {res.returncode}")
    return res.returncode == 0

def main():
    print(f"Starting PeopleCore Automated Test Suite at {datetime.now().isoformat()}")
    results = {}

    # 1. Python Decimal Payroll Engine Tests
    results["Python Payroll Pytest"] = run_command("python -m pytest services/payroll/test_payroll.py -v")

    # 2. Python Workforce Analytics Tests
    results["Python Analytics Pytest"] = run_command("python -m pytest services/analytics/test_analytics.py -v")

    # 3. Node.js Backend Vitest Integration Tests
    results["Backend Vitest Integration"] = run_command("npx vitest run", cwd="apps/backend")

    # 4. TypeScript Typecheck Backend
    results["Backend TypeScript Typecheck"] = run_command("npx tsc --noEmit", cwd="apps/backend")

    # 5. TypeScript Typecheck Frontend
    results["Frontend TypeScript Typecheck"] = run_command("npx tsc --noEmit", cwd="apps/frontend")

    print("\n" + "=" * 60)
    print("PEOPLECORE AUTOMATED TEST SUITE SUMMARY")
    print("=" * 60)
    all_passed = True
    for suite, passed in results.items():
        status = "PASSED (100%)" if passed else "FAILED"
        print(f"• {suite:<35} : {status}")
        if not passed:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("🏆 ALL 5 AUTOMATED TEST SUITES PASSED FLAWLESSLY!")
        sys.exit(0)
    else:
        print("❌ SOME TEST SUITES FAILED. PLEASE REVIEW LOGS.")
        sys.exit(1)

if __name__ == "__main__":
    main()
