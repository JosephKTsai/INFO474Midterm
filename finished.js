'use strict';

(function() {

  let data = ""; // keep data in global scope
  let svgContainer = ""; // keep SVG reference in global scope
  let filterOnActual = false; // Keeps track if the filters are on or not
  let filterOnEstimated = false;
  let singleBarChosen = false;

  // load data and make scatter plot after window loads
  window.onload = function() {
    svgContainer = d3.select('body')
      .append('svg')
      .attr('width', 1100)
      .attr('height', 600);
      
    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv("./SimpsonsData.csv")
      .then((csvData) => makeBarGraph(csvData));
  }

  // Draw the bars on the svg
  function makeBarGraph(csvData) {
      data = csvData

      // Get year and average viewership data
      let yearData = data.map((row) => parseInt(row["year"]));
      let avgNumViewersData = data.map((row) => parseFloat(row["avg_num_viewers_mil"]));
      
      // get axes limits
      let axesLimits = findMinMax(yearData, avgNumViewersData);

      // Draw axes with ticks and return mapping and scaling functions
      let mapFunctions = drawTicks(axesLimits)

      // Plot the data using the mapping and scaling functions
      plotData(mapFunctions);
      addAxesLabels();
      drawAverageLine(mapFunctions);
      addFilters();
  }

  // find min and max for year and average viewership data
  function findMinMax(yearData, avgNumViewersData) {

    // get min/max year
    let yearMin = d3.min(yearData);
    let yearMax = d3.max(yearData);

    // get min/max of average viewership
    let avgNumViewersMin = d3.min(avgNumViewersData);
    let avgNumViewersMax = d3.max(avgNumViewersData);

    // round y-axis limits to nearest 0.05
    avgNumViewersMax = Number((Math.ceil(avgNumViewersMax*20)/20).toFixed(2));
    avgNumViewersMin = Number((Math.ceil(avgNumViewersMin*20)/20).toFixed(2));

    // return formatted min/max data as an object
    return {
        yearMin : yearMin,
        yearMax : yearMax,
        avgNumViewersMin : avgNumViewersMin,
        avgNumViewersMax : avgNumViewersMax
    }
  }

  // draw the axes and ticks
  function drawTicks(limits) {

    let xValue = function(d) { return +d["year"]; }

    // Function to scale 
    let xScale = d3.scaleLinear()
      .domain([limits.yearMin - 1, limits.yearMax + 1])
      .range([100, 1050]);

    // xMap returns a scaled x value from a row of data
    let xMap = function(d) { return xScale(xValue(d)); };

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom()
        .ticks(30)
        .scale(xScale);
        
    svgContainer.append("g")
      .attr('transform', 'translate(0, 550)')
      .call(xAxis);

    // return average number of viewers
    let yValue = function(d) { return +d["avg_num_viewers_mil"]}

    // function to scale average number of viewers
    let yScale = d3.scaleLinear()
      .domain([limits.avgNumViewersMax + 4, limits.avgNumViewersMin - 6]) 
      .range([50, 550]);

    // yMap returns a scaled y value from a row of data
    let yMap = function (d) { return yScale(yValue(d)); };

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft().scale(yScale);
    svgContainer.append('g')
      .attr('transform', 'translate(100, 0)')
      .call(yAxis);

    svgContainer.selectAll("text").each(function(data) {
      let text = d3.select(this);

      // Remove years used for padding
      if (text.text() == '1,989' || text.text() == '2,015') {
        text.text("");
      
      // Reformat without commas
      } else if (text.text().includes(",")) {
        let formattedString = text.text().replace(/,/g, '')
        text.text(formattedString)
      }

    });
    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }

    // plot all the bars on the SVG and create the tool tip
    function plotData(map) {
        let xMap = map.x;
        let yMap = map.y;

        // Add text to the page
        d3.select("body").selectAll('.barText')
        .data(data)
        .enter()
        .append('div')
            .attr("width", "34px")
            .attr("height", "50px")
            .attr("class", "barText")
            .html( d => d.avg_num_viewers_mil)
            .style("left", d => xMap(d) - 8 + "px")
            .style("top", d => yMap(d) + 60+ "px");

        // Define the div for the tooltip
        var div = d3.select("body").append("div")	
            .attr("text-align", "center")
            .attr("width", "400px")
            .attr("height", "200px")
            .attr("class", "tooltip")
            .style("opacity", 0);
            
        svgContainer.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
            .attr('x', d => xMap(d) - 18)
            .attr('y', yMap)
            .attr('class', 'rectBar')
            .attr('width', 34)
            .attr('height', d => 550 - yMap(d))
            .attr('fill', d => {
              if (d.actual_estimated == "Actual") {
                return "#85a2d1"
              } else {
                return "gray";
              }
            })
            // Implement tooltip functionality
            .on("mouseover", (d) => {

              div.transition()
                .duration(200)
                .style("opacity", 1);

              div.html(
                  "<h3 class='tooltipHeader'> Season # " + d.year + "</h3>" +
                  "<span class='tooltipData'>Year:</span> " + d.year + "<br>" + 
                  "<span class='tooltipData'> Episodes </span>: " + d.num_episodes + "<br>" +
                  "<span class='tooltipData'>Avg Viwers (mil): </span>" + d.avg_num_viewers_mil + "<br> <br>" + 
                  "<span class='tooltipData'> Most Watched Episode: </span>" + "\"" + d.most_watched_epi + "\" " + "<br>" + 
                  "<span class='tooltipData'> Viewers (mil): </span>" + d.viewers_of_most_watched_epi
                ).style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", (d) => {
              div.transition()
                .duration(500)
                .style("opacity", 0);
            })
            .classed('actualBar', (d) => {
              if (d.actual_estimated == 'Actual') {
                return true;
              } else {
                return false
              }
            })
            .classed('estimatedBar', (d) => {
              if (d.actual_estimated == 'Estimated') {
                return true;
              } else {
                return false
              }
            })
    }

    function addAxesLabels() {

      // Add the x-axis label
      svgContainer.append("text")
        .attr("transform", "translate(560, 590)")
        .style("text-anchor", "middle")
        .text("Year")

      // Add the y-axis label
      svgContainer.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", "60")
        .attr("x", "-300")
        .style("text-anchor", "middle")
        .text("Avg. Viewers (in millions)")
    }

    function drawAverageLine(map) {

      let xMap = map.x;
      let yMap = map.y;

      // Get average viewing data
      let avgNumViewersArray = data.map((row) => parseFloat(row["avg_num_viewers_mil"]));

      let totalAverageViews = 0;

      // Get sum of average viewing data
      for (let i = 0; i < avgNumViewersArray.length; i++) {
        totalAverageViews += avgNumViewersArray[i];
      }

      // Calculate average and round to nearest tength
      let avgNumViewers = totalAverageViews / avgNumViewersArray.length;
      avgNumViewers = Math.round(10*avgNumViewers)/10; 

      let avgNumViewersObject = {
        "avg_num_viewers_mil" : avgNumViewers
      };

      // Define the div for the tooltip
      var div = d3.select("body").append("div")	
        .attr("text-align", "center")
        .attr("width", "100px")
        .attr("height", "50px")
        .attr("class", "avgTooltip")
        .style("opacity", 0)
        .html("Average = " + avgNumViewers);


      // Append line to svg
      svgContainer.append("line") 
        .style("stroke", "gray")
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "5, 5")
        .style("margin", "100px")
        .attr("class", "avgLine")
        .attr("x1", 100)  
        .attr("y1", (d) => yMap(avgNumViewersObject))
        .attr("x2", 1050) 
        .attr("y2", (d) => yMap(avgNumViewersObject))
        .on("mouseover", (d) => {
          div.transition()
              .duration(100)
              .style("opacity", 1)
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", (d) => {
          div.transition()
            .duration(100)
            .style("opacity", 0);
        })

      // Append a div to show the average number of viewers
      d3.select("body").append("div")
        .attr("text-align", "center")
        .attr("width", "100px")
        .attr("height", "50px")
        .attr("class", "avgNumDiv")
        .style("left", "110px")
        .style("top", "385px")
        .html(avgNumViewers);
    }

    // Adds the filters to filter by actual or estimated on the viz
    function addFilters() {

      // This is the parent div that holds the filters within it
      let filterDiv = d3.select("body").append("div")
        .attr("width", "150px")
        .attr("height", "150px")
        .attr("class", "viewershipFilter")
        .style("left", "1000px")
        .style("top", "100px")
        .html("<h3>Viewership Data</h3>")

      // Create the divs to place within the filter
      let actualViewersFilter = filterDiv.append("div")
        .attr("class", "parentFilterDivActual")
        .html("<div class='actualViewersBox'> </div> <span class='filterLabel'>Actual</span> <br>")
        .on('click', (e) => {
          
          // Turning the filter on
          if (filterOnActual !== true) {
            d3.selectAll('.estimatedBar').each(function(d, i) {
              d3.select(this)
                .classed("lowOpacity", true);
            });

            filterOnActual = true;
            
          // Turning the filter off
          } else {
            filterOnActual = false;

            d3.selectAll('.rectBar').each(function(d, i) {
              d3.select(this)
                .classed("lowOpacity", false);
            });
          }

        });
        

      // Perform filtering logic based on chosen filter
      let estimatedViewersFilter = filterDiv.append("div")
        .attr("class", "parentFilterDivEstimated")
        .html("<div class='estimatedViewersBox'> </div> <span class='filterLabel'>Estimated</span>")
        .on('click', (e) => {
          
          // Turning the filter on
          if (filterOnEstimated !== true) {
            d3.selectAll('.actualBar').each(function(d, i) {
              d3.select(this)
                .classed("lowOpacity", true);
            });

            filterOnEstimated = true;
            
          // Turning the filter off
          } else {
            filterOnEstimated = false;

            d3.selectAll('.rectBar').each(function(d, i) {
              d3.select(this)
                .classed("lowOpacity", false);
            });
          }

        });
    }


})();
