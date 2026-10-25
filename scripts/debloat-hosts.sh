#!/bin/sh
# The ad servers the debloat blocks in /etc/hosts (127.0.0.1 and ::1), each line marked "# cleanyourtv-debloat" so debloat-undo.sh
# removes them; other lines are never touched. Run by debloat-stop.sh. The lines are added when missing and replaced when the list
# changed (a newer list, or DEBLOAT-EXTRA switched), so a list never needs a restart to change.
#   always: the servers checked on the maintainer's TV (resolved and verified as LG ad endpoints)
#   touch /media/developer/cleanyourtv/DEBLOAT-EXTRA: also the LG ad, home-promotion and report servers below, the US ad servers
#   included. They are on public block lists for LG TVs (see docs/debloat.md) but were not checked on a TV by this project, so they
#   are opt-in. rm the file and run debloat-stop.sh (or restart the TV) to go back to the short list.
# CYTV_HOSTS and CYTV_DIR stand in for /etc/hosts and the service folder in tools/test/scripts.test.js; on a TV neither is set.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
L=/media/developer/cleanyourtv
H=/etc/hosts
if [ -n "$CYTV_HOSTS" ]; then
  H=$CYTV_HOSTS
  L=${CYTV_DIR:-$L}
fi
M="# cleanyourtv-debloat"
add_hosts() {
  cat <<'X'
127.0.0.1 eic.ads.lgtvcommon.com nl.ad.lgsmartad.com nl.info.lgsmartad.com # cleanyourtv-debloat
::1 eic.ads.lgtvcommon.com nl.ad.lgsmartad.com nl.info.lgsmartad.com # cleanyourtv-debloat
X
  [ -e $L/DEBLOAT-EXTRA ] || return 0
  # ad servers (the US region and without a region), LG's app-store ad server, LG's Korean ad server
  # home promotion, tips ("nudge") and recommendations, for both of LG's server groups (aic and eic)
  # the usage beacon and the crash-report server
  cat <<'X'
127.0.0.1 us.ad.lgsmartad.com us.info.lgsmartad.com info.lgsmartad.com ad.lgappstv.com lgad.cjpowercast.com # cleanyourtv-debloat
::1 us.ad.lgsmartad.com us.info.lgsmartad.com info.lgsmartad.com ad.lgappstv.com lgad.cjpowercast.com # cleanyourtv-debloat
127.0.0.1 aic.homeprv.lgtvcommon.com eic.homeprv.lgtvcommon.com aic.nudge.lgtvcommon.com eic.nudge.lgtvcommon.com # cleanyourtv-debloat
::1 aic.homeprv.lgtvcommon.com eic.homeprv.lgtvcommon.com aic.nudge.lgtvcommon.com eic.nudge.lgtvcommon.com # cleanyourtv-debloat
127.0.0.1 aic.recommend.lgtvcommon.com eic.recommend.lgtvcommon.com cdpbeacon.lgtvcommon.com rdl.lgtvcommon.com # cleanyourtv-debloat
::1 aic.recommend.lgtvcommon.com eic.recommend.lgtvcommon.com cdpbeacon.lgtvcommon.com rdl.lgtvcommon.com # cleanyourtv-debloat
X
}
[ "$(grep "$M" $H)" = "$(add_hosts)" ] && exit 0
# an earlier copy in RAM goes first, so the new one is made from the real file
if [ -z "$CYTV_HOSTS" ] && [ -e /tmp/cleanyourtv-hosts.mounted ]; then umount $H 2>/dev/null && rm -f /tmp/cleanyourtv-hosts /tmp/cleanyourtv-hosts.mounted; fi
T=${CYTV_HOSTS:+$CYTV_HOSTS.tmp}
T=${T:-/tmp/cleanyourtv-hosts.new}
grep -v "$M" $H > $T
add_hosts >> $T
if [ -w $H ] && cat $T > $H 2>/dev/null; then
  rm -f $T
elif [ -z "$CYTV_HOSTS" ]; then
  # on some TVs /etc/hosts is on the read-only system partition (issue 11): a copy in RAM is mounted over it until the next restart
  mv $T /tmp/cleanyourtv-hosts && mount --bind /tmp/cleanyourtv-hosts /etc/hosts && touch /tmp/cleanyourtv-hosts.mounted \
    || echo "hosts: /etc/hosts cannot be changed on this TV; the ad servers are not blocked"
else
  rm -f $T
  echo "hosts: $H cannot be changed"
fi
