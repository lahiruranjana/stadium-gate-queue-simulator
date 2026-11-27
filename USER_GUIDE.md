# Web Demo User Guide

## Opening the Demo
Open `docs/index.html` in a browser or visit `https://lahiruranjana.github.io/stadium-gate-queue-simulator/`.

## Controls and Outputs
- **Arrival Rate $\lambda$ (spectators/min):** Mean arrival rate before surge scaling.
- **Service Rate $\mu$ (spectators/min/lane):** Mean screening throughput per open lane.
- **Security Lanes $c$:** Number of parallel security lanes.
- **Surge Multiplier:** Scales effective arrival rate $\lambda_{\text{eff}} = \lambda \times \text{surge}$.
- **Start / Pause / Reset:** Controls live simulation progression and resets state.
- **Outputs:** Shows simulated mean wait, analytical Erlang-C reference $W_q$, estimated 95th-percentile wait, peak queue length, safety status (<10 min and <=250 queue), and a live queue-length chart.

## Try This Scenario
Set $\lambda = 18.0$/min, $\mu = 3.00$/min, and surge $= 1.0\text{x}$, then compare $c = 6$ lanes ($\rho = 1.00$) against $c = 7$ lanes ($\rho = 0.86$).

## Limitations
Runs a single-gate exponential queue in the browser without spatial movement or multi-seed batch averaging.