# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
[The stable release is here](https://puzzlescriptnext.polyomino.com/) and the [dev version is here](https://david-pfx.github.io/PuzzleScriptNext/src/index.html).

The [full merged documentation is here](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation).
For the first time ever, all the features contributed by original PuzzleScript, PuzzleScriptPlus and Pattern:Script can be found in this one place.

PuzzleScript Next is a combination of the work of many authors:
* the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript)
* the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus)
* more great features added in [Pattern:Script](https://clementsparrow.github.io/Pattern-Script)
* a few contributions from my own [PuzzleFAB](https://github.com/david-pfx/PuzzleFAB)
* the vector feature created by [hfmanson](https://github.com/hfmanson/PuzzleScriptNext)
* and ongoing development work inspired by its many users (like you).

## New Features and Fixes
The latest version is Release v-24h08. 
It includes a beta release of canvas sprites based on canvas API calls.
See below for documentation. 
Please try the gallery and examples.

Breaking change:
* A `canvas:` sprite is now drawn to align with the bottom left corner, the same as for regular sprites.
This will break some existing games. The fix is to move the sprite offset using `translate:`.

Recent fixes/updates:
* Gallery updated to include `canvas:` games as well as all PS and PS plus (175 total).
* Level edit reverted to ignore zoomscreen etc.
* Two canvas games have been added to the editor **Examples** dropdown.
* A missing target for a sprite `copy:` no longer crashes, but falls back to a default blank icon.
* Various combinations of errors that could cause a `TypeError` exception will now terminate the compile with 'Too Many Errors' instead.
* The title screen and level select menus now work correctly with mouse and on mobile.
* `runtime_metadata_twiddling` with a level of more than 1024 cells no longer triggers an error on undo.
* Metadata twiddle values are now saved and restored by a checkpoint.
* The editor no longer crashes when source code changes make the code invalid.
* The level editor no longer crashes when a new program is loaded.
* Title screen treats as continue if set checkpoint before winning first level.
* Highlight of selected level now less intrusive.
* `skip_title_screen` is now working.
* Solve symbol default now "X" in code and docs.
* Fix parsing of non-alpha transform args.
* Fix menu click on level 1 to not go to title.
* Fix crash on menu click on non-menu lines.
* The display of upper case `text:` sprites has been corrected.
* Deleting and replacing a script in the editor by cut and paste no longer causes a crash.

Older fixes/updates:
* Editing objects that contain tags in the LEGEND and elsewhere no longer causes a crash.
* The ordering of expanding relative directions (`<>^v`) has been corrected (Pattern:Script compatibility).
* Using `rot:` or other transforms with no or bad arguments no longer causes a crash.
* Ctrl+X and Ctrl+B are no longer used as shortcuts but are passed through to the editor.
The ctrl+shift+R shortcut for 'replace all' now works correctly in the editor.
See [Keyboard Shortcuts](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/keyboard_shortcuts.html).
* Keys used by the game but discarded are no longer passed through to the editor.
* Escape to pause in a message now works correctly.
* Gosub now works correctly when a return lands on another return.
* The editor now correctly loads the last saved file on start up.
* The documentation for directions has been improved.
See [Directions](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/directions.html).
* Checkpoints are no longer lost when the program is interrupted or restarted at the title menu. 
Note: this behaviour is widely expected, but is not documented.
* A child object that defines no sprite and/or colour inherits them from its parent (hat tricks).
* The `share` link now targets the correct URL wherever it is hosted.
* Two text objects with the same content no longer get the same colour.

Recent new features include the following. For detail see the documentation.
* Level branching based on a LINK command, and a test program showing how it can be used.
* A new debugging command `log`, which writes a message to the console.
* The menus now more distinctively identify this as PuzzleScript Next.

Several other bugs have already been fixed.
* Inline expansion of rules referring to the absence of an object by a relative reference now works correctly.
For example: `late [ wall no wall:>:quarterTiles ] -> [ wall wall:>:fill ]`
* No longer crashes on resizing the browser window.
* Setting sound volume has been fixed to be compatible with Pattern:Script.
* Undo across a link now works correctly.
* An object that has a `copy:` referring to an implied TAG object now resolves correctly.
* A TAG object with a sprite that is redefined uses the second sprite instead of appending it.
* MESSAGE or other justified text no longer crashes if it contains consecutive newlines: `\n\n`.
* Some minor issues with menu wording have been corrected.
* Debug visualisation now works correctly from one level to another.
* The pause screen now works on mobile and tablet devices.

Also some new documentation:
* [Tags and Mappings](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/tags_and_mappings.html).
* [Tips and Tricks](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/tips_and_tricks.html).
* [Level Branching](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/levels.html#branching).

## Objects with vector based sprites
This is an ALPHA release of vector-based sprite graphics, as an alternative to the more usual pixel graphics.
Instead of colors and pixels, a stringified JSON object is used to specify a drawing.
Details of the syntax are subject to change in future releases.

### Vector type `canvas`
A canvas sprite is defined by adding `canvas:w,h` to the first line after any objects and aliases, like this. 
The width and height are optional, and default to 1.

`Player p canvas:2,2`

This should be followed by lines of JSON objects, each with one name and one value. 
The name should be one of the [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) properties or functions. 
If the name is a function it is invoked with the value, which is a (possibly empty) array containing the function arguments.
Otherwise it is a property, and the value is assigned to that property. 

Objects are scaled so that a size of 1.0 is one cell (or as defined by `w` and `h`).
Angles are in radians.

Example of an object that is a grey blob.
```
// this is a grey blob
blob b canvas:2,1
{"beginPath":[]}{"fillStyle":"#C0C0C0"}
{"arc":[1.5,0.5,0.4,0,6.28]}
{"fill":[]}
```

Alternatively the name may be `!include` in which case the argument is the name of another `canvas` object, and the JSON for that object is included.
{"!include":"man"}
{"beginPath":[]}
{"fillStyle":"white"}
{"arc":[0.5,0.5,0.1,0,7]}
{"fill":[]}

The object transforms `copy:`, `translate`, `rot:` and `flip:` behave as expected, with distances defined in sprite pixels.
The `shift:` transform is not implemented.

The test program is `test/test_min_canvas`.

Notes.
1. The canvas API uses named colours which are quite different from any of the PS pixel colours (eg `"red"` is not the same `red`).
If you really need them to be the same, use hex format colours (e.g. `#FFA500`) which should always match.

1. Canvas size units are grid cells and drawing instructions have their origin at top-left. So `canvas:2,3` allows a sprite to be 6 grid cells, and `{"rect":[0.01,0.01,1.98,1.98]}` will draw a rectange just less than 2x2, relative to the top left corner.
However, like pixel sprites the drawing is aligned with the bottom left corner, so that over-sized sprites extend up and right.

1. All transforms use the `sprite_size` as the unit of measure, so `translate:right:1` means 1 pixel to the right. 
Use a larger `sprite_size` to achieve more fine-grained positioning.

1. Canvas sprites rotate around the centre of their canvas and are not realigned on the grid, while pixel sprites are realigned on the grid after rotation, anchored to the bottom-left corner. Use square canvas and sprite to minimise alignment issues. 

1. Watch out for applying transforms to `copy:` objects that already have transforms applied.
Likewise, applying multiple transforms to a single canvas sprite may not yield the same expected result as the same list applied to a pixel sprite.
Probably best to define a collection of transform-free base sprites and only apply transforms on the copies, but if in doubt, try it!

1. All objects must be included in a collision layer, even partially-defined objects you only `"!include"` into later objects.
Since these are never displayed, you can add all your include-only objects to the first (`Background`) layer. 

1. The Level Editor sprite pick-list currently displays canvas sprites without their transforms, so it can be hard to pick the right one.
If you give sprites meaningful names and hover over a sprite to check its name before you click on it, this should help.

1. JSON syntax error detection and reporting is very limited. 
If you see a magenta square, your JSON is badly formed, but often there is nothing to see except it doesn't work. 
Ask for help or look for existing examples. 

