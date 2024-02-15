# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
[The stable release is here](https://puzzlescriptnext.polyomino.com/) and the [latest version for testing is here](https://david-pfx.github.io/PuzzleScriptNext/src/index.html).

The [full merged documentation is here](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation).

PuzzleScript Next is a combination of the work of many authors:
* the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript)
* the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus)
* more great features added in [Pattern:Script](https://clementsparrow.github.io/Pattern-Script)
* a few contributions from my own [PuzzleFAB](https://github.com/david-pfx/PuzzleFAB)
* and ongoing development work inspired by its many users (like you).

## New Features and Fixes

The latest version is Release v-24b09. 
It includes new features in support of level branching, and a test program showing how it can be used.

* The level command `LINK` provides a link from one level to another, triggered by a specified object.
* The rules command `LINK` activates a link if the player is on a linked object.
* The prelude option `allow_undo_level` allows a player to go back where a link came from.
* Winning a level reached by a level triggers a return to where the link came from instead of winning the game.
* The test program is [`soko_link`](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html?demo=next/soko_link).

Also:
* There is a new documentation page explaining [Tags and Mappings](https://david-pfx.github.io/PuzzleScriptNext/src/Documentation/tags_and_mappings.html).

Bug fixes include:
* Debug visualisation now works correctly from one level to another.
* The pause screen now works on mobile devices (still in testing).

Note that it also includes a total reworking of the documentation.
For the first time ever, all the features contributed by original PuzzleScript, PuzzleScriptPlus and Pattern:Script can be found in this one place.

