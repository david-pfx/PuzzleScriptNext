/*
Credits

Brunt of the work by increpare (www.increpare.com), with many contributions by others over the years

This code comes from the PuzzleScriptPlus fork, with major features added by Auroriax, gathered from forks by many others.

This version is PuzzleScriptNext, by Davidus of Polyomino Games.

Color values for named colours from arne, mostly (and a couple from a 32-colour palette attributed to him)
http://androidarts.com/palette/16pal.htm

The editor is a slight modification of codemirror (codemirror.net), which is crazy awesome.
Testing is based on Qunit

For more information see:
    github.com/increpare/PuzzleScript
    github.com/Auroriax/PuzzleScriptNext
    github.com/david-pfx/PuzzleScriptNext

*/

const MAX_ERRORS_FOR_REAL=100;

let compiling = false;
let errorStrings = [];      //also stores warning strings
let errorCount = 0;         //only counts errors
let caseSensitive = false;

// used here and in compiler
const reg_commandwords = /^(afx[\w:=+-.]+|sfx\d+|cancel|checkpoint|restart|win|message|again|undo|nosave|quit|zoomscreen|flickscreen|smoothscreen|again_interval|realtime_interval|key_repeat_interval|noundo|norestart|background_color|text_color|goto|message_text_align|status|gosub|link|log)$/i;
const reg_name = /^[\p{L}\p{N}_$]+/u;
const reg_objectname = /^[\p{L}\p{N}_$]+(:[\p{L}\p{N}_$]+)*/u;              // object name for definition
const reg_objectnamerel = /^[\p{L}\p{N}_$]+(:[<>v^]|:[\p{L}\p{N}_$]+)*$/u;  // object name with relative parts for use in rules
const reg_objmodi = /^(canvas|copy|flip|rot|scale|shift|text|translate):/i;

const commandwords_table = ['cancel', 'checkpoint', 'restart', 'win', 'message', 'again', 'undo', 'nosave', 'quit', 'zoomscreen', 'flickscreen', 'smoothscreen', 
    'again_interval', 'realtime_interval', 'key_repeat_interval', 'noundo', 'norestart', 'background_color', 'text_color', 'goto', 'message_text_align', 'status', 'gosub'];
const commandargs_table = ['message', 'goto', 'status', 'gosub', 'log'];
const twiddleable_params = ['background_color', 'text_color', 'key_repeat_interval', 'realtime_interval', 'again_interval', 'flickscreen', 'zoomscreen', 'smoothscreen', 'noundo', 'norestart', 'message_text_align'];
const soundverbs_directional = ['move', 'cantmove'];
const soundverbs_other = [ 'create', 'destroy' ];
let soundverbs_movement = [ 'action' ];  // clicks to be added
let directions_table = ['action', 'up', 'down', 'left', 'right', '^', 'v', '<', '>', 
    'moving', 'stationary', 'parallel', 'perpendicular', 'horizontal', 'orthogonal', 'vertical', 'no', 'randomdir', 'random'];
let directions_only = ['>', '\<', '\^', 'v', 'up', 'down', 'left', 'right', 'action', 'moving', 
    'stationary', 'no', 'randomdir', 'random', 'horizontal', 'vertical', 'orthogonal', 'perpendicular', 'parallel'];
const mouse_clicks_table = ['lclick', 'rclick']; // gets appended

// Note: '^', '>', 'v', '<' seems more logical, but is not compatible
const clockwiseDirections = ['up', 'right', 'down', 'left', '>', 'v', '<', '^' ];

const cwdIndexOf = dir => clockwiseDirections.indexOf(dir) % 4;

function TooManyErrors(){
    consolePrint("Too many errors/warnings; aborting compilation.",true);
    throw new Error("Too many errors/warnings; aborting compilation.");
}

function htmlJump(lineNumber, clss) {	
	return clss ? htmlClass(clss, htmlJump(lineNumber)) 
        : `<a onclick="jumpToLine(${lineNumber});"  href="javascript:void(0);">${lineNumber}</a>`;
}

function htmlColor(color, text) {
	return `<font color="${color}">${text}</font>`;
}

function htmlClass(clss, text) {
	return `<span class="${clss}">${text}</span>`;
}

function errorCase(ident) {
    return caseSensitive ? ident : ident ? ident.toUpperCase() : '<null>';
}

function logErrorCacheable(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logError(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logWarning(str, lineNumber, urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logWarningNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logWarningNoLine(str, urgent, increaseErrorCount = false) {
    if (compiling||urgent) {
        var errorString = '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            if (errorStrings.length > MAX_ERRORS_FOR_REAL) {
                TooManyErrors();
        }
        }
        if (increaseErrorCount) {
            errorCount++;
        }
    }
}

function logErrorNoLine(str,urgent) {
    if (compiling||urgent) {
        var errorString = '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
        errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
    }
        }
    }
}

//for IE support
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
 
      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}


var codeMirrorFn = function() {
    'use strict';

    const sectionNames = ['objects', 'legend', 'sounds', 'collisionlayers', 'rules', 'winconditions', 'tags', 'mappings', 'levels'];
    const reg_equalsrow = /[\=]+/;
    const reg_soundevents = /^(sfx\d+|undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage|pausescreen)\b/i;

    const reg_loopmarker = /^(startloop|endloop)$/;
    const reg_ruledirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal|late|rigid)$/;
    const reg_sounddirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal)\b/i;

    const keyword_array = [ 'checkpoint', 'objects', 'collisionlayers', 'legend', 'sounds', 'rules', 'winconditions', 'levels',
        '|', '[', ']', 'up', 'down', 'left', 'right', 'late', 'rigid', '^', 'v', '>', '<', 'no', 'randomdir', 'random', 'horizontal', 'vertical',
        'any', 'all', 'no', 'some', 'moving', 'stationary', 'parallel', 'perpendicular', 'action', 'message', 'move', 
        'create', 'destroy', 'cantmove', 'sfx0', 'sfx1', 'sfx2', 'sfx3', 'Sfx4', 'sfx5', 'sfx6', 'sfx7', 'sfx8', 'sfx9', 'sfx10', 
        'cancel', 'checkpoint', 'restart', 'win', 'message', 'again', 'undo', 'restart', 'titlescreen', 'startgame', 'cancel', 'endgame', 
        'startlevel', 'endlevel', 'showmessage', 'closemessage' ];
    const prelude_keywords = ['allow_undo_level', 'auto_level_titles', 'case_sensitive', 'continue_is_level_select', 'debug', 'level_select', 'level_select_lock', 
        'mouse_clicks', 'noaction', 'nokeyboard', 'norepeat_action', 'norestart', 'noundo', 'require_player_movement', 
        'run_rules_on_level_start', 'runtime_metadata_twiddling', 'runtime_metadata_twiddling_debug', 'scanline', 
        'skip_title_screen', 'smoothscreen_debug', 'status_line', 'throttle_movement', 'verbose_logging'];
    const prelude_param_text = ['title', 'author', 'homepage', 'custom_font', 'text_controls', 'text_message_continue', 'debug_switch'];
    const prelude_param_number = ['again_interval', 'animate_interval', 'font_size', 'key_repeat_interval', 
        'level_select_unlocked_ahead', 'level_select_unlocked_rollover', 'local_radius', 'realtime_interval', 
        'tween_length', 'tween_snap'];
    const prelude_param_single = [
        'background_color', 'color_palette', 'flickscreen', 'level_select_solve_symbol', 'keyhint_color', 
        'message_text_align', 'mouse_drag', 'mouse_left', 'mouse_rdrag', 'mouse_right', 'mouse_rup', 'mouse_up',
        'sitelock_hostname_whitelist', 'sitelock_origin_whitelist', 'sprite_size', 'text_color', 'tween_easing', 'zoomscreen',
        'author_color', 'title_color'
    ];
    const prelude_not_implemented = [
        'game_uri', 'level_title_style', 'show_level_title_in_menu', 
    ];
    const prelude_param_multi = ['smoothscreen', 'puzzlescript', 'youtube' ];
    const prelude_tables = [prelude_keywords, prelude_param_text, prelude_param_number, 
        prelude_param_single, prelude_param_multi];
    const color_names = ['black', 'white', 'darkgray', 'lightgray', 'gray', 'grey', 'darkgrey', 'lightgrey',
        'red', 'darkred', 'lightred', 'brown', 'darkbrown', 'lightbrown', 'orange', 'yellow', 'green', 'darkgreen',
        'lightgreen', 'blue', 'lightblue', 'darkblue', 'purple', 'pink', 'transparent'];

    // updated for // comment style
    let reg_notcommentstart = /[^\(]+/;

    // utility functions used by parser

    function hasParts(ident) {
        return ident.split(':').length > 1;
    }

    // recursively expand an object symbol into its ultimate constituents of base objects
    // callback to handle error
    function expandSymbol(state, name, isand, cbError) {
        if (name in state.objects) 
            return [name];
        for (const sym of state.legend_synonyms)
            if (sym[0] == name) 
                return expandSymbol(state, sym[1], isand);
        for (const sym of state.legend_aggregates) {
            if (sym[0] == name) {
                if (!isand)
                    cbError(name);
                return sym.slice(1).flatMap(s => expandSymbol(state, s, false));
            }
        }
        for (const sym of state.legend_properties) {
            if (sym[0] == name) {
                if (isand)
                    cbError(name);
                return sym.slice(1).flatMap(s => expandSymbol(state, s, true));
            }
        }
        logError(`Cannot expand symbol "${errorCase(name)}"`, state.lineNumber);
        return [name];
    }

    function registerOriginalCaseName(state,candname,lineNumber){
        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        const nameFinder = state.case_sensitive 
            ? new RegExp("\\b" + escapeRegExp(candname) + "\\b")
            : new RegExp("\\b" + escapeRegExp(candname) + "\\b", "i");
        var match = state.mixedCase.match(nameFinder);
        if (match!=null){
            state.original_case_names[candname] = match[0];
            state.original_line_numbers[candname] = lineNumber;
        }
    }

    function createAlias(state, alias, candname, lineno) {
        if (debugSwitch.includes('alias')) console.log(`Create '${alias}' as alias for '${candname}'`);
        const synonym = [alias, candname];
        synonym.lineNumber = lineno;
        state.legend_synonyms.push(synonym);
    }

    //----- lexer functions -----

    // class Lexer
    class Lexer {
        tokens = [];

        constructor(stream, state) {
            this.stream = stream;
            this.state = state;
        }

        pushToken(token, kind) {
            this.tokens.push({ 
                text: token, 
                kind: kind, 
                pos: this.stream.pos 
            });
            this.matchPos = this.stream.pos;
        }

        pushTokens(tokens) {
            this.tokens.push(tokens);
        }

        get tokens() {
            return this.tokens;
        }

        pushBack() {
            this.stream.pos = this.matchPos;
        }

        // check for regex, return token or null if no match
        check(regex) {
            const token = this.stream.match(regex, false);
            return !token ? null : token[0];
        }

        // skip over any comments but push them as tokens
        matchComment() {
            while (true) {
                const token = matchComment(this.stream, this.state);
                if (token)
                    this.pushToken(token, 'comment');
                else break;
            }
        }
        
        matchEol() { 
            this.matchComment();
            return this.stream.eol(); 
        }

        matchEolSemi() { 
            this.matchComment();
            if (this.state.commentStyle == '//' && this.match(/^;/)) {
                this.pushToken(';', 'SEMICOLON');
                return true;
            }
            return this.stream.eol(); 
        }

        next() {
            return this.stream.next();
        }

        peek() {
            return this.stream.peek();
        }

        match(regex, tolower = false) {
            this.matchPos = this.stream.pos;
            const token = this.stream.match(regex);
            if (token) this.stream.eatSpace();
            return !token ? null : tolower ? token[0].toLowerCase() : token[0];
        }

        matchAll() {
            // bug: Trailing whitespace may interact badly with stream eol/bol?
            return (this.match(/.*/) || '').trim();
        }
        
        matchNotComment() {
            return (this.match(reg_notcommentstart) || '').trim();
        }

        // match a sequence of characters bounded by white space
        matchToken(tolower) {
            return this.match(/^\S+/, tolower);
        }
    
        // match a single character that is not white space
        matchObjectGlyph(tolower) {
            return this.match(/^\S/, tolower);
        }
    }

    // match by regex, eat white space, optional return tolower, with pushback
    let matchPos = 0;
    function matchRegex(stream, regex, tolower) {
        matchPos = stream.pos;
        const match = stream.match(regex);
        if (match) stream.eatSpace();
        return !match ? null : tolower ? match[0].toLowerCase() : match[0];
    }
    
    function pushBack(stream) {
        stream.pos = matchPos;
    }

    ////////////////////////////////////////////////////////////////////////////
    // return any kind of comment if found, or null if not
    // updates eol and commentLevel
    function matchComment(stream, state) {
        stream.match(/\s*/);
        if (stream.eol()) 
            return (state.commentLevel > 0) ? '' : null;
        // set comment style if first time
        if (!state.commentStyle && stream.match(/^(\/\/)|\(/, false)) {
            if (stream.match(/^\//, false)) {
                state.commentStyle = '//';
                reg_notcommentstart = /(.(?!\/\/))+|[^\(]+/;
            } else {
                state.commentStyle = '()';
            }
        }
        // handle // comments
        if (state.commentStyle == '//'){
            if (stream.match('//', false))
                return stream.match(/.*/)[0];
                    }
        // handle () comments
        if (state.commentLevel == 0 && stream.peek() != '(')
            return null;
        const pos = stream.pos;
        do {
            stream.match(/[^\(\)]*/);
            if (stream.eol())
                break;
            if (stream.match('('))
                state.commentLevel++;
            else if (stream.match(')'))
                state.commentLevel--;
        } while (state.commentLevel > 0);
        stream.eatSpace();
        return stream.string.slice(pos, stream.pos);
    }

    function checkEol(stream, state) { 
        const pos = stream.pos;
        matchComment(stream, state);
        const iseol = stream.eol();
        stream.pos = pos;
        return iseol;
    }

    function blankLineHandle(state) {
        if (state.section == 'levels') {
            const toplevel = state.levels.at(-1);
            if (toplevel && toplevel.length > 0)
                state.levels.push([]);
        } else if (state.section == 'objects') {
            expandLastObject(state);
            state.objects_section = 0;
        }
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // parse a SECTION line, validate order etc
    function parseSection(stream, state) {
        const section = matchRegex(stream, /^\w+/, true);

        // section must the only thing on the line, helps with backward compatibility
        if (!(section && sectionNames.includes(section) && checkEol(stream, state))) {
            pushBack(stream);
            return false;
        }
        matchComment(stream, state);

        // finalise previous section
        if (state.section === '') {
            state.commentStyle ||= '()';
        } else if (state.section === 'objects') {
            expandLastObject(state);
        } else if (state.section === 'legend') {
            state.names = [];
            state.names.push(...Object.keys(state.objects));
            state.names.push(...state.legend_synonyms.map(s => s[0]));
            state.names.push(...state.legend_aggregates.map(s => s[0]));
            state.names.push(...state.legend_properties.map(s => s[0]));
        } else if (section === 'levels') {
            state.abbrevNames = [];
            state.abbrevNames.push(...Object.keys(state.objects));
            state.abbrevNames.push(...state.legend_synonyms.map(s => s[0]));
            state.abbrevNames.push(...state.legend_aggregates.map(s => s[0]));
        }

        // start new section
        state.section = section;
        state.line_should_end = true;
        state.line_should_end_because = `a section name ("${state.section.toUpperCase()}")`;
        state.visitedSections.push(state.section);
        return true;
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse a PRELUDE line, extract parsed information, return array of tokens
    // also updates state.metadata
    function parsePrelude(stream, state) {
        const lexer = new Lexer(stream, state);
        let value = null;
        
        if (value = getTokens()) 
            setState(state, value);
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // extract and validate tokens
        function getTokens() {
            let token, ident;
            let kind = 'ERROR';
            const args = [];
            if (token = lexer.match(/^[a-z_]+/i, true)) {
                if (state.metadata_lines[ident]) {
                    var otherline = state.metadata_lines[token];
                    logWarning(`You've already defined a "${errorCase(token)}" in the prelude on line ${htmlJump(otherline)}.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                } else if (prelude_not_implemented.includes(token)) {
                    logWarning(`Option ${errorCase(token)} is not implemented, but may be in the future. Let me know if you really need it.`,state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                } else if (prelude_param_text.includes(token)) {
                    ident = token;
                    lexer.pushToken(token, 'METADATA');
                    token = lexer.matchAll();
                    lexer.pushToken(token, 'METADATATEXT');
                    args.push(token);
                } else if (prelude_tables.some(t => t.includes(token))) {
                    ident = token;
                    lexer.pushToken(token, 'METADATA');

                    while (!lexer.matchEol()) {
                        if (token = lexer.match(/^\S+/, true)) {
                            kind = (token in colorPalettes.arnecolors) ? 'COLOR COLOR-' + errorCase(token)
                                : (token === "transparent") ? 'COLOR FADECOLOR'
                                : token.match(/^#[0-9a-fA-F]+$/) ? 'MULTICOLOR' + token
                                : 'METADATATEXT';
                            lexer.pushToken(token, kind);
                            args.push(token);
                        } else break;
                    }
                } else {
                    logWarning(`Prelude option "${errorCase(token)}" is not one I know, so I'm going to ignore it. Hope that works for you.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                }
            } 

            if (token = lexer.matchToken()) {
                logError(`Unrecognised stuff in the prelude: "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
            } else if (ident) {
                return checkArguments(ident, args);
            }
        }

        function checkArguments(ident, args) {
            state.metadata_lines[ident] = state.lineNumber;                                                                                    
            let value
            if (prelude_keywords.includes(ident)) {
                if (args.length > 1)
                    logError(`Prelude option "${errorCase(ident)}" doesn't take any parameters, but you went and gave it "${args.join()}".`, state.lineNumber);
                else value = [ident, true];
            } else if (prelude_param_number.includes(ident)) {
                if (args.length != 1 || parseFloat(args[0]) == NaN)
                    logError(`Prelude option "${errorCase(ident)}" requires one numeric argument.`, state.lineNumber);
                else value = [ident, parseFloat(args[0])];
            } else if (prelude_param_single.includes(ident) || prelude_param_text.includes(ident)) {
                if (!(args.length == 1 || ident.startsWith('mouse')))
                    logError(`Prelude option "${errorCase(ident)}" requires exactly one argument, but you gave it ${args.length}.`, state.lineNumber);
                else if (ident.includes('_color') && !isColor(args[0]))
                    logError(`Prelude option "${errorCase(ident)}" in incorrect format - found ${args[0]}, but I expect a color name (like 'pink') or hex-formatted color (like '#1412FA'). A default will be used.`, state.lineNumber);
                else value = [ident, args[0]];
            } else if (prelude_param_multi.includes(ident)) {
                if (args.length < 1)
                    logError(`Prelude option "${errorCase(ident)}" has no arguments, but it needs at least one.`, state.lineNumber);
                else value = [ident, args.join(' ')];
            } else throw 'args';
            return value;
        }

        function setState(state, value) {
            const ident = value[0];
            if (ident == 'case_sensitive') {
                state.case_sensitive = true;
                caseSensitive = true;
                if (Object.keys(state.metadata).some(k => prelude_param_text.includes(k)))
                    logWarningNoLine("Please make sure that CASE_SENSITIVE comes before any case sensitive prelude setting.", false, false);
            } else if (ident == 'debug_switch') {
                debugSwitch = value[1];
            } else if (ident == 'mouse_clicks' && !directions_table.includes(mouse_clicks_table[0])) {
                directions_table.push(...mouse_clicks_table);
                directions_only.push(...mouse_clicks_table);
                soundverbs_movement.push(...mouse_clicks_table);
            } else if (ident == 'sprite_size') {
                const args = value[1].split('x').map(a => parseInt(a));
                if (!(args.length == 1 || args.length == 2))
                    logError(`MetaData "${errorCase(ident)}" requires an argument of numbers like 8x8 or 10, not ${value[1]}.`, state.lineNumber);
                else state.sprite_size = args[0];
            } else if (ident == 'youtube') {
                logWarning("Unfortunately, YouTube support hasn't been working properly for a long time - it was always a hack and it hasn't gotten less hacky over time, so I can no longer pretend to support it.",state.lineNumber);
                return;
            } else if (ident == 'game_uri') {
                logWarning(`Setting "${errorCase(ident)}" is an experimental Pattern:Script feature. Do not use.`,state.lineNumber);
                return;
            }
            state.metadata.push(...value);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store a TAG definition
    //  <tagid> = { id | tagid }...
    //
    function parseTagsLine(stream, state) {
        const lexer = new Lexer(stream, state);
        const symbols = {};

        if (getTokens())
            setState();
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(reg_name, !state.case_sensitive)) {
                symbols.id = token;
                if (isAlreadyDeclared(state, token) || token.match(/^(player|background)$/i)) {
                    logError(`You cannot define a tag called "${errorCase(token)}" because the name is already in use.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                // } else if (hasParts(token)) {  // cannot happen
                //     logError(`You cannot use "${errorCase(token)}" to define a tag because it contains colons (":").`, state.lineNumber);
                //     lexer.pushToken(token, 'ERROR');
                } else lexer.pushToken(token, 'NAME');
            } else {
                token = lexer.matchToken();
                logError(`Expected a name for a new tag, but found "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            if (token = lexer.match(/^=/, true)) {
                lexer.pushToken(token, 'ASSIGNMENT');
            } else {
                token = lexer.matchToken();
                logError(`Expected an equals sign "=" after the tag name but got "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            symbols.members = [];
            while (true) {
                // todo: handle recursive tag defs
                if (token = lexer.match(reg_name, !state.case_sensitive)) {
                    symbols.members.push(token);
                    lexer.pushToken(token, 'NAME');
                } else {
                    token = lexer.matchToken();
                    logError(`Expected a name for a new tag member, but found "${errorCase(token)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }
                if (lexer.matchEol()) break;
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            state.tags[symbols.id] = symbols.members.map(m => expandTag(m)).flat();
        }

        // tags that reference other tags are expanded to the lowest level here rather than when used
        function expandTag(arg) {
            const ret = [];
            if (Object.hasOwn(state.tags, arg)) 
                ret.push(...state.tags[arg].map(t => expandTag(t)).flat())
            else ret.push(arg);
            return ret;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store a MAPPINGS definition line 1
    // line ::= oldid '=>' newid
    // oldid ::= ( tag-ident | prop-obj-ident )
    //
    function parseMappingsLine1(stream, state) {
        const lexer = new Lexer(stream, state);
        const symbols = {};

        if (getTokens())
            setState();
        if (!lexer.matchEolSemi())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            
            lexer.matchComment();
            if (token = lexer.match(reg_name, !state.case_sensitive)) {
                symbols.lhs = token;
                if (!(isDeclaredAs(state, token) == 'tag')) {       // todo: propobj
                    logError(`Expected a TAG name but "${errorCase(token)}" is not one.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                } else {
                    lexer.pushToken(token, 'NAME');
                }
            } else {
                token = lexer.matchToken();
                logError(`Expected a TAG name, but found "${errorCase(token)}" instead.`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            if (token = lexer.match(/^=>/)) {
                lexer.pushToken(token, 'ASSIGNMENT');
            } else {
                token = lexer.matchToken();
                logError(`Expected an arrow sign "=>" but got "${errorCase(token)}" instead.`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            if (token = lexer.match(reg_name, !state.case_sensitive)) {
                symbols.rhs = token;
                if (isAlreadyDeclared(state, token)) {
                    logError(`You cannot define a mapping called "${errorCase(token)}" because the name is already in use.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                } else {
                    lexer.pushToken(token, 'NAME');
                }
            } else {
                token = lexer.matchToken();
                logError(`Expected a name for a mapping, but got "${errorCase(token)}" instead.`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            if (token = lexer.matchToken()) {
                logError(`Unrecognised stuff in a mapping: "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            state.mappings[symbols.rhs] = { 
                fromKey: symbols.lhs,
                lineNumber: state.lineNumber,
             };
            state.objects_candname = symbols.rhs;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store the second line of a MAPPINGS definition
    // line ::= tag-ident-values{n} -> mapped-ident{n}
    //       || prop-obj-ident-values{n} -> mapped-ident{n}
    //
    function parseMappingsLine2(stream, state) {
        const lexer = new Lexer(stream, state);
        const mapping = state.mappings[state.objects_candname];
        const symbols = {};

        if (getTokens())
            setState();
        else delete state.mappings[state.objects_candname];
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            
            lexer.matchComment();
            symbols.lhs = [];
            while (token = lexer.match(reg_name, !state.case_sensitive)) {
                if (!state.tags[mapping.fromKey].includes(token)) {      // todo: prop
                    logError(`The name "${errorCase(token)}" needs to be defined by "${errorCase(mapping.fromKey)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                } else {
                    lexer.pushToken(token, 'NAME');
                    symbols.lhs.push(token);
                }
                lexer.matchComment();
            }

            if (token = lexer.match(/^->/)) {
                lexer.pushToken(token, 'ASSIGNMENT');
            } else {
                token = lexer.matchToken();
                logError(`Expected an arrow sign "->" but got "${errorCase(token)}" instead.`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            symbols.rhs = [];
            while (token = lexer.match(reg_name, !state.case_sensitive)) {
                if (!token) {      // what do we not allow?
                    logError(`The name "${errorCase(token)}" is a very bad thing.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                } else {
                    lexer.pushToken(token, 'NAME');
                    symbols.rhs.push(token);
                }
            }

            if (!lexer.matchEol()) {
                token = lexer.matchToken();
                logError(`Unrecognised stuff in a mapping: "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            if (!(symbols.lhs.length == symbols.rhs.length 
                && new Set(symbols.lhs).size == symbols.lhs.length
                && new Set(symbols.lhs).size == symbols.rhs.length))
                logError(`Oops! You need the same number of symbols on both sides, and no duplicates.`, state.lineNumber);
            else {
                mapping.fromValues = symbols.lhs;
                mapping.values = symbols.rhs;
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store an object name, return token list
    // nameline ::= symbol { symbol | glyph } transforms
    function parseObjectName(stream, state) {
        const lexer = new Lexer(stream, state);
        const symbols = {};
        const aliases = [];
        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            if (state.case_sensitive)
                stream.string = state.mixedCase;
            lexer.matchComment();

            while (true) {
                let token = null;
                let kind = 'ERROR';
                
                // special for PS+, because otherwise it might get parsed as a name
                if (symbols.candname && lexer.check(reg_objmodi)) {
                    break;
                // first name must be an object, glyph allowed after that
                } else if ((token = lexer.match(reg_objectname, !state.case_sensitive) 
                    || (symbols.candname && lexer.matchObjectGlyph(!state.case_sensitive)))) {
                    if (state.legend_synonyms.some(s => s[0] == token)) {
                        logError(`Name "${errorCase(token)}" already in use.`, state.lineNumber);

                    } else if (state.objects[token] && !state.objects[token].canRedef) {
                        logError(`Object "${errorCase(token)}" defined multiple times.`, state.lineNumber);

                    } else {
                        if (keyword_array.includes(token)) 
                            logWarning(`You named an object "${errorCase(token)}", but this is a keyword. Don't do that!`, state.lineNumber);
                        kind = 'NAME';  
                        if (!symbols.candname) symbols.candname = token;
                        else aliases.push(token);
                    }
                    lexer.pushToken(token, kind);
                    if (lexer.matchEolSemi()) break;

                } else if (token = lexer.matchToken()) {
                    logError(`Invalid object name in OBJECT section: "${errorCase(token)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    lexer.pushToken(lexer.matchAll(), 'ERROR');
                    break;
                } else throw 'name';
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            const candname = state.objects_candname = symbols.candname;
            registerOriginalCaseName(state, candname, state.lineNumber);

            // use existing if there is one, to maintain the correct order of addition
            // preserve colors and sprite matrix, not transforms
            const newobj = state.objects[candname] || {       // doc: array of objects indexed by name
                lineNumber: state.lineNumber,
                colors: [],
                spritematrix: [],
            };
            delete newobj.canRedef;
            newobj.transforms = [];
            delete state.objects[candname];
            state.objects[candname] = newobj;

            const cnlc = candname.toLowerCase();
            if (candname != cnlc && [ 'background', 'player' ].includes(cnlc))
                createAlias(state, cnlc, candname, state.lineNumber);
            for (const alias of aliases) {
                registerOriginalCaseName(state, alias, state.lineNumber);
                createAlias(state, alias, candname, state.lineNumber);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    function parseObjectColors(stream, state) {
        const lexer = new Lexer(stream, state);
        const colors = [];

        if (getTokens())
            state.objects[state.objects_candname].colors = colors;
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            while (!lexer.matchEolSemi()) {
                let token = null;
                let kind = 'ERROR';
                if (token = lexer.match(/^[\w]+/, true)) {
                    if (color_names.includes(token)) {
                        colors.push(token);
                        kind = (token in colorPalettes.arnecolors) ? `COLOR COLOR-${token.toUpperCase()}`
                            : (token === "transparent") ? 'COLOR FADECOLOR'
                            : `MULTICOLOR${token}`;
                    } else logWarning(`Invalid color in object section: "${errorCase(token)}".`, state.lineNumber);
                } else if (token = lexer.match(/^#(([0-9a-f]{2}){3,4}|[0-9a-f]{3,4})/i)) {
                    colors.push(token);
                    kind = `MULTICOLOR${token}`;
                } else if (token = lexer.matchToken()) {
                    logError(`Was looking for color for object "${errorCase(state.objects_candname)}", got "${errorCase(token)}" instead.`, state.lineNumber);
                } else throw 'obj-color';
                lexer.pushToken(token, kind);
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // parse sprite grid, one cell at a time (to show them coloured)
    // grid ::= anychar... [ white [ comment ] ]
    // text ::= TEXT: anychar...
    function parseObjectSprite(stream, state) {
        const lexer = new Lexer(stream, state);
        const values = [];
        const obj = state.objects[state.objects_candname];
        
        if (getTokens()) {
            if (values.text) 
                obj.spritetext = values.text;
            else obj.spritematrix = (obj.spritematrix || []).concat([values]);
        }
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds, and extract values
        function getTokens() {
            let kind = 'ERROR';
            let token;
            if (token = lexer.match(/^text:/i, false)) {
                lexer.pushToken(token, 'LOGICWORD');

                token = lexer.matchAll();
                const kind = obj.colors.length == 1 ? `COLOR COLOR-${obj.colors[0].toUpperCase()}` : 'ERROR';
                lexer.pushToken(token, kind);
                values.text = token;
                state.objects_section = 0;
                return true;
            }    

            if (token = lexer.match(/^\{[^}]*\}/, false)) {
                logError(`This ${token} looks rather like a piece of JSON. Did you maybe leave out "CANVAS:"?`, state.lineNumber);
                lexer.pushToken(token, kind);
                lexer.pushToken(lexer.matchAll(), kind);
                return false;
            }

            while (!stream.eol()) {
                let token = lexer.next();
                let kind = 'ERROR';
                let value = -1;
                if (token.match(/\s/)) break; // stop on whitespace, rest is comment or junk
                if (token == '.') kind = 'COLOR FADECOLOR';
                else if (token.match(/[0-9a-zA-Z]/)) {
                    value = token <= '9' ? +token : 10 + token.toLowerCase().charCodeAt(0) - 97;  // letter 'a'
                    if (!obj.colors[value]) 
                        logError(`Trying to access color number ${value + 1} from the color palette of sprite ${state.objects_candname}, but there are only ${obj.colors.length} defined in it."`, state.lineNumber);
                    else kind = 'COLOR BOLDCOLOR COLOR-' + obj.colors[value].toUpperCase();
                } else logError(`Invalid character "${errorCase(token)}" in sprite for ${state.objects_candname}`, state.lineNumber);
                lexer.pushToken(token, kind);
                values.push(value);
            }
            lexer.matchEol();
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse vector data for canvas or svg
    function parseObjectVector(stream, state) {
        const lexer = new Lexer(stream, state);
        const values = [];
        const obj = state.objects[state.objects_candname];
        
        if (getTokens()) 
            obj.vector.data = (obj.vector.data || []).concat(values);
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds, and extract array of values
        function getTokens() {
            let kind = 'ERROR';
            let token;
            if (obj.vector.type == 'canvas') {
                while (!lexer.matchEol()) {
                    kind = 'ERROR';
                    if (token = lexer.match(/^\{[^}]*\}/, false)) {
                        try {
                            const json = JSON.parse(token);
                            if (json) {
                                values.push(json);
                                kind = 'SPRITEMATRIX';
                            }
                        } catch (error) { }
                    } else token = lexer.matchAll();   
                }
                lexer.pushToken(token, kind);
                if (kind == 'ERROR') 
                    logError(`I was looking for some valid JSON (in curly braces) but found this instead: "${token}."`, state.lineNumber);
                return kind != `ERROR`;

            } else if (obj.vector.type == 'svg') {
                // TODO: check svg syntax
                logError(`SVG is not yet implemented. Sorry.`, state.lineNumber);
                //kind = 'SPRITEMATRIX';
                token = lexer.matchAll();
                values.push(token);
                return true;

            } else throw 'vector';
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store object transforms
    // transforms ::= { COPY: name | SCALE: number 
    //               | SHIFT: <dir> | TRANSLATE: <dir> : <amount> | ROT: <dir> : <dir> }...
    // assumes object already exists
    function parseObjectTransforms(stream, state) {
        const candname = state.objects_candname;
        const obj = state.objects[candname];
        if (!obj) throw 'obj';
        const lexer = new Lexer(stream, state);
        const symbols = { transforms: [] };
        if (getTokens())
            setState();
        return lexer.tokens;

        function isValidDirection(arg) {
            if (Object.hasOwn(state.tags, arg)) {
                return state.tags[arg].every(v => clockwiseDirections.includes(v)) ? arg : null;
            }
            return clockwiseDirections.includes(arg) ? arg : null;
        }

        // build a list of tokens and kinds
        function getTokens() {
            // same as reg_name plus : and reldirs
            const reg_transform_args = /^[\p{L}\p{N}_$:<>^]+/u;
            while (!lexer.matchEolSemi()) { 
                let token = null;
                let kind = 'ERROR';
                if (token = lexer.match(/^copy:/i)) {
                    if (symbols.cloneSprite) 
                        logError(`You already assigned a sprite source for "${errorCase(symbols.candname)}", you can't have more than one!`, state.lineNumber);
                    else kind = 'KEYWORD';
                    lexer.pushToken(token, kind);
                    lexer.matchComment();

                    kind = 'ERROR';
                    if (!(token = lexer.match(reg_objectname, !state.case_sensitive)))      // ?? glyph too?
                        logError(`Missing sprite to copy from.`, state.lineNumber);
                    else if (token == symbols.candname) 
                        logError(`You attempted to set the sprite "${errorCase(token)}" to copy from itself! Please don't.`, state.lineNumber)
                    else if (!(isAlreadyDeclared(state, token) || createObjectRef(state, token)))
                        logError(`You're trying to copy from "${errorCase(token)}" but it's not defined anywhere.`, state.lineNumber)
                    else {
                        kind = 'NAME';
                        symbols.cloneSprite = token;
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^scale:/i)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();

                    token = lexer.match(/^[0-9.]+/);
                    const arg = parseFloat(token);
                    if (arg == NaN)
                        logError(`Scale requires a numeric argument.`, state.lineNumber);
                    else {
                        symbols.scale = arg;
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^flip:/i)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();

                    token = lexer.match(reg_transform_args,  true);
                    const dir = isValidDirection(token);
                    if (dir == null)
                        logError(`Flip requires a direction or tag argument, but you gave it ${errorCase(token)}.`, state.lineNumber);
                    else {
                        symbols.transforms.push([ 'flip', dir ]);
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^[|-]/)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();
                    // P:S compat: "- and | for horizontal and vertical mirrors"
                    symbols.transforms.push([ 'flip', token == '-' ? '>' : 'v']);  

                } else if (token = lexer.match(/^shift:/i)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();

                    token = lexer.match(reg_transform_args,  true);
                    const args = token ? token.split(':') : [];
                    const dir = isValidDirection(args[0]);
                    const amt = args[1] ? +args[1] : 1;
                    if (!(args.length <= 2 && dir && amt))
                        logError(`Shift requires a direction or tag argument and optionally how many, but you gave it ${errorCase(token)}.`, state.lineNumber);
                    else {
                        symbols.transforms.push([ 'shift', dir, amt ]);
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^translate:/i)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();

                    token = lexer.match(reg_transform_args,  true);
                    const args = token ? token.split(':') : [];
                    const dir = isValidDirection(args[0]);
                    const amt = args[1] ? +args[1] : null;
                    if (!(args.length == 2 && dir && amt))
                        logError(`Translate requires two arguments, a direction or tag and an amount, not ${errorCase(token)}.`, state.lineNumber);
                    else {
                        symbols.transforms.push([ 'translate', dir, +args[1] ]);
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^rot:/i)) {
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();

                    token = lexer.match(reg_transform_args,  true);
                    const args = token ? token.split(':') : [];
                    if (args.length == 1) args.unshift('up');
                    const dir1 = isValidDirection(args[0]);
                    const dir2 = isValidDirection(args[1]);
                    if (!(args.length <= 2 && dir1 && dir2))
                        logError(`For rot: you need 1 or 2 direction or tag arguments, but you gave it ${token ? errorCase(token) : 'neither'}.`, state.lineNumber);
                    else {
                        symbols.transforms.push([ 'rot', dir1, dir2 ]);
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);

                } else if (token = lexer.match(/^canvas:/i)) {//@@
                    lexer.pushToken(token, 'KEYWORD');
                    lexer.matchComment();
                    symbols.vector = { 
                        type: 'canvas', 
                        data: [],
                        h: 1, w: 1,
                    };
                    if (token = lexer.match(/^[0-9,]+/,  true)) {
                        const parts = token && token.split(',');
                        if (!(parts.length >= 1 && parts.length <= 2))
                            logError(`Canvas size has to be specified as a number or number,number, not ${errorCase(token)}.`, state.lineNumber);
                        else {
                            symbols.vector.w = ~~parts[0];
                            symbols.vector.h = ~~(parts[1] || parts[0]);
                            kind = 'METADATATEXT';  //???
                        }
                        lexer.pushToken(token, kind);
                    }

                } else if (token = lexer.matchToken()) {
                    logError(`Invalid token in OBJECT modifier section: "${errorCase(token)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                } else throw 'obj-modi';
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            if (symbols.cloneSprite) obj.cloneSprite = symbols.cloneSprite;
            if (symbols.scale) obj.scale = symbols.scale;
            if (symbols.vector) obj.vector = symbols.vector;
            if (symbols.transforms) obj.transforms.push( ...symbols.transforms );
        }
    }

    // if the last object has tags, expand it, delete original name and add property
    function expandLastObject(state) {
        const candname = state.objects_candname;
        if (!candname || !hasParts(candname)) return;
        const obj = state.objects[candname];
        const newobjects = expandObjectDef(state, candname, obj);
        if (newobjects) {
            // add new objects but do not overwrite existing
            for (const [newid, newvalue] of newobjects)
                if (!Object.hasOwn(state.objects, newid)) {
                    state.objects[newid] = newvalue;
                    registerOriginalCaseName(state, newid, state.lineNumber);
                }
            const newlegend = [ candname, ...newobjects.map(n => n[0])];
            newlegend.lineNumber = obj.lineNumber;  // bug: it's an array, isn't it?

            delete state.objects[candname];
            state.objects_candname = '';
            state.legend_properties.push(newlegend);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // SOUND DEFINITION:
    // SOUNDEVENT ~ INT (Sound events take precedence if there's name overlap)
    // OBJECT_NAME
    //     NONDIRECTIONAL_VERB ~ INT
    //     DIRECTIONAL_VERB
    //         INT
    //         DIR+ ~ INT
    // parse a SOUNDS line, extract parsed information, return array of tokens
    function parseSoundLine(stream, state) {
        const lexer = new Lexer(stream, state);
        const rows = [];
        const symbols = {};
        
        if (getTokens()) 
            state.sounds.push(...rows);
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token = null;
            let kind = 'ERROR';
            if (token = lexer.match(reg_soundevents, true)) {
                // closemessage 1241234...
                lexer.pushToken(token, 'SOUNDEVENT');
                lexer.matchComment();
                const tevent = token;

                const tsounds = parseSoundSeedsTail();
                if (tsounds) {
                    rows.push(...tsounds.map(s => ['SOUNDEVENT', tevent, s, state.lineNumber]));
                    return true;
                } else {
                    logError("Was expecting a sound seed here (a number like 123123, like you generate by pressing the buttons above the console panel), but found something else.", state.lineNumber);                                
                }
            } else if (token = lexer.match(reg_objectname, !state.case_sensitive)) {
                // player move [ up... ] 142315...
                const tobjects = getObjectRefs(state, token);
                if (!tobjects) {
                    const undef = getObjectUndefs(state, token);
                    logError(`Found "${errorCase(token)}", which looks like an object but ${ undef[0] ? errorCase(undef[0]) : 'it' } is not declared anywhere.`, state.lineNumber);
                } else {
                    lexer.pushToken(token, 'NAME');

                    let tverb = null;
                    if ((token = lexer.match(/^[a-z]+/i, true))) {
                        if (soundverbs_directional.includes(token) || soundverbs_movement.includes(token) || soundverbs_other.includes(token)) {
                            lexer.pushToken(token, 'SOUNDVERB');
                            tverb = token;
                            lexer.matchComment();
                        } else lexer.pushBack();
                    }

                    if (!tverb) {
                        logError("Was expecting a soundverb here (MOVE, DESTROY, CANTMOVE, or the like), but found something else.", state.lineNumber);
                    } else {
                        const tdirs = [];
                        while (token = lexer.match(reg_sounddirectionindicators, true)) {
                            lexer.pushToken(token, 'DIRECTION');
                            tdirs.push(token);
                            lexer.matchComment();
                        }

                        const tsounds = parseSoundSeedsTail();
                        if (tsounds) {
                            tobjects.forEach(t => 
                                rows.push(...tsounds.map(s => ['SOUND', t, tverb, tdirs, s, state.lineNumber])));
                            return true;
                        } else if (token == lexer.matchToken()) {
                            const dirok = soundverbs_directional.includes(tverb);
                            const msg = dirok ? "direction or sound seed" : "sound seed";
                            logError(`Ah I was expecting a ${msg} after ${tverb}, but I don't know what to make of "${errorCase(token)}".`, state.lineNumber);
                        }
                    }
                }
            } else logError("Was expecting a sound event (like SFX3, or ENDLEVEL) or an object name, but didn't find either.", state.lineNumber);

            return false;
        }
        
        // parse list of at least one sound seeds, check for eol
        function parseSoundSeedsTail() {
            const tsounds = [];
            let token = null;
            while (token = lexer.match(/^(\d+(:[\d.]+)?|afx:[\w:=+-.]+)\b/i, true)) {
                lexer.pushToken(token, 'SOUND');
                tsounds.push(token);
                lexer.matchComment();
            }
            if (token = lexer.matchToken()) {
                logError(`I wasn't expecting anything after the sound declaration ${tsounds.at(-1)} on this line, so I don't know what to do with "${errorCase(token)}" here.`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return null;
            } else return tsounds;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    function parseLegendLine(stream, state) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(reg_objectname, !state.case_sensitive) || lexer.matchObjectGlyph(!state.case_sensitive)) {
                symbols.newname = token;
                const defname = isAlreadyDeclared(state, token);
                if (defname)
                    logError(`Name "${errorCase(token)}" already in use (on line ${htmlJump(defname.lineNumber, 'errorTextLineNumber')}`);
                else if (keyword_array.includes(token))
                    logWarning(`You named an object "${errorCase(token)}", but this is a keyword. Don't do that!`, state.lineNumber);
                lexer.pushToken(token, defname ? 'ERROR' : 'NAME');
            }
            lexer.matchComment();

            if (token = lexer.match(/^=/)) {
                lexer.pushToken(token, 'ASSIGNMENT');
            } else {
                logError(`In the legend, define new items using the equals symbol - declarations must look like "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".`, state.lineNumber);
                return;
            }
            lexer.matchComment();

            while (true) {
                let kind = 'ERROR';
                if (token = lexer.match(reg_objectname, !state.case_sensitive) || lexer.matchObjectGlyph(!state.case_sensitive)) {
                    const tobjects = getObjectRefs(state, token);
                    if (!tobjects) {
                        const undef = getObjectUndefs(state, token);
                        logError(`You're talking about "${errorCase(token)}" but ${ undef[0] ? errorCase(undef[0]) : 'it' } is not defined anywhere.`, state.lineNumber);
                    } else if (token == symbols.newname)
                        logError(`You can't define object "${errorCase(token)}" in terms of itself!`, state.lineNumber);
                    else {
                        if (names.includes(token))
                            logWarning(`You're repeating the object "${errorCase(token)}" here multiple times on the RHS.  This makes no sense.  Don't do that.`, state.lineNumber);                        
                        names.push(...tobjects);
                        if (tobjects.length > 1) symbols.andor ||= 'or';
                        kind = 'NAME';
                    }
                } 
                lexer.pushToken(token, kind);
                if (kind != 'NAME') {
                    token = lexer.matchToken();
                    logError(`Something bad's happening in the LEGEND around ${token}`, state.lineNumber);
                    return;
                }

                if (lexer.matchEol()) break;

                if (token = lexer.match(/^(and|or)\b/i, true)) {
                    if (symbols.andor && token != symbols.andor)
                        logError(`Cannot mix AND and OR`, state.lineNumber);
                    else {
                        symbols.andor ||= token;
                        kind = 'LOGICWORD';
                    }
                    lexer.pushToken(token, kind);
                } else {
                    token = lexer.match(reg_notcommentstart);
                    logError(`AND or OR expected, found ${errorCase(token)}`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            if (names.length == 1) {
                registerOriginalCaseName(state, symbols.newname, state.lineNumber);  // tofix:
                createAlias(state, symbols.newname, names[0], state.lineNumber);
            } else if (symbols.andor == 'and') {
                const newlegend = [ symbols.newname, ...names
                    .flatMap(n => expandSymbol(state, n, true, 
                        () => logError("Cannot define an aggregate (using 'and') in terms of properties (something that uses 'or').", state.lineNumber))) ];
                newlegend.lineNumber = state.lineNumber;
                registerOriginalCaseName(state, symbols.newname, state.lineNumber);
                state.legend_aggregates.push(newlegend);
            } else { // == 'or'
                const newlegend = [ symbols.newname, ...names
                    .flatMap(n => expandSymbol(state, n, false,
                        () => logError("Cannot define a property (something defined in terms of 'or') in terms of aggregates (something that uses 'and').", state.lineNumber))) ];
                newlegend.lineNumber = state.lineNumber;
                registerOriginalCaseName(state, symbols.newname, state.lineNumber);
                state.legend_properties.push(newlegend);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store a collision layer line
    // [ tag [, ...] -> ] ( object | property) [, ...]
    // -- [-^<>-|]...

    // tag prefixes and objects and properties in the body:
    //      Position -> Clue:Position:Value, NoClueCover:Position
    //      dirs -> vs_any_under:dirs:offs
    //      directions, directions1 -> GridLines:directions:directions1
    
    function parseCollisionLayer(stream, state) {
        const lexer = new Lexer(stream, state);
        let divider
        const idents = [];
        let prearrow = 0;         // how many layers prefixes

        if (getTokens())
            setState();
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token = null;
            // start of parse
            while (true) {
                if (token = lexer.match(/^--[-^v<>-|]*/)) {
                    lexer.pushToken(token, 'LOGICWORD');
                    divider = token;
                    if (lexer.matchEolSemi()) break;
                } else if (token = lexer.match(/^->/)) {
                    if (idents.length == 0 || prearrow != 0)
                        logError(`Cannot use arrow syntax here.`, state.lineNumber);
                    else {
                        prearrow = idents.length;
                        lexer.pushToken(token, 'LOGICWORD');
                    }
                } else if (token = lexer.match(reg_objectname, !state.case_sensitive) || lexer.matchObjectGlyph(!state.case_sensitive)) {
                    let kind = 'ERROR';
                    const trefs = getObjectRefs(state, token);   // do we need this?
                    if (token == 'background' && idents.length != 0)
                        logError("Background must be in a layer by itself.",state.lineNumber);
                    else if (!trefs) {
                        const undef = getObjectUndefs(state, token);
                        logError(`Cannot add "${errorCase(token)}" to a collision layer, ${ undef[0] ? errorCase(undef[0]) : 'it' } has not been declared.`, state.lineNumber);
                    } else {
                        if (idents.includes(token))
                            logWarning(`Object "${errorCase(token)}" included explicitly multiple times in the same layer. Don't do that innit.`,state.lineNumber);         
                        else idents.push(token);
                        kind = 'NAME';
                    }
                    lexer.pushToken(token, kind);
                } else {
                    token = lexer.match(reg_notcommentstart);
                    logError(`Object name expected, found ${errorCase(token)}`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }

                if (lexer.matchEolSemi()) break;

                // treat the comma as optional (as PS seems to do). Trailing/extra comma is OK too
                while (token = lexer.match(/^,/)) {
                    lexer.pushToken(token, 'LOGICWORD');
                } 
                if (lexer.matchEolSemi()) break;
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        // further error checking and update external state
        function setState() {

            // functions to manage keyed layers
            const keylayers = [];

            // append objects to a layer by key, or create a new one
            function addToLayer(key, objects) {
                if (keylayers[key]) 
                    keylayers[key].layer.push(...objects);
                else keylayers[key] = { lineNumber: state.lineNumber, layer: objects };
            }
            function getNewLayers() {
                return Object.values(keylayers).map(k => k.layer);
            }

            // add new objects to the proper layer based on ident and prefixes
            // if a part is a member of a prefix it goes in a layer keyed by the part
            function addNewObjects(newobjs, ident, prefixes) {
                const parts = ident.split(':');
                const prefs = prefixes.filter(p => parts.includes(p));
                if (parts.length == 1 || prefixes.length == 0) addToLayer('+', newobjs);
                else {
                    // map the position of the prefix in the parts list
                    const indexes = prefs.map(p => parts.indexOf(p));
                    for (const obj of newobjs) {
                        const key = indexes.map(i => obj.split(':')[i]).join('+');
                        addToLayer(key, [ obj ]);
                    }
                }
            }

            // check for divider first
            if (divider) {
                const chars = '^>v<|-';
                const dirs = ['up', 'right', 'down', 'left', 'down', 'right' ];
                const combos = ['downright', 'downleft', 'upright', 'upleft',
                                'leftdown', 'leftup', 'rightdown', 'rightup'];
                const dirFirst = dirs[chars.indexOf(divider[2] || '>')];
                const dirSecond = dirs[chars.indexOf(divider[3] || 'v')];
                if (!combos.includes(dirFirst + dirSecond)) {
                    consoleError(`Layer divider ${divider} is not valid.`);
                    return;
                }
                state.collisionLayerGroups.push({ 
                    lineNumber: state.lineNumber, 
                    layer: state.collisionLayers.length,
                    dirFirst: dirFirst,
                    dirSecond: dirSecond,
                });
                return;
            } 
            
            if (state.collisionLayerGroups.length == 0) {
                state.collisionLayerGroups.push({ 
                    lineNumber: state.lineNumber, 
                    layer: 0,
                    dirFirst: 'right',
                    dirSecond: 'down',
                });

            }

            // expand rhs first
            const prefixes = idents.slice(0, prearrow);
            const rhs = idents.slice(prearrow)
            for (const prefix of prefixes) {
                if (!(state.tags[prefix] || state.legend_properties.find(s => s[0] == prefix))) {
                    logError(`A layer prefix must be a tag or property but ${prefix} is not.`, state.lineNumber);
                    return;
                }
            }
            
            for (const ident of rhs) {
                const idents = getObjectRefs(state, ident);
                const newobjs =  idents.map(i => expandSymbol(state, i, false, n => logError(
                    `"${n}" is an aggregate (defined using "and"), and cannot be added to a single layer because its constituent objects must be able to coexist.`, state.lineNumber)))
                    .flat();

                // do we care about possible in-layer duplicates?
                const dups = new Set();
                state.collisionLayers.forEach((layer, layerno) => {
                    for (const obj of newobjs) {
                        if (layer.includes(obj))
                            dups.add(layerno + 1);
                    }
                });
                if (dups.size != 0) {
                    const joins = [...dups].map(v => `#${v}, `) + `#${state.collisionLayers.length + 1}`;
                    logWarning(`Object "${errorCase(ident)}" included in multiple collision layers ( layers ${joins} ). You should fix this!`, state.lineNumber);
                }

                // then use lhs to assign to layers
                addNewObjects(newobjs, ident, prefixes);
            }
            // remove the keys and push one or more layers
            const newlayers = getNewLayers();
            newlayers.forEach(l => state.collisionLayers.push(l));
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    //  [ ALL | ANY | NO | SOME ] <object> [ ON <object> ]?
    //
    function parseWinCondition(stream, state) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(/^(all|any|no|some)\b/i, true)) {
                symbols.start = token;
                lexer.pushToken(token, 'LOGICWORD');
            } else {
                token = lexer.match(reg_notcommentstart);
                logError(`Expecting the start of a win condition ("ALL","SOME","NO") but got "${errorCase(token)}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.matchComment();
            getIdent();
            if (!lexer.matchEol()) {
                if (token = lexer.match(/^(on)\b/i, true)) {
                    symbols.kind = token;
                    lexer.pushToken(token, 'LOGICWORD');
                } else {
                    token = lexer.matchToken();
                    logError(`Expecting the word "ON" but got "${errorCase(token)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }

                lexer.matchComment();
                getIdent();
                if (!lexer.matchEol()) {
                    token = lexer.matchToken();
                    logError(`Error in win condition: I don't know what to do with "${errorCase(token)}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                }
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function getIdent() {
            let token
            if (token = lexer.match(reg_objectname, !state.case_sensitive) || lexer.matchObjectGlyph(!state.case_sensitive)) {
                let kind = 'ERROR';
                if (!(isAlreadyDeclared(state, token) || createObjectRef(state, token)))
                    logError(`Error in win condition: "${errorCase(token)}" is not a valid object name.`, state.lineNumber);
                else {
                    names.push(token);
                    kind = 'NAME';
                }
                lexer.pushToken(token, kind);
            } else {
                token = lexer.matchToken();
                logError(`Object name expected, found ${errorCase(token)}`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }
        }

        function setState() {
            state.winconditions.push((names.length == 1) 
                ? [ symbols.start, names[0], state.lineNumber ]
                : [ symbols.start, names[0], 'on', names[1], state.lineNumber ]);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    //  line ::= MESSAGE <text>
    //         | SECTION <text>
    //         | GOTO <text>
    //         | ( <levelchar>+ [ WS comment ] )+
    function parseLevel(stream, state) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        if (!lexer.matchEol())
            lexer.pushToken(lexer.matchAll(), 'ERROR');
    return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(/^(goto|level|link|message|section|title)/i, true)) { // allow omision of whitespace (with no warning!)
                symbols.start = token;
                lexer.pushToken(token, `${errorCase(token)}_VERB`);

                if (token == 'link') {
                    if (!(token = lexer.match(reg_objectname, !state.case_sensitive))) 
                        logError(`LINK needs an object to know where to put the link.`, state.lineNumber);
                    else if (!isAlreadyDeclared(state, token))
                        logError(`LINK object "${errorCase(token)}" not found, it needs to be already defined.`, state.lineNumber);
                    else {      // @@
                        const objects = expandSymbol(state, token, false, () => {});
                        if (!(objects && objects.length == 1))
                            logError(`LINK object "${errorCase(token)}" only works with a simple object or an alias, not something created with AND or OR.`, state.lineNumber);
                        {
                            symbols.link = objects[0];
                            lexer.pushToken(token, 'NAME');
                        }
                    }
                }
                symbols.text = lexer.matchAll();
                if (symbols.text.length > 0)
                    lexer.pushToken(symbols.text, `METADATATEXT`);  // empty causes havoc
            } else {
                symbols.gridline = '';
                // allow comments in level grid, per Selene's Labyrinth
                while (true) {
                    if (state.commentStyle == '()' && lexer.peek() == '(') 
                        break;
                    if (token = lexer.match(/^\S/, !state.case_sensitive)) {
                        symbols.gridline += token;
                        const kind = state.abbrevNames.includes(token) ? 'LEVEL' : 'ERROR';
                        if (kind == 'ERROR')
                            logError(`Key "${errorCase(token)}" not found. Do you need to add it to the legend, or define a new object?`, state.lineNumber);
                        lexer.pushToken(token, kind);
                    } else break;
                }
            }

            lexer.matchEol();
            return true;
        }

        function setState() {
            // look for marker level that says a blank line has been seen
            let toplevel = state.levels.at(-1);
            if (toplevel && toplevel.length == 0) {
                state.levels.pop();
                toplevel = null;
            }
            const cmds = [ 'goto', 'level', 'link', 'message', 'section', 'title', ];
            if (cmds.includes(symbols.start))
                state.levels.push([ symbols.start, symbols.text, state.lineNumber, symbols.link ]);
            else {
                if (toplevel == null || cmds.includes(toplevel[0]))
                    state.levels.push([ state.lineNumber, null, symbols.gridline ]);
                else {
                    // if (symbols.gridline.length != toplevel[2].length)
                    //     logWarning("Maps must be rectangular, yo (In a level, the length of each row must be the same).", state.lineNumber);
                    toplevel.push(symbols.gridline);
                }
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // called as per CodeMirror API
    // return value is an object containing a specific set of named functions
    return {
        copyState: function(state) {
            return ({
                original_case_names: Object.assign({}, state.original_case_names),
                original_line_numbers: Object.assign({}, state.original_line_numbers),
                lineNumber: state.lineNumber,

                objects: deepClone(state.objects),
                collisionLayers: state.collisionLayers.map(p => p.slice()),
                collisionLayerGroups: state.collisionLayerGroups.slice(),

                commentLevel: state.commentLevel,
                commentStyle: state.commentStyle,
                section: state.section,
                visitedSections: state.visitedSections.slice(),

                line_should_end: state.line_should_end,
                line_should_end_because: state.line_should_end_because,
                sol_after_comment: state.sol_after_comment,

                objects_candname: state.objects_candname,
                objects_section: state.objects_section,
                objects_spritematrix: state.objects_spritematrix.slice(),

                tokenIndex: state.tokenIndex,
                // PS+ SECTION command argument if any
                current_line_wip_array: state.current_line_wip_array.slice(),
                mixedCase: state.mixedCase,

                legend_synonyms: state.legend_synonyms.map(p => p.slice()),
                legend_aggregates: state.legend_aggregates.map(p => p.slice()),
                legend_properties: state.legend_properties.map(p => p.slice()),
                tags: Object.assign({}, state.tags),
                mappings: Object.assign({}, state.mappings),

                sounds: state.sounds.map(p => p.slice()),

                rules: state.rules.map(p => p.slice()),

                names: state.names.slice(),

                winconditions: state.winconditions.slice(),

                original_case_names : Object.assign({},state.original_case_names),
                original_line_numbers : Object.assign({},state.original_line_numbers),
    
                abbrevNames: state.abbrevNames.slice(),

                metadata : state.metadata.slice(),
                metadata_lines: Object.assign({}, state.metadata_lines),

                sprite_size : state.sprite_size,

                case_sensitive : state.case_sensitive,

                levels: state.levels.map(p => p.slice()),

                STRIDE_OBJ : state.STRIDE_OBJ,
                STRIDE_MOV : state.STRIDE_MOV
            });
        },
        blankLine: function(state) {
            blankLineHandle(state);
        },
        // function is called to successively find tokens and return a token type in a source code line
        // note: there is no end of line marker, the next line will follow immediately but with sol() set
        token: function(stream, state) {
            // these sections may have pre-loaded tokens, to be cleared before *anything* else
            if (state.current_line_wip_array.length > 0 && !['rules'].includes(state.section)) {
                return flushToken();
            }

            //--- guard against looping?
            // lastStream.pos = stream.pos;
            // lastStream.start = stream.start;
            // lastStream.lineStart = stream.lineStart;
            // lastStream.string = stream.string;
            //console.log(`get token`, lastStream);
            //--- guard against looping?

            //console.log(`Input line ${mixedCase}`)
            var sol = stream.sol();
            if (sol) {
                // Note: used in case insensitive objects, levels, text and editor hints.
                state.mixedCase = stream.string;
                state.current_line_wip_array = [];
                state.original_line = stream.string;

                // PS+ leaves original text unchanged, which means a lot of checking in other places
                if(!state.case_sensitive) {
                    stream.string = stream.string.toLowerCase();
                }
                state.tokenIndex=0;
                state.line_should_end = false;
            }
            if (state.sol_after_comment){
                sol = true;
                state.sol_after_comment = false;
            }

            if (state.tokenIndex !== -4 && matchComment(stream, state) != null) {
                state.sol_after_comment = state.sol_after_comment  || sol;
                return 'comment';
            }

            stream.eatWhile(/[ \t]/);

            if (sol && stream.eol()) {
                return blankLineHandle(state);
            }

            if (state.commentStyle === '()' && stream.match(')')) {
                logWarning("You're trying to close a comment here, but I can't find any opening bracket to match it? [This is highly suspicious; you probably want to fix it.]", state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            } else if (state.commentStyle === '//' && stream.match(/[\(\)]/)) {
                logWarning("You're trying to use the wrong type of comment here.[This is highly suspicious; you probably want to fix it.]", state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            }

            if (state.line_should_end && !stream.eol()) {
                logError('Only comments should go after ' + state.line_should_end_because + ' on a line.', state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            }            

            //MATCH '==="s AT START OF LINE
            if (sol && stream.match(reg_equalsrow, true)) {  // todo: not if we're in a level
                state.line_should_end = true;
                state.line_should_end_because = 'a bunch of equals signs (\'===\')';
                return 'EQUALSBIT';
            }

            if (sol && parseSection(stream, state))
                return 'HEADER';

            if (stream.eol()) {
                //endOfLineProcessing(state,mixedCase);  
                return null;
            }

            // per section specific parsing
            switch (state.section) {
                case '': {
                    stream.string = state.mixedCase;  // put it back, for now!
                    state.current_line_wip_array = parsePrelude(stream, state);
                    return flushToken();

                }
                case 'tags': {
                    state.current_line_wip_array = parseTagsLine(stream, state);
                    return flushToken();
                }
                case 'mappings': {
                    if (state.objects_section == 0) {
                        state.objects_candname = null;
                        state.current_line_wip_array = parseMappingsLine1(stream, state);
                        state.objects_section = state.objects_candname ? 1 : 0;
                    } else {
                        state.current_line_wip_array = parseMappingsLine2(stream, state);
                        state.objects_section = 0;
                    }
                    return flushToken();
                }

                // Objects parsing is all LL(1):
                // object alias* ( prop: value? )*
                // ( colour+ )?
                // ( digit+ )* | ( json )*
                // ( prop: value? )*

                case 'objects': {
                    // start of line, special for no blank line
                    if (sol && (state.objects_section == 3 || state.objects_section == 4)) {
                        // no blank line: criterion for end sprite: <= 10 colours, line matches object and not transform
                        if (state.objects[state.objects_candname].colors.length <= 10 
                          && !state.objects[state.objects_candname].vector 
                          && !stream.match(/^[.\d]/, false)
                          && !stream.match(reg_objmodi, false))
                            state.objects_section = 0;
                    }
                    if (sol && state.objects_section == 0) {
                        expandLastObject(state);
                        state.objects_candname = null;
                        state.current_line_wip_array = [];
                        state.objects_section = 1;
                    }

                    switch (state.objects_section) {
                    case 1: {
                            state.current_line_wip_array.push(...parseObjectName(stream, state));
                            if (state.objects_candname) {
                                if (stream.match(reg_objmodi, false))
                                    state.current_line_wip_array.push(...parseObjectTransforms(stream, state));
                                state.objects_section = 2;
                            }
                            return flushToken();
                        }
                    case 2: 
                        state.objects_section = 3;
                        if (stream.match(/^[#\w]+/, false) && !stream.match(reg_objmodi, false)) {
                            state.current_line_wip_array.push(...parseObjectColors(stream, state));
                            return flushToken();
                        } // else fall through
                    case 3: 
                        if (stream.match(/^text:/i, false)) {
                            stream.string = state.mixedCase;
                            const tokens = parseObjectSprite(stream, state);
                            state.current_line_wip_array.push(...tokens);
                            state.objects_section = 0;
                            return flushToken();
                        } // else fall through
                    case 4:
                        if (stream.match(reg_objmodi, false)) {
                            state.objects_section = 5; // fall through
                        } else {
                            stream.string = state.mixedCase;
                            const tokens = state.objects[state.objects_candname].vector 
                                ? parseObjectVector(stream, state) 
                                : parseObjectSprite(stream, state);
                            state.current_line_wip_array.push(...tokens);
                            state.objects_section = 4;
                            return flushToken();
                        }
                    case 5: {
                            state.current_line_wip_array.push(...parseObjectTransforms(stream, state));
                            return flushToken();
                        }
                    }
                    break;
                }

                case 'legend': {
                    state.current_line_wip_array = parseLegendLine(stream, state);
                    return flushToken();
                }

                case 'sounds': {
                    stream.string = state.mixedCase;
                    state.current_line_wip_array = parseSoundLine(stream, state);
                    return flushToken();
                }

                case 'collisionlayers': {
                    state.current_line_wip_array = parseCollisionLayer(stream, state);
                    return flushToken();
                }
                case 'rules': {
                        if (sol) {
                            var rule = reg_notcommentstart.exec(stream.string)[0];
                            state.rules.push([rule, state.lineNumber, state.mixedCase]);
                            state.tokenIndex = 0;//in rules, records whether bracket has been found or not
                        }

                        if (state.tokenIndex===-4) {
                            stream.skipToEnd();
                            return 'MESSAGE';
                        }
                        if (stream.match(/[\p{Z}\s]*->[\p{Z}\s]*/u, true)) {
                            return 'ARROW';
                        }
                        var ch = stream.peek();
                        if (ch === '[' || ch === '|' || ch === ']' || ch==='+') {
                            if (ch!=='+') {
                                state.tokenIndex = 1;
                            }
                            stream.next();
                            stream.match(/[\p{Z}\s]*/u, true);
                            return 'BRACKET';
                        } else {
                            var m = stream.match(/[^\[\|\]\p{Z}\s]*/u, true)[0].trim();

                            if (state.tokenIndex===0&&reg_loopmarker.exec(m)) {
                                return 'BRACKET';
                            } else if (state.tokenIndex == 0 && m.toLowerCase() == 'subroutine') {
                                state.tokenIndex = -4;
                                return 'BRACKET';
                            } else if (state.tokenIndex === 0 && reg_ruledirectionindicators.exec(m)) {
                                stream.match(/[\p{Z}\s]*/u, true);
                                return 'DIRECTION';
                            } else if (state.tokenIndex === 1 && (directions_table.includes(m)) || Object.hasOwn(state.tags, m)) {
                                stream.match(/[\p{Z}\s]*/u, true);
                                return 'DIRECTION';
                            } else {
                                if (state.names.indexOf(m) >= 0) {
                                    if (sol) {
                                        logError('Objects cannot appear outside of square brackets in rules, only directions can.', state.lineNumber);
                                        return 'ERROR';
                                    } else {
                                        stream.match(/[\p{Z}\s]*/u, true);
                                        return 'NAME';
                                    }
                                } else if (m.match(reg_objectnamerel) && (isAlreadyDeclared(state, m) || createObjectRef(state, m))) {
                                    return 'NAME';
                                }
                                
                                m = m.toLowerCase();
                                if (['...', 'rigid', 'random', 'global', 'once'].includes(m)) {
                                    return 'DIRECTION';
                                } else if (m.match(reg_commandwords)) {
                                    if (commandargs_table.includes(m) || twiddleable_params.includes(m)) {
                                        state.tokenIndex=-4;
                                    }
                                    return 'COMMAND';
                                } else {
                                    logError('Name "' + m + '", referred to in a rule, does not exist.', state.lineNumber);
                                    return 'ERROR';
                                }
                            }
                        }

                        break;
                    }
                case 'winconditions': {
                    state.current_line_wip_array = parseWinCondition(stream, state);
                    return flushToken();
                }
                case 'levels': {
                    stream.string = state.mixedCase;
                    state.current_line_wip_array = parseLevel(stream, state);
                    return flushToken();
                }
                        
                default: { 
                    throw 'case!';
                }
	        }
            // end of switch

            if (stream.eol()) {
                return null;
            }

            if (!stream.eol()) {
                stream.next();
                return null;
            }

            // flush token and kind list back to caller -- move it???
            function flushToken() {
                if (state.current_line_wip_array.length > 0) {
                    const token = state.current_line_wip_array.shift();
                    stream.pos = token.pos;
                    return token.kind;
                } else return null;
            }

        },
        startState: function() {
            return {
                objects: {},

                lineNumber: 0,
                commentLevel: 0,  // trigger comment style
                commentStyle: null,

                section: '',  // prelude
                visitedSections: [],

                line_should_end: false,
                line_should_end_because: '',
                sol_after_comment: false,

                objects_candname: '',
                objects_section: 0, //whether reading name/color/spritematrix
                objects_spritematrix: [],

                collisionLayers: [],
                collisionLayerGroups: [],

                tokenIndex: 0,

                current_line_wip_array: [],
                mixedCase: '',

                legend_synonyms: [],
                legend_aggregates: [],
                legend_properties: [],

                sounds: [],
                rules: [],

                names: [],

                winconditions: [],
                metadata: [],
                metadata_lines: {},

                sprite_size: 5,

                case_sensitive: false,

                original_case_names: {},
                original_line_numbers: {},

                abbrevNames: [],

                levels: [[]],

                tags: { // to match P:S
                    directions: [ 'up', 'right', 'down', 'left' ], 
                    horizontal: [ 'right', 'left' ], 
                    vertical: [ 'up', 'down' ], 
                },
                mappings: {},

                subsection: ''
            };
        }
    };
};

window.CodeMirror.defineMode('puzzle', codeMirrorFn);
