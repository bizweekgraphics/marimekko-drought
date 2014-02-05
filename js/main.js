var width = 630,
    height = 400,
    margin = 20;

var marimekko = new Array();
var reservoirs,
    averages,
    levels;

var startDates = {
  "fitty": 0,
  "five": 568,
  "now": 628 };

var start = startDates.now;
var i = start;
var linger = 0;
var lingerMax = 15;
var milliseconds = 100;
var timer;

var x = d3.scale.linear()
    .range([0, width - 3 * margin]);

var y = d3.scale.linear()
    .range([0, height - 2 * margin])
    .clamp(true);

var colorKey = {
    "Water level": "#99f",
    "Unused capacity": "#eee"
    };

var dateFormatter = d3.time.format("%B %Y");

var n = d3.format(",d"),
    p = d3.format("%");

var svg = d3.select("#svg-canvas")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + 2 * margin + "," + margin + ")");

d3.json("data/reservoirs.json", function(error, reservoirsJson) {
  reservoirs = reservoirsJson;
  d3.json("data/averages.json", function(error, averagesJson) {
    averages = averagesJson;
    d3.json("data/levels-bigdata.json", function(error, levelsJson) {
      levels = levelsJson;
      levels.forEach(function(levelEntry) {
        var dateLevels = new Object();
        dateLevels.date = levelEntry.date;
        dateLevels.month = levelEntry.month;
        dateLevels.values = new Array();
        
        // push two entries for each reservoir
        reservoirs.forEach(function(reservoirEntry) {
          
          // push entry for water level (blue)
          dateLevels.values.push({
            "market": "Water level",
            "segment": reservoirEntry.name,
            "value": levelEntry[reservoirEntry.id] ? levelEntry[reservoirEntry.id] : 0
          });
          
          // push entry for unused capacity (gray)
          dateLevels.values.push({
            "market": "Unused capacity",
            "segment": reservoirEntry.name,
            "value": reservoirEntry.capacity-levelEntry[reservoirEntry.id] ? reservoirEntry.capacity-levelEntry[reservoirEntry.id] : 0
          });
                    
        });
        marimekko.push(dateLevels);
      });
      
      // chart for the first time, including misc drawing setup
      chart(null, marimekko[i].values);
      // begin update loop
      resetInterval();
      
      //JSON.stringify(marimekko[40909]);

    });    
  });
});

function resetInterval() {
  clearInterval(timer);
  timer = setInterval(function(){
    if(i>=marimekko.length) {
      if(linger>=lingerMax) {
        i=start;
        linger=0;
      } else {
        linger++;
      }
    }
    else {
      update(marimekko[i].values);
      i++;      
    }
  },milliseconds);
}

d3.select("#fitty").on("click",function(e) {
  start=startDates.fitty;
  i=start;
  milliseconds=10;
  lingerMax = 150;
  resetInterval();
});

d3.select("#five").on("click",function(e) {
  start=startDates.five;
  i=start;
  milliseconds=100;
  lingerMax = 15;
  resetInterval();
});

d3.select("#now").on("click",function(e) {
  start=startDates.now;
  i=start;
  resetInterval();
});

function chart(error, data) {
  
  d3.select("#date-label").text(dateFormatter(getDateFromExcel(marimekko[i].date)));
  
  var offset = 0;

  // Nest values by segment. We assume each segment+market is unique.
  var segments = d3.nest()
      .key(function(d) { return d.segment; })
      .entries(data);

  // Compute the total sum, the per-segment sum, and the per-market offset.
  // You can use reduce rather than reduceRight to reverse the ordering.
  // We also record a reference to the parent segment for each market.
  var sum = segments.reduce(function(v, p) {
    return (p.offset = v) + (p.sum = p.values.reduceRight(function(v, d) {
      d.parent = p;
      return (d.offset = v) + d.value;
    }, 0));
  }, 0);
  
  /*
  // Add x-axis ticks.
  var xtick = svg.selectAll(".x")
      .data(x.ticks(10))
    .enter().append("g")
      .attr("class", "x")
      .attr("transform", function(d) { return "translate(" + x(d) + "," + y(1) + ")"; });

  xtick.append("line")
      .attr("y2", 6)
      .style("stroke", "#000");

  xtick.append("text")
      .attr("y", 8)
      .attr("text-anchor", "middle")
      .attr("dy", ".71em")
      .text(p);
  */

  // Add y-axis ticks.
  var ytick = svg.selectAll(".y")
      .data(y.ticks(1))
    .enter().append("g")
      .attr("class", "y")
      .attr("transform", function(d) { return "translate(0," + y(1 - d) + ")"; });

  ytick.append("line")
      .attr("x1", -6)
      .style("stroke", "#000");

  ytick.append("text")
      .attr("x", -8)
      .attr("text-anchor", "end")
      .attr("dy", ".35em")
      .text(p);

  // Add a group for each segment.
  var segments = svg.selectAll(".segment")
      .data(segments)
    .enter().append("g")
      .attr("class", "segment")
      .attr("xlink:title", function(d) { return d.key; })
      .attr("transform", function(d) { return "translate(" + x(d.offset / sum) + ")"; });
  
  // Add a rect for each market.
  var markets = segments.selectAll(".market")
      .data(function(d) { return d.values; })
    .enter().append("a")
      .attr("class", "market")
      .attr("xlink:title", function(d) { return d.market + " at " + d.parent.key + " reservoir: " + n(d.value) + " acre-feet"; })
    .append("rect")
      .attr("y", function(d) { return y(d.offset / d.parent.sum); })
      .attr("height", function(d) { return y(d.value / d.parent.sum); })
      .attr("width", function(d) { return x(d.parent.sum / sum); })
      .style("fill", function(d) { return colorKey[d.market]; });
  
  var avgLines = segments
    .append("line")
    .attr("class","avgLines")
    .attr("x1",0)
    .attr("x2",function(d) { return x(d.sum / sum); })
    .attr("y1",function(d) { return y(1-averages[d.key][marimekko[i].month]); })
    .attr("y2",function(d) { return y(1-averages[d.key][marimekko[i].month]); })
    .attr("stroke","#3333ff");
    
}

function update(data) {

  d3.select("#date-label").text(dateFormatter(getDateFromExcel(marimekko[i].date)));

  var offset = 0;

  // Nest values by segment. We assume each segment+market is unique.
  var segments = d3.nest()
      .key(function(d) { return d.segment; })
      .entries(data);

  // Compute the total sum, the per-segment sum, and the per-market offset.
  // You can use reduce rather than reduceRight to reverse the ordering.
  // We also record a reference to the parent segment for each market.
  var sum = segments.reduce(function(v, p) {
    return (p.offset = v) + (p.sum = p.values.reduceRight(function(v, d) {
      d.parent = p;
      return (d.offset = v) + d.value;
    }, 0));
  }, 0);
  
  var markets = svg.selectAll(".market rect")
      .data(data)
      .transition()
      .duration(milliseconds)
      .ease("linear")
      .attr("y", function(d) { return y(d.offset / d.parent.sum); })
      .attr("height", function(d) { return y(d.value / d.parent.sum); })
      .attr("width", function(d) { return x(d.parent.sum / sum); })
      .style("fill", function(d) { return colorKey[d.market]; });
      
  var avgLines = d3.selectAll(".avgLines")
    .transition()
    .duration(milliseconds)
    .ease("linear")
    .attr("y1",function(d) { return y(1-averages[d.key][marimekko[i].month]); })
    .attr("y2",function(d) { return y(1-averages[d.key][marimekko[i].month]); });

}

//////////////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS //////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

// from http://stackoverflow.com/a/326076/120290
function inIframe() {
    try {
        return window.self !== window.top;
    } catch(err) {
        return true;
    }
}

$( document ).ready(function() {  
  if(inIframe()) $("body").addClass("iframed");
});

//////////////////////////////////////////////////////////////////////////////////////////
// DRAWING FUNCTIONS /////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

function drawArrow(parent, from, to, degrees, clockwise) {
  /* 
  PARAMETERS:
    parent:   the svg container or element to which to append the arrow
    from:     the pixel coordinates from which to draw the arrow as an array [x,y], e.g. [100,200]
    to:     works just like {from}
    degrees:   the angle which the arc of the arrow will subtend. 
          90 for a gentle arc, 180 for a bigger swoop.
          beyond 180, it gets gentler again, because of the way SVG computes arc.
          pass 0 or 360 for a straight arrow.
    clockwise:   boolean determining whether arrow will swoop clockwise (true) or counterclockwise (false)
  */
  
  /* 
  FIRST, compute radius of circle from desired degrees for arc to subtend.
    read up:  http://mathworld.wolfram.com/Chord.html
          http://www.wolframalpha.com/input/?i=angle+subtended
    n.b.:  bizweek only uses circular arcs, but SVG allows for any ellipse, so r1 == r2 in SVG path below
        bizweek arrows typically subtend 90 or 180 degrees
  */
  
  // bound acceptable {degrees}, between 1 and 359
  degrees = Math.max(degrees, 1);
  degrees = Math.min(degrees, 359);
  
  // get the chord length ("height" {h}) between points, by pythagorus
  var h = Math.sqrt(Math.pow((to[0]-from[0]),2)+Math.pow((to[1]-from[1]),2));
  
  // get the distance at which chord of height h subtends {angle} degrees
  var radians = degrees * Math.PI/180;
  var d = h / ( 2 * Math.tan(radians/2) );
  
  // get the radius {r} of the circumscribed circle
  var r = Math.sqrt(Math.pow(d,2)+Math.pow((h/2),2));
  
  /*
  SECOND, compose the corresponding SVG arc.
    read up: http://www.w3.org/TR/SVG/paths.html#PathDataEllipticalArcCommands
    example: <path d = "M 200 50 a 90 90 0 0 1 100 0"/>
  */
  var path = "M " + from[0] + " " + from[1] + " a " + r + " " + r + " 0 0 "+(clockwise ? "1" : "0")+" " + (to[0]-from[0]) + " " + (to[1]-from[1]);
  
  // append path to given {parent} (with class .arrow)
  var arrow = parent.append("path")
    .attr("d", path)
    .attr("marker-end", "url(#arrowhead)")
    .attr("class", "arrow");
  
  // return a reference to the appended arrow
  return arrow;
}

//////////////////////////////////////////////////////////////////////////////////////////
// NUMBER FORMATTING /////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

// adapted from d3.formatPrefix
function bbwNumberFormat(dolla) {
  var base = Math.max(1, Math.min(1e12, dolla));
  var scaler = bbwFormatPrefix(base);
  return parseFloat(scaler.scale(dolla).toPrecision(3))+scaler.symbol;
}
var bbw_formatPrefixes = [ "p", "n", "µ", "m", "", "k", "m", "b", "t" ].map(bbw_formatPrefix);
function bbwFormatPrefix(value, precision) {
	var i = 0;
	if (value) {
		if (value < 0) value *= -1;
		if (precision) value = d3.round(value, d3_format_precision(value, precision));
		i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
		i = Math.max(-24, Math.min(24, Math.floor((i <= 0 ? i + 1 : i - 1) / 3) * 3));
	}
	return bbw_formatPrefixes[4 + i / 3];
};
function bbw_formatPrefix(d, i) {
	var k = Math.pow(10, Math.abs(4 - i) * 3);
	return {
		scale: i > 4 ? function(d) {
			return d / k;
		} : function(d) {
			return d * k;
		},
		symbol: d
	};
}

// Convert Excel dates into JS date objects
// @author https://gist.github.com/christopherscott/2782634
// @param excelDate {Number}
// @return {Date}
function getDateFromExcel(excelDate) {
  // 1. Subtract number of days between Jan 1, 1900 and Jan 1, 1970, plus 1 (Google "excel leap year bug")             
  // 2. Convert to milliseconds.
	return new Date((excelDate - (25567 + 1))*86400*1000);
}