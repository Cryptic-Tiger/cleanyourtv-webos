/* ---------- input: tap OK to open, hold OK for options ---------- */
var lastMove = 0,
  snapT = 0,
  downT = 0,
  held = false,
  downEnter = false,
  swallowUp = false,
  pressT = 0,
  lastKey = 0,
  lastMX = -1,
  lastMY = -1,
  lastEnter = 0;
function hit(e) {
  e.addEventListener('mousedown', function () {
    held = false;
    clearTimeout(pressT);
    pressT = setTimeout(function () {
      held = true;
      options(e);
    }, 650);
  });
  e.addEventListener('mouseup', function () {
    clearTimeout(pressT);
  });
  e.addEventListener('click', function () {
    if (held) {
      held = false;
      return;
    }
    if (moving) return endMove();
    act(e);
  });
}
function options(e) {
  if (e._a && !e._a.sys) appMenu(e._a);
  else if (e._o && !e._o.fixed) barMenu(e._o);
}

/* ---------- moving an app (hold OK, Move): the arrows move it in the dock or in the grid, OK or Back puts it down ----------
   Moving in the grid switches the app order to your own order, starting from the order on screen. */
var moving = null;
function startMove(id) {
  var e = tiles[id],
    p = e && posOf(e);
  if (!p || p[0] < 1) return;
  if (p[0] >= 2) useOwnOrder();
  moving = id;
  e.classList.add('mv');
  toast(t('Arrows move the app, OK puts it down'));
}
function moveKey(k) {
  var e = tiles[moving],
    p = e && posOf(e);
  if (!p) return endMove();
  if (p[0] === 1) {
    if (k !== 37 && k !== 39) return;
    var d = dockIds(),
      i = d.indexOf(moving),
      j = i + (k === 39 ? 1 : -1);
    if (i < 0 || j < 0 || j >= d.length) return;
    d.splice(i, 1);
    d.splice(j, 0, moving);
    cfg.dock = d;
  } else {
    var g = gridIds(),
      a = g.indexOf(moving),
      b = a + (k === 37 ? -1 : k === 39 ? 1 : k === 38 ? -TH.cols : TH.cols);
    /* Down on the row above a shorter last row goes to the end of it */
    if (k === 40 && b >= g.length && Math.floor(a / TH.cols) < Math.floor((g.length - 1) / TH.cols)) b = g.length - 1;
    if (a < 0 || b < 0 || b >= g.length) return;
    g.splice(a, 1);
    g.splice(b, 0, moving);
    cfg.order = g;
  }
  rebuild();
}
function endMove() {
  var e = tiles[moving];
  if (e) e.classList.remove('mv');
  moving = null;
  saveCfg();
}

/* Pointer focus follows real pointer movement only: a tile sliding under a still cursor, a cursor jitter when
   the remote is picked up, or a pointer move right after a button press must not steal the focus. */
document.addEventListener('mousemove', function (ev) {
  if (stack.length || LIVE.on || moving || Date.now() - lastKey < 1500) return;
  if (lastMX < 0) {
    lastMX = ev.clientX;
    lastMY = ev.clientY;
    return;
  }
  if (Math.abs(ev.clientX - lastMX) + Math.abs(ev.clientY - lastMY) < 24) return;
  lastMX = ev.clientX;
  lastMY = ev.clientY;
  var el = ev.target.closest ? ev.target.closest('.tile,.pill') : null,
    p = el && posOf(el);
  if (p && !(p[0] === r && p[1] === c)) setFocus(p[0], p[1]);
});

document.addEventListener('keydown', function (e) {
  var k = e.keyCode;
  lastKey = Date.now();
  if (LIVE.on) {
    LIVE.key(e);
    return;
  }
  if (stack.length) {
    if (k === 13) {
      if (downEnter && Date.now() - lastEnter < 1500) {
        lastEnter = Date.now();
        e.preventDefault();
        return;
      }
      downEnter = true;
      lastEnter = Date.now();
      swallowUp = true;
    }
    if (menuKey(k)) e.preventDefault();
    return;
  }
  if (moving) {
    if (k >= 37 && k <= 40) moveKey(k);
    else if (k === 13 || k === 461 || k === 27 || k === 8) {
      /* OK still held from choosing Move in the menu repeats its keydown: only a new press puts the app down */
      if (k === 13 && downEnter) {
        e.preventDefault();
        return;
      }
      if (k === 13) {
        downEnter = true;
        swallowUp = true;
      }
      endMove();
    }
    e.preventDefault();
    return;
  }
  if ((TH.overlay || TH.push) && r >= 2 && (k === 461 || k === 27 || k === 8)) {
    setFocus(1, Math.min(c, rows[1].length - 1));
    e.preventDefault();
    return;
  } /* Back closes the grid overlay */
  if (k === 461 || k === 27 || k === 8) {
    runningMenu();
    e.preventDefault();
    return;
  } /* Back on the home screen: the running apps */
  var len = rows[r].length;
  if (k >= 37 && k <= 40) {
    var tn = performance.now();
    if (e.repeat || tn - lastMove < 90) {
      document.body.classList.add('snap');
      clearTimeout(snapT);
      snapT = setTimeout(function () {
        document.body.classList.remove('snap');
      }, 180);
    }
    lastMove = tn;
  }
  if (k === 37 && c > 0) setFocus(r, c - 1);
  else if (k === 39 && c < len - 1) setFocus(r, c + 1);
  else if (k === 38 && r > 0) setFocus(r - 1, mapCol(len, rows[r - 1].length, c));
  else if (k === 40 && r < rows.length - 1) setFocus(r + 1, mapCol(len, rows[r + 1].length, c));
  else if (k === 13) {
    /* webOS repeats keydown while OK is held, sometimes without e.repeat: only the first one starts the hold timer */
    if (!downEnter || Date.now() - lastEnter > 1500) {
      downEnter = true;
      held = false;
      clearTimeout(downT);
      var t = rows[r][c];
      t.classList.add('press');
      downT = setTimeout(function () {
        held = true;
        t.classList.remove('press');
        options(t);
      }, 650);
    }
    lastEnter = Date.now();
  } else return;
  e.preventDefault();
});
document.addEventListener('keyup', function (e) {
  if (e.keyCode !== 13) return;
  lastKey = Date.now();
  clearTimeout(downT);
  var pr = document.querySelector('.press');
  if (pr) pr.classList.remove('press');
  if (swallowUp) {
    swallowUp = false;
    downEnter = false;
    return;
  }
  if (downEnter && !held) act(rows[r][c]);
  downEnter = false;
  held = false;
});
/* launching Home with {inputs:true} opens the Inputs list */
function wantInputs() {
  var p = {};
  try {
    p = JSON.parse(webOSSystem.launchParams || '{}');
  } catch (e) {}
  if (p && p.inputs) {
    closeMenus();
    inputsMenu();
  } else if (p && p.live && liveOn()) {
    closeMenus();
    LIVE.enter(!!p.guide);
  }
}
document.addEventListener('webOSRelaunch', function () {
  var p = {};
  try {
    p = JSON.parse(webOSSystem.launchParams || '{}');
  } catch (e) {}
  if (LIVE.on && p && p.guide && liveOn()) {
    LIVE.toggleGuide();
    return;
  } /* the Guide button while Live TV is open */
  if (LIVE.on) LIVE.exit();
  if (moving) endMove();
  load();
  wantInputs();
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    if (LIVE.on) LIVE.exit();
    if (moving) endMove();
    closeRunningMenu();
  } else load();
});

function tick() {
  var d = new Date();
  try {
    $('time').textContent = d.toLocaleTimeString(LOC, clockOpts());
    $('date').textContent = d.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (e) {
    $('time').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
}
setInterval(tick, 15000);
tick();
