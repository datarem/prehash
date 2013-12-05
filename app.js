/*
* Use kmeans clustering to find dominant image colors and merge them with associated hashtags
* Using graphicsmagick instead of canvas for the fun of it
* Partial node port of http://charlesleifer.com/blog/using-python-and-k-means-to-find-the-dominant-colors-in-images/
* datafile looks like image_url,tag,tag,....\n
*/

var fs = require('fs'),
  gm = require('gm'),
  clusterfck = require('clusterfck'),
  async = require('async');

function calculateCenter(clusters, n) {
  var vals = [];
  for (var i = 0; i < clusters.length; i++) {
  	var rsum = 0;
  	var gsum = 0;
  	var bsum = 0;
    if(clusters[i]) {
  	for (var j = 0; j < clusters[i].length; j++) {
  		rsum += clusters[i][j][0] / clusters[i].length;
  		gsum += clusters[i][j][1] / clusters[i].length;
  		bsum += clusters[i][j][2]/ clusters[i].length;
  	}
  }
  	vals.push([Math.floor(rsum), Math.floor(gsum), Math.floor(bsum)]);
  }
  return vals;
}

function rgbToHex(rgb) {
  function th(i) {
    var h = parseInt(i).toString(16);
    return h.length == 1 ? '0'+h : h;
  }
  return '#' + th(rgb[0]) + th(rgb[1]) + th(rgb[2]);
}
fs.readFile('./urlhashdata.txt', function(err, f){
    // use a queue, else it will try to open thousands of images at once
    var q = async.queue(getValues, 2);
    // assign a callback
    q.drain = function() {
        console.log('all items have been processed');
    }
    var array = f.toString().split('\n');
    for (var i = 0; i < array.length; i++) {
      q.push(array[i]);
    }

});





function getValues(imageMeta, callback) {
  imageMeta = imageMeta.split(',');
  // get only the url and not the following tags
  gm(imageMeta[0])
  .resize(140,140)
  .stream('miff', function (err, stdout, stderr) {
    var bufs = [];
    stdout.on('data', function(d){ bufs.push(d); });
    (function(imageMeta, callback) {
      stdout.on('end', function(){
        var buf = Buffer.concat(bufs);
        var pix = [];
        for (var j = 0; j < buf.length; j += 3) {
          var r = buf[j];
          var g = buf[j+1];
          var b = buf[j+2];
          if(typeof r === 'undefined' || typeof g === 'undefined' || typeof b === 'undefined'){
            // was not divisible by 3
            // dont push to keep the clustering working
          } else {
            pix.push([r,g,b]);
          }
        }
        console.log("Buf" + buf.length);
        console.log("pixs" + pix.length);
        var out = clusterfck.kmeans(pix, 3);
        var centers = calculateCenter(out, 3);
        var output = "";
        for (var j = 0; j < centers.length; j++){
          output += rgbToHex(centers[j]) + ",";
        }
        // remove bad images
        if (output != "#000000,#000000,#000000") {
          imageMeta.shift();
          for (var j = 0; j < imageMeta.length; j++){
            if (j + 1 == imageMeta.length) {
              output += imageMeta[j];
            } else {
              output += imageMeta[j] + ",";
            }
          }
          output += "\n";
          fs.appendFile('./outfile.csv', output, function (err) {
            if(!err)
              console.log("Appended:" + output);
          });
        }

        callback();
      });
  })(imageMeta, callback);
  });
};



