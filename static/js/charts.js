/*COLOR LIST*/
var color = ["#8FBC8F", "#6B8E23", "#7D0552", "#DDA0DD", "#527D1A", "#00FF00", "#E0FFFF", "#6A287E", "#5FF5AA",
    "#23C260", "#BA55D3", "#DC143C", "#CD5C5C", "#4682B4", "#ADFF2F", "#577D57", "#D2691E", "#FF6347", "#CEED72",
    "#4E387E", "#FFD700", "#9172EC", "#90EE90", "#B8860B", "#808000", "#9ACD32", "#C12283", "#A74AC7", "#F9A7B0",
    "#FFA07A", "#7B68EE", "#8DC3C4", "#3CB371", "#F535AA", "#B0C4DE", "#C5908E", "#708090", "#23C27D", "#F4A460",
    "#9400D3", "#FAAFBE", "#66CDAA", "#79CF2D", "#E9967A", "#BDB76B", "#F660AB", "#D462FF", "#69C74A", "#EEE8AA",
    "#36F57F", "#FF7F50", "#6495ED", "#8BFF61", "#20B2AA", "#483D8B", "#842DCE", "#C12267", "#677D37", "#E3E4FA",
    "#7F4E52", "#000080", "#461B7E", "#8A2BE2", "#DB7093", "#F52887", "#7E587E", "#5E5A80", "#800000", "#8B4513",
    "#F778A1", "#006400", "#3C7D28", "#BC8F8F", "#87CEEB", "#FF8C00", "#C6AEC7", "#008B8B", "#8467D7", "#571B7E",
    "#FF5733", "#771D81", "#83C8D9"
];
var MAP_COLORS = {};

$(function() {
    // Menu buttons
    $("#select_sankey").on("click", function() {
        $("#select_sankey").removeClass("inactive-button");
        $("#select_stacked_bar").addClass("inactive-button");
        $("#select_map").addClass("inactive-button");
        $("#sankey_panel").css("display", "block");
        $("#stacked_bar_panel").css("display", "none");
        $("#map_panel").css("display", "none");
        get_sankey_diagram_data();
    });

    $("#select_stacked_bar").on("click", function() {
        $("#select_sankey").addClass("inactive-button");
        $("#select_stacked_bar").removeClass("inactive-button");
        $("#select_map").addClass("inactive-button");
        $("#sankey_panel").css("display", "none");
        $("#stacked_bar_panel").css("display", "block");
        $("#map_panel").css("display", "none");
        get_stacked_bar_chart_data();
    });

    $("#select_map").on("click", function() {
        $("#select_sankey").addClass("inactive-button");
        $("#select_stacked_bar").addClass("inactive-button");
        $("#select_map").removeClass("inactive-button");
        $("#sankey_panel").css("display", "none");
        $("#stacked_bar_panel").css("display", "none");
        $("#map_panel").css("display", "block");
        get_map_chart_data();
    });

    // Sankey diagram filter panel
    $('#clear_sankey_filters').on('click', function() {
        $("#Year").val($("#Year").data("default"));
        $("#Month").val($("#Month").data("default"));
        $("#Operator").val($("#Operator").data("default"));
        $("#Direction").val($("#Direction").data("default"));
        get_sankey_diagram_data();
    });
    $('#Year, #Month, #Operator, #Direction').on('change', function() {
        if ($("#Year").val() != $("#Year").data("default")) {
            $("#Month").prop('disabled', false);
        }
        else {
            $("#Month").prop('disabled', 'disabled');
            $("#Month").val($("#Month").data("default"));
        }
        get_sankey_diagram_data();
    });

    // Stacked bar chart filter panel
    $('#clear_stacked_filters').on('click', function() {
        $("#Port").val($("#Port").data("default"));
        $("#Bert").val($("#Bert").data("default"));
        $("#Direction2").val($("#Direction2").data("default"));
        get_stacked_bar_chart_data();
    });
    $('#Bert, #Direction2').on('change', function() {
        get_stacked_bar_chart_data();
    });
    $('#Port').on('change', function() {
        $.ajax({
            url: "/update_berts_list",
            type: "GET",
            data: {
                port: $("#Port :selected").text()
            },
            success: function(data) {
                $("#Bert > option").remove();
                $("#Bert").append("<option>" + $("#Bert").data("default") + "</option>");
                $.each(data.berts, function(d) {
                    $("#Bert").append("<option>" + d + "</option>");
                });
            }
        });
        get_stacked_bar_chart_data();
    });
    get_sankey_diagram_data();

});

// Update sankey diagram
function get_sankey_diagram_data() {
    $.ajax({
        url: "/sankey_filter",
        type: "GET",
        data: {
            year: $("#Year :selected").text(),
            month: $("#Month :selected").text(),
            operator: $("#Operator :selected").text(),
            direction: $("#Direction :selected").text()
        },
        success: function(data) {
            $(".tooltip").remove();
            $(".sankey").remove();
            if (data.nodes != 0 && data.links != 0) {
                render_sankey_chart(data);
            } else {
                $('#noDataModal').modal("show");
            }
        }
    });
}

// Update stacked bar chart
function get_stacked_bar_chart_data() {
    $.ajax({
        url: "/stacked_bar_filter",
        type: "GET",
        data: {
            port: $("#Port :selected").text(),
            direction: $("#Direction2 :selected").text(),
            bert: $("#Bert :selected").text()
        },
        success: function(data) {
            $(".tooltip").remove();
            $(".stacked_bar").remove();
            if (data != 0) {
                render_stacked_bar(data.data, data.all_shipment, data.shortMonths, data.title);
            } else {
                $('#noDataModal').modal("show");
            }
        }
    });
}

// Update map
function get_map_chart_data(){
    $.ajax({
        url: "/map_filter",
        type: "GET",
        success: function(data) {
            $(".tooltip").remove();
            $(".map").remove();
            if (data != 0) {
                render_map(data.map_data, data.ports_geo_data, data.one_port_pie_data, data.pie_data);
                render_main_pie_chart(data.pie_data);
                for(i=0; i < data.pie_data.length; i++){
                    MAP_COLORS[data.pie_data[i].shipment] = color[i]
                }
            } else {
                $('#noDataModal').modal("show");
            }
        }
    });
}


/* SANKEY DIAGRAM: START */
function render_sankey_chart(data) {
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = $('#sankey_chart').width() - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

    var isIE = /*@cc_on!@*/false || !!document.documentMode;   // At least IE6
    if (isIE) {
        $('#sankey_chart').css('height', 700);
        $('#sankey_chart').css('width', 700)
    }

    var formatNumber = d3.format(",.3f"),    // zero decimal places
        format = function(d) { return formatNumber(d); },
        color = d3.scale.category20();

    // append the svg canvas to the page
    var svg = d3.select("#sankey_chart").append("svg").classed('sankey', true)
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .attr("preserveAspectRatio", "xMidYMid")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Set the sankey diagram properties
    var sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(20)
        .size([width, height]);

    var path = sankey.link();

    // load the data
    sankey
        .nodes(data.nodes)
        .links(data.links)
        .layout(32);

    // Define the div for the tooltip
    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // add in the links
    var phrase = "empty for now";
    var link = svg.append("g").selectAll(".link")
        .data(data.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("value", function(d) { return d.value; })
        .attr("port", function(d) {return d.source;})
        .attr("shipment", function(d) {return d.target;})
        .attr("d", path)
        .attr("stroke", function(d,i) { return d.color = color(i); })
        .attr("stroke-opacity", "0.2")
        .attr("fill", "none")
        .on("mousemove", function(d){
            div.transition().duration(200).style("opacity", .9);
            div.html([
                    "<strong>" + data.popup,
                    parseFloat($(this).attr("value")).toLocaleString('en-US') + "</strong><br>",
                ].join(''))
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            div.transition().duration(300).style("opacity", 0);
        })
        .on("mouseleave", function(d) {
            div.transition().duration(300).style("opacity", 0);
        })
        .style("stroke-width", function(d) {return Math.max(1.8, d.dy); })
        .sort(function(a, b) {return b.dy - a.dy; });

    // add in the nodes
    var node = svg.append("g").selectAll(".node")
        .data(data.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")"; })
        .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() {
            this.parentNode.appendChild(this); })
        .on("drag", dragmove));

    // add the rectangles for the nodes
    node.append("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) {
            return d.color = color(d.name.replace(/ .*/, "")); })
        .style("stroke", function(d) {
            return d3.rgb(d.color).darker(2); })
        .append("title")
        .text(function(d) {
            return d.name + "\n" + format(d.value); });

    // add in the title for the nodes
    node.append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
        .attr("x", 6 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    // the function for moving the nodes
    function dragmove(d) {
        d3.select(this).attr("transform",
            "translate(" + d.x + "," + ( d.y = Math.max(0, Math.min(height - d.dy, d3.event.y)) ) + ")");
        sankey.relayout();
        link.attr("d", path);
    }
}
/* SANKEY DIAGRAM: END */

/* STACKED BAR CHART: START */
function render_stacked_bar(data, all_shipment, shortMonths, title) {
    var myFormatters = d3.locale({
        "decimal": ".",
        "thousands": ",",
        "grouping": [3],
        "currency": ["$", ""],
        "dateTime": "%a %b %e %X %Y",
        "date": "%m/%d/%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "shortMonths": shortMonths
    });
    d3.time.format = myFormatters.timeFormat;

    var main_height = 700,
        bottom_height = 70,
        margin = {top: 10, right: 30, bottom: 100, left: 55},
        margin2 = {top: main_height-bottom_height, right: 30, bottom: 20, left: 55},
        width = $('#stached_bar_chart').width() - margin.left - margin.right,
        height = main_height - margin.top - margin.bottom,
        height2 = main_height - margin2.top - margin2.bottom;

    var parseDate = d3.time.format("%m/%Y").parse;

    var colors = d3.scale.category20b().domain(all_shipment);

    data.forEach(function(d) {
        var y0 = 0;
        d.column = d.values.map(function(u) { return {name: u.name, y0: y0, y1: y0 += +u.value, date: parseDate(d.date), value: u.value}; });
        d.total = d.column.length != 0 ? d.column[d.column.length - 1].y1 : 0;
        return {date: d.date, column: d.column, total: d.total};
    });
    data = data.map(function(d) {
        d.date = parseDate(d.date);
        return d;
    });

    var x = d3.time.scale().range([0, width]),
        x2 = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]),
        y2 = d3.scale.linear().range([height2, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format("%b %Y")),
        xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickFormat(d3.time.format("%b %Y")),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var area = d3.svg.area()
        .interpolate("monotone")
        .x(function (d) { return x(d.date); })
        .y0(height)
        .y1(function (d) {return y(d.total); });

    var area2 = d3.svg.area()
        .interpolate("monotone")
        .x(function (d) { return x2(d.date); })
        .y0(height2)
        .y1(function (d) { return y2(d.total); });

    var svg = d3.select("#stached_bar_chart").append("svg").classed('stacked_bar', true)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    var date_range = data.map(function (d) {return d.date; });
    var max_date = d3.max(date_range),
        min_date = d3.min(date_range);
    date_range.push(d3.time.month.offset(max_date, 1));
    date_range.unshift(d3.time.month.offset(min_date, -1));
    data.push({"date": d3.time.month.offset(max_date, 1), "total": 0, "column": []});
    data.unshift({"date": d3.time.month.offset(min_date, -1), "total": 0, "column": []});

    x.domain(d3.extent(date_range));
    y.domain([0, d3.max(data.map(function (d) {return d.total; }))]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    focus.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    var dates = data.map(function(d) {return d.date; });
    var barWidth = d3.scale.ordinal()
        .domain(dates)
        .rangeRoundBands(x.range(), 0.05)
        .rangeBand();
    var mini_barWidth = d3.scale.ordinal()
        .domain(dates)
        .rangeRoundBands(x2.range(), 0.05)
        .rangeBand();

    var bar = focus.selectAll('.bar')
        .data(data)
        .enter()
        .append("g")
        .classed("main_bar", true);

    bar.selectAll("rect")
        .data(function(d) { return d.column; })
        .enter().append("rect")
        .attr('class', 'bar')
        .attr('x', function(d) { return x(d.date) - barWidth / 2; })
        .attr('width', barWidth)
        .attr("y", function(d) { return y(d.y1); })
        .attr('height', function(d) { return y(d.y0) - y(d.y1); })
        .attr('fill', function(d) { return colors(d.name); })
        .attr('opacity', 0.85)
        .on("mousemove", function (d) {
            div.transition().duration(200).style("opacity", .95);
            div.html("<strong><span style='color: darkred; text-decoration: underline'>" + d.name + "</span></br>" + title + ": " + d.value + "</strong><br>")
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            d3.select(this).style("opacity", '1');
        })
        .on("mouseout", function (d) {
            div.transition().duration(300).style("opacity", 0);
            d3.select(this).style("opacity", '0.85');
        });

    focus.append("g")
        .attr("class", "left")
        .attr("transform", "translate(" + (-margin.left) + ",0)")
        .append("rect")
        .attr("width", margin.left)
        .attr('height', height)
        .attr("fill", "#f9f9ff");

    focus.append("g")
        .attr("class", "right")
        .attr("transform", "translate(" + width + ",0)")
        .append("rect")
        .attr("width", margin.right)
        .attr("y", 0)
        .attr('height', height)
        .attr("fill", "#f9f9ff");

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(title)
        .attr("class", "y_label");

    context.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area2);

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append('rect')
        .attr('pointer-events', 'painted')
        .attr('width', width)
        .attr('height', bottom_height)
        .attr('visibility', 'hidden')
        .on('mouseup', moveBrush);

    var mini_bar = context.selectAll('.bar')
        .data(data)
        .enter()
        .append("g")
        .classed("main_bar", true);

    mini_bar.selectAll("rect")
        .data(function(d) { return d.column; })
        .enter().append("rect")
        .attr('class', 'mini-bar')
        .attr('x', function(d) { return x2(d.date) - mini_barWidth / 2; })
        .attr('width', mini_barWidth)
        .attr("y", function(d) { return y2(d.y1); })
        .attr('height', function(d) { return y2(d.y0) - y2(d.y1); })
        .attr('fill', function(d) { return colors(d.name); });

    var brush = d3.svg.brush().x(x2)
        .on("brush", brushed);

    context.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

    function brushed() {
        x.domain(brush.empty() ? x2.domain() : brush.extent());
        var d1Y = x.domain()[0].getFullYear(),
                d2Y = x.domain()[1].getFullYear(),
                d1M = x.domain()[0].getMonth(),
                d2M = x.domain()[1].getMonth();
        var months = (d2M+12*d2Y)-(d1M+12*d1Y);
        if (months < 12) { xAxis.ticks(d3.time.months, 1) }
        else { xAxis.ticks(d3.time.months, 3) }

        focus.select(".area").attr("d", area);
        var extent = brush.extent(); //returns [xMin, xMax]
        var rangeExtent = [x2( extent[0] ), x2( extent[1] ) ]; //convert
        var rangeWidth  = rangeExtent[1] - rangeExtent[0];
        var ratio = rangeWidth != 0 ? width / rangeWidth : 1;
        console.log(ratio, extent)
        bar.selectAll("rect")
            .attr('x', function(d) { return x(d.date) - barWidth * ratio / 2; })
            .attr('width', barWidth * ratio);
        focus.select(".x.axis").call(xAxis);
    }

    function moveBrush () {
        /*var origin = d3.mouse(this),
            point = x2.invert(origin[0]);
        var date = new Date(point.getTime());
        var start = new Date(new Date(date).setMonth(date.getMonth() - 3)),
            end = new Date(new Date(date).setMonth(date.getMonth() + 3));

        brush.extent([start,end]);
        console.log("mouseup", brush.extent())
        brushed();*/
    }
}
/* STACKED BAR CHART: END */



/* MAP: START */

function render_map (ukraine_data, ports_geo_data, one_port_pie_data, data_pie) {
    var width = $('#map_chart').width(),
        height = $('#map_chart').height();

    var geometry_center =  {"latitude": 48.360833, "longitude": 31.1809725};
    var geography_center = {"latitude": 49.0275, "longitude": 31.482778};

    var svg = d3.select("#map_chart").append("svg").classed('map', true)
        .attr("width", width)
        .attr("height", height);

    var projection = d3.geo.conicEqualArea()
        .center([0, geometry_center.latitude])
        .rotate([-geometry_center.longitude, 0])
        .parallels([44, 52])  // vsapsai: selected these parallels myself, most likely they are wrong.
        .scale(4000)
        .translate([width / 2, height / 2]);
    var path = d3.geo.path()
        .projection(projection);

    var countries = topojson.feature(ukraine_data, ukraine_data.objects.countries);
    svg.selectAll(".country")
        .data(countries.features)
      .enter().append("path")
        .attr("class", function(d) { return "country " + d.id; })
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(ukraine_data, ukraine_data.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "country-boundary")
        .attr("d", path);
    svg.append("path")
        .datum(topojson.mesh(ukraine_data, ukraine_data.objects.countries, function(a, b) { return a === b; }))
        .attr("class", "coastline")
        .attr("d", path);

    var regions = topojson.feature(ukraine_data, ukraine_data.objects.regions);
    // -- areas
    svg.selectAll(".region")
        .data(regions.features)
      .enter().append("path")
        .classed("region", true)
        .attr("id", function(d) { return d.id; })
        .attr("d", path);

     // Add rivers and lakes after region so that rivers not paint out.
     var water_group = svg.append("g")
        .attr("id", "water-resources");

    var rivers = topojson.feature(ukraine_data, ukraine_data.objects.rivers);
    water_group.selectAll(".river")
        .data(rivers.features)
      .enter().append("path")
        .attr("class", "river")
        .attr("name", function(d) { return d.properties.name; })
        .attr("d", path);

    // Add lakes after rivers so that river lines connect reservoirs, not cross them.
    var lakes = topojson.feature(ukraine_data, ukraine_data.objects.lakes);
    water_group.selectAll(".lake")
        .data(lakes.features)
      .enter().append("path")
        .attr("class", "lake")  // Note: not necessary a lake, it can be a reservoir.
        .attr("name", function(d) { return d.properties.name; })
        .attr("d", path);

    // -- boundaries
    svg.append("path")
        .datum(topojson.mesh(ukraine_data, ukraine_data.objects.regions, function(a, b) { return a !== b; }))
        .classed("region-boundary", true)
        .attr("d", path);
    // -- labels
    svg.selectAll(".region-label")
        .data(regions.features)
      .enter().append("text")
        .attr("transform", function(d) { return "translate(" + projection(d.properties.label_point) + ")"; })
        .classed("region-label", true)
        .selectAll("tspan")
            .data(function(d) { return d.properties.localized_name.ua.split(" "); })
          .enter().append("tspan")
            .attr("x", "0")
            .attr("dy", function(d, i) { return i > 0 ? "1.1em" : "0"; })
            .text(function(d) { return d + " "; });

    $("#map_chart").css("background-color", "#C2DFFF");

    var tooltip = d3.select("#map_chart")
            .append("div")   
            .attr("class", "tooltip_map")               
            .style("opacity", 0);

    // settings
    var color_map = {};
    for(i=0; i < data_pie.length; i++){
        color_map[data_pie[i].shipment] = color[i]
    }
    color_map["Все інше"]= "#83C8D9";

    var w = 400, h = 400;
    var rStart = 25, rFinish = Math.min(w,h) / 3;
    var pie = d3.layout.pie().value(function(d ) { return d.value });
    var arcStart = d3.svg.arc().outerRadius(rStart);
    var arcFinish = d3.svg.arc().outerRadius(rFinish);
    var radius = 0.75 * Math.min(width, height) / 3
        percentRadius = rStart - 5, dotRadius = radius - 50;
    var formatNumber = d3.format(".2f"),
        format = function (d) { return formatNumber(d); };
    var arcOver = d3.svg.arc()
        .outerRadius(rFinish + 9);

    // -- ports
    var circles = svg.selectAll("g.pie")
        .data(ports_geo_data)
        .enter()
        .append("g")
        .attr("class", "pie")
        .attr("id", function (d, i) {
            return i
        })
        .attr("transform", function (d) {
           return "translate(" + projection([d.lon, d.lat])[0] + "," + projection([d.lon, d.lat])[1] + ")";
        });
        // .selectAll("chunk.slice")
        // .data(pie(data))
        // .enter()
        // .append("chunk")
        // .attr("class", "slice")
        // .attr("r", function(d) {
        //     return 15 + "px";
        // })
        // .style("fill", "rgb(217,91,67)")
        // .style("opacity", 0.85)
        // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks"
        // http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
    //     .on("mouseover", function(d) {
    //         console.log(d);
    //         tooltip.transition()
    //        .duration(200)
    //        .style("opacity", .9);
    //        tooltip.text(d.label)
    //        // .style("left", (projection([d.lon, d.lat])[0]) + "px")
    //        // .style("top", (projection([d.lon, d.lat])[1] - 28) + "px");
    //     })
    // // fade out tooltip on mouse out
    //     .on("mouseout", function(d) {
    //         tooltip.transition()
    //             .duration(500)
    //             .style("opacity", 0);
    //     });

    // Create new dataset for 'other' data
    var other_data = {};
    var data = [];

    for(i=0; i < one_port_pie_data.length; i++){
        var other = 0;
        other_data[[i]] = {"label": one_port_pie_data[i].label, "products": []};
        data.push({"lable": one_port_pie_data[i].label, "products": []});
        for(f=0; f < one_port_pie_data[i].products.length; f++){
            if(one_port_pie_data[i].products[f].value/one_port_pie_data[i].total <= 0.03){
                other += one_port_pie_data[i].products[f].value;
                other_data[[i]].products.push(one_port_pie_data[i].products[f]);
                other_data[[i]]["total"] = one_port_pie_data[i].total;
            }
            else{
                data[i].products.push(one_port_pie_data[i].products[f]);
                data[i]["total"] = one_port_pie_data[i].total;
            }
        }
        if(other != 0) {
            data[i].products.push({"shipment": "Все інше", "value": other});
        }
    }

    var arcs = circles.data(data).selectAll("g.slice")
        .data(function (d) {
            return pie(d.products)
        })
        .enter()
        .append("g")
        .attr("class", function (d) {
            return d.data.shipment == "Все інше" ? "other": "slice"
        });

    arcs.append("path")
        .attr("fill", function(d, i) {
            return color_map[d.data.shipment] })
        .attr("d", function (d) { return arcStart(d); })
        .attr("stroke-width", 1)
        .attr("stroke","white")
        .style("opacity", .7);

    arcs.filter(function(d) { return d.endAngle - d.startAngle > .1; })
        .append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", function (d) {
            return (d.endAngle + d.startAngle) / 2 > Math.PI ? "end" : "start"})
        .attr("transform", function(d) { //set the label's origin to the center of the arc
            d.outerRadius = rStart; // Set Outer Coordinate
            d.innerRadius = 0; // Set Inner Coordinate
            var c = arcStart.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x*x + y*y);
            return "translate(" + (x / h * percentRadius) + ',' + (y / h * percentRadius) + ")rotate(" + angle(d) + ")";
      })
        .style("fill", "black").style("font", " 6px Arial")
        .attr("text-anchor", "middle")
        .style("font-size", 1)
        .text( function(d, i) {
            return d.data.shipment == "Все інше" ? "Все інше": format(d.value); });

    circles.on("mouseenter", function(d) {
				console.log("over");
        this.parentNode.appendChild(this);
        d3.select(this).attr()
            .selectAll("path")
        		.transition()
            .duration(1000)
            .attr("d", function (d) { return arcFinish(d); })
            .style("opacity", 1);
        d3.select(this).selectAll("text")
        		.transition()
            .duration(1000)
            .attr("transform", function(d){
                d.outerRadius = rFinish; // Set Outer Coordinate
                d.innerRadius = 0; // Set Inner Coordinate
                var c = arcFinish.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x*x + y*y);
                return "translate(" + (x / h * dotRadius) + ',' + (y / h * dotRadius) + ")rotate(" + angle(d) + ")";
            })
            .style("font-size", 11);
        d3.select(this).selectAll(".other").selectAll("path")
            .transition()
            .duration(1000)
            .attr("stroke-width",2)
            .attr("d", function (d) { return  arcOver(d); })
            .attr("cursor", "pointer");
        })
    .on("mouseleave", function(d) {
    		console.log("out");
        arcs.selectAll("path")
        		.transition()
            .duration(1000)
            .attr("d", function (d) { return arcStart(d); })
            .style("opacity", 0.7)
            .attr("stroke-width",1);
        arcs.selectAll("text")
        		.transition()
            .duration(1000)
            .attr("transform", function(d){
                d.innerRadius = 0;
                d.outerRadius = rStart;
                return "translate(" + arcStart.centroid(d) + ")rotate(" + angle(d) + ")";
            })
            .style("font-size", 1);
            d3.select(this).selectAll("line").remove();
            d3.select(this).selectAll(".linetext").remove();
    });
    // Text name for ports
    circles.data(ports_geo_data)
        .on("mouseover", function (d) {
            tooltip.transition()
                .duration(1000)
                .style("opacity", 1);
           tooltip.text(d.port)
               .style("left", (projection([d.lon, d.lat])[0]) - 320 + "px")
               .style("top", (projection([d.lon, d.lat])[1]) - 28 + "px");
    })
        .on("mouseout", function(d) {
             tooltip.transition()
                 .duration(500)
                 .style("opacity", 0);
         });

    // effect for other section
    d3.selectAll(".other")
        .on("click", function (d) {
            // var parent = this.parentNode;
            // d3.select(parent).data(other_data[parent.id])
            //     .data(function (d) {
            //             return pie(d.products)}
            //         )
        })
}
/* MAP: END */


/* MAIN PIE CHART: START */
function render_main_pie_chart(data) {
    var color_map = {};
    for(i=0; i < data.length; i++){
        color_map[data[i].shipment] = color[i]
    }
    var width = $('#main_pie_chart').width(), height = 650,
        radius = 0.75 * Math.min(width, height) / 2, labelRadius = radius + 30,
        percentRadius = radius - 100, dotRadius = radius - 25,
        top_shift = 50,
        arc = d3.svg.arc().outerRadius(radius).innerRadius(0),
        hoverArc = d3.svg.arc().innerRadius(0).outerRadius(radius + 8),
        pie = d3.layout.pie().value(function (d) { return d.value; });

    var formatNumber = d3.format(".2f"),
        format = function (d) { return formatNumber(d); };
    var percent_limit = 0.02,
        limit = 0.003,
        max_label_length = 20;

    var svg = d3.select("#main_pie_chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("preserveAspectRatio", "xMidYMid")
        .append("g").attr("transform", "translate(" + width / 2 + "," + (height / 2 + top_shift) + ")");

    var total = data.map(function (d) { return + d.value; }).reduce(function (a, b) { return a + b; }, 0);
    // color.domain(data.map(function (d) { return d.shipment; }));

    var g = svg.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc");

    g.append("path")
        .attr("d", arc)
        .style("fill", function (d) {return color_map[d.data.shipment]; })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

    g.filter(function (d) { return +d.value / total > percent_limit; })
        .append("svg:text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            return "translate(" + (x / h * percentRadius) + ',' + (y / h * percentRadius) + ")rotate(" + angle(d) + ")";
        })
        .style("fill", "black").style("font", "bold 14px Arial")
        .text(function (d) { return format(+d.value / total * 100) + "%"; });

    g.append("circle")
        .filter(function (d) { return +d.value / total > limit; })
        .attr({x: 0, y: 0, r: 2, fill: "#000"})
        .attr("transform", function (d, i) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            return "translate(" + (x / h * dotRadius) + ',' + (y / h * dotRadius) + ")";
        })
        .classed("label-circle", true);

    var textLines = g.append("line")
        .filter(function (d) { return +d.value / total > limit; })
        .attr("x1", function (d, i) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            return x / h * dotRadius;
        })
        .attr("y1", function (d, i) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            return y / h * dotRadius;
        })
        .attr("x2", function (d, i) {
            var centroid = arc.centroid(d);
            var midAngle = Math.atan2(centroid[1], centroid[0]);
            return Math.cos(midAngle) * labelRadius;
        })
        .attr("y2", function (d, i) {
            var centroid = arc.centroid(d);
            var midAngle = Math.atan2(centroid[1], centroid[0]);
            return Math.sin(midAngle) * labelRadius;
        })
        .classed("label-line", true)
        .attr("stroke-width", 1)
        .attr("stroke", "#393939");

    var textLabels = g.append("text")
        .filter(function (d) { return +d.value / total > limit; })
        .attr("x", function (d) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            x = x / h * labelRadius;
            var sign = (x > 0) ? 1 : -1;
            return x + (5 * sign);
        })
        .attr("y", function (d) {
            var c = arc.centroid(d), x = c[0], y = c[1], h = Math.sqrt(x * x + y * y);
            return y / h * labelRadius;
        })
        .style("font", "bold 14px Arial")
        .attr("text-anchor", function (d) {
            return (d.endAngle + d.startAngle) / 2 > Math.PI ? "end" : "start";
        })
        .classed("label-text", true)
        .text(function (d) {
            return d.data.shipment.trunc(max_label_length) + ' (' + format(+d.value) + ')';
        });

    var alpha = 0.5, spacing = 18;

    function relax() {
        var again = false;
        textLabels.each(function (d, i) {
            var a = this, da = d3.select(a), y1 = da.attr("y");
            textLabels.each(function (d, j) {
                var b = this;
                if (a == b) return; // a & b are the same element and don't collide
                var db = d3.select(b);
                // a & b are on opposite sides of the chart and don't collide
                if (da.attr("text-anchor") != db.attr("text-anchor")) return;
                // Now let's calculate the distance between these elements.
                var y2 = db.attr("y"), deltaY = y1 - y2;
                // Our spacing is greater than our specified spacing, so they don't collide.
                if (Math.abs(deltaY) > spacing) return;
                // If the labels collide, we'll push each of the two labels up and down a little bit.
                again = true;
                var sign = deltaY > 0 ? 1 : -1, adjust = sign * alpha;
                da.attr("y", +y1 + adjust);
                db.attr("y", +y2 - adjust);
            });
        });
        // Adjust our line leaders here so that they follow the labels.
        if (again) {
            var labelElements = textLabels[0];
            textLines.attr("y2", function (d, i) {
                var labelForLine = d3.select(labelElements[i]);
                return labelForLine.attr("y");
            });
            setTimeout(relax, 20)
        }
    }
    relax();
}

function angle(d) {
    var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
    return a > 90 ? a - 180 : a;
}

String.prototype.trunc = String.prototype.trunc || function(n) { return (this.length > n) ? this.substr(0, n-1)+'...' : this; };
/* MAIN PIE CHART: END */


/* COLORS PANEL */
function add_remove_colors_panel(obj) {
    if($(obj).text() == "Показати легенду"){
        $(obj).text("Згорнути легенду");
        $("ul.list-group").html("");
        $("#color_panel").css({
            "z-index": 1001,
            "visibility": "visible",
            "opacity": 0.7
        });
        for(var key in MAP_COLORS) {
            var li = $("<li></li>").attr({ class: "list-group-item"});
            var d = $("<div></div>").css({"display":"inline"});
            $("<div></div>").css({
                "width": "30px",
                "height": "15px",
                "background": MAP_COLORS[key],
                "padding": "5px",
                "display": "inline"
            }).appendTo(li);
            $('<p></p>').css({
                "display":"inline"
            }).html("&nbsp;" + "-" + "&nbsp;" + key).appendTo(d);
            d.appendTo(li);
            li.appendTo("ul.list-group");
        }
    }
    else if($(obj).text() == "Згорнути легенду"){
        $(obj).text("Показати легенду");
        $("#color_panel").css({
            "z-index": 100,
            "visibility": "hidden",
        });
    }
}
