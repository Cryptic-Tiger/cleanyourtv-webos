# Debloat

An optional clean-up of LG's ads and telemetry. It is on by default in the setup and has a switch in the
[manager app](manager.md).

## What it does

About a minute after every boot, the debloat:

- **stops** the systemd services `remotelogger`, `service-logger`, `contentminer` and `nudge`;
- **prevents** `acr2`, `admanager`, `sportsalarm` and `adoverlay-service` from starting, by mounting a do-nothing stub over each
  program (in RAM; the real files are not changed);
- **adds** `eic.ads.lgtvcommon.com`, `nl.ad.lgsmartad.com` and `nl.info.lgsmartad.com` to `/etc/hosts`, pointing at `127.0.0.1`
  and `::1` and marked `# cleanyourtv-debloat` (other entries are untouched). Where `/etc/hosts` is on the read-only system partition, a copy
  with these lines is kept in RAM (`/tmp/cleanyourtv-hosts`) and mounted over it until the next restart. The lines are written by
  `debloat-hosts.sh`, which replaces them when the list changes (see the longer list below).

Nothing is uninstalled. It applies only while the launcher is Home, because LG's own Home needs some of those services to start;
switching back to LG's Home lifts the debloat first.

## The longer list (optional)

The servers above are the ones checked on the maintainer's TV in the Netherlands; the `nl.` names are that region's. A TV elsewhere
talks to other names, for example `us.ad.lgsmartad.com` in the United States. An optional, longer list blocks those too:

| Servers | What they are |
|---|---|
| `us.ad.lgsmartad.com`, `us.info.lgsmartad.com`, `info.lgsmartad.com` | LG's ad servers for the US region and without a region |
| `ad.lgappstv.com`, `lgad.cjpowercast.com` | The app store's ad server and LG's Korean ad network |
| `aic.homeprv`, `eic.homeprv`, `aic.nudge`, `eic.nudge`, `aic.recommend`, `eic.recommend` (`.lgtvcommon.com`) | Home promotion, tips and recommendations, for both of LG's server groups |
| `cdpbeacon.lgtvcommon.com`, `rdl.lgtvcommon.com` | A usage beacon and the crash-report server |

Every name is on public block lists for LG TVs, but this project has not checked them on a TV, so the list is off unless you ask for
it. It leaves alone what the TV needs: the app store and app updates (`lgtvsdp.com`, `lgappstv.com` apart from `ad.`), firmware
updates (`*.lge.com`), sign-in and streaming. Over SSH:

```sh
touch /media/developer/cleanyourtv/DEBLOAT-EXTRA && sh /media/developer/cleanyourtv/debloat-hosts.sh   # on
rm /media/developer/cleanyourtv/DEBLOAT-EXTRA && sh /media/developer/cleanyourtv/debloat-hosts.sh       # off again
```

The lines carry the same marker, so switching the debloat off removes them too. If an app or the app store misbehaves with the longer
list, switch it off again.

## Checking what it does

```sh
sh /media/developer/cleanyourtv/debloat-status.sh
```

prints the switches, the state of every stopped service and stubbed program, the blocked servers, and what the Homebrew Channel blocks
on its own. It changes nothing.

## What the Homebrew Channel already does

The Homebrew Channel makes the folders of LG's crash and log uploaders (`rdxd`, `uploadd`) read-only at every boot, and blocks the
firmware update servers when **Block system updates** is on in its settings. The debloat does not repeat either.

## LG's own settings

Some tracking is switched off in LG's settings, which survives everything and needs no root. The menus move between webOS versions,
so these are the names to look for:

- **Live Plus** off: LG's recognition of what is on screen (ACR).
- **Limit AD Tracking** on (under Advertisement).
- **Home Promotion** and **Content Recommendation** off (Home Settings). They only affect LG's Home, but stay off if you go back to it.
- **User Agreements**: the viewing-information, voice and interest-based-advertising agreements can be withdrawn.

A blocker on the router (Pi-hole, AdGuard Home) can block whole LG domains, which `/etc/hosts` cannot (it takes exact names only).
Blocking `lgtvsdp.com`, `lgappstv.com` or all of `lge.com` there breaks the app store and updates.

## Turning it off

Switch **Debloat** off in the manager app. It starts the stopped services again, unmounts the stubs and removes the marked
hosts lines. To pause it without the manager, create `/media/developer/cleanyourtv/DISABLE-DEBLOAT`.

## What it does not do

It does not block updates: firmware update blocking (for example with the Homebrew Channel's tools) is separate and is not touched.
It does not claim to remove all tracking. It stops the services listed above and nothing else.
