# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
[The stable release is here](https://puzzlescriptnext.polyomino.com/) and the [latest version for testing is here](https://david-pfx.github.io/PuzzleScriptNext/src/index.html).

The [full merged documentation is here](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation).
For the first time ever, all the features contributed by original PuzzleScript, PuzzleScriptPlus and Pattern:Script can be found in this one place.

PuzzleScript Next is a combination of the work of many authors:
* the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript)
* the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus)
* more great features added in [Pattern:Script](https://clementsparrow.github.io/Pattern-Script)
* a few contributions from my own [PuzzleFAB](https://github.com/david-pfx/PuzzleFAB)
* and ongoing development work inspired by its many users (like you).

## New Features and Fixes

The latest version is Release v-24c27. New features include the following. For detail see the documentation.
* Level branching based on a LINK command, and a test program showing how it can be used.
* A new debugging command `log`, which writes a message to the console.
* The menus now more distinctively identify this is PuzzleScript Next.

Several bugs have been fixed.
* Setting sound volume has been fixed to be compatible with Pattern:Script.
* Share authorisation now works correctly independntly of where it is hosted.
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

## WIP: new data types for objects
In original PuzzleScript objects are represented as pixel data. This branch introduces two other ways to represent pixel data. The new ways are implemented using a non-existing color stored in the `extdattype` property of an object, followed by non-empty lines which are accumulated in a string stored in the `extdat` property of an object. The new representations  are

### contextData
Each line is a JSON object with one property and one value. the property should be one of the [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) properties or functions. When the propery is a CanvasRenderingContext2D function it is invoked with the value which should be a possible empty array containing the function arguments, otherwise the CanvasRenderingContext2D property is assigned to the value. [Example](https://gist.github.com/hfmanson/bae827c42baa4b4316667642f5e42da0). The coordinate range is 0 to 1 for x and y.

### svgData
The following lines should be an entire SVG file which is then rendered in the sprite context. [Example](https://gist.github.com/hfmanson/5888ad62bc271d907e2c931cfb44fc00)
#### TODO
currently the game needs to be restarted to get the SVG rendered



