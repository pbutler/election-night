var svg = d3.select("body").select("svg")
             //.call(d3.behavior.zoom()
            // .on("zoom", redraw))
            .append("g");

var counties = svg.append("g")
                  .attr("id", "counties");
var states = svg.append("g")
                  .attr("id", "states");
var path = d3.geo.path();


function fill(x) {
    if (x < 50) {
        return fill1(x);
    } else if (x > 50) {
        return fill2(100 - x);
    } else {
        return "white";
	}
}
var fill1 = d3.scale.sqrt()
    .domain([1, 50])
    .range(["firebrick", "#f7e9e9"]);
var fill2 = d3.scale.sqrt()
    .domain([1, 50])
    .range(["steelblue", "#e9e9f7"]);

var data;
var sdata;
var evdata;
var final_results = []

function get_results() {
    console.log("hi");
    d3.json("results.json", function (json) {
        final_results = json.races;
        var states = data.states.forecast[0].states;
        console.log(states);
        for(var i = 0; i < final_results.length; i++) {
            for(var j = 0; j < states.length; j++) {
                if(states[j].state_name.search(final_results[i].state) == 0 || 
                 (states[j].state_name == "District of Columbia"
                  && final_results[i].state == "Dist. of Columbia")) {
                    for (var k = 0; k < final_results[i].candidates.length; k++) {
                        
                        if (final_results[i].candidates[k].winner) {
                            if (final_results[i].candidates[k].lname == "Romney")  {
                                states[j].cur_pct = 0;
                                d3.select("#stats_"+states[j].state_name.split(" ").join("_"))
                                    .attr("class", "romney pct")
                                    .attr("disabled", "true");
                            }
                            if (final_results[j].candidates[k].lname == "Obama") {
                                states[j].cur_pct = 100;
                                d3.select("#stats_"+states[j].state_name.split(" ").join("_"))
                                    .attr("class", "obama pct")
                                    .attr("disabled", "true");
                            }
                            states[j].locked = true;
                        }
                    }
                }
            }
        }
        update();
        //d3.timer(get_results, 60*1000);
    });
    return true;
}

d3.json("us-states.json", function(json) {
    sdata = json;
    d3.text("538.js", function(txt) {
        data = txt.slice(txt.indexOf("(") + 1, txt.indexOf(")"));
        data = JSON.parse(data);
        var forecast = data.states.forecast[0];
        //remove PR
        sdata.features = sdata.features.slice(0, sdata.features.length - 1);
        for(var j = 0; j < sdata.features.length; j++) {
            if (sdata.features[j].properties.name == "Maine") {
                sdata.features[j].properties.name = "Maine Statewide";
            }
            if (sdata.features[j].properties.name == "Nebraska") {
                sdata.features[j].properties.name = "Nebraska Statewide";
            }
        }
        //convert forecast to hash
        for(var i = 0; i < forecast.states.length; i++) {
            var tmp = {};
            for(var j = 0; j < data.states.columns.length; j++) {
                var cname = data.states.columns[j];
                tmp[cname] = forecast.states[i][j];
		if (cname == "dem_win_pct")  {
			tmp["cur_pct"] = forecast.states[i][j];
		}
            }
            forecast.states[i] = tmp;
        }
        evdata = d3.nest().key(function(d) { return d.state_name; })
                          .map(forecast.states);
        update(true);
    });
});

function calculate(x) {
    var edata = d3.entries(evdata);
    var val = Array();
    var val2 = Array();
    for(var j = 0; j < 539; j++) {
    	val[j] = 0.;
    	val2[j] = 0.;
    }

    var p = edata[0].value[0].cur_pct / 100.;
    var ev = edata[0].value[0].electoral_votes;
    val[0] = 1. - p;
    val[ev] = p;
    for(var i = 1; i < edata.length; i++) {
	    p = edata[i].value[0].cur_pct / 100.;
	    ev = edata[i].value[0].electoral_votes;
	    for(var j = 0; j < 539; j++) {
	    	val2[j] = (1. - p) * val[j];
	    }
	    for(var j = 0; j < 539; j++) {
	    	if ((j + ev) >= 539) break;
	    	val2[j + ev] += p * val[j];
	    }
	    var tmp = val;
	    val = val2;
	    val2 = tmp;
    }
    for(var i = 0; i < val.length; i++)  {
        val[i] = {"votes": i, "prob": val[i]};
    }
    return val;
}

function calc_stats(val) {
    var a = 0, b = 0;
    var lowci = -1, highci = -1;
    for(var i = 0; i < val.length; i++)  {
    	a += val[i].prob;
    	b += val[i].votes * val[i].prob;
        if (a > .025 && lowci < 0) lowci = i - 1;
        if (a > .975 && highci < 0) highci = i;
    }
    return [lowci, b, highci];
}
    
//actually returns the last zero
function nonzero(probs) {
    var i,l,h, n = probs.length - 1;
    for (i = 0; i < probs.length; i++) {
        if (probs[i].prob > 1e-4) {
            l = i - 1;
            break;
        }
    }
    for (i = probs.length - 1; i >= 0; i--) {
        if (probs[i].prob > 1e-4) {
            h = i + 1;
            console.log([l, h])
            return [l, h];
        }
    }
}

function redraw() {
  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

var paths;
function update(first) {
    if (first) paths = states.selectAll("path")
                  .data(sdata.features)

    paths.enter().append("path")
         .attr("d", path)

      paths.attr("fill", function(d) { 
          return fill(evdata[d.properties.name][0].cur_pct);
      })
      .attr("stroke", function(d) { 
          if (d.id >= 0) return "#000";
          else if (d.id  < 0) return "rgba(0,0,0,0)";
      });

      var evs = ""; // calculate().toFixed(1);
      var ul = d3.select("body").select("ul.states")
      var li = ul.selectAll("li")
                 .data(d3.entries(evdata)).enter().append("li")
      li.append("div").attr("class", "statename").text(function (d, i) { return d.key; });

     if (first == true) {
         var input = li.append("span")
                       .attr("class", "input-append")
	 input.append("input")
              .attr("id", function(d, i) { 
                  return "stats_"+d.key.split(" ").join("_"); })
              .attr("class", "pct")
              .attr("type", "text")
              //.attr("id", "appendedInput")
              .attr("value", function(d) { return d.value[0].cur_pct.toFixed(1);})
              .on("change", function(d) { d.value[0].cur_pct = parseFloat(this.value); update(); })
         input.append("span").attr("class", "add-on").text("%");
	 li.append("span").html("&nbsp;&nbsp;");
	      /*input = li.append("span")
		       .attr("class", "input-prepend input-append")
	      input.append("span").attr("class", "add-on").html("&plusmn;");
	      
	      input.append("input")
		.attr("name", function(d) { return "ci-"+d[30]+"-stats"; })
		.attr("class", "pctci")
		.attr("type", "text")
		.attr("id", "appendedPrependedInput")
		.attr("value", function(d) { return d.value[0].margin_of_error.toFixed(1);});
	      input.append("span").attr("class", "add-on").text("%");*/
          PG.svg.append("rect")
             .attr("class", "ci")
             .attr("y", 0)
             .attr("height", PG.height);
          PG.svg.append("line")
             .attr("class", "break")
             .attr("x1", PG.x(270) )
             .attr("x2", PG.x(270) )
             .attr("y1", 0)
             .attr("y2", PG.height);
          PG.svg.append("line")
             .attr("class", "lowci")
             .attr("y1", 0)
             .attr("y2", PG.height);
          PG.svg.append("line")
             .attr("class", "highci")
             .attr("y1", 0)
             .attr("y2", PG.height);
          PG.svg.append("path").attr("class", "path");
          PG.svg.append("g").attr("class", "x axis");
          PG.svg.append("g").attr("class", "y axis")
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("%");

         get_results();
     }

     var probs = calculate();
     var stats = calc_stats(probs);
     d3.select("body").select("h2").text("Mean EVs Obama: " + stats[1].toFixed(1)
         + " Romney: " + (538 - stats[1]).toFixed(1));
     console.log(stats);
     probs.forEach(function(d) { d.prob *= 100; });

     var xnoz = -1;
     PG.x.domain(nonzero(probs));
     PG.y.domain([0, d3.max(probs, function(d) { return d.prob; })]);

     PG.svg.select("rect.ci")
        .attr("x", PG.x(stats[0]))
        .attr("width", PG.x(stats[2]) - PG.x(stats[0]) );
     PG.svg.select("line.break").attr("x1", PG.x(270)).attr("x2", PG.x(270));
     PG.svg.select("line.lowci").attr("x1", PG.x(stats[0])).attr("x2", PG.x(stats[0]));
     PG.svg.select("line.highci").attr("x1", PG.x(stats[2])).attr("x2", PG.x(stats[2]));
     PG.svg.select("path")
         .datum(probs)
         .attr("class", "area")
         .attr("d", PG.area);

     PG.svg.select("g.x")
         .attr("transform", "translate(0," + PG.height + ")")
         .call(PG.xAxis);

     PG.svg.select("g.y")
         .call(PG.yAxis)
}

var PG = {};

function init_pg() {
    PG.margin = {top: 20, right: 20, bottom: 30, left: 50};
    PG.width = 400 - PG.margin.left - PG.margin.right;
    PG.height = 300 - PG.margin.top - PG.margin.bottom;
    PG.x = d3.scale.linear().range([0, PG.width]).domain([200,400]);
    PG.y = d3.scale.linear().range([PG.height, 0]).domain([0, 6]);
    PG.xAxis = d3.svg.axis().scale(PG.x).orient("bottom");
    PG.yAxis = d3.svg.axis().scale(PG.y).orient("left");
    PG.area = d3.svg.area().x(function(d, i) { return PG.x(d.votes); })
                           .y0(PG.height)
                           .y1(function(d, i) { return PG.y(d.prob); });
    PG.svg = d3.select("body").select("svg.prob")
                   .attr("width", PG.width + PG.margin.left + PG.margin.right)
                   .attr("height", PG.height + PG.margin.top + PG.margin.bottom)
                 .append("g")
                   .attr("transform", "translate(" + PG.margin.left + "," + PG.margin.top + ")");
    
}

init_pg();



