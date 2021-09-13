/*onmousemove="onMouseMove(event)";
onmousein="onMouseIn()";
onmouseout="onMouseOut()";

var el = document.getElementById("gameCanvas");
if (el.addEventListener) {
    //el.addEventListener("contextmenu", rightClickCanvas, false);
    //el.addEventListener("mousemove", mouseMove, false);
    el.addEventListener("mouseout", onMouseOut, false);
} else {
    el.attachEvent('oncontextmenu', rightClickCanvas);
    el.attachEvent('onmousemove', onMouseMove);
    el.attachEvent('onmousein', onMouseIn);
    el.attachEvent('onmouseout', onMouseOut);
}  
*/