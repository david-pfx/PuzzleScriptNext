# PuzzleScript Next Development Guide

## Hello

This document is about recompiling PuzzlescriptNext from source.  If you're just interested in learning about using the engine, rather than developing it, 
[the documentation is here](https://www.puzzlescript.net/Documentation/documentation.html) 
and [here](https://auroriax.github.io/PuzzleScript/Documentation/documentation.html).

## Structure
The structure of PuzzleScript is as follows.

* In the `src/` directory you have the 'raw' version of PuzzleScript, which is itself runnable, just not compressed/optimised.
* When you run the compile step it generates a compressed/optimized version of PuzzleScript into `bin`, which is what people see on 
[PuzzleScript Next](https://david-pfx.github.io/PuzzleScriptNext/), or wherever you are hosting this. 
* It also updates the `standalone_inlined.txt` file, which is the template that is used for exported standalone PuzzleScriptNext games.
This is generated from `./src/standalone.html`.

Getting compilation working requires a couple of extra steps.
`compile.js` uses [node](https://nodejs.org). 
So first off you have to install that, followed by the packages that it uses (the specific packages and versions go into `package.json`).

So the steps in order are:

1. Install [node](https://nodejs.org) by following this link.
2. Install packages.
```
npm install
```
3. Compile the site.
```
node compile.js
```

The final compiled site can be found in the `./bin/` directory.
If you need to do it again, just run Step 3.

## Standalone Exporting

If you load `src/editor.html` directly, by double-clicking it or whatever, exporting won't work because the browser sandboxing prevents the `XMLHttpRequest` for `standalone_inlined.txt` from working.  
To get it to work you need to run it from a server.
The Windows batch file `runserver.bat` runs a local http server using python.

Also, remember you need to run `compile.js` to generate the updated `standalone_inlined.txt` template whenever you make changes.

## Publishing your Game

Of course you can just send anyone your source code with instructions how to load it into PuzzleScript Next, but sometimes you just want to give people a single
link "click to play". There are basically two ways.

The EXPORT link in the editor builds a standalone HTML version of you game that you can send to someone as a file.
They should save the file and then open it in their favourite browser, and play your fantastic creation.
So the full sequence of steps is:
* Run the `compile.js` step above to rebuild `standalone_inlined.txt`.
* Click the EXPORT link.
* Save the HTML file.
* (optional) Send it to someone.
* Open the HTML file in a browser (perhaps by double clicking the file).

The SHARE link makes more work for you and less for your target player. 
It relies on storing your HTML game as a 'gist' in GitHub.
The steps are these:
* Setup an account with GitHub, or login if you already have one.
* Click the SHARE link
* (first time only) Go through the authorisation procedure to create a token.
* Copy the URL and paste it into an email or Discord or wherever for your friends to enjoy!

## Tests

The tests can be run by opening `./src/tests/tests.html`.  There are two kinds of tests:

* Tests based on short play-sessions recorded in the editor - it checks for a given start state and input state that a particular end-state will be reached.   
* Tests based on error messages.  This is not based on input, but records all the error messages and checks that they are still present in the current version of the engine.  If new errors are generated, that's also ok, so long as the old ones are still there.  Note that if you change the wording of an error message in PuzzleScript, you'll also need to change it in the test data.

The two kinds of tests are stored in `./src/tests/resources/testdata.js` and `./src/tests/resources/errormessage_testdata.js` respectively.  

Here's how you make a new test: Press *Ctrl/Cmd+J* in the editor to generate test data in the console (Be sure to have compiled/launched the game first).  You'll see something like this:

```
Compilation error/warning data (for error message tests - errormessage_testdata.js):

[
    "Name of project",
    [big long array]
],

Recorded play session data (for play session tests - testdata.js):

[
    "Name of test",
    [big long array]
]
```

If you're at the title screen you won't get the second bit.  The recorded play session records all the input from when the level was loaded up until the moment of generation.  Yeah anyway just paste whichever bit you want as an entry in  `./src/tests/resources/testdata.js` or `./src/tests/resources/errormessage_testdata.js` and you're away.
