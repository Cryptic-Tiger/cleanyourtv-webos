// The shell side: the scripts parse, and the setup keeps the options the user chose (issues 6 and 7).
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const { root, tmp, ok, run } = require('./lib');

run(async () => {
  const scripts = fs
    .readdirSync(path.join(root, 'scripts'))
    .filter(f => !/\.js$/.test(f))
    .map(f => path.join('scripts', f))
    .concat(['install.sh', 'uninstall.sh', 'tools/diagnose.sh']);
  for (const f of scripts) {
    const r = cp.spawnSync('sh', ['-n', path.join(root, f)], { encoding: 'utf8' });
    ok(r.status === 0, 'shell syntax ' + f + (r.status ? ': ' + r.stderr : ''));
  }
  const jt = path.join(root, 'scripts', 'jtool.js'),
    cfg = path.join(tmp, 'config.json');
  const opts = function () {
    return cp.spawnSync(process.execPath, [jt, 'options', cfg].concat([].slice.call(arguments)), { encoding: 'utf8' });
  };
  fs.writeFileSync(cfg, JSON.stringify({ options: { inputKey: false, debloat: false, liveTv: false }, keep: 1 }));
  let r = opts('', '');
  let c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
  ok(
    r.status === 0 && c.options.inputKey === false && c.options.debloat === false && c.options.liveTv === false && c.keep === 1,
    'an update (no values) keeps Input key, Debloat and Live TV as they were'
  );
  ok(/\(kept\)/.test(r.stdout), 'the setup log says the options were kept');
  r = opts('1', '1');
  c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
  ok(
    c.options.inputKey === true && c.options.debloat === true && /were/.test(r.stdout),
    'setup with values sets them and says what they were'
  );
  fs.writeFileSync(cfg, '{}');
  opts('', '');
  c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
  ok(c.options.inputKey === true && c.options.debloat === true, 'a first install without values defaults both to on');
  // bootstrap.sh run for real against a folder that stands in for the TV's root (CYTV_TEST_ROOT), with stand-ins for luna-send and systemctl
  const R = path.join(tmp, 'root'),
    S = path.join(tmp, 'pkg'),
    BIN = path.join(tmp, 'bin');
  const write = (f, data, mode) => {
    cp.spawnSync('mkdir', ['-p', path.dirname(f)]);
    fs.writeFileSync(f, data);
    if (mode) fs.chmodSync(f, mode);
  };
  const copyDir = (from, to, filter) => {
    cp.spawnSync('mkdir', ['-p', to]);
    for (const n of fs.readdirSync(from)) if (!filter || filter(n)) fs.copyFileSync(path.join(from, n), path.join(to, n));
  };
  copyDir(path.join(root, 'helper'), path.join(S, 'helper'), n => /\.js$/.test(n));
  copyDir(path.join(root, 'scripts'), path.join(S, 'scripts'), n => n !== 'bootstrap.sh');
  fs.copyFileSync(path.join(root, 'scripts', 'bootstrap.sh'), path.join(S, 'bootstrap.sh'));
  write(path.join(S, 'inputhook', 'ezinject'), '', 0o755);
  write(path.join(S, 'inputhook', 'libinputhookpp.so'), '');
  fs.copyFileSync(path.join(root, 'compat.json'), path.join(S, 'compat.json'));
  fs.copyFileSync(path.join(root, 'config.example.json'), path.join(S, 'config.example.json'));
  write(path.join(S, 'payload', 'app', 'index.html'), '<!doctype html>');
  fs.copyFileSync(path.join(root, 'app', 'version.json'), path.join(S, 'payload', 'app', 'version.json'));
  write(
    path.join(R, 'usr/palm/applications/com.webos.app.home/appinfo.json'),
    JSON.stringify({ id: 'com.webos.app.home', type: 'flutter' })
  );
  const NA = path.join(R, 'media/developer/apps/usr/palm/applications/com.cleanyourtv.notify/appinfo.json');
  write(NA, JSON.stringify({ id: 'com.cleanyourtv.notify', defaultWindowType: 'topui' }));
  cp.spawnSync('mkdir', ['-p', path.join(R, 'var/lib/webosbrew/init.d')]);
  write(
    path.join(BIN, 'luna-send'),
    '#!/bin/sh\necho \'{"returnValue": true, "modelName": "OLED55CX3LA", "firmwareVersion": "04.41.35", "sdkVersion": "5.4.3"}\'\n',
    0o755
  );
  write(path.join(BIN, 'systemctl'), '#!/bin/sh\nexit 0\n', 0o755);
  const boot = args =>
    cp.spawnSync('sh', [path.join(S, 'bootstrap.sh')].concat(args), {
      encoding: 'utf8',
      env: Object.assign({}, process.env, { PATH: process.env.PATH + ':' + BIN, CYTV_TEST_ROOT: R }),
      timeout: 60000,
    });
  const D = path.join(R, 'media/developer/cleanyourtv');
  let b = boot(['install', '--no-start', '--no-input-key']);
  const out1 = b.stdout + b.stderr;
  ok(b.status === 0, 'bootstrap.sh install runs to the end (' + (b.status === 0 ? 'ok' : out1.slice(-400)) + ')');
  ok(
    /webOS SDK 5\.4\.3/.test(out1) && /not in the compatibility list; continuing because LG's Home is the flutter or web kind/.test(out1),
    'it reads the TV and accepts a flutter Home that is not in the list'
  );
  ok(
    JSON.parse(fs.readFileSync(NA, 'utf8')).defaultWindowType === 'overlay' && /use the overlay window/.test(out1),
    'on SDK 5 the notification app gets the overlay window (tvprofile.js)'
  );
  ok(
    fs.existsSync(path.join(D, 'helper.js')) &&
      fs.existsSync(path.join(D, 'tvprofile.js')) &&
      fs.existsSync(path.join(D, 'app', 'version.json')),
    'the service files and the launcher are in place'
  );
  let conf = JSON.parse(fs.readFileSync(path.join(D, 'config.json'), 'utf8'));
  ok(conf.options.inputKey === false && conf.options.debloat === true, 'the setup stores the chosen options');
  const initd = path.join(R, 'var/lib/webosbrew/init.d');
  ok(
    fs.lstatSync(path.join(initd, '10-cleanyourtv-home')).isSymbolicLink() &&
      fs.lstatSync(path.join(initd, '15-cleanyourtv-debloat')).isSymbolicLink(),
    'the boot scripts are linked'
  );
  b = boot(['update', '1.6.0', '--no-start']);
  const out2 = b.stdout + b.stderr;
  conf = JSON.parse(fs.readFileSync(path.join(D, 'config.json'), 'utf8'));
  ok(
    b.status === 0 && conf.options.inputKey === false && /options: .*\(kept\)/.test(out2),
    'an update keeps the Input key switched off (issues 6 and 7)'
  );
  ok(fs.existsSync(path.join(D, 'backup', 'service-prev.tgz')), 'an update keeps the previous service files for a rollback');
  fs.writeFileSync(
    path.join(R, 'usr/palm/applications/com.webos.app.home/appinfo.json'),
    JSON.stringify({ id: 'com.webos.app.home', type: 'native' })
  );
  fs.unlinkSync(path.join(D, 'backup', 'home-appinfo.orig.json'));
  b = boot(['install', '--no-start']);
  ok(
    b.status !== 0 && /Set up anyway/.test(b.stderr),
    'a native Home that is not in the list stops the setup with the hint to set up anyway'
  );
  b = boot(['install', '--no-start', '--force']);
  ok(b.status === 0 && /continuing because of --force/.test(b.stderr), 'with --force it continues');

  // bootstrap.sh asks tvprofile.js for the per-TV decisions instead of deciding itself
  const bootText = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.sh'), 'utf8');
  const stop = fs.readFileSync(path.join(root, 'scripts', 'debloat-stop.sh'), 'utf8'),
    hostsSh = fs.readFileSync(path.join(root, 'scripts', 'debloat-hosts.sh'), 'utf8'),
    undo = fs.readFileSync(path.join(root, 'scripts', 'debloat-undo.sh'), 'utf8');
  ok(
    /sh \$L\/debloat-hosts\.sh/.test(stop) &&
      /mount --bind \/tmp\/cleanyourtv-hosts \/etc\/hosts/.test(hostsSh) &&
      /umount \/etc\/hosts/.test(undo),
    'where /etc/hosts is read-only (issue 11) the ad servers go into a copy in RAM, and the undo removes it'
  );
  // the hosts lines: the short list always, the longer one only with DEBLOAT-EXTRA; a changed list replaces the old lines, and the
  // undo's own command (every line with the marker goes) gives back the original file
  const hd = path.join(tmp, 'hostsdir'),
    hf = path.join(hd, 'hosts'),
    orig = '127.0.0.1 localhost\n::1 localhost\n192.168.1.5 nas # mine\n';
  fs.mkdirSync(hd);
  fs.writeFileSync(hf, orig);
  const hosts = () =>
    cp.spawnSync('sh', [path.join(root, 'scripts', 'debloat-hosts.sh')], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, { CYTV_HOSTS: hf, CYTV_DIR: hd }),
    });
  const marked = () =>
    fs
      .readFileSync(hf, 'utf8')
      .split('\n')
      .filter(l => /# cleanyourtv-debloat$/.test(l));
  let hr = hosts();
  const short = fs.readFileSync(hf, 'utf8');
  ok(
    hr.status === 0 &&
      short.indexOf(orig) === 0 &&
      marked().length === 2 &&
      /nl\.ad\.lgsmartad\.com/.test(short) &&
      !/us\.ad\.lgsmartad\.com/.test(short),
    'the debloat adds the short list of ad servers after the existing lines'
  );
  hosts();
  ok(fs.readFileSync(hf, 'utf8') === short, 'run again, nothing changes');
  fs.writeFileSync(path.join(hd, 'DEBLOAT-EXTRA'), '');
  hosts();
  const long = fs.readFileSync(hf, 'utf8');
  ok(
    marked().length === 8 &&
      /^127\.0\.0\.1 us\.ad\.lgsmartad\.com us\.info\.lgsmartad\.com /m.test(long) &&
      /^::1 .*aic\.homeprv\.lgtvcommon\.com/m.test(long) &&
      long.indexOf(orig) === 0 &&
      long.split('\n').filter(l => /nl\.ad\.lgsmartad/.test(l)).length === 2,
    'with DEBLOAT-EXTRA the longer list replaces the short one, nothing twice'
  );
  fs.unlinkSync(path.join(hd, 'DEBLOAT-EXTRA'));
  hosts();
  ok(fs.readFileSync(hf, 'utf8') === short, 'without it again, the short list is back');
  ok(
    fs
      .readFileSync(hf, 'utf8')
      .split('\n')
      .filter(l => !/# cleanyourtv-debloat/.test(l))
      .join('\n') === orig,
    "the undo's removal of the marked lines gives back the original file"
  );
  ok(
    /\[ -n "\$CYTV_HOSTS" \]/.test(hostsSh) && /H=\/etc\/hosts/.test(hostsSh),
    'the hosts file of the computer running the tests is never the one changed'
  );
  ok(
    /TV="node \$S\/helper\/tvprofile\.js"/.test(bootText) &&
      /\$TV get notifyWindow/.test(bootText) &&
      /\$TV get testedNote/.test(bootText) &&
      /\$TV get homeSupported/.test(bootText) &&
      !/TESTED_SDK/.test(bootText),
    'the setup takes the window type and the compatibility list from tvprofile.js'
  );
});
