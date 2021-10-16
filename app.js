// DOM elements
var canvas;
var button_clear;
var button_togglestate;
var button_step;

// Sizes
var width, height;

var gridWidth;
var gridHeight;
var cellSize;
var cellPadding = 2;

// Grid
var grid;

// Colors
var backgroundColor = [54, 54, 54];
var lowColor = [255, 0, 255];
var highColor = [0, 199, 255];

// Internal
var currentInterval;

// Audio
var musicReactive = true;
var audioAmplification = 1;
var mrDirection = 0;
var audioData = [];

// Gradient
var maxDistance;

// Behavior
var startgrid = 0;
var edgewrap = false;
var generationsPerSecond = 16;

// Rule
var customrule = "B2/S23";
var birth = [3];
var survive = [2, 3];

// Drawing
var draw = false;
var drawGrid;

// Controls
var paused = false;

// Control buttons
var showButtons = [];

// Debug
var debug;

/*

      EXTERNAL FUNCTIONS

*/

function init() {
   canvas = document.getElementById('canvas');
   
   button_clear = document.getElementById('button_clear');
   button_togglestate = document.getElementById('button_togglestate');
   button_step = document.getElementById('button_step');

   initGrid();
   initAudioListener();
   initUserPropertyUpdateHandle();
   initMouseListener();
   setUpdateInterval(generationsPerSecond);
}

function toggleState() {
   paused = !paused;
   button_togglestate.innerText = paused ? "Play" : "Pause";
}

function step() {
   update(true);
   render();
}

/*

      INTERNAL FUNCTIONS

*/

function initGrid() {
   width = document.body.clientWidth;
   height = document.body.clientHeight;

   if(mrDirection == 0 || mrDirection == 1) {
      gridWidth = 128;
      cellSize = width / gridWidth;
      gridHeight = Math.round(height / cellSize);
   } else if(mrDirection == 2 || mrDirection == 3) {
      gridHeight = 128;
      cellSize = height / gridHeight;
      gridWidth = Math.round(width / cellSize);
   }

   maxDistance = Math.sqrt(gridWidth*gridWidth + gridHeight*gridHeight);

   grid = [];
   for(var x = 0; x < gridWidth; x++) {
      grid[x] = [];
      for(var y = 0; y < gridHeight; y++) {
         if(startgrid == 0) // empty
            grid[x][y] = false;
         else if(startgrid == 1) // random
            grid[x][y] = Math.random() >= 0.5;
      }
   }

   resizeCanvas();
}

function resizeCanvas() {
   canvas.width = width;
   canvas.height = height;
}

function clearGrid() {
   for(var x = 0; x < gridWidth; x++) {
      for(var y = 0; y < gridHeight; y++) {
         grid[x][y] = false;
      }
   }
}

function initAudioListener() {
   window.wallpaperRegisterAudioListener(audioListener);
}

function audioListener(audioArray) {
   audioData = []
   for(var i = 64; i < audioArray.length; i++) {
      audioData.push(amplify(audioArray[i - 64]));
      audioData.push(amplify(audioArray[i]));
   }
}

function amplify(x) {
   return Math.min(Math.pow(Math.round(x * 100000) / 100000, 1 / audioAmplification));
}

function initMouseListener() {
   document.body.addEventListener("mousedown", mouseListener);
   document.body.addEventListener("mouseup", mouseListener);
   document.body.addEventListener("mousemove", mouseListener);
}

var mousedown = false;
var mouseX = 0;
var mouseY = 0;
function mouseListener(event) {
   if(event.type == "mousedown") {
      let targetId = event.target.id;
      if(targetId != "canvas") return;

      if(event.button == 0) {
         mousedown = true;
         if(draw) {
            let x = Math.floor(event.clientX / cellSize);
            let y = Math.floor(event.clientY / cellSize);
            drawCell(x, y);
         }
      }
   } else if(event.type == "mouseup") {
      if(event.button == 0) mousedown = false;
   } else if(event.type == "mousemove") {
      if(draw && mousedown) {
         let x = Math.floor(event.clientX / cellSize);
         let y = Math.floor(event.clientY / cellSize);
         drawCell(x, y);
      }
      mouseX = event.clientX;
      mouseY = event.clientY;
   }
}

/*

   Drawing functions

*/

function drawCell(x, y) {
   if(paused) grid[x][y] = true;
   else drawGrid[x][y] = true;
}

/*
   UserProperty functions
*/

function initUserPropertyUpdateHandle() {
   window.wallpaperPropertyListener = {
      applyUserProperties: function(properties) {
         prop_rule(properties);
         prop_rulestring(properties);
         prop_startgrid(properties);
         prop_edgewrap(properties);
         prop_color(properties);
         prop_gps(properties);
         prop_mr(properties);
         prop_mr_amp(properties);
         prop_mr_dir(properties);
         prop_draw(properties);
         prop_controls(properties);
      }
   }
}

var rules = {
   "conways_gol": "B3/S23", // Conway's Game of Life
   "replicator": "B1357/S1357", // Replicator
   "fredkin": "B1357/S02468", // Fredkin
   "seeds": "B2/S", // Seeds
   "lfod": "B2/S0", // Live Free or Die
   "lwd": "B3/S012345678", // Life without Death
   "flock": "B3/S12", // Flock
   "maze": "B3/S12345", // Maze
   "maze_ctric": "B3/S1234", // Mazectric
   "2b2": "B36/S125", // 2x2
   "highlife": "B36/S23", // HighLife
   "move": "B368/S245", // Move
   "dan": "B3678/S34678", // Day & Night
   "drylife": "B37/S23", // DryLife
   "pl": "B38/S23", // Pedestrian Life
}
function prop_rule(properties) {
   if(properties.rule) {
      let rule = properties.rule.value;
      if(rule == "custom") applyRulestring(customrule);
      else {
         let rs = rules[rule];
         if(rs) applyRulestring(rs);
         else applyRulestring(customrule);
      }
   }
}

function prop_rulestring(properties) {
   if(properties.rulestring) {
      customrule = properties.rulestring.value;
      applyRulestring(customrule);
   }
}

function applyRulestring(rulestring) {
   let reg = rulestring.match(/B([0-9]*)\/S([0-9]*)/);
   if(reg) {
      birth = reg[1].split('').map(function(c) { return parseInt(c); });
      survive = reg[2].split('').map(function(c) { return parseInt(c); });
   } else birth = survive = [];
}

function prop_startgrid(properties) {
   if(properties.startgrid) {
      let selected = properties.startgrid.value;
      if(selected == "empty") startgrid = 0;
      else if(selected == "random") startgrid = 1;
      init();
   }
}

function prop_edgewrap(properties) {
   if(properties.edgewrap) {
      edgewrap = properties.edgewrap.value;
   }
}

function prop_color(properties) {
   if(properties.color_low) {
      let color = properties.color_low.value.split(' ');
      color = color.map(function(c) {
         return Math.ceil(c * 255);
      });
      lowColor = color;
   }
   if(properties.color_high) {
      let color = properties.color_high.value.split(' ');
      color = color.map(function(c) {
         return Math.ceil(c * 255);
      });
      highColor = color;
   }
   if(properties.color_bg) {
      let color = properties.color_bg.value.split(' ');
      color = color.map(function(c) {
         return Math.ceil(c * 255);
      });
      backgroundColor = color;
   }
}

function prop_gps(properties) {
   if(properties.gps) {
      setUpdateInterval(properties.gps.value);
   }
}

function prop_mr(properties) {
   if(properties.mr) {
      musicReactive = properties.mr.value;
   }
}

function prop_mr_amp(properties) {
   if(properties.mr_amp) {
      audioAmplification = properties.mr_amp.value;
   }
}

function prop_mr_dir(properties) {
   if(properties.mr_dir) {
      let selected = properties.mr_dir.value;
      let prev = mrDirection;
      if(selected == "up") mrDirection = 0;
      else if(selected == "down") mrDirection = 1;
      else if(selected == "right") mrDirection = 2;
      else if(selected == "left") mrDirection = 3;
      if(((mrDirection == 0 || mrDirection == 1) && (prev == 2 || prev == 3)) || ((mrDirection == 2 || mrDirection == 3) && (prev == 0 || prev == 1))) initGrid();
   }
}

function prop_draw(properties) {
   if(properties.draw) {
      let prev = draw;
      draw = properties.draw.value;
      if(draw && !prev) {
         drawGrid = [];
         for(var x = 0; x < gridWidth; x++) {
            drawGrid[x] = [];
            for(var y = 0; y < gridHeight; y++) {
               drawGrid[x][y] = false;
            }
         }
      } else if(prev && !draw) {
         drawGrid = undefined;
      }
   }
}

function prop_controls(properties) {
   if(properties.controls) {
      let display = properties.controls.value ? "block" : "none";
      button_clear.style.display = display;
      button_togglestate.style.display = display;
      button_step.style.display = display;
   }
}

/*
   Simulation functions
*/

function setUpdateInterval(generationsPerSecond) {
   if(currentInterval) {
      clearInterval(currentInterval);
   }
   currentInterval = setInterval(function() {
      update();
      render();
   }, (1 / generationsPerSecond) * 1000);
}

function update(force=false) {
   if(paused && !force) return;
   advanceGeneration();
   if(musicReactive) fillGridWithMusicData();
}

function advanceGeneration() {
   let next = [];
   for(var x = 0; x < gridWidth; x++) {
      next[x] = [];
      for(var y = 0; y < gridHeight; y++) {
         next[x][y] = grid[x][y];
      }
   }

   for(var x = 0; x < gridWidth; x++) {
      for(var y = 0; y < gridHeight; y++) {
         let neighbors = 0;
         for(var xOffset = -1; xOffset <= 1; xOffset++) {
            for(var yOffset = -1; yOffset <= 1; yOffset++) {
               let shiftedX = x + xOffset;
               let shiftedY = y + yOffset;

               if(x == shiftedX && y == shiftedY) continue;

               if(edgewrap == 0) { // zeros
                  if(shiftedX < 0 || shiftedX >= gridWidth || shiftedY < 0 || shiftedY >= gridHeight) continue;
               } else if(edgewrap == 1) { // wrap
                  shiftedX = mod(shiftedX, gridWidth);
                  shiftedY = mod(shiftedY, gridHeight);
               }
               
               if(grid[shiftedX][shiftedY]) neighbors++;
            }
         }
         if(!grid[x][y] && birth.includes(neighbors)) {
            next[x][y] = true;
         }
         else if(grid[x][y] && !survive.includes(neighbors)) {
            next[x][y] = false;
         }
      }
   }

   grid = next;

   if(draw) {
      for(var x = 0; x < gridWidth; x++) {
         for(var y = 0; y < gridHeight; y++) {
            if(drawGrid[x][y]) {
               grid[x][y] = true;
               drawGrid[x][y] = false;
            }
         }
      }
   }
}

function fillGridWithMusicData() {
   if(mrDirection == 0 || mrDirection == 1) {
      for(var x = 0; x < audioData.length; x++) {
         let start = 0;
         let end = Math.round(Math.min(audioData[x] * gridHeight, gridHeight));
         if(mrDirection == 0) {
            start = gridHeight - end;
            end = gridHeight;
         }
         for(var y = start; y < end; y++) {
            grid[x][y] = true;
         }
      }
   } else if(mrDirection == 2 || mrDirection == 3) {
      for(var y = 0; y < audioData.length; y++) {
         let start = 0;
         let end = Math.round(Math.min(audioData[y] * gridWidth, gridWidth));
         if(mrDirection == 3) {
            start = gridWidth - end;
            end = gridWidth;
         }
         for(var x = start; x < end; x++) {
            grid[x][y] = true;
         }
      }
   }
}

function mod(a, b) {
   return a == b ? 0 : a == -1 ? b - 1 : a % b;
}

function render() {
   let ctx = canvas.getContext('2d');

   ctx.clearRect(0, 0, width, height);
   ctx.fillStyle = `rgba(${backgroundColor.join(',')})`;
   ctx.fillRect(0, 0, width, height);

   if(canvas.getContext) {
      for(var x = 0; x < gridWidth; x++) {
         for(var y = 0; y < gridHeight; y++) {
            if(!grid[x][y]) continue;

            let xPos = (cellSize * x) + cellPadding;
            let yPos = (cellSize * y) + cellPadding;
            let drawSize = cellSize - cellPadding * 2;

            let color = getLerpedColor(x, y);
            color.push(1);

            ctx.fillStyle = `rgba(${color.join(',')})`;
            ctx.fillRect(xPos, yPos + cellPadding, drawSize, drawSize);
         }
      }
      //ctx.fillText(debug, 50, 100);
   }
}

function getLerpedColor(x, y) {
   let dist = distance(x, y, 0, gridHeight - 1);
   let d = dist / maxDistance;
   return [lerp(lowColor[0], highColor[0], d), lerp(lowColor[1], highColor[1], d), lerp(lowColor[2], highColor[2], d)];
}

function lerp(a, b, d) {
   return a + (b - a) * d;
}

function distance(x1, y1, x2, y2) {
   let x = x2 - x1;
   let y = y2 - y1;
   return Math.sqrt(x*x + y*y);
}
