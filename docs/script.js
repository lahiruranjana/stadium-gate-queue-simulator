const elLambda = document.getElementById("input-lambda");
const elMu = document.getElementById("input-mu");
const elLanes = document.getElementById("input-lanes");
const elSurge = document.getElementById("input-surge");

const valLambda = document.getElementById("val-lambda");
const valMu = document.getElementById("val-mu");
const valLanes = document.getElementById("val-lanes");
const valSurge = document.getElementById("val-surge");

const outMeanWait = document.getElementById("out-mean-wait");
const outErlangWq = document.getElementById("out-erlang-wq");
const outP95Wait = document.getElementById("out-p95-wait");
const outPeakQ = document.getElementById("out-peak-q");
const outStatus = document.getElementById("out-status");

const canvas = document.getElementById("queue-canvas");
const ctx = canvas.getContext("2d");

let running = false;
let timerId = null;
let simClock = 0;
let nextArrival = 0;
let busyEnds = [];
let queueTimes = [];
let waits = [];
let history = [{ t: 0, q: 0 }];
let peakQ = 0;

function expSample(rate) {
  if (rate <= 0) return Infinity;
  return -Math.log(1 - Math.random()) / rate;
}

function erlangCWq(lam, mu, c) {
  const rho = lam / (c * mu);
  if (lam <= 0) return 0;
  if (rho >= 1) return Infinity;
  const a = lam / mu;
  let sum = 0;
  let term = 1;
  for (let k = 0; k < c; k++) {
    if (k > 0) term *= a / k;
    sum += term;
  }
  let cFact = 1;
  for (let k = 2; k <= c; k++) cFact *= k;
  const powA = Math.pow(a, c);
  const pw = (powA / cFact / (1 - rho)) / (sum + powA / cFact / (1 - rho));
  return pw / (c * mu - lam);
}

function syncLabels() {
  valLambda.textContent = Number(elLambda.value).toFixed(1);
  valMu.textContent = Number(elMu.value).toFixed(2);
  valLanes.textContent = elLanes.value;
  valSurge.textContent = Number(elSurge.value).toFixed(1);

  const lamEff = Number(elLambda.value) * Number(elSurge.value);
  const mu = Number(elMu.value);
  const c = Number(elLanes.value);
  const eq = erlangCWq(lamEff, mu, c);
  outErlangWq.textContent = Number.isFinite(eq) ? `${eq.toFixed(2)} min` : "Unstable (ρ≥1)";
}

function resetSim() {
  running = false;
  clearInterval(timerId);
  simClock = 0;
  busyEnds = [];
  queueTimes = [];
  waits = [];
  peakQ = 0;
  history = [{ t: 0, q: 0 }];
  const lamEff = Number(elLambda.value) * Number(elSurge.value);
  nextArrival = expSample(lamEff);
  syncLabels();
  renderMetricsAndPlot();
}

function stepMinutes(dt = 0.5) {
  const lamEff = Number(elLambda.value) * Number(elSurge.value);
  const mu = Number(elMu.value);
  const c = Number(elLanes.value);
  const target = simClock + dt;

  while (true) {
    busyEnds.sort((a, b) => a - b);
    const nextDep = busyEnds.length > 0 ? busyEnds[0] : Infinity;
    const tEv = Math.min(nextArrival, nextDep);
    if (tEv > target || !Number.isFinite(tEv)) break;

    simClock = tEv;
    if (nextArrival <= nextDep) {
      if (busyEnds.length < c) {
        waits.push(0);
        busyEnds.push(simClock + expSample(mu));
      } else {
        queueTimes.push(simClock);
        if (queueTimes.length > peakQ) peakQ = queueTimes.length;
      }
      nextArrival = simClock + expSample(lamEff);
    } else {
      busyEnds.shift();
      if (queueTimes.length > 0) {
        const arrT = queueTimes.shift();
        waits.push(simClock - arrT);
        busyEnds.push(simClock + expSample(mu));
      }
    }
  }
  simClock = target;
  history.push({ t: simClock, q: queueTimes.length });
  if (history.length > 240) history.shift();
}

function renderMetricsAndPlot() {
  const meanW = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const sortedW = [...waits].sort((a, b) => a - b);
  const p95 = sortedW.length ? sortedW[Math.min(sortedW.length - 1, Math.floor(0.95 * sortedW.length))] : 0;

  outMeanWait.textContent = `${meanW.toFixed(2)} min`;
  outP95Wait.textContent = `${p95.toFixed(2)} min`;
  outPeakQ.textContent = `${peakQ}`;

  const safe = p95 < 10.0 && peakQ <= 250;
  outStatus.textContent = safe ? "SAFE" : "AT RISK";
  outStatus.className = safe ? "safe" : "unsafe";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const padL = 48, padR = 16, padT = 16, padB = 28;
  const w = canvas.width - padL - padR;
  const h = canvas.height - padT - padB;
  const maxQ = Math.max(20, peakQ * 1.15);
  const tMin = history[0].t;
  const tMax = Math.max(tMin + 1, history[history.length - 1].t);

  ctx.strokeStyle = "#cbd2d9";
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + h);
  ctx.lineTo(padL + w, padT + h);
  ctx.stroke();

  if (maxQ >= 250) {
    const yCap = padT + h - (250 / maxQ) * h;
    ctx.strokeStyle = "#b42318";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padL, yCap);
    ctx.lineTo(padL + w, yCap);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "#0f6cbd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((pt, idx) => {
    const x = padL + ((pt.t - tMin) / (tMax - tMin)) * w;
    const y = padT + h - (Math.min(pt.q, maxQ) / maxQ) * h;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#52606d";
  ctx.font = "12px sans-serif";
  ctx.fillText("0", 24, padT + h + 4);
  ctx.fillText(`${Math.round(maxQ)}`, 10, padT + 10);
  ctx.fillText(`t = ${simClock.toFixed(1)} min`, padL + w - 85, canvas.height - 6);
}

[elLambda, elMu, elLanes, elSurge].forEach((inp) => inp.addEventListener("input", syncLabels));
document.getElementById("btn-start").addEventListener("click", () => {
  if (!running) {
    running = true;
    timerId = setInterval(() => {
      stepMinutes(0.5);
      renderMetricsAndPlot();
    }, 80);
  }
});
document.getElementById("btn-pause").addEventListener("click", () => {
  running = false;
  clearInterval(timerId);
});
document.getElementById("btn-reset").addEventListener("click", resetSim);

resetSim();
