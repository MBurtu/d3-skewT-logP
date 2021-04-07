//-
//      config.js
//-

//      Table of Contents
//      1. Dataset      
//      2. Sounding
//          2.1 Size
//          2.2 Domain & Axis
//      3. Wind barbs
//          3.1 Size
//          3.2 Axis
//      4. Hodograph
//          4.1 Size
//          4.2 Domain & Axis
//      5. International Standard Atmosphere
//      6. Various path generators

//-
//-
//-

/////////////////////////////////
//
//      1. Dataset
//
/////////////////////////////////

const firstStep = 0,       // timestep of first image
      timeStep = 3, 	   // timestep in hours
      lastStep = 72,	   // forecast hour of last sounding
      nrOfSoundings = 24;  // nr of model soundings per location

/////////////////////////////////
//
//      2. Sounding
//
/////////////////////////////////

/////////////////////////////////
//      2.1 Size

var height = $('#sounding_container').height();
var width = $('#sounding_container').width();

var margin = {top: width*0.04, right: 0, bottom: width*0.045, left: width*0.07},
    w = width*0.9 - margin.right - margin.left,
    h = height - margin.top - margin.bottom;

/////////////////////////////////
//      2.2 Domain & Axis

const basep = 1050,  // Base pressure
    topp = 100, // Top pressure
    dp = 1,
    plines = [1000,850,700,500,300,200,100],  // Isobars
    pticks = [950,900,800,750,650,600,550,450,400,350,250,150];  // Pressure ticks

// Dry adibats
const pp_dry = d3.range(topp,basep+1,dp); // pressure
const dryad = d3.range(-50,240,2); // degC
// Most adiabats
const pp_moist_range = d3.range(topp,1000+1,dp);
const pp_moist = pp_moist_range.sort((a,b)=>b-a); // pressure in descending order
const moistad = d3.range(-40,50,2); // degC
// Mixing ratio 
const pp_mix = d3.range(600,basep+1,dp); // pressure
const mix_ratio = [0.1,0.2,0.4,1,2,3,5,7,10,15,20,30,40]; //  g/kg

// Scales and axes. Note the inverted domain for the y-scale: bigger is up!
var x = d3.scaleLinear().range([0, w]).domain([-45,45]),
    y = d3.scaleLog().range([0, h]).domain([topp, basep]),
    y2 = d3.scaleLinear(),
    xAxis = d3.axisBottom(x).tickSize(0,0).ticks(10),
    yAxis = d3.axisLeft(y).tickSize(0,0).tickValues(plines)
              .tickFormat(d3.format(".0d")),
    yAxis2 = d3.axisRight(y).tickSize(5,0).tickValues(pticks); // just for ticks

/////////////////////////////////
//
//      3. Wind barbs
//
/////////////////////////////////

/////////////////////////////////
//      3.1 Size

var w_barbs = width*0.1;
// height = same as for sounding
var barbsize = w_barbs*0.35;

/////////////////////////////////
//      3.2 Axis

var y_barbs = d3.scaleLog().range([0, h]).domain([topp, basep]);

/////////////////////////////////
//
//      4. Hodograph
//
/////////////////////////////////

/////////////////////////////////
//      4.1 Size

var hodoContainer = $('#convection').width()*0.5*0.9; // i.e. width of hodograph container
var hodoMargin = {"top": hodoContainer*0.05, "right": hodoContainer*0.04, "bottom": hodoContainer*0.05, "left": hodoContainer*0.03};
var hodo_w = hodoContainer - hodoMargin.right - hodoMargin.left;
var hodo_h = hodoContainer - hodoMargin.top - hodoMargin.bottom; 

/////////////////////////////////
//      4.2 Domain & Axis

const hodo_degrees = d3.range(0,360,30);
var r = d3.scaleLinear().range([0,hodo_w]).domain([0,190]);

//////////////////////////////////////////////////////
//
//      5. International Standard Atmosphere (ISA)
//
//////////////////////////////////////////////////////

// (https://www.skybrary.aero/bookshelf/books/2263.pdf)
const isa = [{"tmpc":15.0,"pres":1013,"hghtft":0},{"tmpc":13.0,"pres":977,"hghtft":1000},{"tmpc":11.0,"pres":942,"hghtft":2000},{"tmpc":9.1,"pres":908,"hghtft":3000},{"tmpc":7.1,"pres":875,"hghtft":4000},{"tmpc":5.1,"pres":843,"hghtft":5000},{"tmpc":3.1,"pres":812,"hghtft":6000},{"tmpc":1.1,"pres":782,"hghtft":7000},{"tmpc":-0.8,"pres":753,"hghtft":8000},{"tmpc":-2.8,"pres":724,"hghtft":9000},{"tmpc":-4.8,"pres":697,"hghtft":10000},{"tmpc":-6.8,"pres":670,"hghtft":11000},{"tmpc":-8.8,"pres":644,"hghtft":12000},{"tmpc":-10.8,"pres":619,"hghtft":13000},{"tmpc":-12.7,"pres":595,"hghtft":14000},{"tmpc":-14.7,"pres":572,"hghtft":15000},{"tmpc":-16.7,"pres":549,"hghtft":16000},{"tmpc":-18.7,"pres":527,"hghtft":17000},{"tmpc":-20.7,"pres":506,"hghtft":18000},{"tmpc":-22.6,"pres":485,"hghtft":19000},{"tmpc":-24.6,"pres":466,"hghtft":20000},{"tmpc":-26.6,"pres":446,"hghtft":21000},{"tmpc":-28.6,"pres":428,"hghtft":22000},{"tmpc":-30.6,"pres":410,"hghtft":23000},{"tmpc":-32.5,"pres":393,"hghtft":24000},{"tmpc":-34.5,"pres":376,"hghtft":25000},{"tmpc":-36.5,"pres":360,"hghtft":26000},{"tmpc":-38.5,"pres":344,"hghtft":27000},{"tmpc":-40.5,"pres":329,"hghtft":28000},{"tmpc":-42.5,"pres":315,"hghtft":29000},{"tmpc":-44.4,"pres":301,"hghtft":30000},{"tmpc":-46.4,"pres":287,"hghtft":31000},{"tmpc":-48.4,"pres":274,"hghtft":32000},{"tmpc":-50.4,"pres":262,"hghtft":33000},{"tmpc":-52.4,"pres":250,"hghtft":34000},{"tmpc":-54.3,"pres":238,"hghtft":35000},{"tmpc":-56.3,"pres":227,"hghtft":36000},{"tmpc":-56.5,"pres":217,"hghtft":37000},{"tmpc":-56.5,"pres":206,"hghtft":38000},{"tmpc":-56.5,"pres":197,"hghtft":39000},{"tmpc":-56.5,"pres":188,"hghtft":40000},{"tmpc":-56.5,"pres":147,"hghtft":45000},{"tmpc":-56.5,"pres":100,"hghtft":NaN}];
const FLs = [50,100,150,200,250,300,350,400,450]; // Flight levels to label up  
       
/////////////////////////////////////
//
//      6. Various path generators
//
/////////////////////////////////////

// Temperature
var tline = d3.line()   
    .curve(d3.curveLinear) 
	.x(function(d,i) { return x(d.tmpc) + (y(basep)-y(d.pres))/tan; })
	.y(function(d,i) { return y(d.pres); });

// Dewpoint temperature
var tdline = d3.line()
    .curve(d3.curveLinear) 
	.x(function(d,i) { return x(d.dwpc) + (y(basep)-y(d.pres))/tan; })
    .y(function(d,i) { return y(d.pres); });
    
// Hodoline
var hodoline = d3.lineRadial()
    .radius(function(d) { return r(d.wspd); })
    .angle(function(d) { return (d.wdir+180)*(Math.PI/180); });
    
// Bisector function for tooltips    
var bisectTemp = d3.bisector(function(d) { return d.pres; }).left;