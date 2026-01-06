"use client";
import { useMemo, useState } from "react";

export default function EstimatedTaxCalculatorPage() {
  const [income, setIncome] = useState<string>("");
  const [deductions, setDeductions] = useState<string>("");
  const [rate, setRate] = useState<string>("22");

  const result = useMemo(() => {
    const inc = Number(income) || 0;
    const ded = Number(deductions) || 0;
    const r = Number(rate) || 0;
    const taxable = Math.max(inc - ded, 0);
    const estimatedTax = taxable * (r / 100);
    const quarterly = estimatedTax / 4;
    return { taxable, estimatedTax, quarterly };
  }, [income, deductions, rate]);

  return (
    <main className="mx-auto max-w-6xl px-6 pt-24">
      <h1 className="text-2xl font-semibold">Estimated Tax Calculator</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Enter projected annual figures to estimate your total and quarterly payments.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Projected annual income
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="50000"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Estimated deductions
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              placeholder="13000"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Effective tax rate (%)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="22"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Results
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">Taxable income</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                ${result.taxable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">Estimated total tax</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                ${result.estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">Quarterly payment</span>
              <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                ${result.quarterly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            This is a simplified estimate. Actual taxes depend on filing status, credits, and additional taxes.
          </div>
        </div>
      </div>
    </main>
  );
}

