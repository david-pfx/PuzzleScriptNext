var unitTesting=false;
let curLevelNo = 0;
var solvedSections = [];
var curlevelTarget=null;
var hasUsedCheckpoint=false;
var levelEditorOpened=false;
var muted=0;
var runrulesonlevelstart_phase=false;
var ignoreNotJustPressedAction=true;

var verbose_logging=false;
var throttle_movement=false;
var cache_console_messages=false;
var quittingTitleScreen=false;
var quittingMessageScreen=false;

var deltatime=17; // this gets updated every frame; see loop()
var timer=0;
var repeatinterval=150;
var autotick=0;
var autotickinterval=0;
var winning=false;
var againing=false;
var againinterval=150;
var norepeat_action=false;
var oldflickscreendat = [];//used for buffering old flickscreen/scrollscreen positions, in case player vanishes
var keybuffer = [];

var debugSwitch = '';
var showLayers = false;
var showLayerNo = 0;
var defaultDebugMode = false;
var defaultVerboseLogging = false;

var tweeninterval=0;
var tweentimer=0;
var isTweening = false;     // true for tweening not yet complete, to defer againing
var isAnimating = false;    // true for animation/tweening/smoothscreen to keep rendering
var animateinterval=0;

var restarting=false;

var messageselected=false;

var textImages = {};
var initLevel = {};
var curLevel = initLevel;
var suppressInput = false;
