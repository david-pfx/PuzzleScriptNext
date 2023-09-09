# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
You can try it out [here](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html).

PuzzleScript Next is based on the latest version of the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript), the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus) by many authors, plus a few contributions from [my own PuzzleFAB](https://github.com/david-pfx/PuzzleFAB).

## New Features

The latest version is Release v-23i08, which includes a significant upgrade to the animation system, as well as:
* Several new games to demonstrate text sprites and animation.
* Key repeat interval default 200 (from 150) to reduce key bounce.
* The lexer has been reimplemented as a class, and several parsing sections rewritten to use it.
* Performance counters to gather timing statistics (`set debugLevel='perf'``).
* Updated to latest version of jquery.

It includes the following features.

### Object animation

The SOUNDS section is enhanced by the ability for an object to have an animation instead of or as well as a sound.
The test program is [`test_min_animate`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_animate) and the demos are Yet Another Sokoban, Net Game and Fifteen in the editor examples dropdown.
Use it like this. 

```
player move up afx:slide
player cantmove up afx:slide
player move left afx:zoom
player cantmove left afx:zoom

m lclick afx:turn
w lclick afx:fade

b create  afx:turn
b destroy afx:turn
y create  afx:fade:scale
y destroy afx:fade:

player lclick 32169907 afx:turn=.25,0      // anticlockwise 90
player rclick 32169907 afx:turn=-.25,0     // clockwise 90
```

All animations start with `afx` and have one or more parameters separated by `:`. 
Each parameter may have an argument separated by `=`.
The parameters are:
 * `slide[=n,m...]` animates a sliding movement of an object
 * `zoom[=n,m...]` animates zooming in or out (resizing) of an object
 * `fade[=n,m...]` animates fading (alpha, transparency) of an object
 * `turn[=n,m...]` animates turning (rotation) of an object
 * `ease[=function]` applies an easing `function` (non-linear tweening), as per `tween_easing` in the prelude

 An argument of `n,m...` is a comma-separated list of values that define the animation, how the value changes over time.
 Default values are defined in a table in the source code and will be documented here once stable.
 Meanwhile feel free to experiment.

 All animations take place in a single period of time, set by in the prelude by `animate_interval`. 
 Multiple animations may be applied to an object.
 The default is 0.25 sec. Note that if you enable tweening by setting `tween_length`, animation is disabled.

 ```
 animate_interval 0.4   // set animations to run in 0.4 secs
 // tween_length = 0.4  // tweening must not be set
 ```

### Custom font can load dynamically
The custom font setting can be a link to a font file on the Web, preferably of type `woff2`.
You can find font files that are freely accessible in various places, including Google Fonts.
* Search for VT323 and you will find https://fonts.google.com/specimen/VT323. 
* Then search a bit more and find this link: https://fonts.googleapis.com/css2?family=VT323.
* On this page there is (finally) this link to the font file: https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2

Use it like this.
See [`test_min_prelude`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_prelude) for a small example.
```
custom_font https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2

custom_font https://fonts.gstatic.com/s/inconsolata/v31/QldgNThLqRwH-OJ1UHjlKENVzkWGVkL3GZQmAwLYxYWI2qfdm7Lpp4U8WR32lw.woff2
```
Note that text pages like the title screen and message text are displayed as full lines of text.
This means that there will be a variation in character widths, and even in a Monospace font wide characters like `大 ⚐` will display at full width.
### TEXT objects now use the custom font, or Monospace fallback
This change greatly improves the visual appearance and usability of TEXT sprites.
Use it like this:
```
OBJECTS
number7
red
TEXT 7
```

### New STATUS_LINE setting and STATUS command
This prelude setting reserves some space at the bottom of the screen for displaying a status line.

Use it like this.
See [`test_min_prelude`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_prelude) for a small example.

```
status_line
RULES
[ right p ] -> status You just moved the player to the right!

```
### Level editor supports zoomscreen etc

Some PuzzleScript games create very large levels and divide them into 'rooms' or 'caves' using `zoomscreen`. 
A similar approach for a large open area is to use `flickscreen`.
Editing as one large area is hard.
The level editor now respects `zoomscreen` and `flickscreen`, allowing editing of individual 'rooms'.

### Major rework of test suite

The test suite now includes far more programs and provides greater detail about test results.
A test suite program can now be opened directly in the editor.
The version of QUnit has been updated to the latest.

### Sprites can be of any size or width

Sprites can be defined as a grid of anything from 2x2 to 50x50 or even more! 
They do not need to be square, but they must be rectangular (that is, all rows in the grid the same length).

There are two options. 
* If sprite_size is __not__ specified, sprites are scaled to the cell size and non-square sprites are centred horizontally and vertically.
That is, all sprites are sized to fit in and fill a cell.
* If sprite_size __is__ specified, sprites are scaled so that a sprite of that size fills a cell. 
Smaller sprites are smaller and larger sprites are larger, and will overlap adjacent cells.

The test program is [`test_min_spritesize`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_spritesize).
Use it like this. 
```
sprite_size 8

stripe;black red blue green yellow white orange purple
01234567
70123456
```

### Run button
The console toolbar now has a 'run' button.
The point is to make it easy to to use the mouse to clear the console and then click on run.

### Show single layer
 The editor has a new button to show a single layer of a running game.
 The PgUp and PgDn keys move through the layers.
 This is a work in progress.

### Comment styles
Like this:
```
title PuzzleScriptNext Starter
author davidus
homepage www.polyomino.com

// Welcome to PuzzleScript Next, the home of the most advanced PuzzleScript features!
```

The // comment style is activated if you use it in the prelude, as shown in the starter. 
Note that you cannot mix comment styles.

The `;` symbol can be used as an object definition line break, as show here.
It only works if you activated // comments.

```
Target; #0f0
Player; #00f8
Crate; orange
3; pink; text: 3
```
See the starter for how it looks.

### Mouse click movements

This feature is enabled by prelude setting `mouse_clicks`.
The test program is [`test_min_click`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_click).
Use it like this. 
```
mouse_clicks

RULES
[ lclick crate ] -> [ ] // destroys a crate
```

If you left or right click on an object, it will receive the movements `lclick` or `rclick` (`mclick` and `hover` are reserved for future use). 
These movements are also displayed in the editor to show where the click happened, using a new style of glyph.

### TEXT sprites

Instead of a sprite matrix, use `text:` followed by a string of one or more characters. 
The rest of the line is the text in the sprite (trimmed).
The test program is [`test_min_text`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_text).
Use it like this. 
```
s; purple; text S
t; orange; text t
3; pink; text: 3
4; pink; text: 4
```
The text is centred to fit in the cell. 
Unfortunately the built in font is only 7x12, which is not visually attractive.
A future release may offer a better font.

### Move corresponding using property objects

Property objects work as maps, to move objects in corresponding positions within the definition.
There must be at least one on each side and all must be the same size.

Use it like this. The test program is [`test_min_move_corr`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=test/test_min_move_corr).
```
rgb = r or g or b
gbr = g or b or r

[ > p | rgb ] -> [ p | gbr ]
```

### Load a program from a local server

Start the editor with a URL like this: 
```
.../editor.html?url=<path>
```

Due to a security restriction called CORS, this URL has to be on the local server.

