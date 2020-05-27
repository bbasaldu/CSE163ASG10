var width = 1200;
var height = 960;
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
//global vars    
let Counties_bool = true; //for showing counties
let State_bool = true; //for showing state boundries
let Legend_bool = true;; //for changing legend
let showHousingCosts = false; //for changing data shown
let Legend = d3.schemeOrRd[9]; //for changing color scheme
//color schemes same as Mike Bostock examples
//https://bl.ocks.org/mbostock/670b9fe0577a29c39a1803f59c628769
var color = d3.scaleThreshold()
            .domain([1, 10, 50, 200, 500, 1000, 2000, 4000])
            //.domain([250, 500, 1000, 2000, 3000, 4000, 5000,6000])
            .range(Legend);//d3.schemeOrRd[9] //d3.schemeBlues[9]

var x = d3.scaleSqrt()
    .domain([0, 4500])
    //.domain([0, 6000])
    .rangeRound([440, 950]);
    
//console.log(color(504));


//from d3 documentation
//https://github.com/d3/d3-geo/blob/master/README.md
//and Bostock example https://bl.ocks.org/mbostock/5663666
//shows how to transform pre-projected maps
//originally i had to scroll down a bit to see my map and then you couldnt see the title.
//this just moves my map up and to the right
var translate = d3.geoTransform({
  point: function(x, y) {
    this.stream.point(x + 100, y - 200);
  }
});    
//map is pre-projected so no d3.projection function is used except for my translation
var path = d3.geoPath().projection(translate);

let dataset;
let HousingCostData;
//Kept getting promise errors so i used promise functions to fix it
// I used this for reference https://bl.ocks.org/denisemauldin/3436a3ae06f73a492228059a515821fe

//k-total-topo.json was made using Mike Bostocks command line cartography tutorial
//The map is pre-projected but the projection used is 
//d3.geoConicEqualArea().parallels([37, 40]).rotate([98, 0]) and is made to fit a canvas
//size of 960x960
//This projection is also known as albers. It uses two standard latidude parallels.
//The areas of this porjection are equal to all other areas of maps also using this projection.
//This projection also minimalizes distortion of the map.
//Both of these things make it a great projection for mapping data.

//KSCountyNames.json just containes county names and their code since none of the other json files
//had names as strings


//KSHousingCost.json has contains data for the monthly housing cost
//in kansas per tract for 2018. From the acs.
var promises = [
    d3.json("KS.json"),
    d3.json("KSCountyNames.json").then(function(d){
        dataset = d.slice(1);
    }),
    d3.json("KSHousingCost.json").then(function(d){
        HousingCostData = d.slice(1);
    })
]
Promise.all(promises).then(ready);    
//Used Mike Bostocks CA pop. density map for reference
  function ready([kansas]) {  
    var min = d3.min(HousingCostData, function(d){return +d[0];});
    var max = d3.max(HousingCostData, function(d){return +d[0];});
    
    console.log(min);
    console.log(max);
    console.log(kansas)
    console.log(topojson.feature(kansas, kansas.objects.tracts));
    //console.log(topojson.feature(kansas, kansas.objects.tracts).features);
    //create tooltip.
    var tooltip = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);
      
    //Using Mike Bostocks CA pop density example https://bl.ocks.org/mbostock/5562380 for reference
    var Tracts = svg.append("g")
    .selectAll("path")
    //topojson.feature converts topo.json file data to geojson data.
    //topojson files use geometries and geometry collections while
    //geojson uses features and featured collections
    //.features returns the parsed object data
    .data(topojson.feature(kansas, kansas.objects.tracts).features)
    .enter().append("path")
    .attr("fill", function(d) {
        //console.log(d);
        //inital color is a function of density for a specific tract
        return color(d.properties.density);
    })
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0)//set tract lines to be invisible until we toggle them on later
    .attr("d", path)
    .on("mouseover", function(d){
          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
      })
    .on("mousemove", function(d){
        tooltip.html(function(){
              if(showHousingCosts){//if we are looking at Housing Data
                  //look for an object b with a tract b[3] from our housing data whose tract matches our current tract d.id.slice(3,9)
                  //d.id.slice(0,2) is our 3 digit county code so we ignore it. 
                  var tractData = HousingCostData.find(function(b){
                    return b[3] == d.id.slice(3, 9);//"051072600";
                  });
                  //tractData[0] contains the actual monthly housing cost
                  //here we try to compute the avg cost for a county rather then just tract
                  //County Obj is just used to get the county name. Where County[0] contains the name
                  //dataset just contains county names and their fips code
                  var CountyObj = dataset.find(function(d){return d[2] == tractData[2];});//
                  var countyCost = 0;//to keep track of monthly housing cost for county
                  var count = 0;
                  //Get an array of tract objects who share the same county.
                  //add up all tract costs and divide by number of tracts in that county
                  var CountyData = HousingCostData.filter(function(d2){return d2[2] == tractData[2]});
                  CountyData.forEach(function(d){
                      var temp = +d[0];
                      countyCost += temp;
                      count +=1;
                  });
                  countyCost = d3.format(",")(Math.floor(countyCost/count));
                  tractCost = d3.format(",")(tractData[0]);
                  //console.log(CountyData);
                  return CountyObj[0]+"<br><br>"+"County Avg. Monthy Housing Cost: $"+countyCost+"<br><br>"+"Tract Avg. Monthly Housing Cost:"+" $" + tractCost;
              }
              else{//if we are looking at pop. density data
              var FIPS = d.id.slice(0,3);//get FIPS county code from current feature data
              var countyObj = dataset.find(function(e){return e[2] == FIPS});//get county obj associated with current fips code.
              //group together all tract data
              var tractDensities = topojson.feature(kansas, kansas.objects.tracts).features.filter(function(e){return e.id.slice(0,3) == FIPS;});
              var countyDensity = 0;
              var count = 0;
              //for each county, add up all tract pop. densities to get total county density
                tractDensities.forEach(function(d){
                    countyDensity += d.properties.density;
                });
                
              //console.log(d.id.slice(0,3));
              //print county name, current selected county density, and current selected tract density
              return countyObj[0] + "<br><br>" + "County Population Per Square Mile: " + countyDensity + "<br><br>" + "Tract Population Per Square Mile: " + d.properties.density;//d.id;
              }
          })//d3.select(this).attr("class")
            .style("left", (d3.event.pageX + 10) + "px") //position tooltip at mouse position
            .style("top", (d3.event.pageY) + "px");
    })
      .on("mouseout", function(d) {	//make tooltip fade away	
            tooltip.transition()		
                .duration(500)		
                .style("opacity", 0);
        });

    //get innerCounty Boundaries.
    //this was computed during the projection of the map but it seems like the idea is
    //to find all geometries whose first 3 numbers of their 'id' are the county fips codes
      //so we would just create a new filtered array of objects where each object has a list
      //of tracts with the same first 3 numbers in their id
      //To get inner counties we go through each arc of our county data and check adjacent polygons a and b.
      //According to Bostocks tutorial, by convention a and b would be on the same exterior arc.
      //So we can simply return geometries with arcs that do not have an adjacent polygons a and b
    var Counties = svg.append("path")
      .datum(topojson.feature(kansas, kansas.objects.innerCounties))
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.3)
      .attr("d", path);

    //For the state boundary you would just do the opposite of the above
    //You could return geometries with arcs that share adjacenet polygons a and b.
    //state stroke opacity set to 0 to be invisble until we toggle it later
    var State = svg.append("path")
      .datum(topojson.feature(kansas, kansas.objects.State))
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0)
      .attr("d", path);
    
    //draw Legend
    //from mike bostock CA pop Density example
    ////////////////////////
     var g = svg.append("g")
    .attr("class", "key")
    .attr("transform", "translate(-140,580)");
     
     //console.log(color.range());
    
     g.selectAll("rect")
      //invertExtent returns extent of values in our color domain, for the corresponding value in the range
      //The if statements takes care of undefined behavior
      //We have undefined behavior becuase our range has 9 elements while our domain only has 8
      //invertExtent tries to equally distribute unique pairs of min/max in the range of the range values among every domain element.
      //Example: domain is [0,1] and range is ["color1, "color2", "color3"]
      //invertExtent("color1") is[undefined,1]
      //invertExtent("color2") is [0,1]
      //inverExtenet("color3") is [1, undefined]
      //Bostock knows that d[0] from d=[undefined,1] ,which will be our first call to invertExtent,
      //will be undefined so he sets it to the first value of our x.domain which is 0.
      //He does this with th very last set of min/mad values which will be [4000, undefined] so he
      //checks for null and sets d[1] to be the last value in our x domain
      //I think he does this on purpose so he can manually set the min and max values of his legened
      //and let the values in between be determined programatically, but also i think it just made it easier
      //for him to decide the width of the colored 'strips' in his legend
  .data(color.range().map(function(d) {
      d = color.invertExtent(d);
      console.log(d);
      if (d[0] == null) d[0] = x.domain()[0];
      if (d[1] == null) d[1] = x.domain()[1];
      return d;
    }))
  .enter().append("rect")//creates the different colored 'strips' on the legend.
    .attr("height", 8)
      //positions the left side of the rectangle to our min value given by
      //d = color.invertEctent(d)
      //where d[0] is the min and d[1] is the max
      //the width is simply the max range index - min range index for a specifc domain value given
      //For 8 domain values and 9 range values, invertExtent will return only 8 min values, since the first
      //min value will be undefined. However, we manually assigned a min value earlier for a total
      //of 9 min values given. We can simply pass this to our color scale for the fill
      //since our color scale has a range of 9 and we are passing it 9 values from 0(given from x domain)
      //plus [1-8] since each min value will be one plus the last.
      //i.e d1=[0,1] d2=[1,2] d3=[2,3]...
    .attr("x", function(d) { return x(d[0]); })
    .attr("width", function(d) { return x(d[1]) - x(d[0]); })
    .attr("fill", function(d) { return color(d[0]); });
      
//positions the legend caption 
g.append("text")
    .attr("class", "caption")
    .attr("x", x.range()[0])
    .attr("y", -6)
    .attr("fill", "#000")
    .attr("text-anchor", "start")
    .attr("font-weight", "bold")
    .text("Population per square mile");

     

//d3.select(".x-axis").remove();
      //sets tick labels to our domain which we defined very early on
var axis = g.append("g")
    .attr("class", "x-axis")
    .call(d3.axisBottom(x)
    .tickSize(13)
    .tickValues(color.domain()).tickFormat(function(d){
    if(showHousingCosts){
        return "$" + d;
    }
    else{
        return d;
    }
})) 
  .select(".domain")//makes the axis line disappear
    .remove();
//console.log(d3.select(".axis"));



    ////////////////////////
    //Buttons//
    //pretty straightforward just creating some rectangle buttons
    var TractsBtn = svg.append("rect")
        .attr("x", width-100)
        .attr("y", height/8 - 50)
        .attr("width", 100)
        .attr("height", 50)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0)
        .attr("fill", color(10));
    svg.append("text")
        .attr("x", width-95)
        .attr("y", height/8 - 20)
        .text("Tracts On/Off");
    
    var StateBtn = svg.append("rect")
        .attr("x", width-100)
        .attr("y", height/8 + 50)
        .attr("width", 100)
        .attr("height", 50)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0)
        .attr("fill", color(10))
    svg.append("text")
        .attr("x", width-90)
        .attr("y", height/8 + 80)
        .text("State On/Off");
    
    var LegendBtn = svg.append("rect")
        .attr("x", width-300)
        .attr("y", height/2 + 80)
        .attr("width", 110)
        .attr("height", 50)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0)
        .attr("fill", color(10));
    svg.append("text")
        .attr("x", width-290)
        .attr("y", height/2 + 110)
        .text("Change Color");
    
    var NewMapBtn = svg.append("rect")
        .attr("x", width-100)
        .attr("y", height/8 + 150)
        .attr("width", 100)
        .attr("height", 50)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0)
        .attr("fill", color(10));
    svg.append("text")
        .attr("x", width-90)
        .attr("y", height/8 + 180)
        .text("Change Data");
    
    //if we toggle tracts just make the lines appear/disapear based 
    //on whether the button is clicked or not
    TractsBtn.on("click",function(){
         if(Counties_bool){
            Counties_bool = false;
            Tracts.attr("stroke-opacity", 0.3);
            TractsBtn.attr("stroke-opacity", 0.5);
            //Counties.attr("stroke-opacity", 0);
        }
        else{
            Counties_bool = true;
            Tracts.attr("stroke-opacity", 0);
            TractsBtn.attr("stroke-opacity", 0);
            //Counties.attr("stroke-opacity", 0.3);
        }
        //console.log(Counties_bool);
    });
    //same logic for state boundaries
    StateBtn.on("click", function(){
        if(State_bool){
            State_bool = false;
            State.attr("stroke-opacity", 0.5);
            StateBtn.attr("stroke-opacity", 0.5);
        }
        else{
            State_bool = true;
            State.attr("stroke-opacity", 0);
            StateBtn.attr("stroke-opacity", 0);
        }
    });
    
    NewMapBtn.on("click",function(d){
        //change data shown by
        //chaning the color domain and x domain
        //and changing the data used for the fill
        Tracts.attr("fill", function(d){
            if(!showHousingCosts){
            color.domain([250, 500, 1000, 2000, 3000, 4000, 5000,6000]);
            x.domain([0, 6000]);
            var tractData = HousingCostData.find(function(b){
                return b[3] == d.id.slice(3, 9);//"051072600";
            });
            //console.log(tractData);
            
            return color(tractData[0]);
        }
        else{
           color.domain([1, 10, 50, 200, 500, 1000, 2000, 4000]);
           x.domain([0, 4500]);
           return color(d.properties.density); 
        }
        });
        //change title
        if(!showHousingCosts){
            showHousingCosts = true;
            document.getElementById("title").innerHTML = "Kansas Monthly Housing Costs, 2018";

        }
        else{
            showHousingCosts = false;
            document.getElementById("title").innerHTML = "Kansas Population Density, 2018";
        }
        updateLegend();
        
    });
    
    LegendBtn.on("click", function(){
        //If legened button is clicked
        //we change the color scheme and redraw
        //current map using new color scheme
        if(Legend_bool){
            //console.log("hi");
            //Legend_bool = false;
            console.log(color.range());
            Legend = d3.schemeBlues[9];
            color.range(Legend);
            Tracts.attr("fill", function(d){
                if(showHousingCosts){
                    var tractData = HousingCostData.find(function(b){
                    return b[3] == d.id.slice(3, 9);//"051072600";
            });
            //console.log(tractData);
            return color(tractData[0]);
            }
                else{
                    return color(d.properties.density); 
            }   
            });
            StateBtn.attr("fill", color(10));
            TractsBtn.attr("fill", color(10));
            LegendBtn.attr("fill", color(10));
            NewMapBtn.attr("fill", color(10)); // change button colors
            LegendBtn.attr("stroke-opacity", 0.5);
            //redraw Legend
            //console.log(color.range());
            tt=1;
            Legend_bool = false;
            updateLegend();
            //Legend_bool = false;

        }
        else{
            //console.log("hello");
            Legend = d3.schemeOrRd[9];
            color.range(Legend);
            Tracts.attr("fill", function(d){
                if(showHousingCosts){
                    var tractData = HousingCostData.find(function(b){
                    return b[3] == d.id.slice(3, 9);//"051072600";
            });
            //console.log(tractData);
            return color(tractData[0]);
            }
                else{
                    return color(d.properties.density); 
            }
            });
            StateBtn.attr("fill", color(10));
            TractsBtn.attr("fill", color(10));
            LegendBtn.attr("fill", color(10));
            NewMapBtn.attr("fill", color(10));
            LegendBtn.attr("stroke-opacity", 0);
            //redraw Legend
            updateLegend();
            Legend_bool = true;
            //console.log(Legend);
        }
    });
 function updateLegend(){
     //tried to update Legend info
     //http://bl.ocks.org/alansmithy/e984477a741bc56db5a5 used for reference
     //
     //change legend caption
    if(showHousingCosts){
        g.selectAll(".caption").text("Monthly Housing Cost in U.S Dollars");
    }
     else{
        g.selectAll(".caption").text("Population per square mile"); 
     }
     g.selectAll("rect").remove(); //remove all drawn rectangles from 'previous' legened
        g.selectAll("rect")
  .data(color.range().map(function(d) {//recompute rectangle strip values
      d = color.invertExtent(d);
      if (d[0] == null) d[0] = x.domain()[0];
      if (d[1] == null) d[1] = x.domain()[1];
      return d;
    }))
  .enter().append("rect")
    .attr("height", 8)
    .attr("x", function(d) { return x(d[0]); })
    .attr("width", function(d) { return x(d[1]) - x(d[0]); })
    .attr("fill", function(d) { return color(d[0]); });
    //redraw tick marks with new domain data with in dollar format or not
    g.select(".x-axis").call(d3.axisBottom(x)
    .tickSize(13)
    .tickValues(color.domain()).tickFormat(function(d){
    if(showHousingCosts){
        return "$" + d3.format(",")(d);
    }
    else{
        return d;
    }
})) 
  .select(".domain")
    .remove();
 };     
 

 
};