#!/usr/bin/env python3
"""WiFi Pulse Pro local, opt-in diagnostic logger (Python standard library only).

Runs on the user's own PC. Sends ICMP to the default gateway and TCP 443
connections to two fixed public IPs. Neither method proves which company is at fault.
"""
from __future__ import annotations

import argparse
import csv
import ipaddress
import platform
import re
import socket
import statistics
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

TARGETS = ("1.1.1.1", "8.8.8.8")
FIELDS = ("timestamp_utc", "gateway_icmp_ms", "internet_a_tcp_ms",
          "internet_b_tcp_ms", "assessment", "confidence", "observation_gap_before")


def validate_gateway(value: str) -> str:
    ip = ipaddress.ip_address(value)
    if not isinstance(ip, ipaddress.IPv4Address) or not ip.is_private or ip.is_loopback or ip.is_unspecified:
        raise ValueError("Gateway must be a local/private IPv4 address")
    return str(ip)


def detect_gateway() -> str | None:
    system = platform.system()
    commands = {
        "Windows": ["route", "print", "-4"],
        "Linux": ["ip", "-4", "route", "show", "default"],
        "Darwin": ["route", "-n", "get", "default"],
    }
    if system not in commands:
        return None
    try:
        output = subprocess.run(commands[system], capture_output=True, text=True,
                                timeout=3, check=False).stdout
        if system == "Linux":
            match = re.search(r"\bdefault\s+via\s+(\d+\.\d+\.\d+\.\d+)", output)
        elif system == "Darwin":
            match = re.search(r"\bgateway:\s*(\d+\.\d+\.\d+\.\d+)", output)
        else:
            match = re.search(r"(?m)^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)\b", output)
        return validate_gateway(match.group(1)) if match else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def ping_gateway(ip: str | None, timeout: float = 1.5) -> float | None:
    if not ip:
        return None
    system = platform.system()
    if system == "Windows":
        cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), ip]
    elif system == "Darwin":
        cmd = ["ping", "-n", "-c", "1", "-W", str(int(timeout * 1000)), ip]
    else:
        cmd = ["ping", "-n", "-c", "1", "-W", str(max(1, int(timeout + .5))), ip]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 2,
                                check=False)
        if result.returncode != 0:
            return None
        match = re.search(r"time\s*([=<])\s*(\d+(?:[.,]\d+)?)\s*ms", result.stdout, re.I)
        if match:
            return round(float(match.group(2).replace(",", ".")) if match.group(1) == "=" else .5, 2)
    except (OSError, ValueError, subprocess.TimeoutExpired):
        pass
    return None


def tcp_probe(ip: str, timeout: float = 1.5) -> float | None:
    started = time.monotonic()
    try:
        with socket.create_connection((ip, 443), timeout=timeout):
            return round((time.monotonic() - started) * 1000, 2)
    except OSError:
        return None


def classify(gateway_known: bool, gateway_ok: bool, internet_a: bool, internet_b: bool) -> tuple[str, str, str]:
    external = int(internet_a) + int(internet_b)
    if external == 2:
        if gateway_known and not gateway_ok:
            return ("Internet reachable; gateway ignored/failed ICMP", "low",
                    "Gateway ICMP refusal alone does not prove a router problem.")
        return ("Internet reachable", "moderate",
                "Both external targets answered TCP. This does not rule out intermittent problems.")
    if external == 1:
        return ("Partial external reachability", "low",
                "One target failed. Endpoint filtering or a routing issue is possible.")
    if gateway_known and gateway_ok:
        return ("Possible WAN/router uplink or upstream issue", "low",
                "Gateway answered but both TCP targets failed; firewall, VPN and endpoint blocking remain possible.")
    if gateway_known:
        return ("Local network, PC or upstream cause undetermined", "low",
                "Gateway ICMP and both TCP targets failed; Wi-Fi/PC/router/ISP cannot yet be distinguished.")
    return ("External connectivity not confirmed", "low",
            "No usable gateway target was found and both external TCP probes failed.")


def probe_once(gateway: str | None) -> dict:
    gateway_ms = ping_gateway(gateway) if gateway else None
    a_ms = tcp_probe(TARGETS[0])
    b_ms = tcp_probe(TARGETS[1])
    assessment, confidence, _ = classify(bool(gateway), gateway_ms is not None,
                                           a_ms is not None, b_ms is not None)
    return {"timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "gateway_icmp_ms": gateway_ms, "internet_a_tcp_ms": a_ms,
            "internet_b_tcp_ms": b_ms, "assessment": assessment, "confidence": confidence}


def outage_events(records: list[dict]) -> list[dict]:
    events, streak = [], []
    for record in records:
        if record.get("observation_gap_before"):
            if len(streak) >= 2:
                events.append({"start": streak[0]["timestamp_utc"],
                               "last_failure": streak[-1]["timestamp_utc"],
                               "restored": None, "checks": len(streak)})
            streak = []
        down = record["internet_a_tcp_ms"] is None and record["internet_b_tcp_ms"] is None
        if down:
            streak.append(record)
        elif streak:
            if len(streak) >= 2:
                events.append({"start": streak[0]["timestamp_utc"],
                               "last_failure": streak[-1]["timestamp_utc"],
                               "restored": record["timestamp_utc"], "checks": len(streak)})
            streak = []
    if len(streak) >= 2:
        events.append({"start": streak[0]["timestamp_utc"],
                       "last_failure": streak[-1]["timestamp_utc"],
                       "restored": None, "checks": len(streak)})
    return events


def report(records: list[dict], gateway: str | None) -> str:
    events = outage_events(records)
    reachable = sum(r["internet_a_tcp_ms"] is not None or r["internet_b_tcp_ms"] is not None for r in records)
    changes = [abs(a["internet_a_tcp_ms"] - b["internet_a_tcp_ms"])
               for a, b in zip(records, records[1:])
               if a["internet_a_tcp_ms"] is not None and b["internet_a_tcp_ms"] is not None
               and not b.get("observation_gap_before")]
    jitter = statistics.median(changes) if changes else None
    lines = ["WIFI PULSE PRO — LOCAL NETWORK EVIDENCE REPORT",
             "Generated UTC: " + datetime.now(timezone.utc).isoformat(timespec="seconds"),
             "Computer-side gateway: " + (gateway or "unavailable (not tested)"),
             "Measurements: gateway ICMP (if detected), TCP connect to 1.1.1.1:443 and 8.8.8.8:443",
             "Checks: " + str(len(records)), "At least one external TCP target reachable: " + str(reachable),
             "Both external targets unreachable: " + str(len(records) - reachable),
             "Median adjacent successful external-A RTT change: " + (f"{jitter:.1f} ms" if jitter is not None else "N/A"),
             "Suspected interruptions (2+ consecutive both-target failures): " + str(len(events)), "",
             "INTERRUPTION TIMELINE"]
    if not events:
        lines.append("No consecutive two-target failure event observed.")
    for i, event in enumerate(events, 1):
        lines.append(f"{i}. First failed check: {event['start']}; last failed check: {event['last_failure']}; "
                     f"next successful check: {event['restored'] or 'not observed'}; failed checks: {event['checks']}")
    lines += ["", "LATEST DIAGNOSTIC ASSESSMENT"]
    if records:
        r = records[-1]
        lines.extend(classify(bool(gateway), r["gateway_icmp_ms"] is not None,
                              r["internet_a_tcp_ms"] is not None, r["internet_b_tcp_ms"] is not None))
    else:
        lines.append("No measurements")
    lines += ["", "IMPORTANT LIMITATIONS",
              "- These timestamps indicate when probes failed, not exact outage start or end times.",
              "- One host or protocol can be blocked; all failed TCP probes do not prove an ISP outage.",
              "- Gateway ICMP can be disabled by a healthy router.",
              "- These probes cannot reliably distinguish PC faults from Wi-Fi interference.",
              "- IPv4 testing only; VPN, firewall, DNS and upstream server behavior can affect results.",
              "- Gaps from sleep/pauses are not counted as successful or failed checks.",
              "- Test with Ethernet vs Wi-Fi and repeat before attributing fault.",
              "- Probe records are saved on this computer. Share only what you choose.", ""]
    return "\n".join(lines)


def run() -> None:
    parser = argparse.ArgumentParser(description="WiFi Pulse Pro: opt-in local connectivity logger")
    parser.add_argument("--gateway", help="Private IPv4 gateway override if auto-detection fails")
    parser.add_argument("--interval", type=float, default=5, help="Seconds between checks (2–3600)")
    parser.add_argument("--count", type=int, default=0, help="Number of checks; 0 runs until Ctrl+C")
    parser.add_argument("--output", default="wifi-pulse-pro", help="Output filename prefix")
    args = parser.parse_args()
    if not 2 <= args.interval <= 3600 or args.count < 0:
        parser.error("interval must be 2–3600 seconds and count must be >= 0")
    try:
        gateway = validate_gateway(args.gateway) if args.gateway else detect_gateway()
    except ValueError as error:
        parser.error(str(error))
    prefix = Path(args.output)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    records = []
    last_wall = None
    print("WiFi Pulse Pro local diagnostic logger. Ctrl+C to stop.")
    print("Router gateway:", gateway or "unavailable (use --gateway if desired)")
    with (prefix.with_suffix(".csv")).open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        try:
            while args.count == 0 or len(records) < args.count:
                started = time.monotonic()
                wall = time.time()
                gap = last_wall is not None and wall - last_wall > args.interval * 2 + 5
                last_wall = wall
                result = probe_once(gateway)
                result["observation_gap_before"] = gap
                records.append(result); writer.writerow(result); file.flush()
                print(result["timestamp_utc"], result["assessment"])
                remaining = args.interval - (time.monotonic() - started)
                if remaining > 0 and (args.count == 0 or len(records) < args.count):
                    time.sleep(remaining)
        except KeyboardInterrupt:
            print("\nMonitoring stopped.")
    path = prefix.with_suffix(".txt")
    path.write_text(report(records, gateway), encoding="utf-8")
    print("Saved:", prefix.with_suffix(".csv"), "and", path)


if __name__ == "__main__":
    run()
