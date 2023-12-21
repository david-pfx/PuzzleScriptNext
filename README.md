# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
[The stable release is here](https://puzzlescriptnext.polyomino.com/) and the [latest version for testing is here](https://david-pfx.github.io/PuzzleScriptNext/src/index.html).

PuzzleScript Next is a combination of the work of many authors:
* the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript)
* the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus)
* more great features added in [Pattern:Script](https://clementsparrow.github.io/Pattern-Script)
* a few contributions from my own [PuzzleFAB](https://github.com/david-pfx/PuzzleFAB)
* and ongoing development work inspired by its many users (like you).

## New Features

The latest version is Release v-23l20, with additional Pattern:Script compatible features and some bug fixes.
Features included are:
* MAPPINGS: compile-time symbols that convert a set of TAGS values into a different but related set of values.
* Compressed gzip files are no longer built in the standalone version, for easier hosting.

Bug fixes:
* A blank text item such as title in the prelude no longer causes a hang.
* The combination of `require_player_move, message, again` no longer hangs but works correctly (freeze bug).
* A related issue triggered by the previous fix now works correctly (autowin bug).
* Child objects created by defining a parent object with tags now inherit their parent colours and sprite. Programs Castlemouse and Cakemonsters now work, and are in the gallery.
* Blank lines are no longer required between objects
* Corrected some reported problems with TAGS.
* Verbose logging set by button recompiles and shows debugging steps correctly.

Of note:
* In-place sprite scaling is useful for text sprites, but is otherwise deprecated.
* The sample games provided have been updated to the new conventions.
* Sample program Pentaglyph has a compile error not detected by Pattern:Script.

### Pattern Script compatibility
The following features are implemented.

* The prelude section: `author_color`, `title_color`, `keyhint_color`.
* The `TAGS` section: compile-time symbols that are expanded in objects, legend symbols, collision layers and rules.
* The symbol `directions` is a pre-defined tag.
* The `MAPPINGS` section: compile-time symbols that convert a set of TAGS values into a different but related set of values.
* The `OBJECTS` section: `copy:`, `translate:`, `shift:` and `rot:`.
* Objects can be any size, and are aligned with the bottom left corner of the cell defined by `sprite_size`.
* The `COLLISIONLAYERS` section: layer groups, delimited by `--`, `--^>` or similar.
* The `SOUNDS` section: volume in the form `sfx1 88453607:11`.
* The `RULES` section: tags as rule prefixes `dir [> p:dir] -> [> p:dir]` and relative direction parts `[> p:^] -> [v p:>]`.

Still to do:
* Prelude `auto_level_titles`.
* Level features `TITLE`, `LEVEL`.

Documentation is here: https://github.com/ClementSparrow/Pattern-Script/wiki. 

### New Gallery
The Gallery has been reworked with a selection of PuzzleScript Next, PuzzleScript Plus and Pattern Script games.
Making GIFs is now supported for mouse games, and new GIFs have been created for gallery games.

### The `once` keyword

The standard defined behaviour per the PuzzleScript documentation is that "Each rule gets applied in turn as often as it can be".
A rule with a `once` prefix simply executes once instead.
Even if "something happens", the rule is executed just the once.

This turns out to useful in situations where after running the rule, the result is such that the rule would still apply.
Without this feature, it's necessary to use movement flags or lay down temporary objects to achieve the same effect.
There is a new game Bridges.txt to show it in use.

Here is how the code looks (from Bridges).
```
// calculate a count for each cell, using the once prefix so the rule applies only once
            [ cell ] -> [ cell c0 ]
up    once [ cell count | singley ] -> [ cell count1 | singley ]
down  once [ cell count | singley ] -> [ cell count1 | singley ]
left  once [ cell count | singlex ] -> [ cell count1 | singlex ]
right once [ cell count | singlex ] -> [ cell count1 | singlex ]
up    once [ cell count | doubley ] -> [ cell count2 | doubley ]
down  once [ cell count | doubley ] -> [ cell count2 | doubley ]
left  once [ cell count | doublex ] -> [ cell count2 | doublex ]
right once [ cell count | doublex ] -> [ cell count2 | doublex ]
```

### GOSUB and SUBROUTINE

The RULES section is enhanced by two new keywords. 
SUBROUTINE defines a set of rules that can only be reached by GOSUB to that subroutine. 
The code looks like this.

```
[ stationary spot ] -> gosub Startup
[ > spot ] -> gosub Move Tiles
[ > spot ] -> gosub Drop New Tile
[ spot ] -> gosub Check Move
[ spot ] -> gosub Finish

subroutine Startup
startloop
  random [ seed ][ empty ] -> [] [ 1 ]
endloop

subroutine Drop New Tile
random [ empty ] -> [ random 1 random 1 random 1 random 1 random 1 random 1 random 1 random 1 random 1 random 2 ]

subroutine Move Tiles
// and so on

```

The code is taken from 2048.txt, so take a look at that to see how it can help to structure your code.

Just one more thing -- don't try to put a GOSUB inside a STARTLOOP ENDLOOP. 
Right now it won't work but the compiler doesn't tell you.
In a future release it will either work, or trigger an error.

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
number8 scale: 0.5; green; text 8
```
The text is centred to fit in the cell. 
Text objects use the custom font, or Monospace fallback, rather than the built-in font.

### Load a program from a local server

Start the editor with a URL like this: 
```
.../editor.html?url=<path>
```

Due to a security restriction called CORS, this URL has to be on the local server.

### STATUS_LINE setting and STATUS command
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

### Run button
The console toolbar now has a 'run' button.
The point is to make it easy to to use the mouse to clear the console and then click on run.

### Show single layer
 The editor has a new button to show a single layer of a running game.
 The PgUp and PgDn keys move through the layers.
 This is a work in progress.

