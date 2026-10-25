/* ---------- menus ---------- */
var stack = [],
  ovEl = null;
/* webOS 5's Chromium (68) can leave the old text in the compositor tile when an element's content is replaced, so menu and list text shows
   twice (issue 4). There the element is swapped for a fresh one instead of rewriting its content; newer engines just set innerHTML. */
var OLDGPU = (function () {
  var m = /Chrome\/(\d+)/.exec(navigator.userAgent || '');
  return !!m && +m[1] < 79;
})();
function setHtml(el, h) {
  if (!OLDGPU || !el.parentNode) {
    el.innerHTML = h;
    return el;
  }
  var n = el.cloneNode(false);
  n.innerHTML = h;
  el.parentNode.replaceChild(n, el);
  return n;
}
function openMenu(title, items) {
  stack.push({ title: title, items: items, idx: 0 });
  drawMenu();
}
function closeMenus() {
  stack = [];
  if (ovEl) {
    ovEl.remove();
    ovEl = null;
  }
}
function backMenu() {
  stack.pop();
  if (stack.length) drawMenu();
  else closeMenus();
}
function drawMenu() {
  var m = stack[stack.length - 1],
    N = 8,
    start = Math.max(0, Math.min(m.idx - 3, m.items.length - N));
  if (!ovEl) {
    ovEl = document.createElement('div');
    ovEl.id = 'ov';
    document.body.appendChild(ovEl);
  }
  var h = '<div class="panel"><h2></h2><div class="more">' + (start > 0 ? '▲' : '') + '</div>';
  for (var i = start; i < Math.min(m.items.length, start + N); i++) {
    var it = m.items[i];
    h +=
      '<div class="row' +
      (i === m.idx ? ' f' : '') +
      (it.dim ? ' dim' : '') +
      '" data-i="' +
      i +
      '">' +
      (it.icon ? svg(it.icon) : '') +
      '<span class="lb"></span>' +
      (it.sub ? '<span class="st"></span>' : '') +
      '</div>';
  }
  h += '<div class="more">' + (start + N < m.items.length ? '▼' : '') + '</div></div>';
  ovEl = setHtml(ovEl, h);
  ovEl.querySelector('h2').textContent = m.title;
  [].forEach.call(ovEl.querySelectorAll('.row'), function (row) {
    var it = m.items[+row.getAttribute('data-i')];
    row.querySelector('.lb').textContent = it.label;
    if (it.sub) row.querySelector('.st').textContent = it.sub;
    row.addEventListener('click', function () {
      m.idx = +row.getAttribute('data-i');
      pickMenu();
    });
  });
}
function pickMenu() {
  var m = stack[stack.length - 1],
    it = m.items[m.idx];
  if (it && it.fn) {
    var n = stack.length;
    it.fn();
    if (stack.length === n && !it.stay) closeMenus();
  }
}
function menuKey(k) {
  var m = stack[stack.length - 1];
  if (k === 38 && m.idx > 0) {
    m.idx--;
    drawMenu();
  } else if (k === 40 && m.idx < m.items.length - 1) {
    m.idx++;
    drawMenu();
  } else if (k === 13) pickMenu();
  else if (k === 461 || k === 27 || k === 8) backMenu();
  else return false;
  return true;
}

/* Back on the home screen lists the running apps to close them, as LG's Home does with its Recents on a second Back (issue 16) */
function runningMenu() {
  api('/api/running').then(
    function (x) {
      if (x.error) return toast(t('Could not read the running apps'));
      openMenu(t('Running apps'), runningItems(x.apps || []));
      stack[stack.length - 1].running = true;
    },
    function () {
      toast(t('Could not read the running apps'));
    }
  );
}
/* the list is only true for the moment it was read: it goes when Home is left, so it is never shown out of date */
function closeRunningMenu() {
  if (
    stack.some(function (m) {
      return m.running;
    })
  )
    closeMenus();
}
function runningItems(list) {
  if (!list.length) return [{ label: t('No apps are running'), dim: true }];
  var items = list.map(function (a) {
    return {
      label: a.title,
      sub: t('Close'),
      stay: true,
      fn: function () {
        closeRunning(list, [a.id]);
      },
    };
  });
  if (list.length > 1)
    items.push({
      label: t('Close all'),
      stay: true,
      fn: function () {
        closeRunning(
          list,
          list.map(function (a) {
            return a.id;
          })
        );
      },
    });
  return items;
}
/* the app manager's running list lags by seconds after a close, so the rows go at once instead of after a new reading */
function closeRunning(list, ids) {
  var m = stack[stack.length - 1],
    left = list.filter(function (a) {
      return ids.indexOf(a.id) < 0;
    });
  api('/api/running/close', ids.length > 1 ? { all: true } : { id: ids[0] }).then(
    function (x) {
      if (!x || x.returnValue !== true) toast(t('Could not close'));
    },
    function () {
      toast(t('Could not close'));
    }
  );
  m.items = runningItems(left);
  m.idx = Math.min(m.idx, m.items.length - 1);
  drawMenu();
}

function inputsMenu() {
  api('/api/inputs').then(function (x) {
    var items = (x.devices || [])
      .filter(function (d) {
        return d.appId;
      })
      .map(function (d) {
        var port = 'HDMI ' + d.port,
          named = d.label && d.label !== port && d.label !== 'HDMI ' + d.port,
          parts = [];
        if (named) parts.push(port);
        if (d.hdmiPlugIn) parts.push(t('Connected'));
        if (d.activate) parts.push(t('Active'));
        return {
          icon: 'hdmi',
          label: d.label || port,
          sub: parts.join(' \u00B7 '),
          dim: !d.hdmiPlugIn,
          fn: function () {
            launch(d.appId);
          },
        };
      });
    openMenu(t('Inputs'), items);
  });
}

function appMenu(a) {
  var di = dockIds(),
    pos = di.indexOf(a.id),
    items = [
      {
        label: t('Open'),
        fn: function () {
          launch(a.id);
        },
      },
    ];
  if (pos >= 0 ? di.length > 1 : gridIds().length > 1)
    items.push({
      label: t('Move'),
      sub: pos >= 0 ? t('in the dock') : '',
      fn: function () {
        startMove(a.id);
      },
    });
  if (pos >= 0) {
    items.push({
      label: t('Remove from dock'),
      fn: function () {
        setDock(
          di.filter(function (i) {
            return i !== a.id;
          })
        );
      },
    });
  } else if (di.length < TH.dockN)
    items.push({
      label: t('Add to dock'),
      fn: function () {
        setDock(di.concat(a.id));
      },
    });
  else
    items.push({
      label: t('Add to dock...'),
      stay: true,
      fn: function () {
        openMenu(
          t('Replace which app?'),
          di.map(function (id, i) {
            return {
              label: title(id),
              fn: function () {
                var d = di.slice();
                d[i] = a.id;
                setDock(d);
              },
            };
          })
        );
      },
    });
  items.push({
    label: t('Hide app'),
    fn: function () {
      hideApp(a.id);
    },
  });
  openMenu(a.title, items);
}

function removeButton(o) {
  cfg.topbar = topbar().filter(function (b) {
    return b !== o;
  });
  saveCfg();
}
function barMenu(o) {
  openMenu(barLabel(o), [
    {
      label: t('Remove this button'),
      fn: function () {
        removeButton(o);
      },
    },
  ]);
}

function customizeMenu() {
  openMenu(t('Customise'), [
    {
      label: 'Dock',
      sub: t('hold OK on an app'),
      stay: true,
      fn: function () {
        toast(t('Hold OK on any app to change the dock'));
      },
    },
    { label: t('Top buttons'), stay: true, fn: topButtonsMenu },
    { label: t('Show and hide apps'), stay: true, fn: showHideMenu },
    {
      label: t('App order'),
      sub: cfg.sort === 'alpha' ? t('A to Z') : cfg.sort === 'custom' ? t('Your order') : t('Most used first'),
      fn: function () {
        /* most used first > A to Z > your own order (as you left it, or the order on screen the first time) */
        if (cfg.sort === 'alpha') {
          if (cfg.order && cfg.order.length) cfg.sort = 'custom';
          else useOwnOrder();
        } else cfg.sort = cfg.sort === 'custom' ? 'usage' : 'alpha';
        saveCfg();
      },
    },
    {
      label: t('Clock'),
      sub: cfg.clock === '24' ? t('24-hour') : cfg.clock === '12' ? t('12-hour') : t('Automatic'),
      fn: function () {
        cfg.clock = cfg.clock === '24' ? '12' : cfg.clock === '12' ? 'auto' : '24';
        saveCfg();
        tick();
      },
    },
    {
      label: t('Reset customisation'),
      fn: function () {
        cfg = {};
        saveCfg();
      },
    },
  ]);
}
function topButtonsMenu() {
  var items = shownBar().map(function (o) {
    return {
      label: barLabel(o),
      sub: t('OK to remove'),
      fn: function () {
        removeButton(o);
      },
    };
  });
  items.push({ label: t('Add a button...'), stay: true, fn: addButtonMenu });
  openMenu(t('Top buttons'), items);
}
function addButtonMenu() {
  var items = PRESETS.filter(function (p) {
    return liveOn() || p.action !== 'live';
  }).map(function (p) {
    return {
      icon: p.icon,
      label: barLabel(p),
      fn: function () {
        cfg.topbar = topbar().concat([p]);
        saveCfg();
      },
    };
  });
  items.push({ icon: 'hdmi', label: t('An input...'), stay: true, fn: addInputMenu });
  items.push({
    label: t('An app...'),
    stay: true,
    fn: function () {
      openMenu(
        t('Pick an app'),
        apps
          .slice()
          .sort(function (a, b) {
            return a.title.localeCompare(b.title);
          })
          .map(function (a) {
            return {
              label: a.title,
              fn: function () {
                cfg.topbar = topbar().concat([{ label: a.title, icon: 'grid', app: a.id }]);
                saveCfg();
              },
            };
          })
      );
    },
  });
  openMenu(t('Add a button'), items);
}
/* an HDMI input as a top button of its own: one press switches to it */
function addInputMenu() {
  api('/api/inputs').then(
    function (x) {
      var items = (x.devices || [])
        .filter(function (d) {
          return d.appId;
        })
        .map(function (d) {
          var port = 'HDMI ' + d.port;
          return {
            icon: 'hdmi',
            label: d.label || port,
            sub: d.label && d.label !== port ? port : '',
            fn: function () {
              cfg.topbar = topbar().concat([{ label: (d.label || port).slice(0, 40), icon: 'hdmi', app: d.appId }]);
              saveCfg();
            },
          };
        });
      if (!items.length) return toast(t('No inputs found'));
      openMenu(t('Pick an input'), items);
    },
    function () {
      toast(t('Could not read the inputs'));
    }
  );
}
/* every app with OK to hide it or show it again; the list stays open, so several can be changed in one go */
function showHideMenu() {
  var list = apps
    .filter(function (a) {
      return !a.sys;
    })
    .sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  var items = list.map(function (a) {
    var it = {
      label: a.title,
      sub: isHidden(a.id) ? t('Hidden') : t('Shown'),
      dim: isHidden(a.id),
      stay: true,
      fn: function () {
        if (isHidden(a.id)) unhideApp(a.id);
        else hideApp(a.id);
        it.sub = isHidden(a.id) ? t('Hidden') : t('Shown');
        it.dim = isHidden(a.id);
        drawMenu();
      },
    };
    return it;
  });
  openMenu(t('Show and hide apps'), items);
}
