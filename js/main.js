// based on Jason Davies' Marimekko chart http://www.jasondavies.com/mekko/
// based in turn on Mike Bostock's http://bl.ocks.org/1005090

var width = 630,
    height = 450,
    margin = 30,
    color = d3.scale.category10(),
    n = d3.format(",d"),
    p = d3.format("%"),
    i = 0,
    data;

d3.json("data/data-real.json", function(error, jsonData) {
  data = jsonData;
  console.log(jsonData);
  svg.datum({values: nest.entries(data[i])})
    .transition()
    .duration(1000)
    .call(chart);
});

var nest = d3.nest()
    .key(function(d) { return d.market; })
    .key(function(d) { return d.segment; });

var treemap = d3.layout.treemap()
    .mode("slice-dice")
    //.padding(function(d) { return d.depth > 1 ? 2 : 0; })
    .size([width - 3 * margin, height - 2 * margin])
    .children(function(d) { return d.values; })
    .sort(null);

var svg = d3.select("#svg-canvas")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + 2 * margin + "," + margin + ")");

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + treemap.size()[1] + ")")
    .call(d3.svg.axis().scale(d3.scale.linear().range([0, treemap.size()[0]])).tickFormat(d3.format("%")));

svg.append("g")
    .attr("class", "y axis")
    .call(d3.svg.axis().scale(d3.scale.linear().range([treemap.size()[1], 0])).tickFormat(d3.format("%")).orient("left"));

function chart(selection) {
  selection.each(function() {
    var cell = d3.select(this).selectAll("g.cell")
        .data(treemap.nodes);
    var cellEnter = cell.enter().append("g")
        .attr("class", "cell");
    var cellUpdate = d3.transition(cell)
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    d3.transition(cell.exit()).remove();

    cellEnter.filter(function(d) { return d.depth > 2; }).append("rect")
        .style("fill", function(d) { 
          if(d.children) { return null; } else { 
            if(d.segment == "Unused capacity") {
              return "#eee";
            } else if(d.segment == "Water storage") {
              return "#99f";
            }
          }
        });
    cellUpdate.select("rect")
        .attr("width", function(d) { return d.dx; })
        .attr("height", function(d) { return d.dy; })

    cellEnter.append("title")
        .text(function(d) { return d.children ? null : title(d); });
    
    i++;
  });
}

function title(d) {
  return d.segment + ": " + d.parent.key + ": " + n(d.value);
}

function increment() {
  svg.datum({values: nest.entries(data[i])})
      .transition()
      .ease("linear")
      .duration(1000)
      .call(chart);
}

d3.select("body").on("click", function() {
  increment();
});

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