#!/bin/sh
# Read-only: what the debloat does on this TV right now, and what the Homebrew Channel blocks on its own. Changes nothing.
#   sh /media/developer/cleanyourtv/debloat-status.sh
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
L=/media/developer/cleanyourtv
echo "== switches"
for f in DISABLE DISABLE-DEBLOAT DEBLOAT-EXTRA; do
  if [ -e $L/$f ]; then echo "$f: present"; else echo "$f: absent"; fi
done
if [ -L /var/lib/webosbrew/init.d/15-cleanyourtv-debloat ]; then echo "boot hook: installed"; else echo "boot hook: not installed (Debloat is off)"; fi
echo "== services the debloat stops"
for s in remotelogger service-logger contentminer nudge; do echo "$s: $(systemctl is-active $s.service 2>/dev/null)"; done
echo "== programs the debloat keeps from starting (a stub is mounted over each)"
for b in acr2 admanager sportsalarm adoverlay-service; do
  if [ ! -e /usr/sbin/$b ]; then
    echo "$b: not on this TV"
    continue
  fi
  m=no
  grep -q " /usr/sbin/$b " /proc/mounts && m=yes
  p=no
  pgrep -f "^/usr/sbin/$b" >/dev/null && p=yes
  echo "$b: stubbed=$m running=$p"
done
echo "== servers blocked in /etc/hosts"
grep "# cleanyourtv-debloat" /etc/hosts || echo "(none)"
[ -e /tmp/cleanyourtv-hosts.mounted ] && echo "(a copy of /etc/hosts in RAM is mounted over it until the next restart)"
echo "== the Homebrew Channel's own blocks"
for d in /tmp/rdxd /tmp/uploadd /var/spool/rdxd /var/spool/uploadd/pending; do
  if grep -q " $d " /proc/mounts; then echo "$d: made read-only (crash and log uploads)"; else echo "$d: not blocked"; fi
done
if [ -e /var/luna/preferences/webosbrew_block_updates ]; then echo "firmware update servers: blocked"; else echo "firmware update servers: not blocked"; fi
