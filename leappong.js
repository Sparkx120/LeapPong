'use strict'
class Ball {
  constructor(args){
    this.x     = args.x;
    this.y     = args.y;
    this.rad   = args.rad;
    this.vec   = args.vec;
    this.color = "rgba(0,0,0,1)";
  }
  
  timeStep(){
    this.x = this.x+this.vec.x;
    this.y = this.y+this.vec.y;
  }
  
  drawable(ctx){
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.rad, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 0;
    ctx.strokeWidth = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.stroke();
  }
}

class Paddle {
  constructor(args){
    this.length    = 150;
    this.width     = 10;
    this.x         = args.x;
    this.y         = args.y;
    this.totalH    = args.totalH;
    this.direction = 0;
    this.speed     = args.speed;
    this.color     = "rgba(0,0,0,1)";
  }
  
  timeStep(){
    if(this.y > 0 && this.direction < 0)
      this.y += this.direction*this.speed;
    else if(this.y < this.totalH-this.length && this.direction > 0)
      this.y += this.direction*this.speed;
  }
  
  drawable(ctx){
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x,this.y,this.width,this.length);
  }
}

class Canvas {
  constructor(args){
    this.canvasElem = args.canvasElem;
    this.ctx = args.canvasElem.getContext('2d');
    this.rect = this.canvasElem.getBoundingClientRect();
    this.width = this.rect.width;
    this.height = this.rect.height;
    this.canvasElem.width = this.width;
    this.canvasElem.height = this.height;
    this.backgroundColor = args.backgroundColor;
    this.forgroundColor = args.forgroundColor;
  }
  
  clear(){
    this.ctx.beginPath();
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0,0,this.width,this.height);
    this.ctx.strokeStyle = this.forgroundColor;
    this.ctx.strokeWidth = 2;
    this.ctx.rect(0,0,this.width,this.height);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2,0);
    this.ctx.lineTo(this.width/2,this.height);
    this.ctx.stroke();
  }
}

class Controller{
  constructor(args){
    this.sampleFreq = args.sampleFreq;
    this.timestamp = Date.now();
    this.direction = 0;
    this.up = false;
    this.down = false;
    
    this.intervalFunc = (now)=>{
      if((now - this.timestamp) > this.sampleFreq){
        this.direction = 0;
      }
    };
  }
}

class KeyboardController extends Controller{
  constructor(args){
    super(args);
    console.log(this.direction);
    document.onkeypress = (e)=>{
      e = e || window.event;
      var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
      if (charCode) {
        if(charCode == 119){ //'w'
          this.direction = -1;
          this.timestamp = Date.now();
        }
        if(charCode == 115){ //'s'
          this.direction = 1;
          this.timestamp = Date.now();
        }
      }
    };
  }
}

class LeapController extends Controller{
  constructor(args){
    super(args);
    
    const controllerOptions = {enableGestures: true};
    let setDirection = (dir) => {
                         this.direction = dir
                         this.timestamp = Date.now();
                        };
    
    //console.log("Starting Loop");
    Leap.loop(controllerOptions, function(frame) {
      //var interactionBox = frame.interactionBox;
      
      if (frame.hands.length > 0) {
        for (let i = 0; i < frame.hands.length; i++) {
          let hand = frame.hands[i];
          if(hand.indexFinger.extended){
            let nameMap = ["thumb", "index", "middle", "ring", "pinky"];
            let pointer = null;
            hand.pointables.forEach(function(pointable){
              if(nameMap[pointable.type] == "index") pointer = pointable;
            });
            if(pointer){
              let direction = pointer.direction;
              if(direction[1] > 0.3){
                setDirection(-1);
              }
              if(direction[1] < -0.3){
                setDirection(1);
              }
            }
          }
        }
      }
    });
  }
  
}

class AIController extends Controller{
  constructor(args){
    super(args);
    this.ball   = args.ball;
    this.paddle = args.paddle;
    
    this.interval = setInterval(()=>{
      let top = this.paddle.y + this.paddle.length/2 - 25;
      let bottom = this.paddle.y + this.paddle.length/2 + 25;
      
      if(top < this.ball.y){
        //console.log("moving down");
        this.direction = 1;
        this.timestamp = Date.now();
      }
      if(bottom > this.ball.y){
        //console.log("moving usp");
        this.direction = -1;
        this.timestamp = Date.now();
      }
      
      if(top > this.ball.y && bottom < this.ball.y){
        this.direction = 0;
        this.timestamp = Date.now();
      }
    },this.sampleFreq);
  }
}

class Pong {
  constructor(canvas){
    this.framerate       = 20;
    this.inPlay          = true;
    this.canvas          = new Canvas({canvasElem:canvas,
                                       backgroundColor: "rgba(255,255,255,1)",
                                       forgroundColor: "rgba(0,0,0,1)"
                           });
    
    this.ball            = new Ball({x:this.canvas.width/2,
                                      y:this.canvas.height/2,
                                      rad:10,
                                      vec:{x:5,y:0},
                                      color:"rgba(0,0,0,1)"
                           });
    
    this.leftPaddle      = new Paddle({x:10,
                                       y:(canvas.height/2)-50,
                                       speed: 4,
                                       totalH: this.canvas.height
                           });
    
    this.rightPaddle     = new Paddle({x:canvas.width-20,
                                       y:(canvas.height/2)-50,
                                       speed: 4,
                                       totalH: this.canvas.height
                           });
    
    this.leftController  = new AIController({sampleFreq: this.framerate,
                                             ball: this.ball, 
                                             paddle: this.leftPaddle
                           });
    
    this.rightController = new LeapController({sampleFreq: this.framerate});
    
    
    this.interval = setInterval(()=>{
      if(this.inPlay)
        this.gameStep();
    },this.framerate);
  }
  
  gameStep(){
    let now = Date.now();
    
    this.leftController.intervalFunc(now);
    this.rightController.intervalFunc(now);
    
    this.leftPaddle.direction = this.leftController.direction;
    this.rightPaddle.direction = this.rightController.direction;
    
    this.ball.timeStep();
    this.leftPaddle.timeStep();
    this.rightPaddle.timeStep();
    
    //Handle Wall Collisions
    if(this.ball.x < 0 + this.ball.rad){
      //right player loss
      this.ball.x = this.canvas.width/2;
      this.ball.y = this.canvas.height/2;
      this.ball.vec = {x:5,y:0}
    }
    
    if(this.ball.x > this.canvas.width - this.ball.rad){
      //left player loss
      this.ball.x = this.canvas.width/2;
      this.ball.y = this.canvas.height/2;
      this.ball.vec = {x:-5,y:0}
    }
    
    if(this.ball.y < 0 + this.ball.rad){
      //bounce mirror
      this.ball.vec.y = -this.ball.vec.y;
    }
    
    if(this.ball.y > this.canvas.height - this.ball.rad){
      //bounce mirror
      this.ball.vec.y = -this.ball.vec.y;
    }
    
    //Handle Paddle Collisions
    if((this.ball.x < this.leftPaddle.x + this.leftPaddle.width + this.ball.rad) &&
       (this.ball.y > this.leftPaddle.y && this.ball.y < this.leftPaddle.y + this.leftPaddle.length)){
      //bounce
      this.ball.vec.x = -this.ball.vec.x
      let yreflectmod = this.ball.y - (this.leftPaddle.y + this.leftPaddle.length/2);
      if(yreflectmod > 2){ //Dumb angle calulation
        yreflectmod = 2;
      } 
      if(yreflectmod < -2){
        yreflectmod = -2;
      }
      this.ball.vec.y = this.ball.vec.y + yreflectmod; 
    }
    
    if((this.ball.x > this.rightPaddle.x - this.ball.rad) && 
       (this.ball.y > this.rightPaddle.y && this.ball.y < this.rightPaddle.y + this.rightPaddle.length)){
      //bounce
      this.ball.vec.x = -this.ball.vec.x
      let yreflectmod = this.ball.y - (this.rightPaddle.y + this.rightPaddle.length/2);
      if(yreflectmod > 2){ //Dumb angle calculation
        yreflectmod = 2;
      } 
      if(yreflectmod < -2){
        yreflectmod = -2;
      }
      this.ball.vec.y = this.ball.vec.y + yreflectmod; 
    }
    
    this.canvas.clear();
    this.ball.drawable(this.canvas.ctx);
    this.leftPaddle.drawable(this.canvas.ctx);
    this.rightPaddle.drawable(this.canvas.ctx);
    
  }
}

function vectorToString(vector, digits) {
  if (typeof digits === "undefined") {
    digits = 1;
  }
  return "(" + vector[0].toFixed(digits) + ", "
             + vector[1].toFixed(digits) + ", "
             + vector[2].toFixed(digits) + ")";
}

(()=>{
   new Pong(document.getElementById("canvas"));
})();