# Batch AI Simulation Analysis Report

Generated: 2026-04-08T22:57:38.846Z
Total runs: 65
Average wall time: 33ms per run

## Personality Win Rates

| Personality | Wins | Rate | Avg Score | Bankruptcy Rate |
|---|---|---|---|---|
| aggressiveExpander | 25/65 | 38.5% | 20169234 | 31.9% |
| steadyHauler | 30/65 | 46.2% | 16416129 | 41.7% |
| cherryPicker | 10/65 | 15.4% | 12727785 | 24.4% |

## Stats by Game Size

| Size | Runs | Avg Bankruptcies | Avg Score Spread | Avg Gini | Avg Winner Score | Avg Fuel | Avg Cargo Price |
|---|---|---|---|---|---|---|---|
| small | 30 | 1.3 | 55588238 | 0.468 | 57878966 | 8.2 | 67.4 |
| medium | 25 | 1.8 | 49205673 | 0.474 | 53852290 | 7.4 | 68.0 |
| large | 10 | 4.8 | 34031300 | 0.495 | 36589188 | 7.3 | 67.9 |

## Stats by Galaxy Shape

| Shape | Runs | Avg Bankruptcies | Avg Gini |
|---|---|---|---|
| spiral | 50 | 2.2 | 0.471 |
| elliptical | 5 | 1.0 | 0.476 |
| ring | 5 | 1.6 | 0.503 |
| irregular | 5 | 1.6 | 0.475 |

## Economy Health

- Avg final fuel price: 8.93
- Avg peak fuel price: 23.05
- Fuel price variance: 27.45
- Avg final cargo price: 67.71

## Event Frequency (top 15)

| Event | Total Occurrences |
|---|---|
| Empire Trade Pact | 1183 |
| Famine Crisis | 1043 |
| Import Crackdown | 906 |
| Tariff War | 864 |
| Ore Boom | 859 |
| New Colony | 851 |
| Trade Agreement | 825 |
| Government Subsidy | 777 |
| Quarantine | 763 |
| Economic Recession | 760 |
| Tech Glut | 731 |
| Asteroid Storm | 690 |
| Border Dispute | 669 |
| Pirate Activity | 658 |
| Fuel Shortage | 614 |

## Warning Frequency

| Warning | Total Count |
|---|---|
| BALANCE_OUTLIER | 1145 |
| FUEL_CRISIS | 532 |
| MASS_BANKRUPTCY | 360 |

## Detected Balance Issues

- **HIGH_BANKRUPTCY: steadyHauler goes bankrupt 41.7% of the time (98/235)**
- **MASS_BANKRUPTCY: Average 2.0 bankruptcies per game**

## Sample Run Details

### Seed 42, small, spiral, 0 companies
- Winner: Nebula Express (score: 78005054)
- Bankruptcies: 1
- Final fuel: 10.77, cargo: 69.99
- Rankings:
  - Nebula Express: score=78005054, nw=76970149, fleet=10, routes=11
  - AI Sandbox Corp: score=58782593, nw=58000493, fleet=8, routes=9
  - Void Transport Co.: score=33241129, nw=32723869, fleet=8, routes=9
  - Stellar Cargo Ltd.: score=11076119, nw=10898114, fleet=7, routes=8
  - AI Sandbox Corp: score=187500, nw=175000, fleet=0, routes=0
  - Deep Fleet Services: score=4847, nw=-793, fleet=1, routes=0

### Seed 42, medium, spiral, 0 companies
- Winner: Nova Shipping Corp (score: 30539170)
- Bankruptcies: 2
- Final fuel: 14.98, cargo: 68.35
- Rankings:
  - Nova Shipping Corp: score=30539170, nw=30066450, fleet=12, routes=12
  - Quantum Freight Lines: score=25171226, nw=24819101, fleet=8, routes=8
  - Void Transport Co.: score=22222805, nw=21895305, fleet=10, routes=12
  - Stellar Cargo Ltd.: score=7628210, nw=7442950, fleet=8, routes=9
  - Nebula Express: score=7546900, nw=7341275, fleet=8, routes=8
  - AI Sandbox Corp: score=293400, nw=280000, fleet=0, routes=0
  - Apex Freight Lines: score=1755, nw=-3765, fleet=1, routes=0
  - AI Sandbox Corp: score=-140, nw=-5740, fleet=1, routes=0

### Seed 42, large, spiral, 0 companies
- Winner: Apex Freight Lines (score: 22186849)
- Bankruptcies: 5
- Final fuel: 2.50, cargo: 65.72
- Rankings:
  - Apex Freight Lines: score=22186849, nw=21789799, fleet=10, routes=12
  - Nova Shipping Corp: score=12584785, nw=12306600, fleet=9, routes=8
  - Stellar Trading Guild: score=8367818, nw=8089803, fleet=10, routes=12
  - Nebula Express: score=6458498, nw=6219258, fleet=8, routes=9
  - AI Sandbox Corp: score=344500, nw=330000, fleet=0, routes=0
  - Stellar Fleet Services: score=70234, nw=-153566, fleet=6, routes=0
  - Quantum Freight Lines: score=5134, nw=-466, fleet=1, routes=0
  - Deep Freight Lines: score=4800, nw=-880, fleet=1, routes=0
  - AI Sandbox Corp: score=2887, nw=-2793, fleet=1, routes=0
  - Stellar Cargo Ltd.: score=1992, nw=-3728, fleet=1, routes=0
