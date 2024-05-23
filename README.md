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
The latest version is Release v-24e12. 
This is an ALPHA release of support for vector sprites, based on either canvas API calls or SVG, see below.

Other new features include the following. For detail see the documentation.
* Level branching based on a LINK command, and a test program showing how it can be used.
* A new debugging command `log`, which writes a message to the console.
* The menus now more distinctively identify this is PuzzleScript Next.

Several other bugs have already been fixed.
* Inline expansion of rules referring to the absence of an object by a relative reference now works correctly.
For example: `late [ wall no wall:>:quarterTiles ] -> [ wall wall:>:fill ]`
* No longer crashes on resizing the browser window.
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

## Objects with vector based sprites
This is an ALPHA of vector-based object graphics, as an alternative to the more usual pixel graphics.
Instead of colors and pixels, a stringified JSON object is used to specify a drawing.

The first line specifies properties of the JSON object as follows.
- `type`: mandatory: either `canvas` or `svg`.
- `w`: optional width of the sprite expressed in cells, default 1 
- `h`: optional height of the sprite expressed in cells, default 1
- `x`: optional x offset expressed in cells, default 0
- `y`: optional y offset expressed in cells, default 0

Note that these are settings for the size and position of the drawing, with the origin at the top left corner.
Vector drawings that fall outside these bounds will be clipped.

The non-empty lines following the JSON object are accumulated and passed to a vector based graphic handler, either `canvas` or `svg`.

### Vector type `canvas`
Each line is one or more JSON objects, each with one name and one value. 
The name should be one of the [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) properties or functions. 
If the name is a function it is invoked with the value, which is a (possibly empty) array containing the function arguments.
Otherwise the name is a property, and the value is assigned to that property. 

Objects are scaled so that a size of 1.0 is one cell (or as defined by `w` and `h`).
Angles are in radians.

Example of an object that is a grey blob.
```
blob b
{"type":"canvas","w":2,"h":1}
// this is a grey blob
{"beginPath":[]}{"fillStyle":"#C0C0C0"}
{"arc":[1.5,0.5,0.4,0,6.28]}
{"fill":[]}
```

#### canvas subtype
`{"type":"canvas", "subtype": "include"}` means the canvas instructions are to be included in a normal `{"type":"canvas"}` object using a special attribute `"ps-include"`.
Objects having this subtype will not be part of `COLLISIONLAYERS`.

Example, the `ArrowIncl` "object" is included by the `NE` object.

```
ArrowIncl
{"type":"canvas", "subtype": "include"}
{"lineWidth":"0.12"}
{"lineCap":"round"}
{"beginPath":[]}
{"moveTo":[-0.3,0.0]}
{"lineTo":[0.3,0.0]}
{"moveTo":[0.1,-0.2]}
{"lineTo":[0.3,0.0]}
{"moveTo":[0.1,0.2]}
{"lineTo":[0.3,0.0]}
{"stroke":[]}

NE
{"type":"canvas"}
{"translate":[0.5,0.5]}
{"rotate":[-0.785]}
{"strokeStyle":"green"}
{"ps-include":"ArrowIncl"}
```

### Vector type `svg`
Each line must start with `<` and together the lines form a single XML document. 
The [SVG specification](https://developer.mozilla.org/en-US/docs/Web/SVG) can be found here.

The root element (the first line) must be `svg`, and it must specify a `viewBox` and a namespace as shown in the example.
Objects are scaled so that the `viewBox` occupies one cell (or as defined by `w` and `h`).

Example of an object that is a rounded rectangle with a thick border and partially transparent.
```
rect r
{"type": "svg", "h": 2, "w": 2 }
<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="280" height="280" x="10" y="10" rx="20" ry="20" style="fill:red;stroke:black;stroke-width:5;opacity:0.5" />
</svg>
```

#### svg subtypes
`{"type":"svg", "subtype": "template"}` is a SVG file without a "body".
Objects having this subtype will not be part of `COLLISIONLAYERS`.

The body will be defined by an object `{"type":"svg", "subtype": "instance", "template": "<template>"}`  and the rendered SVG will be the template with the instance object concatenated.

Example, `Marbles` is the template object referenced by the `nWall` object.

```
Marbles
{"type":"svg","subtype":"template"}
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1 1">
	<style type="text/css">
		.E {
			--rotation: 0deg;
		}
		.S {
			--rotation: 90deg;
		}
		.W {
			--rotation: 180deg;
		}
		.N {
			--rotation: -90deg;
		}
        #thinwall {
			stroke-width: 0.3px;
			stroke-linecap: round;
			transform-origin: 0.5px 0.5px; 
			stroke: black;
            transform: rotate(var(--rotation));
		}
        #thinbar {
			stroke-width: 0.1px;
			stroke-linecap: round;
			transform-origin: 0.5px 0.5px; 
			stroke: lightgrey;
            transform: rotate(var(--rotation));
		}           
        .black {
        	fill: black;
        }
        .red {
        	fill: red;
        }
	</style>
	<defs>
    	<path id="thinwall" d="M 0.5 0.5 L 1 0.5"/>
        <path id="thinbar"  d="M 0 0.5 L 1 0.5"/>       
        <rect id="vortex" x="0" y="0" width="1.5" height="1.5" fill="#aaa"/>
        <circle id="ball" cx="0.5" cy="0.5" r="0.31"/>
	</defs>
</svg>           
```

```
nWall
{"type":"svg","subtype":"instance","template":"Marbles"}
<use xlink:href="#thinwall" class="N"/>
```
