socket = io()

var width = window.innerWidth;
var height = window.innerHeight;

var stage = new Konva.Stage({
  container: 'container',
  width: width,
  height: height,
  x: 0,
  y: 0,
});

var layer = new Konva.Layer({
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});
stage.add(layer);

var group = new Konva.Group({
  x: 0,
  rotation: 0,
  scaleX: 1,
});
layer.add(group);
layer.draw();


socket.on('connected', e => {
    console.log(`${e} has connected.`)
})

socket.on('disconnected', e => {
    console.log(`${e} has disconnected.`)
})



// this function will return pointer position relative to the passed node
function getRelativePointerPosition(node) {
  var transform = node.getAbsoluteTransform().copy();
  // to detect relative position we need to invert transform
  transform.invert();

  // get pointer (say mouse or touch) position
  var pos = node.getStage().getPointerPosition();

  // now we can find relative point
  return transform.point(pos);
}

stage.on('mousemove', function () {
  var pos = getRelativePointerPosition(group);
  var shape = new Konva.Circle({
    x: pos.x,
    y: pos.y,
    fill: 'red',
    radius: 20,
  });

  group.add(shape);
  layer.batchDraw();
});