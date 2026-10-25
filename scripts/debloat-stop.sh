#!/bin/sh
# Stop LG telemetry/ad daemons and keep the on-demand ones from starting (RAM-only; a reboot restores them unless run from init.d).
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
L=/media/developer/cleanyourtv
for s in remotelogger service-logger contentminer nudge; do systemctl stop $s.service 2>&1 | sed "s/^/$s: /"; done
# luna dynamic services: bind a do-nothing stub over the binary so ls-hubd cannot start them
printf '#!/bin/sh\nexit 0\n' > $L/stub-noop; chmod +x $L/stub-noop
for b in acr2 admanager sportsalarm adoverlay-service; do
  [ -e /usr/sbin/$b ] || continue
  grep -q " /usr/sbin/$b " /proc/mounts || mount --bind $L/stub-noop /usr/sbin/$b
  pkill -9 -f "^/usr/sbin/$b"
done
# ad servers in /etc/hosts (the list and how it is written: debloat-hosts.sh); the marker lets debloat-undo.sh remove them
sh $L/debloat-hosts.sh
