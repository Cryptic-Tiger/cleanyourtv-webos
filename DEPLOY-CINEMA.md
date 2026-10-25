# Cinema on a 55UQ7570PUJ: deploying from an iPhone

This branch (`premium-cinema` in `Cryptic-Tiger/cleanyourtv-WebOS`) adds the **Cinema** theme and launcher 1.6.0 with service 1.7.0
(moving apps, your own app order, show and hide apps, an HDMI input as a top button, the name under the focused tile). Everything
below runs from **a-Shell** on the iPhone over the SSH key that already works. Nothing is reinstalled or rooted again; the manager's
own update path is used, which keeps the previous launcher and service files for a rollback.

Replace `<TV-IP>` with the TV's address. Lines starting with `#` are comments.

## 0. Before you start (once)

1. On GitHub (Safari is fine): open the fork, **Actions**, and enable workflows if GitHub asks (forks start with them off).
2. The branch must be on GitHub. When it is pushed, the **Test build** workflow builds the package and publishes the pre-release
   **test-premium-cinema** under **Releases** (a few minutes). Wait until it is there.
3. Keep a copy of the current settings on the TV:

```sh
ssh root@<TV-IP>
B=/media/developer/cytv-before-cinema; mkdir -p $B
cp /media/developer/cleanyourtv/config.json /media/developer/cleanyourtv/usage.json /etc/hosts $B/ 2>/dev/null
curl -s localhost:8765/api/manager/status > $B/status.json; ls $B
```

## 1. Follow the branch

Still in the SSH session. The `source` file tells the service which repository and branch the updates and themes come from
(`helper/updates.js`, `helper/theme.js`):

```sh
echo 'Cryptic-Tiger/cleanyourtv-WebOS premium-cinema' > /media/developer/cleanyourtv/source
curl -s -X POST localhost:8765/api/manager/channel -d '{"tag":"test-premium-cinema"}' | grep -o '"updateTo":"[^"]*"'
```

It should print `"updateTo":"1.7.0"` (the service) and `"updateTo":"1.6.0"` (the launcher). Nothing is installed yet.

## 2. Service first, then the launcher

The launcher 1.6.0 asks for service 1.7.0, so the service goes first:

```sh
curl -s -X POST localhost:8765/api/manager/update-service -d '{"version":"1.7.0"}'
# about two minutes: the package installs and the service restarts (the connection may drop; reconnect with ssh)
curl -s localhost:8765/api/version
```

When it answers `{"version":"1.7.0"}`:

```sh
curl -s -X POST localhost:8765/api/manager/update-frontend -d '{"version":"1.6.0"}'
# about a minute; Home reloads. Check the result:
curl -s localhost:8765/api/manager/status | grep -o '"job":{[^}]*}'
```

`"state":"done"` means it is in place. A launcher that does not start is replaced by the previous one automatically.

The same can be done with the remote: **CleanYourTV** app > **Update channel** > **Test: premium-cinema**, then the **Service** row,
then the **Launcher** row.

## 3. The theme

```sh
curl -s -X POST localhost:8765/api/theme/set -d '{"id":"cinema"}' | grep -o '"current":{[^}]*}'
```

or **CleanYourTV** app > **Theme** > **Cinema**. Press Home to see it.

On the TV, with the remote:

- **Six apps in the dock**: hold OK on an app > **Add to dock** (the dock shows as many as you add, up to six).
- **Arrange**: hold OK on an app > **Move**, then the arrows; OK puts it down.
- **An HDMI input as a button**: **Customise** > **Top buttons** > **Add a button...** > **An input...**.
- **Hide LG apps you never use**: **Customise** > **Show and hide apps**, OK on each.

## Optional: the longer debloat list

Your debloat stays exactly as it is. The US ad servers and LG's promotion and report servers can be added (see `docs/debloat.md`):

```sh
touch /media/developer/cleanyourtv/DEBLOAT-EXTRA && sh /media/developer/cleanyourtv/debloat-hosts.sh
sh /media/developer/cleanyourtv/debloat-status.sh     # read-only: what is stopped and blocked now
```

## Without GitHub: the package from this session

If the branch is not on GitHub yet, the package built in this session (`com.cleanyourtv.manager_1.7.0_all.ipk`, with launcher 1.6.0
inside) can be copied to the TV directly. Save it and the two theme files (`theme.json`, `cinema.jpg`) to **Files > On My iPhone >
a-Shell**, then in a-Shell (not in the SSH session):

```sh
cd ~/Documents
scp com.cleanyourtv.manager_1.7.0_all.ipk root@<TV-IP>:/tmp/cytv.ipk
ssh root@<TV-IP> 'mkdir -p /media/developer/cleanyourtv/themes/cinema'
scp theme.json cinema.jpg root@<TV-IP>:/media/developer/cleanyourtv/themes/cinema/
```

Then on the TV (`ssh root@<TV-IP>`), compare the checksum with the `.sha256` file that came with the package, and update with the
project's installer, which installs a local package with `CYTV_IPK` and, on a TV that is already set up, only updates:

```sh
node -e 'console.log(require("crypto").createHash("sha256").update(require("fs").readFileSync("/tmp/cytv.ipk")).digest("hex"))'
curl -fsSL https://raw.githubusercontent.com/lasharor/cleanyourtv-WebOS/main/install.sh | CYTV_IPK=/tmp/cytv.ipk sh
curl -s localhost:8765/api/version
curl -s -X POST localhost:8765/api/theme/set -d '{"id":"cinema"}' | grep -o '"current":{[^}]*}'
```

The theme is taken from the copied folder when GitHub has no copy of it (copy it before the update, as above: the service reads the
theme folders when it starts). The manager then offers the stable release as an "update": that is the way back (see Rollback), not
something to install.

## Rollback

| To undo | Command (in `ssh root@<TV-IP>`) |
|---|---|
| The theme | `curl -s -X POST localhost:8765/api/theme/revert` (the previous theme), or `-d '{"id":"classic"}'` to `/api/theme/set` |
| The launcher only | `curl -s -X POST localhost:8765/api/manager/rollback-frontend -d '{}'` (back to 1.5.1, kept as `app.prev`) |
| The longer debloat list | `rm /media/developer/cleanyourtv/DEBLOAT-EXTRA && sh /media/developer/cleanyourtv/debloat-hosts.sh` |
| Your settings | `cp /media/developer/cytv-before-cinema/config.json /media/developer/cleanyourtv/config.json`, then press Home |
| LG's Home, right now | `sh /media/developer/cleanyourtv/undo-home.sh` (or **CleanYourTV as Home** off in the app) |

Everything back to the stable release (the launcher first, because 1.5.1 runs on service 1.7.0 but 1.6.0 needs 1.7.0):

```sh
rm -f /media/developer/cleanyourtv/source
curl -s -X POST localhost:8765/api/manager/channel -d '{"tag":""}' | grep -o '"updateTo":"[^"]*"'
# use the two numbers it prints (1.5.1 and 1.6.4 at the time of writing)
curl -s -X POST localhost:8765/api/manager/update-frontend -d '{"version":"1.5.1"}'
# about a minute, then:
curl -s -X POST localhost:8765/api/manager/update-service -d '{"version":"1.6.4"}'
```

If a boot ever goes wrong, the Homebrew Channel's failsafe mode skips all boot scripts and the TV starts with LG's Home.

## What was and was not checked

Checked in this session, without a TV: every test in `tools/test` (365 checks) under Node.js 22, the type checks and lint, the built
pages, and the launcher in headless Chromium (the theme's screenshots, moving apps in the grid and the dock, your own order saved
through the service's own handler, show and hide apps, an input as a top button, the name under the focused tile, no script errors).

Not run: the tests under Node.js 8.12 and the pages in Chromium 68 and 79 (`sh tools/check.sh --chromium`), because this session
could not download those engines; your TV runs webOS 22, which is newer than both. The GitHub workflow runs them on every push. Nothing
was tried on a TV.
