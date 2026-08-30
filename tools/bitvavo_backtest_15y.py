#!/usr/bin/env python3
"""15-year simulation of the live BTC/ETH allocation rules."""
from __future__ import annotations

import io
import json
import math
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_DOWN
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import pandas as pd
import requests

D = Decimal
COINBASE = "https://api.exchange.coinbase.com/products"
BITVAVO = "https://api.bitvavo.com/v2"
EARLY_BTC = (
    "https://raw.githubusercontent.com/curiousily/Deep-Learning-For-Hackers/"
    "f872ef70530f2da45eba23e1b77781fcb6a9086b/data/3.stock-prediction/BTC-USD.csv"
)
FRANKFURTER = "https://api.frankfurter.app"
COINBASE_BTC_START = date(2015, 4, 23)
ETH_NETWORK_START = date(2015, 7, 30)
BITVAVO_SPLICE = date(2019, 3, 8)
START = date(2011, 8, 30)
END = date(2026, 8, 30)
WARMUP_START = date(2010, 7, 16)
PROFILES = {
    "balanced": D("0.35"),
    "balanced_plus": D("0.40"),
    "growth": D("0.45"),
    "high_growth": D("0.50"),
    "aggressive": D("0.55"),
    "very_aggressive": D("0.60"),
    "maximum_tested": D("0.65"),
}


def get_response(url: str) -> requests.Response:
    last: Exception | None = None
    for attempt in range(6):
        try:
            response = requests.get(
                url,
                timeout=60,
                headers={"User-Agent": "bitvavo-bot-15y-backtest/1.0"},
            )
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last = exc
            if attempt == 5:
                break
            time.sleep(2**attempt)
    raise RuntimeError(f"Failed to fetch {url}: {last}")


def get_json(url: str) -> Any:
    return get_response(url).json()


def floor_decimal(value: Decimal, decimals: int) -> Decimal:
    return value.quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_DOWN)


def normalise(frame: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    if frame.empty:
        return frame
    data = frame.copy()
    data["day"] = pd.to_datetime(data["day"]).dt.date
    data = data[(data.day >= start) & (data.day < end)]
    data = data.drop_duplicates("day", keep="last").sort_values("day").set_index("day")
    for col in ["open", "high", "low", "close", "volume"]:
        if col not in data:
            data[col] = 0.0
        data[col] = pd.to_numeric(data[col], errors="coerce")
    return data


def early_btc_eur(start: date, end: date) -> pd.DataFrame:
    raw = pd.read_csv(io.StringIO(get_response(EARLY_BTC).text)).rename(columns=str.lower)
    raw["day"] = pd.to_datetime(raw.date).dt.date
    raw = raw[(raw.day >= start) & (raw.day < end)].copy()
    fx_payload = get_json(
        f"{FRANKFURTER}/{start.isoformat()}..{(end - timedelta(days=1)).isoformat()}?from=EUR&to=USD"
    )
    fx = pd.DataFrame(
        [(d, values["USD"]) for d, values in fx_payload["rates"].items()],
        columns=["day", "eurusd"],
    )
    fx["day"] = pd.to_datetime(fx.day).dt.date
    full = pd.Index(pd.date_range(start, end - timedelta(days=1), freq="D").date, name="day")
    fx = fx.set_index("day").sort_index().reindex(full).ffill().bfill()
    raw = raw.set_index("day").join(fx, how="left")
    for col in ["open", "high", "low", "close"]:
        raw[col] = pd.to_numeric(raw[col], errors="raise") / raw.eurusd
    raw["volume"] = pd.to_numeric(raw.volume, errors="coerce").fillna(0)
    raw["source"] = "BTC-USD converted to EUR"
    return normalise(raw.reset_index(), start, end)


def coinbase(asset: str, start: date, end: date) -> pd.DataFrame:
    rows: list[list[Any]] = []
    cursor = start
    while cursor < end:
        chunk_end = min(cursor + timedelta(days=280), end)
        query = urlencode(
            {
                "granularity": 86400,
                "start": f"{cursor.isoformat()}T00:00:00Z",
                "end": f"{chunk_end.isoformat()}T00:00:00Z",
            }
        )
        payload = get_json(f"{COINBASE}/{asset}-EUR/candles?{query}")
        if isinstance(payload, list):
            rows.extend(payload)
        cursor = chunk_end
        time.sleep(0.12)
    frame = pd.DataFrame(rows, columns=["timestamp", "low", "high", "open", "close", "volume"])
    if frame.empty:
        return frame
    frame["day"] = pd.to_datetime(frame.timestamp, unit="s", utc=True).dt.date
    frame["source"] = "Coinbase EUR"
    return normalise(frame, start, end)


def bitvavo(asset: str, start: date, end: date) -> pd.DataFrame:
    end_ms = int(datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc).timestamp() * 1000)
    rows: list[list[Any]] = []
    while True:
        payload = get_json(f"{BITVAVO}/{asset}-EUR/candles?interval=1d&limit=1440&end={end_ms}")
        if not payload:
            break
        rows.extend(payload)
        minimum = min(int(item[0]) for item in payload)
        if datetime.fromtimestamp(minimum / 1000, timezone.utc).date() <= start:
            break
        end_ms = minimum
        time.sleep(0.08)
    frame = pd.DataFrame(rows, columns=["timestamp", "open", "high", "low", "close", "volume"])
    if frame.empty:
        return frame
    frame["day"] = pd.to_datetime(frame.timestamp, unit="ms", utc=True).dt.date
    frame["source"] = "Bitvavo"
    return normalise(frame, start, end)


def fill_gaps(frame: pd.DataFrame, end: date) -> pd.DataFrame:
    full = pd.Index(pd.date_range(min(frame.index), end - timedelta(days=1), freq="D").date, name="day")
    data = frame.reindex(full)
    previous = data.close.ffill()
    missing = data.close.isna()
    for col in ["open", "high", "low", "close"]:
        data.loc[missing, col] = previous.loc[missing]
    data.loc[missing, "volume"] = 0.0
    data.loc[missing, "source"] = "filled prior close"
    return data.dropna(subset=["close"])


def load(asset: str) -> pd.DataFrame:
    parts: list[pd.DataFrame] = []
    if asset == "BTC":
        parts.append(early_btc_eur(WARMUP_START, COINBASE_BTC_START))
        cb_start = COINBASE_BTC_START
    else:
        cb_start = ETH_NETWORK_START
    parts.append(coinbase(asset, cb_start, BITVAVO_SPLICE))
    parts.append(bitvavo(asset, BITVAVO_SPLICE, END))
    frame = pd.concat([p for p in parts if not p.empty]).sort_index()
    frame = frame[~frame.index.duplicated(keep="last")]
    return fill_gaps(frame, END)


def features(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    data["log_ret"] = (data.close / data.close.shift(1)).map(
        lambda x: math.log(x) if pd.notna(x) and x > 0 else float("nan")
    )
    data["sma150"] = data.close.rolling(150, min_periods=150).mean()
    data["vol30"] = data.log_ret.rolling(30, min_periods=30).std() * math.sqrt(365)
    data["signal_close"] = data.close.shift(1)
    data["signal_sma"] = data.sma150.shift(1)
    data["signal_vol"] = data.vol30.shift(1)
    return data


@dataclass(frozen=True)
class RunSpec:
    start: date
    target_vol: Decimal
    profile: str


def simulate(spec: RunSpec, data: dict[str, pd.DataFrame]) -> tuple[dict[str, Any], pd.DataFrame]:
    days = [d for d in data["BTC"].index if spec.start <= d < END]
    cash, btc, eth = D("10000"), D("0"), D("0")
    fee, slip = D("0.0025"), D("0.0010")
    peak = cash
    rows: list[dict[str, Any]] = []
    for day in days:
        b = data["BTC"].loc[day]
        e = data["ETH"].loc[day] if day in data["ETH"].index else None
        opens = {"BTC": D(str(b.open)), "ETH": D(str(e.open)) if e is not None else D("0")}
        closes = {"BTC": D(str(b.close)), "ETH": D(str(e.close)) if e is not None else D("0")}
        qty = {"BTC": btc, "ETH": eth}
        equity_open = cash + btc * opens["BTC"] + eth * opens["ETH"]

        def target(row: Any) -> Decimal:
            if row is None or pd.isna(row.signal_sma) or pd.isna(row.signal_vol):
                return D("0")
            if D(str(row.signal_close)) <= D(str(row.signal_sma)):
                return D("0")
            vol = D(str(row.signal_vol))
            return D("0") if vol <= 0 else D("0.5") * min(D("1"), spec.target_vol / vol)

        target_pct = {"BTC": target(b), "ETH": target(e)}
        target_value = {asset: equity_open * target_pct[asset] for asset in ("BTC", "ETH")}
        threshold = max(D("10"), equity_open * D("0.005"))
        fees_day, turnover, orders = D("0"), D("0"), 0

        for asset in ("BTC", "ETH"):
            if opens[asset] <= 0:
                continue
            delta = target_value[asset] - qty[asset] * opens[asset]
            if delta >= -threshold:
                continue
            price = opens[asset] * (D("1") - slip)
            sell_qty = floor_decimal(min(qty[asset], abs(delta) / price), 8)
            notional = sell_qty * price
            if notional >= D("5"):
                charge = notional * fee
                cash += notional - charge
                qty[asset] -= sell_qty
                fees_day += charge
                turnover += notional
                orders += 1

        buys: dict[str, Decimal] = {}
        for asset in ("BTC", "ETH"):
            if opens[asset] <= 0:
                buys[asset] = D("0")
                continue
            delta = target_value[asset] - qty[asset] * opens[asset]
            buys[asset] = floor_decimal(delta, 2) if delta >= threshold else D("0")
            if buys[asset] < D("5"):
                buys[asset] = D("0")
        total = sum(buys.values(), D("0")) * (D("1") + fee)
        scale = min(D("1"), cash / total) if total > 0 else D("1")
        for asset in ("BTC", "ETH"):
            notional = floor_decimal(buys[asset] * scale, 2)
            if notional < D("5") or opens[asset] <= 0:
                continue
            charge = notional * fee
            if notional + charge > cash:
                continue
            price = opens[asset] * (D("1") + slip)
            qty[asset] += floor_decimal(notional / price, 8)
            cash -= notional + charge
            fees_day += charge
            turnover += notional
            orders += 1

        btc, eth = qty["BTC"], qty["ETH"]
        equity = cash + btc * closes["BTC"] + eth * closes["ETH"]
        peak = max(peak, equity)
        rows.append(
            {
                "day": day,
                "cash": float(cash),
                "btc": float(btc),
                "eth": float(eth),
                "btc_target_pct": float(target_pct["BTC"]),
                "eth_target_pct": float(target_pct["ETH"]),
                "fees": float(fees_day),
                "orders": orders,
                "turnover": float(turnover),
                "equity": float(equity),
                "drawdown": float(equity / peak - 1),
            }
        )

    curve = pd.DataFrame(rows)
    final = D(str(curve.iloc[-1].equity))
    years = (END - spec.start).days / 365.25
    curve["year"] = pd.to_datetime(curve.day).dt.year
    year_end = curve.groupby("year").tail(1)
    previous = 10000.0
    yearly, balances = {}, {}
    for _, row in year_end.iterrows():
        yearly[str(int(row.year))] = (row.equity / previous - 1) * 100
        balances[str(int(row.year))] = row.equity
        previous = row.equity
    curve["rolling_365"] = curve.equity / curve.equity.shift(365) - 1
    rolling = curve.rolling_365.dropna()
    active_eth = curve[curve.eth_target_pct > 0]
    result = {
        "profile": spec.profile,
        "target_annual_volatility": float(spec.target_vol),
        "period": {"start": spec.start.isoformat(), "end_inclusive": "2026-08-29"},
        "results": {
            "initial_balance_eur": 10000.0,
            "final_equity_eur": float(final),
            "profit_eur": float(final - D("10000")),
            "growth_multiple": float(final / D("10000")),
            "total_return_pct": float((final / D("10000") - 1) * 100),
            "cagr_pct": (float(final / D("10000")) ** (1 / years) - 1) * 100,
            "maximum_drawdown_pct": curve.drawdown.min() * 100,
            "fees_eur": curve.fees.sum(),
            "orders": int(curve.orders.sum()),
            "rebalance_days": int((curve.orders > 0).sum()),
            "worst_rolling_365_pct": rolling.min() * 100,
            "median_rolling_365_pct": rolling.median() * 100,
            "positive_rolling_365_pct": (rolling > 0).mean() * 100,
            "eth_first_positive_target_day": str(active_eth.iloc[0].day) if not active_eth.empty else None,
        },
        "yearly_returns_pct": yearly,
        "year_end_balances_eur": balances,
    }
    return result, curve


def main() -> int:
    output = Path("reports/bitvavo-15-year-backtest")
    output.mkdir(parents=True, exist_ok=True)
    print("Loading BTC history", flush=True)
    btc = features(load("BTC"))
    print(f"BTC {btc.index.min()} to {btc.index.max()} rows={len(btc)}", flush=True)
    print("Loading ETH history", flush=True)
    eth = features(load("ETH"))
    print(f"ETH {eth.index.min()} to {eth.index.max()} rows={len(eth)}", flush=True)
    data = {"BTC": btc, "ETH": eth}

    profiles, curves = [], {}
    for name, target_vol in PROFILES.items():
        print(f"Running {name}", flush=True)
        result, curve = simulate(RunSpec(START, target_vol, name), data)
        profiles.append(result)
        if name in {"balanced", "maximum_tested"}:
            curves[name] = curve

    ten_year, _ = simulate(RunSpec(date(2016, 8, 30), D("0.35"), "balanced"), data)
    expected = D("199232.75")
    actual = D(str(ten_year["results"]["final_equity_eur"]))
    difference = actual - expected
    validation = {
        "expected_final_equity_eur": float(expected),
        "actual_final_equity_eur": float(actual),
        "difference_eur": float(difference),
        "status": "PASS" if abs(difference) <= D("1.00") else "MISMATCH_REVIEW_REQUIRED",
    }
    payload = {
        "strategy": {
            "markets": ["BTC-EUR", "ETH-EUR"],
            "sleeves": "50% maximum each",
            "trend_filter": "prior completed close above prior SMA150",
            "volatility_window_days": 30,
            "execution": "next-day open",
            "fee": 0.0025,
            "adverse_slippage": 0.001,
            "minimum_rebalance": "max(EUR 10, 0.5% of portfolio)",
            "leverage": False,
            "shorting": False,
        },
        "period": {"start": START.isoformat(), "end_inclusive": "2026-08-29"},
        "data_policy": {
            "btc_2010_to_2015": "BTC-USD OHLC converted to EUR with daily EUR/USD rates",
            "coinbase_btc_eur_start": COINBASE_BTC_START.isoformat(),
            "bitvavo_start": BITVAVO_SPLICE.isoformat(),
            "eth_before_sufficient_history": "ETH sleeve held in EUR; no synthetic ETH history",
            "btc_loaded": {"start": str(btc.index.min()), "end": str(btc.index.max()), "rows": len(btc)},
            "eth_loaded": {"start": str(eth.index.min()), "end": str(eth.index.max()), "rows": len(eth)},
        },
        "profiles": profiles,
        "ten_year_validation": validation,
        "limitations": [
            "Historical simulated performance is not a forecast or guarantee.",
            "ETH did not exist for the first part of the test, so its sleeve remained in EUR.",
            "The pre-Coinbase BTC segment is a USD-to-EUR converted proxy rather than native Bitvavo candles.",
            "Taxes, outages, rejected orders, custody risk, and slippage above 0.10% are not modelled.",
        ],
    }
    (output / "summary.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    pd.DataFrame(
        [{"profile": p["profile"], "target_volatility": p["target_annual_volatility"], **p["results"]} for p in profiles]
    ).to_csv(output / "profiles.csv", index=False)
    for name, curve in curves.items():
        curve.to_csv(output / f"equity_curve_{name}.csv", index=False)
    lines = [
        "# BTC/ETH bot 15-year backtest",
        "",
        "| Profile | Target vol | Final equity | CAGR | Max drawdown | Orders | Fees |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for p in profiles:
        r = p["results"]
        lines.append(
            f"| {p['profile']} | {p['target_annual_volatility']:.0%} | €{r['final_equity_eur']:,.2f} | "
            f"{r['cagr_pct']:.2f}% | {r['maximum_drawdown_pct']:.2f}% | {r['orders']:,} | €{r['fees_eur']:,.2f} |"
        )
    lines += [
        "",
        "## Ten-year overlap validation",
        "",
        f"Expected: €{validation['expected_final_equity_eur']:,.2f}",
        f"Actual: €{validation['actual_final_equity_eur']:,.2f}",
        f"Difference: €{validation['difference_eur']:,.2f} ({validation['status']})",
        "",
        "ETH did not exist during the early years. Its half of the portfolio remained in EUR until sufficient ETH history existed.",
    ]
    (output / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0 if validation["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
