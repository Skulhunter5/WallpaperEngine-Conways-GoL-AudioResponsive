var canvas;

var width, height;

var gridWidth;
var gridHeight;
var cellSize;
var cellPadding = 2;
var grid;

var backgroundColor = [54, 54, 54];
var lowColor = [255, 0, 255];
var highColor = [0, 199, 255];

var currentInterval;

var musicReactive = true;
var audioAmplification = 1;
var mrDirection = 0;
var audioData = [];

var maxDistance;

var startType = 0;
var edgeType = 1;

var generationsPerSecond = 16;
var birth = [3];
var survive = [2, 3];

var debug;

function init() {
   canvas = document.getElementById('canvas');
   initGrid();
   initAudioListener();
   initUserPropertyUpdateHandle();
   setUpdateInterval(generationsPerSecond);
}

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
         if(startType == 0 || startType == 2) // zeros | glider
            grid[x][y] = false;
         else if(startType == 1) // random
            grid[x][y] = Math.random() >= 0.5;
      }
   }
   if(startType == 2) // glider
      grid[20][20] = grid[21][21] = grid[21][22] = grid[20][22] = grid[19][22] = true;

   resizeCanvas();
}

function resizeCanvas() {
   canvas.width = width;
   canvas.height = height;
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

function initUserPropertyUpdateHandle() {
   window.wallpaperPropertyListener = {
      applyUserProperties: function(properties) {
         prop_starttype(properties);
         prop_edgetype(properties);
         prop_color(properties);
         prop_gps(properties);
         prop_mr(properties);
         prop_mr_amp(properties);
         prop_mr_dir(properties);
      }
   }
}

function prop_starttype(properties) {
   if(properties.starttype) {
      let selected = properties.starttype.value;
      if(selected == "empty") startType = 0;
      else if(selected == "random") startType = 1;
      else if(selected == "glider") startType = 2;
      init();
   }
}

function prop_edgetype(properties) {
   if(properties.edgetype) {
      let selected = properties.edgetype.value;
      if(selected == "zeros") edgeType = 0;
      else if(selected == "wrap") edgeType = 1;
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

function setUpdateInterval(generationsPerSecond) {
   if(currentInterval) {
      clearInterval(currentInterval);
   }
   currentInterval = setInterval(function() {
      update();
      draw();
   }, (1 / generationsPerSecond) * 1000);
}

function update() {
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

               if(edgeType == 0) { // zeros
                  if(shiftedX < 0 || shiftedX >= gridWidth || shiftedY < 0 || shiftedY >= gridHeight) continue;
               } else if(edgeType == 1) { // wrap
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

function draw() {
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
