# The launcher

The launcher replaces LG's Home. It is a web page of the project that the TV's browser runs, so it starts fast and works the
same on every supported webOS version.

![Home screen](screenshots/home.jpg)

## The screen

- **Dock.** Your favourite apps, large, on the first row: four, or as many as the [theme](themes.md) makes room for.
- **Top shelf.** The name of the focused app and an ambient glow taken from its icon.
- **Grid.** All other apps, sorted by how often you use each one, A to Z, or in your own order.
- **Top buttons.** Inputs, Live TV, Settings and Customise, and a clock. The buttons you see are yours to change.

## Keys

| Action | How |
|---|---|
| Open an app | OK |
| App options (move, dock, hide) | Hold OK on an app |
| Move an app | Hold OK on it, **Move**, then the arrows; OK or Back puts it down |
| Remove a top button | Hold OK on it |
| Customise | The **Customise** button |
| Live TV | The **Live TV** button or tile |
| Switch input | The **Inputs** button |
| Close running apps | Back on the home screen |

The Magic Remote pointer works too: pointing and clicking, and holding the button on an app for its options.

![App options](screenshots/options.jpg)

## Running apps

Back on the home screen lists the apps that are open, as LG's Home does with its Recents on a second Back. OK closes an app,
**Close all** closes every app in the list, and Back leaves it. Closing an app also removes it from LG's recent apps.

It lists the apps the launcher knows, including the ones you hid from the grid; Home itself, CleanYourTV's own apps and the TV's
system apps are never in it. The list is read when it opens and closes when you leave Home. Suggested and first built by
[Steefzar](https://github.com/lasharor/cleanyourtv-WebOS/issues/16).

![Running apps](screenshots/running.jpg)

## Customise

![Customise menu](screenshots/customise.jpg)

**Customise** holds:

- the **top buttons** (add Inputs, Settings, Live TV, one HDMI input or any app, or remove one),
- **show and hide apps** (every app with OK to hide it or show it again; the list stays open),
- the **app order** (most used first, A to Z, or your own order),
- the **clock** format (automatic, 12 or 24 hour),
- **Reset customisation**.

The dock holds four apps, or the number the theme sets (six in Cinema). Hold OK on an app and choose **Add to dock**, **Move** or
**Remove from dock**.

## Moving apps

Hold OK on an app and choose **Move**: the app lifts and sways. The arrows move it, in the dock sideways and in the grid in every
direction; OK or Back puts it down and saves the order. Moving an app in the grid switches the app order to **your own order**,
starting from the order that was on screen, so nothing else jumps. An app that is new, or that leaves the dock, goes after the apps
you placed, most used first. **Customise** > **App order** switches between most used first, A to Z and your own order; your order
is kept while you use the others.

## Inputs

The **Inputs** button lists HDMI inputs by the names LG shows, with what is connected and a marker on the active one. OK
switches to the input.

An input you use often can have a button of its own: **Customise** > **Top buttons** > **Add a button...** > **An input...** lists the
inputs by their names; the new button switches to that input with one press. Hold OK on it to remove it.

![Inputs menu](screenshots/inputs.jpg)

## Icons

Each tile uses the app's own icon. The tile colour is taken from the icon's edge colour, so an icon that reaches its edges blends
into the tile, and the ambient glow comes from the icon's most vivid colour. Colours are worked out once per app and remembered.

!!! note "Icons with a transparent margin"
    An icon that is an opaque square with a transparent margin around it (many LG icons) can look boxed in on its tile. A fix
    that fills the tile is available as a test build; see [Test builds](managing.md#test-builds).

## Language

Menus follow the TV's language: English, Dutch, German, French and Spanish.

## Themes

The look of the home screen (colours, tile and text size, columns, clock, glow, animation speed, wallpaper) is a [theme](themes.md),
chosen in the manager app.

## Settings file

Settings are stored on the TV in `/media/developer/cleanyourtv/config.json`:

| Key | Meaning |
|---|---|
| `dock` | App ids in the dock (up to the theme's number, at most eight). |
| `topbar` | The buttons at the top. |
| `hidden` | App ids you hid. |
| `sort` | `usage`, `alpha` or `custom` (your own order). |
| `order` | App ids in your own order of the grid. |
| `clock` | `auto`, `12` or `24`. |

See [`config.example.json`](https://github.com/lasharor/cleanyourtv-WebOS/blob/main/config.example.json). Change settings in
the launcher; the file is read and written by the service.
