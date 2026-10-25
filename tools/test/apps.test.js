// The launcher's app list (apps.js): the first answer is waited for, later ones come from memory while the list is asked again.
const { ok, call, req, memoryConfig, run } = require('./lib');

run(async () => {
  let asked = 0,
    title = 'One';
  const luna = async uri => {
    if (/listApps/.test(uri)) {
      asked++;
      await new Promise(r => setTimeout(r, 50));
      return {
        returnValue: true,
        apps: [
          { id: 'a.one', title, folderPath: '/x', icon: 'i.png' },
          { id: 'com.webos.app.home', title: 'Home' },
        ],
      };
    }
    return { returnValue: true };
  };
  const apps = req('apps').create({ config: memoryConfig({ dock: ['a.one'] }), luna, version: '1.6.0', feature: () => null });
  let r = await call(apps, '/api/apps');
  ok(
    asked === 1 && r.j.apps.length === 1 && r.j.apps[0].title === 'One' && r.j.config.dock[0] === 'a.one',
    'the first list is asked from the app manager, without LG Home'
  );
  title = 'Two';
  const t0 = Date.now();
  r = await call(apps, '/api/apps');
  ok(asked === 1 && r.j.apps[0].title === 'One' && Date.now() - t0 < 40, 'opened again soon: the list comes from memory at once');
  r = await call(apps, '/api/launch', 'POST', { id: 'bad id' });
  ok(r.code === 400, 'a bad app id is refused');
  // your own order of the grid (moving apps in the launcher): kept with sort "custom"; a sort the launcher does not know is not kept
  await call(apps, '/api/config', 'POST', { dock: ['a.one'], sort: 'custom', order: ['b', 'a', 7, 'c'] });
  r = await call(apps, '/api/apps');
  ok(
    r.j.config.sort === 'custom' && r.j.config.order.join() === 'b,a,c' && r.j.config.dock[0] === 'a.one',
    'your own app order is kept (app ids only)'
  );
  await call(apps, '/api/config', 'POST', { sort: 'random', order: 'x' });
  r = await call(apps, '/api/apps');
  ok(r.j.config.sort === undefined && r.j.config.order === undefined, 'an unknown sort or an order that is not a list is not kept');
});
