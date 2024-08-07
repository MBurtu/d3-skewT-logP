//-
//      main.js
//-

//      Table of Contents
//      1. Document.ready   
//          1.1 Mousewheel & Spacebar
//          1.2 Defaults
//          1.3 Markers 
//      2. Switches & Dates
//          2.1 Toggle data
//          2.2 Modal
//          2.3 Date grid
//      3. SVG
//          3.1 Containers
//          3.2 Background
//      4. Data
//          4.1 Load data
//          4.2 Draw data
//      5. Parcel profiles
//      6. Copyrights
//      7. References

//-
//-
//-

/////////////////////////////////
//
//      1. Document.ready
//
/////////////////////////////////

$(document).ready(function() {

    ////////////////////////////////////
    //      1.1 Mousewheel & Spacebar

    // Spacebar
    spaceBar = false;
    $(window).keypress(function(e) {  // Lock/Unlock timestep scroll with spacebar
        if (e.which === 32) {
            var stepID = getSoundingId();
            if (!spaceBar) {
                $("#"+stepID).addClass("locked");
                spaceBar = true;
            } else {
                $("body .hour ").removeClass("locked");
                spaceBar = false;
            }
        }
    });

    //	Initiate mousewheel
    if (document.addEventListener) {
        // Firefox
        document.addEventListener("DOMMouseScroll", wheel, false);
        // Chrome, IE
        document.addEventListener("mousewheel", wheel, false);
    }

    // Change timestep with mousewheel
    function getSoundingId(){
        var id = 0;
        $(".hour").each(function(){
            if ($(this).hasClass("selected")) {
                id = $(this).attr('id');
            }
        });
        return parseInt(id);
    }
    function handle(delta) {
        id = getSoundingId();
        if (delta > 0) {
            if (id === nrOfSoundings - 1) {
                id = 0;
            }
            else {
                id += 1;
            }
        }
        else {
            if (id === 0) {
                id = nrOfSoundings - 1;
            }
            else {
                id -= 1;
            }
        }
        $("body .hour ").removeClass("selected");
        $("#"+id).addClass("selected");
        updateData(id);
        index = id;
    }
    function wheel(event) {
        var delta = 0;
        if (!event) {
            event = window.event;
        }
        if (event.wheelDelta) {
            delta = event.wheelDelta / 120;
        }
        else if (event.detail) {
            delta = -event.detail / 3;
        }
        if (delta) {
            if (!spaceBar) {
                handle(delta);
            }
        }/*
        if (event.preventDefault) {
            event.preventDefault();
        }
        event.returnValue = false;*/
    }

    /////////////////////////////////
    //      1.2 Defaults

    // Show default tabs
    $('.tabs').click(function(){
		switchTabs($(this));
	});
 
    switchTabs($('.defaulttab'));

    // Units
    if ( unit_height == 'ft' ) {
        m2hft = 3.28084/100;  // Converts meter to hectofeet
        m2ft = 3.28084;  // Converts meter to feet
    } else {
        m2hft = 1;  // No conversion from unit in json, i.e. meter.
        m2ft = 1;  
    }
    $('.unit_height').html(unit_height);

    if ( unit_wind == 'kt' ) {
        ms2kt = 1.944;  // Converts m/s to kt
    } else {
        ms2kt = 1;  // No conversion from unit in json, i.e. m/s.
    }
    $('.unit_wind').html(unit_wind);

    /////////////////////////////////
    //      1.3 Markers

    // Draw markers on map (https://observablehq.com/@delos/intro-to-leaflet-d3-interactivity)
    
    const map = L
        .map('map', {
        center: center,
        zoom: zoom,
        maxZoom: maxZoom,
        minZoom: minZoom,
        zoomControl: false,
        scrollWheelZoom: false 
    });   
    
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add a tile to the map
    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    //initialize svg to add to map
    L.svg({clickable:true}).addTo(map) // we have to make the svg layer clickable
  
    const overlay = d3.select(map.getPanes().overlayPane).attr("class", "markers");
    const svg = overlay.select("svg").attr("pointer-events", "auto");

    d3.json("data/locations.json?" + Math.floor(Math.random() * 1000)).then(function(json){
    
        const markers = svg.selectAll("markers")
            .data(json.locations) 
            .enter().append("circle")
            .attr("cx", function(d){ return map.latLngToLayerPoint([d.lat, d.lon]).x })
            .attr("cy", function(d){ return map.latLngToLayerPoint([d.lat, d.lon]).y })
            .attr("class", "marker")
            .attr("r", "0.3em")
            .on("click", function(d) {
                $('.marker').each(function() {
                    $(this).css("stroke", "rgb(255, 187, 60)");
                });
                $(this).css("stroke", "red");
                var name = d.name;
                var fileName = d.filename;
                var icao = d.icao;
                loadSounding(fileName,name,icao);
            });
    
        // Function that update circle position if something change
        const update = () => markers
            .attr("cx", function(d){ return map.latLngToLayerPoint([d.lat, d.lon]).x })
            .attr("cy", function(d){ return map.latLngToLayerPoint([d.lat, d.lon]).y })

        // If the user change the map (zoom or drag), update circle position:
        map.on("moveend", update)
        map.on("zoomend", update)
        
    });
    // 

    // Side divs to same height as middle div
    var convectionHeight = $('#convection').height();
    $('#conv-left').css("height", convectionHeight);
    $('#conv-right').css("height", convectionHeight);
    
});

/////////////////////////////////
//
//      2. Switches and Dates
//
/////////////////////////////////

/////////////////////////////////
//      2.1 Toggle data

// Hide/Show convective data
$('.toggle_convection').on('click', function(){
    if ($('#convection').css('left') == '0px') {
        $('#convection').animate({'left':'48%'}, "slow");
        $('.toggle_convection').html('x');
    } else {
        $('#convection').animate({'left':'0'}, "slow");
        $('.toggle_convection').html('>>');
    }
});

function switchTabs(obj){
	$('.tab-content').hide();
	$('.tabs').removeClass("selected");
	var id = obj.attr("data-tab");
 
	$('#'+id).show();
	obj.addClass("selected");
}

//   Hide/Show parcel profile
$('.parcel-switch').on('click', function(){
    
    var parcels = ['surface_parcel','unstable_parcel','mixed_parcel','air-parcel'];
    var parcel = $(this).attr('id');

    var back = $(this).find('.back');
    var front = $(this).find('.front');

    if (front.position().left != 0){
        front.css("left",0);   
        back.css("background-color","#ff4d4d");
        parcelgroup.selectAll("*").remove();
        $('.air-parcel').hide();       
    } else {
        front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
        back.css("background-color","#5cd65c");
        parcelgroup.selectAll("*").remove();
        if (parcel == 'surface_parcel') {
            drawProfile(index,sb_parcel[index]);
        } else if (parcel == 'unstable_parcel') {
            drawProfile(index,mu_parcel[index]);
        } else if (parcel == 'mixed_parcel') {
            drawProfile(index,ml_parcel[index]); 
        } else if (parcel == 'air-parcel') { 
            $('.air-parcel').show();       
        }
    }
    
    // Switch off other parcels if they are active
    for (var i=0; i<parcels.length; i++) {
        var back = $('#' + parcels[i]).find('.back');
        var front = $('#' + parcels[i]).find('.front');
        if (front.position().left != 0 && parcel != parcels[i]){
            front.css("left",0);   
            back.css("background-color","#ff4d4d");
            if (parcel != 'air-parcel') { 
                $('.air-parcel').hide();       
            }
        }
    }

});

$('.storm-switch').on('click', function(){

    // hide all
    $('.storm_vector').hide();
    $('.storm-switch').each(function() {
        var back = $(this).find('.back');
        var front = $(this).find('.front');
        if (front.position().left != 0){
            front.css("left",0);   
            back.css("background-color","#ff4d4d");
        }
    });

    var storm = $(this).attr('id');
    var back = $(this).find('.back');
    var front = $(this).find('.front');

    // show or hide clicked
    if (front.position().left != 0){
        front.css("left",0);   
        back.css("background-color","#ff4d4d");
        $('.' + storm).hide();       
    } else {
        front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
        back.css("background-color","#5cd65c");
        $('.' + storm).show();       
    }

});


/////////////////////////////////
//      2.2 Modal

// Show modal
$('.modal-tag').on('click', function(){
    var modalID = $(this).attr('data-id');

    // Setup
    if (modalID == 'settings') {

        // Units
        if (unit_height == 'ft') {
            $('#feet').prop("checked", true).trigger("click");
        } else if (unit_height = 'm') {
            $('#meter').prop("checked", true).trigger("click");
        }
        if (unit_wind == 'kt') {
            $('#knots').prop("checked", true).trigger("click");
        } else if (unit_wind = 'ms') {
            $('#ms').prop("checked", true).trigger("click");
        }

        // Virtual temperature correction
        var virt_tmp_switch = $('#vir_tmp_corr');
        var back = virt_tmp_switch.find('.back');
        var front = virt_tmp_switch.find('.front');

        if (virtual_temperature_correction) {
            front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
            back.css("background-color","#5cd65c"); // green
        } else {
            front.css("left",0);   
            back.css("background-color","#ff4d4d"); // red
        }

        // Wet-bulb temperature
        var wet_bulb_switch = $('#wet-bulb_tmp');
        var back = wet_bulb_switch.find('.back');
        var front = wet_bulb_switch.find('.front');

        if (wetbulb_temperature) {
            front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
            back.css("background-color","#5cd65c"); // green
        } else {
            front.css("left",0);   
            back.css("background-color","#ff4d4d"); // red
        }

        // Frost point temperature
        var frp_switch = $('#frp_tmp');
        var back = frp_switch.find('.back');
        var front = frp_switch.find('.front');

        if (frostpoint_temperature) {
            front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
            back.css("background-color","#5cd65c"); // green
        } else {
            front.css("left",0);   
            back.css("background-color","#ff4d4d"); // red
        }

        // Storm relative helicity
        $('#srh_storm_motion').val(storm_motion);

    } else if (modalID == 'information') {
        
        // Storm relative helicity
        let storm_motion_txt = "Bunkers right mover";
        if (storm_motion == "bunkers-left") {
            storm_motion_txt = "Bunkers left mover";
        } else if (storm_motion == "maddox") {
            storm_motion_txt = "Maddox (30R75)";
        }
        $('#storm_motion').html(storm_motion_txt);

    }

    $('#' + modalID).show();

});

// Hide modal
$('.close').on('click', function(){

    $('.modal-bg').hide();

});

// Save settings
$('.save').on('click', function(){ 

    // Units
    if ( $('#feet').is(':checked') ) {
        unit_height = 'ft'
        m2hft = 3.28084/100;  // Converts meter to hectofeet
        m2ft = 3.28084;  // Converts meter to feet
    } else {
        unit_height = 'm'
        m2hft = 1;  // No conversion from unit in json, i.e. meter.
        m2ft = 1;  
    }
    $('.unit_height').html(unit_height);

    if ( $('#knots').is(':checked') ) {
        unit_wind = 'kt'
        ms2kt = 1.944;  // Converts m/s to kt
    } else {
        unit_wind = 'm/s'
        ms2kt = 1;  // No conversion from unit in json, i.e. m/s.
    }
    $('.unit_wind').html(unit_wind);

    // Virtual temperature correction
    var virt_tmp_switch = $('#vir_tmp_corr');
    var front = virt_tmp_switch.find('.front');

    if (front.position().left != 0){
        virtual_temperature_correction = true;
    } else {
        virtual_temperature_correction = false;
    }

    // Wet-bulb temperature
    var wet_bulb_switch = $('#wet-bulb_tmp');
    var front = wet_bulb_switch.find('.front');

    if (front.position().left != 0){
        wetbulb_temperature = true;
    } else {
        wetbulb_temperature = false;
    }

    // Frost point temperature
    var frp_switch = $('#frp_tmp');
    var front = frp_switch.find('.front');

    if (front.position().left != 0){
        frostpoint_temperature = true;
    } else {
        frostpoint_temperature = false;
    }

    // Storm relative helicity
    storm_motion = $('#srh_storm_motion').val();

    // Clear plot
    skewtgroup.selectAll("*").remove();
    barbgroup.selectAll("*").remove();
    hodogroup.selectAll("*").remove();
    parcelgroup.selectAll("*").remove();
    // Clear background
    svg.selectAll("*").remove(); 
    svgwind.selectAll("*").remove();
    svghodo.selectAll("*").remove();
    
    // Draw new background
    drawBackground();

    // Reload sounding with new settings
    if (typeof soundingName !== 'undefined') {
        loadSounding(soundingFileName, soundingName, soundingICAO);
    }

    $('.modal-bg').hide();

});

//  Settings that can be turned on/off
$('.settings-switch').on('click', function(){
    
    var back = $(this).find('.back');
    var front = $(this).find('.front');

    if (front.position().left != 0){
        front.css("left",0);   
        back.css("background-color","#ff4d4d"); // red
    } else {
        front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
        back.css("background-color","#5cd65c"); // green
    }

});

//  Settings that can be turned on/off
$('.wetblb-frost-switch').on('click', function(){

    // hide all
    $('.wetblb-frost-switch').each(function() {
        var back = $(this).find('.back');
        var front = $(this).find('.front');
        if (front.position().left != 0){
            front.css("left",0);   
            back.css("background-color","#ff4d4d");
        }
    });

    // show / hide clicked 
    var back = $(this).find('.back');
    var front = $(this).find('.front');

    if (front.position().left != 0){
        front.css("left",0);   
        back.css("background-color","#ff4d4d"); // red
    } else {
        front.css("left",(back.outerWidth()-front.outerWidth()) + "px");  
        back.css("background-color","#5cd65c"); // green
    }

});


/////////////////////////////////
//      2.3 Date grid

// Generate and plot date-grid
function dateGrid(modelrun) {
     
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
    const weekDays = ['sun','mon','tue','wed','thu','fri','sat'];
 
    yyyy = modelrun.substring(0,4);
    mm = parseInt(modelrun.substring(5,7)) - 1;
    dd = parseInt(modelrun.substring(8,10));
    hh = parseInt(modelrun.substring(11,13));
    var date = Date.UTC(yyyy,mm,dd,hh);
     
    $('#navigation').empty();
    var nav = '<table class="date_container">'; var row1 = '<tr>'; var row2 = '<tr>'; var j = 0; var colspan = 1;
    for (let i=0; i<lastStep; i+=timeStep) {
  
        var newDay = new Date(date);

        var month = newDay.getUTCMonth() + 1;
        if (month < 10) {
            month = '0' + month;
        }
        var day = newDay.getUTCDate();
        if (day < 10) {
           day = '0' + day;
        }
        var weekDay = weekDays[newDay.getUTCDay()];
        var hour = newDay.getUTCHours();
        if (hour < 10) {
            hour = '0' + hour;
        }
 
        if (i == lastStep - timeStep) {
            row1 += '<td class="date" colspan='+colspan+'>'+weekDay+' '+month+'-'+day+'</td>';
            row2 += '<td class="hour" id="'+j+'">'+hour+'Z</td>';
            colspan = 0;
        }
        else if (hour == 24 - timeStep) {
            row1 += '<td class="date" colspan='+colspan+' style="border-right:2px solid black;">'+weekDay+' '+month+'-'+day+'</td>';
            row2 += '<td class="hour" id="'+j+'" style="border-right:2px solid black;">'+hour+'Z</td>';
            colspan = 0;
        } else {
            row2 += '<td class="hour" id="'+j+'" style="border-right:1px solid black;">'+hour+'Z</td>';
        }
 
        date += timeStep*60*60*1000; // adds timestep hours in milliseconds
        j += 1;
        colspan += 1;
 
    }
    nav += row1 + '</tr>' + row2 + '</tr></table>';
    $('#navigation').append(nav);
    $('#' + index).addClass('selected');
     
    $(".hour").on('mouseover', function() {
        if (!spaceBar) { // if spaceBar = false, i.e. if not locked
            var i = $(this).attr('id');
            
            // change class for rollover
            $("body .hour ").removeClass("selected");
            $(this).addClass("selected");
            updateData(i);
            index = i;
        }
    });
 
}

/////////////////////////////////
//
//      3. SVG
//
/////////////////////////////////

/////////////////////////////////
//      3.1 Containers

// Create svg container for sounding
var svgContainer = d3.select("div#sounding")
    .append("svg")
    .attr("width", w + margin.right + margin.left)
    .attr("height", h + margin.top + margin.bottom)      
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create svg container for wind barbs
var svgwindContainer = d3.select("div#windbarbs")
    .append("svg")
    .attr("width", w_barbs)
    .attr("height", h + margin.top + margin.bottom)      
    .append("g")
    .attr("transform", "translate(" + 0 + "," + margin.top + ")");
    
// Create svg container for hodograph
var svghodoContainer = d3.select("div#hodobox")
    .append("svg")
    .attr("width", hodo_w + hodoMargin.right + hodoMargin.left)
    .attr("height", hodo_h + hodoMargin.top + hodoMargin.bottom)
    .append("g")
    .attr("transform", "translate(" + (hodo_w/2 + hodoMargin.left) + "," + (hodo_h/2 + hodoMargin.top) + ")");    

makeBarbTemplates();
drawBackground();

/////////////////////////////////
//      3.2 Background

function drawBackground() {

    svghodo = d3.select("div#hodobox svg g").append("g").attr("class", "hodobg");
    svg = d3.select("div#sounding svg g").append("g").attr("class", "skewtbg");
    svgwind = d3.select("div#windbarbs svg g").append("g").attr("class", "windbg");

    skewtgroup = svgContainer.append("g").attr("class", "skewt"); // put skewt lines in this group
    parcelgroup = svgContainer.append("g") // put parcels in this group
    barbgroup  = svgwindContainer.append("g").attr("class", "windbarb"); // put barbs in this group
    hodogroup = svghodoContainer.append("g").attr("class", "hodo"); // put hodo stuff in this group

    // Add clipping path
    svg.append("clipPath")
    .attr("id", "clipper")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", w)
    .attr("height", h);

    ////////////////// DRAW /////////////////////////////   
    /////////////////////////////////////////////////////
    ////////// Skewed temperature lines ////////////////

    svg.selectAll("gline")
    .data(d3.range(-110,45,2))
    .enter().append("line")
        .attr("x1", function(d) { return x(d)-0.5 + (y(basep)-y(100))/tan; })
        .attr("x2", function(d) { return x(d)-0.5; })
        .attr("y1", 0)
        .attr("y2", h)
        .attr("class", function(d) { if (d == 0) { return "tempzero"; } else if (d%10 == 0) { return "gridline"} else {return "thin_gridline"}})
        .attr("clip-path", "url(#clipper)");
    
    /////////////////////////////////////////////////////
    ///////// Logarithmic pressure lines ////////////////

    svg.selectAll("gline2")
    .data(plines)
    .enter().append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", function(d) { return y(d); })
        .attr("y2", function(d) { return y(d); })
        .attr("class", "gridline");

        
    /////////////////////////////////////////////////////
    //////////////// Adiabats  //////////////////////////

    // Lines of equal potential temperature (dry adiabat)
    var dryline = d3.line()
    .curve(d3.curveLinear)
    .x(function(theta,i) { 
        return x( ( T0 + theta ) / Math.pow( (1000/pp_dry[i]), Rd/cpd) - T0) + (y(basep)-y(pp_dry[i]))/tan;
    })
    .y(function(theta,i) { return y(pp_dry[i])} );

    // create array to plot dry adiabats
    var all = [];
    for (var i=0; i<dryad.length; i++) { 
        var z = [];
        for (var j=0; j<pp_dry.length; j++) { z.push(dryad[i]); }
        all.push(z);
    }
    // Draw dry adiabats
    svg.selectAll(".dryline")
    .data(all)
    .enter().append("path")
    .attr("class", function(d) { if (d[0]%10 == 0) {return "dryline";} else {return "thin_dryline";}})
    .attr("clip-path", "url(#clipper)")
    .attr("d", dryline);

    // Lines of equal equivalent potential temperature (moist adiabats)
    var deltaT = 0;
    var moistline = d3.line()
    .curve(d3.curveLinear)
    .x(function(baseT,i) {

        if (pp_moist[i] == 1000) {deltaT = 0;}

        var m_tmp = baseT + deltaT + T0; // Celsius -> Kelvin
        var m_pres = pp_moist[i];
        var dt = calc_moist_gradient(m_tmp,m_pres,dp);

        deltaT -= dt;

        return x(m_tmp - dt - T0) + (y(basep)-y(m_pres))/tan;
    })
    .y(function(d,i) { return y(pp_moist[i])} ); 

    // create array to plot moist adiabats
    var all = [];
    for (var i=0; i<moistad.length; i++) { 
        var z = [];
        for (var j=0; j<pp_moist.length; j++) { z.push(moistad[i]); }
        all.push(z);
    }
    // Draw moist adiabats
    svg.selectAll(".moistline")
    .data(all)
    .enter().append("path")
    .attr("class", function(d) { if (d[0]%10 == 0) {return "moistline";} else {return "thin_moistline";}})
    .attr("clip-path", "url(#clipper)")
    .attr("d", moistline);

    /////////////////////////////////////////////////////
    //////////////// Mixing ratio  //////////////////////
        
    // Lines of equal mixing ratio (Isohumes)
    var mixing_ratio = d3.line()
    .curve(d3.curveLinear)
    .x(function(mix_ratio,i) { 
        
        mix_ratio = mix_ratio/1000 // g/kg-> kg/kg
        var es = (mix_ratio*pp_mix[i])/(mix_ratio + eps); // saturation vapor pressure, Wallace & Hobbs (2006) eqn 3.63 
        var mixT = (Math.log(es)*243.5 - 440.8)/(19.48 - Math.log(es)); // Bolton (1980) eqn 11

        // Label
        if (pp_mix[i] == 600) {
            svg.append("text")
            .attr("class", "mix_label")
            .attr("text-anchor", "middle")
            .attr("x", x(mixT) + (y(basep)-y(pp_mix[i]))/tan)
            .attr("y", y(pp_mix[i])) 
            .text(mix_ratio*1000);
        }
        if (pp_mix[i] == 600 && mix_ratio*1000 == 0.1) {
            svg.append("text")
            .attr("class", "mix_unit")
            .attr("text-anchor", "middle")
            .attr("x", x(mixT) + (y(basep)-y(pp_mix[i]))/tan - 30)
            .attr("y", y(pp_mix[i])) 
            .text('[g/kg]');
        }
        
        return x(mixT) + (y(basep)-y(pp_mix[i]))/tan;
    })
    .y(function(mix_ratio,i) { return y(pp_mix[i])} );

    // create array to plot mixing ratio
    var all = [];
    for (var i=0; i<mix_ratio.length; i++) { 
        var z = [];
        for (var j=0; j<pp_mix.length; j++) { z.push(mix_ratio[i]); }
        all.push(z);
    }
    // Draw lines of constant mixing ratio
    svg.selectAll(".mixing_ratio")
    .data(all)
    .enter().append("path")
    .attr("class", "mixing_ratio")
    .attr("clip-path", "url(#clipper)")
    .attr("d", mixing_ratio);

    /////////////////////////////////////////////////////
    ////// International Standard Atmosphere (ISA) //////
    
    // (https://www.skybrary.aero/bookshelf/books/2263.pdf) //

    var isaline = d3.line()   
    .curve(d3.curveLinear)
	.x(function(d) {

        var fl = d.hghtft/100;
        if (FLs.includes(fl)) {
            if (fl < 100) { fl = '0' + fl; }
            svg.append("text")
            .attr("class", "isa_label")
            .attr("text-anchor", "left")
            .attr("x", x(d.tmpc) + (y(basep)-y(d.pres))/tan)
            .attr("y", y(d.pres)) 
            .text('FL' + fl);
        }
         
        return x(d.tmpc) + (y(basep)-y(d.pres))/tan; 
    })
	.y(function(d) {  return y(d.pres); });
    
    // Draw standard atmosphere
     svg.selectAll(".isaline")
     .data([isa])
     .enter().append("path")
     .attr("class", "isaline")
     .attr("clip-path", "url(#clipper)")
     .attr("d", isaline);

    /////////////////////////////////////////////////////
        
    // Add axes
    svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + (h-0.5) + ")").call(xAxis);
    svg.append("g").attr("class", "y axis").attr("transform", "translate(-0.5,0)").call(yAxis);
    svg.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
    //svg.append("g").attr("class", "y axis hght").attr("transform", "translate(0,0)").call(yAxis2);

    // Line along right edge of plot
    svg.append("line")
    .attr("x1", w)
    .attr("x2", w)
    .attr("y1", 0)
    .attr("y2", h)
    .attr("class", "gridline");

    // Labels
    // X-axis
    svg.append("text")
        .attr("class", "axis_label")
        .attr("text-anchor", "middle")
        .attr("x", w/2)
        .attr("y", h + margin.bottom - 5) 
        .text("temperature [°C]");
    // Y-axis
    svg.append("text")
        .attr("class", "axis_label")
        .attr("text-anchor", "middle")
        .attr("x", -h/2)
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .text("pressure [hPa]");

    /////////////////////////////////////////////////////
    //////////////// Svg with wind barbs  ///////////////
    
    svgwind.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
    
    // Line along bottom edge of plot
    svgwind.append("line")
        .attr("x1", 0)
        .attr("x2", w_barbs)
        .attr("y1", h)
        .attr("y2", h)
        .attr("class", "gridline");

    // Isobars
    svgwind.selectAll("gline")
        .data(plines)
        .enter().append("line")
        .attr("x1", 0)
        .attr("x2", w_barbs)
        .attr("y1", function(d) { return y_barbs(d); })
        .attr("y2", function(d) { return y_barbs(d); })
        .attr("class", "gridline");

    
    /////////////////////////////////////////////////////
    /////////////// Hodograph background  ///////////////
   
    // Concentric circles
    svghodo.selectAll(".circles")
        .data(d3.range(10,100,5).sort((a,b)=>b-a))
        .enter().append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function(d) { return r(d); })
        .attr("class", function(d) {if (d%10 == 0) { return "gridline";} else { return "thin_gridline";}});
    // Gridlines every 15 degrees
    for (var deg=0; deg<360; deg+=10) {
        if (deg >= 0 && deg <= 90) {
            var degTxt = deg + 270;
        } else {
            var degTxt = deg - 90;
        }
        var hodoCos = (hodo_w/2)*Math.cos(deg*deg2rad);
        var hodoSin = (hodo_w/2)*Math.sin(deg*deg2rad);
        svghodo.append("line")
            .attr("x1", 0)
            .attr("x2", hodoCos)
            .attr("y1", 0)
            .attr("y2", hodoSin)
            .attr("class", function(d) {if (deg%30 == 0) { return "gridline";} else { return "thin_gridline";}});
        // Label every 30 degrees
        if (deg%30 == 0) {
            svghodo.append("text")
                .attr("class", "hodolabels")
                .attr("text-anchor", "middle")
                .attr("transform", "translate("+hodoCos+","+hodoSin+") rotate("+(deg+90)+")")
                .text((degTxt) + '°');
        }
    }

    // Label concentric circles [kt]
    // Vertical
    svghodo.selectAll("hodolabels")
        .data(d3.range(10,100,20)).enter().append("text")
        .attr('x', 0)
        .attr('y', function (d,i) { return r(d); })
        .attr('dy', '0.4em')
        .attr('class', 'hodolabels')
        .attr('text-anchor', 'middle')
        .text(function(d) { if(d==50) {d = d + ' ' + unit_wind} return d; });
    svghodo.selectAll("hodolabels")
        .data(d3.range(10,100,20)).enter().append("text")
        .attr('x', 0)
        .attr('y', function (d,i) { return -1*r(d);})
        .attr('dy', '0.4em')
        .attr('class', 'hodolabels')
        .attr('text-anchor', 'middle')
        .text(function(d) { if(d==50) {d = d + ' ' + unit_wind} return d; });
    // Horizontal
    svghodo.selectAll("hodolabels")
        .data(d3.range(20,100,20)).enter().append("text")
        .attr('x', function (d,i) { return r(d); })
        .attr('y', 0)
        .attr('dy', '0.4em')
        .attr('class', 'hodolabels')
        .attr('text-anchor', 'middle')
        .text(function(d) { return d; });
    svghodo.selectAll("hodolabels")
        .data(d3.range(20,100,20)).enter().append("text")
        .attr('x', function (d,i) { return -1*r(d); })
        .attr('y', 0)
        .attr('dy', '0.4em')
        .attr('class', 'hodolabels')
        .attr('text-anchor', 'middle')
        .text(function(d) { return d; });
        
}


/////////////////////////////////
//
//      4. Data
//
/////////////////////////////////

/////////////////////////////////
//      4.1 Load data

function loadSounding(fileName,name,icao) {

    $('#loader').show();

    soundingName = name; // global variable containing the (header) name of the current sounding
    soundingFileName = fileName; // global variable containing the (file) name of the current sounding
    soundingICAO = icao; // global variable containing the ICAO code (if airport else 'NN')

    // Clear plot
    skewtgroup.selectAll("*").remove();
    barbgroup.selectAll("*").remove();
    hodogroup.selectAll("*").remove();
    parcelgroup.selectAll("*").remove();
    svg.selectAll("circle").remove(); // air parcel

    // Reset settings
    $("li.rollover").removeClass("selected");
    $(".on-off").each(function(){ // switch off all parcel profiles and storm motion vectors
        $(this).find(".back").css("background-color","#ff4d4d");
        $(this).find(".front").css("left",0); 
    });
    spaceBar = false;

    // Add location name 
    var soundingHeader = name;
    if (soundingICAO !== "NN") { 
        soundingHeader = name + " [" + icao + "]";
    }
    $("#sounding_name").html(soundingHeader);

    drawToolTips();

    // Load data
    d3.json("data/sounding_"+fileName+".json?" + Math.floor(Math.random() * 1000)).then(function(json){
        sounding = []; // Array with all model soundings
        dateTime = []; // Array with the forecast time for each sounding
        hodoData = []; // Array with data for hodoline
        for (var s=0; s<nrOfSoundings; s++) {
            var key = Object.keys(json)[s];
            var time = `${key.substring(0, key.length - 6)}Z`; //"Subtracting" minutes and seconds
            
            var tmpStep = json[key];//.reverse();
            var soundingStep = [];
            // Convert all pressure levels to objects
            for (var j=0; j<tmpStep.pres.length; j++) {
                // Wet-bulb temperature
                var wetblbc = NaN;
                if (wetbulb_temperature) {
                    wetblbc = calc_wetbulb(tmpStep.tmpc[j], tmpStep.dwpc[j], tmpStep.pres[j]);
                 }
                // Frost point temperature
                var frpc = NaN;
                if (frostpoint_temperature) {
                    frpc = calc_frost_point(tmpStep.tmpc[j],tmpStep.dwpc[j],tmpStep.pres[j]);
                }
                var lvlObj = {
                    "pres": tmpStep.pres[j],
                    "hghtagl": tmpStep.hghtagl[j],
                    "tmpc": tmpStep.tmpc[j],
                    "dwpc": tmpStep.dwpc[j],
                    "wetblbc": wetblbc,
                    "frpc": frpc,
                    "wdir": tmpStep.wdir[j],
                    "wspd": tmpStep.wspd[j]
                };
                soundingStep.push(lvlObj);
            };
            dateTime.push(time);
            sounding.push([soundingStep]);

            // Hodoline
            const requestedLevels = [0,1,3,6,9]; // levels in km agl
            var step = []; var interpolTemp = [];
            for (var l=0; l<requestedLevels.length; l++) {
                
                if (requestedLevels[l] == 0) { continue; }

                var levels = [];
                var lvl = 1000*requestedLevels[l]; 
                var prev_lvl = 1000*requestedLevels[l-1];
                for (var i=1; i<soundingStep.length; i++) {
                    var level = []; var bindingLvl = [];
                    if (soundingStep[i].hghtagl > lvl) { 
                        // Adjust for interpolation over 360deg, e.g. between 2deg and 358deg, by adding 360deg to the lowest degree
                        var prev_lvl_wdir = soundingStep[i-1].wdir;
                        var lvl_wdir = soundingStep[i].wdir;
                        if (prev_lvl_wdir - lvl_wdir > 180) {
                            soundingStep[i].wdir += 360;
                        } else if (lvl_wdir - prev_lvl_wdir > 180) {
                            soundingStep[i-1].wdir += 360;
                        }
                        break; 
                    } 
                    if (soundingStep[i].hghtagl >= prev_lvl) {
                        if (lvl > 1000) {
                            bindingLvl.wdir = soundingStep[i-1].wdir; //Binding -> e.g. first value of 1-3km the same as the last value of 0-1km  
                            bindingLvl.wspd = soundingStep[i-1].wspd*ms2kt; // Convert to kt;
                            levels.push(bindingLvl);
                        }
                        level.wdir = soundingStep[i].wdir;
                        level.wspd = soundingStep[i].wspd*ms2kt; // Convert to kt
                        levels.push(level);
                    }
                }
                // interpolate to requested heights for each sounding 
                var interpolatedLvls = [];
                var interp = d3.interpolateObject(soundingStep[i-1],soundingStep[i]); // interp btw two levels
                var half = interp(1-(lvl - soundingStep[i].hghtagl)/(soundingStep[i-1].hghtagl - soundingStep[i].hghtagl));
                interpolatedLvls.wdir = Math.round(half.wdir,1);
                interpolatedLvls.wspd = Math.round(half.wspd*ms2kt,1);
                levels.push(interpolatedLvls);
                interpolTemp.push(interpolatedLvls);
                step.push([levels]);
            }
            hodoData.push([step]);
        }
        drawFirstHour();
        mouseoverdata = sounding[index][0].slice(0).reverse();
    
        // Indicies and convective data
        conv_data = []; sb_parcel = []; mu_parcel = []; ml_parcel = [];
        for (var s=0; s<nrOfSoundings; s++) {

            var conv_sfc_press = sounding[s][0][0].pres;
            var conv_twom_dwpc = sounding[s][0][0].dwpc;
            var conv_twom_tmpc = sounding[s][0][0].tmpc;

            // Bulk shear
            var bulk_shear01 = calc_bulk_shear(s,1);
            var bulk_shear03 = calc_bulk_shear(s,3);
            var bulk_shear06 = calc_bulk_shear(s,6);

            // Storm motion
            var maddox = maddox_storm_motion(s);
            var bunkers = bunkers_storm_motion(s);
            var corfidi = corfidi_storm_motion(s);
            
            let srh_storm_motion = '';
            if (storm_motion == 'maddox') { srh_storm_motion = maddox; }
            else if (storm_motion == 'bunkers-right') { srh_storm_motion = bunkers.right_mover; }
            else if (storm_motion == 'bunkers-left') { srh_storm_motion = bunkers.left_mover; }

            // Storm Relative Helicity (srh)
            var srh01 = calc_srh(s, 1, srh_storm_motion);
            var srh03 = calc_srh(s, 3, srh_storm_motion);

            // Convective temperature
            var pp_range = d3.range(topp,conv_sfc_press,dp);
            var pp = pp_range.sort((a,b)=>b-a); // flip order, bottom first
            var conv_tmpc = find_convective_temperature(s,pp,conv_twom_tmpc,conv_twom_dwpc,conv_sfc_press);

            // Precipitable water
            var prec_water = calc_precipitable_water(s,conv_sfc_press);

            // Freezing level
            var fzlvl = find_freezing_lvl(s,pp,conv_sfc_press,conv_twom_tmpc,conv_twom_dwpc);
            
            conv_data[s] = {
                "conv_tmpc": conv_tmpc,
                "bulk_shear01": bulk_shear01,
                "bulk_shear03": bulk_shear03,
                "bulk_shear06": bulk_shear06,
                "srh01": srh01,
                "srh03": srh03,
                "prec_water": prec_water,
                "fzlvl": fzlvl,
                "maddox": storm_arrow(maddox),
                "bunkers_right": storm_arrow(bunkers.right_mover),
                "bunkers_left": storm_arrow(bunkers.left_mover), 
                "corfidi_upshear": storm_arrow(corfidi.upshear),
                "corfidi_downshear": storm_arrow(corfidi.downshear) 
            };

            // Surface based parcel (sb)
            var sb_profile = makeProfile(s,conv_twom_tmpc,conv_twom_dwpc,conv_sfc_press,conv_sfc_press);

            sb_parcel[s] = {
                "lift_theta": sb_profile[0],
                "pp_dry_parcel": sb_profile[1],
                "lift_e": sb_profile[2],
                "lcl": sb_profile[3],
                "lcl_hght": sb_profile[4],
                "pp_moist_parcel": sb_profile[5],
                "lfc": sb_profile[6],
                "lfc1_hght": sb_profile[7],
                "lfc2_hght": sb_profile[8],
                "el": sb_profile[9],
                "el_hght": sb_profile[10],
                "el_tmpc": sb_profile[11],
                "cape": sb_profile[12],
                "cape_val": sb_profile[13],
                "cin": sb_profile[14],
                "cin_val": sb_profile[15]
            };

            // Most unstable parcel (mu) 
            // (Defaults to surface based parcel)
            // Dryg
            var mu_lift_theta = sb_profile[0];
            var mu_pp_dry_parcel = sb_profile[1];
            var mu_lift_e = sb_profile[2];
            var mu_lcl = sb_profile[3];
            var mu_lcl_hght = sb_profile[4];
            // Moist
            var mu_pp_moist_parcel = sb_profile[5];
            var mu_lfc = sb_profile[6];
            var mu_lfc1_hght = sb_profile[7];
            var mu_lfc2_hght = sb_profile[8];
            var mu_el = sb_profile[9];
            var mu_el_hght = sb_profile[10];
            var mu_el_tmpc = sb_profile[11];
            var mu_cape = sb_profile[12];
            var mu_cape_val = sb_profile[13];
            var mu_cin = sb_profile[14];
            var mu_cin_val = sb_profile[15];
            
            // Iterate the lowest 300 hPa looking for higher cape than sb
            var pp_range = d3.range(conv_sfc_press-300,conv_sfc_press,mu_dp);
            var pp = pp_range.sort((a,b)=>b-a); // flip order, bottom first
            for (var p=0; p<pp.length; p++) {
                var t_td = env_t_td_from_pressure(s,pp[p]);
                var tmpc = t_td[0];
                var dwpc = t_td[1]; 
                var mu_profile = makeProfile(s,tmpc,dwpc,pp[p],conv_sfc_press);
                var new_cape_val = mu_profile[13];
                if (new_cape_val > mu_cape_val) {
                    // Dry
                    mu_lift_theta = mu_profile[0];
                    mu_pp_dry_parcel = mu_profile[1];
                    mu_lift_e = mu_profile[2];
                    mu_lcl = mu_profile[3];
                    mu_lcl_hght = mu_profile[4];
                    // Moist
                    mu_pp_moist_parcel = mu_profile[5];
                    mu_lfc = mu_profile[6];
                    mu_lfc1_hght = mu_profile[7];
                    mu_lfc2_hght = mu_profile[8];
                    mu_el = mu_profile[9];
                    mu_el_hght = mu_profile[10];
                    mu_el_tmpc = mu_profile[11];
                    mu_cape = mu_profile[12];
                    mu_cape_val = new_cape_val;
                    mu_cin = mu_profile[14];
                    mu_cin_val = mu_profile[15];
                }
            }

            mu_parcel[s] = {
                "lift_theta": mu_lift_theta,
                "pp_dry_parcel": mu_pp_dry_parcel,
                "lift_e": mu_lift_e,
                "lcl": mu_lcl,
                "lcl_hght": mu_lcl_hght,
                "pp_moist_parcel": mu_pp_moist_parcel,
                "lfc": mu_lfc,
                "lfc1_hght": mu_lfc1_hght,
                "lfc2_hght": mu_lfc2_hght,
                "el": mu_el,
                "el_hght": mu_el_hght,
                "el_tmpc": mu_el_tmpc,
                "cape": mu_cape,
                "cape_val": mu_cape_val,
                "cin": mu_cin,
                "cin_val": mu_cin_val,
            };

            // Mixed layer parcel (ml) 
            // Average potential temperature and mixing ratio of the lowest 100hPa
            var theta = 0; var dwpc = 0; var r = 0;
            var pp_range = d3.range(conv_sfc_press-100,conv_sfc_press,dp);
            var pp = pp_range.sort((a,b)=>b-a); // flip order, bottom first
            for (var p=0; p<pp.length; p++) {
                var t_td = env_t_td_from_pressure(s,pp[p]);
                var env_theta = calc_theta(t_td[0],pp[p])
                var env_e = calc_e_es(t_td[1]);
                var env_r = calc_mixing_ratio(env_e,pp[p]);
                theta += env_theta;
                r += env_r;
            }
            var ml_theta = theta/pp.length;
            var ml_r = r/pp.length;
            var ml_tmpc = (ml_theta / Math.pow(1000/conv_sfc_press, Rd/cpd)) - T0;
            var ml_dwpc = calc_mix_dwpc(ml_r,conv_sfc_press);
            var ml_profile = makeProfile(s,ml_tmpc,ml_dwpc,conv_sfc_press,conv_sfc_press);
            
            ml_parcel[s] = {
                "lift_theta": ml_profile[0],
                "pp_dry_parcel": ml_profile[1],
                "lift_e": ml_profile[2],
                "lcl": ml_profile[3],
                "lcl_hght": ml_profile[4],
                "pp_moist_parcel": ml_profile[5],
                "lfc": ml_profile[6],
                "lfc1_hght": ml_profile[7],
                "lfc2_hght": ml_profile[8],
                "el": ml_profile[9],
                "el_hght": ml_profile[10],
                "el_tmpc": ml_profile[11],
                "cape": ml_profile[12],
                "cape_val": ml_profile[13],
                "cin": ml_profile[14],
                "cin_val": ml_profile[15]
            };

            // Bulk Richardson Number
            conv_data[s].sb_brn = calc_brn(s,sb_parcel[s].cape_val);
            conv_data[s].mu_brn = calc_brn(s,mu_parcel[s].cape_val);
            conv_data[s].ml_brn = calc_brn(s,ml_parcel[s].cape_val);

        }
        drawFirstHourText();
        $('#loader').hide();

    });

}

/////////////////////////////////
//      4.2 Draw data

function makeBarbTemplates() {
    var speeds = d3.range(0,155,5);
    barbdef = svgwindContainer.append('defs')
    speeds.forEach(function(d) {
    	var thisbarb = barbdef.append('g').attr('id', 'barb'+d);
    	
        var flags = Math.floor(d/50);
        var pennants = Math.floor((d - flags*50)/10);
        var halfpennants = Math.floor((d - flags*50 - pennants*10)/5);
        
        var px = barbsize;
        	    
		// Draw wind barb stems
        if (d != 0) {
		    thisbarb.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", barbsize);
        }

    	// Draw wind barb flags and pennants for each stem (50 kt)
	    for (var i=0; i<flags; i++) {
     		thisbarb.append("polyline")
                .attr("points", "0,"+px+" -10,"+(px)+" 0,"+(px-4))
     		    .attr("class", "flag");
     		 px -= 7;
     	}
	    // Draw pennants on each barb (10 kt)
	    for (var i=0; i<pennants; i++) {
    	    thisbarb.append("line")
     		    .attr("x1", 0)
     		    .attr("x2", -10)
     		    .attr("y1", px)
     		    .attr("y2", px+4)
     		 px -= 3;
     	}
     	// Draw half-pennants on each barb (5 kt)
        for (var i=0; i<halfpennants; i++) {
    	    thisbarb.append("line")
     		    .attr("x1", 0)
     		    .attr("x2", -5)
     		    .attr("y1", px)
     		    .attr("y2", px+2)
     		px -= 3;
     	}
        // Draw circle (0 kt)
        if (d == 0) {
            thisbarb.append("circle")    
            .attr("r", "0.2em")
            .attr("cx", 0)
            .attr("cy", 0)
        }
    });
}

function drawFirstHour() {
    // Draw initial set of lines
    if (wetbulb_temperature) {
        wetlines = skewtgroup.selectAll("wetlines")
            .data(sounding[index]).enter().append("path")
            .attr("class", "wet_line")
            .attr("clip-path", "url(#clipper)")
            .attr("d", wetline);
    }

    if (frostpoint_temperature) {
        frostlines = skewtgroup.selectAll("frostlines")
            .data(sounding[index]).enter().append("path")
            .attr("class", "frost_line")
            .attr("clip-path", "url(#clipper)")
            .attr("d", frostline);
    }

    tlines = skewtgroup.selectAll("tlines")
        .data(sounding[index]).enter().append("path")
        .attr("class", "temp_line")
        .attr("clip-path", "url(#clipper)")
        .attr("d", tline);
            
	tdlines = skewtgroup.selectAll("tdlines")
        .data(sounding[index]).enter().append("path")
        .attr("class", "dwp_line")
        .attr("clip-path", "url(#clipper)")
        .attr("d", tdline);

    // Air parcel
    sfc_press = sounding[index][0][0].pres;
    twom_dwpc = sounding[index][0][0].dwpc;
    twom_tmpc = sounding[index][0][0].tmpc;
    
    parcel_tmpc = svg.append("circle")
        .data(["tmp"])
        .attr("class", "air-parcel parcel-tmpc")    
        .attr("r", "0.2em")
        .attr("cx", x(twom_tmpc) + (y(basep)-y(sfc_press))/tan)
        .attr("cy", y(sfc_press))
        .call(d3.drag()
            .on("drag", moveParcel)
            .on("end", liftParcel)
        );
    parcel_dwpc = svg.append("circle")
        .data(["dwp"])
        .attr("class", "air-parcel parcel-dwpc")    
        .attr("r", "0.2em")
        .attr("cx", x(twom_dwpc) + (y(basep)-y(sfc_press))/tan)
        .attr("cy", y(sfc_press))
        .call(d3.drag()
            .on("drag", moveParcel)
            .on("end", liftParcel)
        );
    $('#parcel_tmpc').html(twom_tmpc + '&deg;C');
    $('#parcel_dwpc').html(twom_dwpc + '&deg;C');

    //Hodolines
    holines01 = hodogroup.selectAll("hodolines01")  //0-1 km
        .data(hodoData[index][0][0]).enter().append("path")
        .attr("class", "hodoline hodo01")
        .attr("d", hodoline);
    holines13 = hodogroup.selectAll("hodolines13")  //1-3 km
        .data(hodoData[index][0][1]).enter().append("path")
        .attr("class", "hodoline hodo13")
        .attr("d", hodoline);
    holines36 = hodogroup.selectAll("hodolines36")  //3-6 km
        .data(hodoData[index][0][2]).enter().append("path")
        .attr("class", "hodoline hodo36")
        .attr("d", hodoline);
    holines69 = hodogroup.selectAll("hodolines69")  //6-9 km
        .data(hodoData[index][0][3]).enter().append("path")
        .attr("class", "hodoline hodo69")
        .attr("d", hodoline);

    // Wind barbs
    allbarbs = barbgroup.selectAll("barbs")
        .data(sounding[index][0]).enter().append("use")
    	.attr("xlink:href", function (d) { 
            var wspdround = Math.ceil((d.wspd*ms2kt)/5)*5;
            if (d.pres >= topp) {
                return "#barb"+wspdround;
            } else {
                return "";
            } 
        })
        .attr("transform", function(d) {
            if (d.pres >= topp) {
                return "translate("+w_barbs/2+","+y(d.pres)+") rotate("+(d.wdir+180)+")";
            } else {
                return "";
            } 
        });
        

}

function drawFirstHourText() {    

    $("#bs01").html(conv_data[index].bulk_shear01);
    $("#bs03").html(conv_data[index].bulk_shear03);
    $("#bs06").html(conv_data[index].bulk_shear06);

    $("#srh01").html(conv_data[index].srh01);
    $("#srh03").html(conv_data[index].srh03);

    $("#conv_tmpc").html(conv_data[index].conv_tmpc + '&deg;C');

    $("#pw").html(conv_data[index].prec_water + ' mm');

    if (conv_data[0].fzlvl == 'Sfc') {
        $("#fzlvl").html(conv_data[index].fzlvl);
    } else {
        $("#fzlvl").html(conv_data[index].fzlvl + ' '+ unit_height + ' agl');
    }
    
    $("#lcl").html(sb_parcel[index].lcl_hght);
    $("#lfc").html(sb_parcel[index].lfc1_hght);
    $("#el").html(sb_parcel[index].el_hght);
    $("#el_tmpc").html(sb_parcel[index].el_tmpc);
    $("#cape").html(sb_parcel[index].cape_val);
    $("#cin").html(sb_parcel[index].cin_val);
    
    $("#mulcl").html(mu_parcel[index].lcl_hght);
    $("#mulfc").html(mu_parcel[index].lfc1_hght);
    $("#muel").html(mu_parcel[index].el_hght);
    $("#muel_tmpc").html(mu_parcel[index].el_tmpc);
    $("#mucape").html(mu_parcel[index].cape_val);
    $("#mucin").html(mu_parcel[index].cin_val);
    
    $("#mllcl").html(ml_parcel[index].lcl_hght);
    $("#mllfc").html(ml_parcel[index].lfc1_hght);
    $("#mlel").html(ml_parcel[index].el_hght);
    $("#mlel_tmpc").html(ml_parcel[index].el_tmpc);
    $("#mlcape").html(ml_parcel[index].cape_val);
    $("#mlcin").html(ml_parcel[index].cin_val);

    $("#brn").html(conv_data[index].sb_brn);
    $("#mubrn").html(conv_data[index].mu_brn);
    $("#mlbrn").html(conv_data[index].ml_brn);

    // Storm motion
    maddoxline = hodogroup.selectAll("maddoxline")
        .data(conv_data[index].maddox).enter().append("path")
        .attr("class", "storm_vector maddox")
        .attr("d", storm_vector);
  
    bunkers_rightline = hodogroup.selectAll("bunkers_rightline")
        .data(conv_data[index].bunkers_right).enter().append("path")
        .attr("class", "storm_vector bunkers_right")
        .attr("d", storm_vector);

    bunkers_leftline = hodogroup.selectAll("bunkers_leftline")
        .data(conv_data[index].bunkers_left).enter().append("path")
        .attr("class", "storm_vector bunkers_left")
        .attr("d", storm_vector);

    corfidi_upline = hodogroup.selectAll("corfidi_upline")
        .data(conv_data[index].corfidi_upshear).enter().append("path")
        .attr("class", "storm_vector corfidi_up")
        .attr("d", storm_vector);

    corfidi_downline = hodogroup.selectAll("corfidi_downline")
        .data(conv_data[index].corfidi_downshear).enter().append("path")
        .attr("class", "storm_vector corfidi_down")
        .attr("d", storm_vector);
  
    
    $("#model_run").html(dateTime[0]);
    dateGrid(dateTime[0]);

}

function drawToolTips() {
    // Draw T/Td tooltips
    focus = skewtgroup.append("g").attr("class", "focus tmpc").style("display", "none");
    focus.append("circle").attr("r", 4);
    focus.append("text").attr("x", 9).attr("dy", ".35em");
        
    focus2 = skewtgroup.append("g").attr("class", "focus dwpc").style("display", "none");
    focus2.append("circle").attr("r", 4);
    focus2.append("text").attr("x", -9).attr("text-anchor", "end").attr("dy", ".35em");
    
    focus3 = skewtgroup.append("g").attr("class", "focus").style("display", "none");
    focus3.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", ".35em");

    focus4 = skewtgroup.append("g").attr("class", "focus").style("display", "none");
    focus4.append("text").attr("x", w).attr("text-anchor", "end").attr("dy", ".35em");

    focus5 = skewtgroup.append("g").attr("class", "focus wetblbc").style("display", "none");
    if (wetbulb_temperature) {
        focus5.append("circle").attr("r", 4);
    } else if (frostpoint_temperature) {
        focus5 = skewtgroup.append("g").attr("class", "focus frpc").style("display", "none");
        focus5.append("circle").attr("r", 4);
    }
    
    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", w)
        .attr("height", h)
        .on("mouseover", function() { focus.style("display", null); focus2.style("display", null); focus3.style("display", null); focus4.style("display", null); focus5.style("display", null);})
        .on("mouseout", function() { focus.style("display", "none"); focus2.style("display", "none"); focus3.style("display", "none"); focus4.style("display", "none"); focus5.style("display", "none");})
        .on("mousemove", mousemove);
        
    function mousemove() {
        var y0 = y.invert(d3.mouse(this)[1]); // get y value of mouse pointer in pressure space
        var i = bisectTemp(mouseoverdata, y0, 1, mouseoverdata.length-1);
        var d0 = mouseoverdata[i - 1];
        var d1 = mouseoverdata[i];
        var d = y0 - d0.pres > d1.pres - y0 ? d1 : d0;
        
        if (d.pres >= topp) {
            focus.attr("transform", "translate(" + (x(d.tmpc) + (y(basep)-y(d.pres))/tan)+ "," + y(d.pres) + ")");
            focus2.attr("transform", "translate(" + (x(d.dwpc) + (y(basep)-y(d.pres))/tan)+ "," + y(d.pres) + ")");
            focus3.attr("transform", "translate(0," + y(d.pres) + ")");
            focus4.attr("transform", "translate(0," + y(d.pres) + ")");
            if (wetbulb_temperature) {
                focus5.attr("transform", "translate(" + (x(d.wetblbc) + (y(basep)-y(d.pres))/tan)+ "," + y(d.pres) + ")");
                focus.select("text").text("Tw: " + d.wetblbc + "°C, T: " + d.tmpc + "°C");
            } else if (frostpoint_temperature) {
                focus5.attr("transform", "translate(" + (x(d.frpc) + (y(basep)-y(d.pres))/tan)+ "," + y(d.pres) + ")");
                focus.select("text").text("Tf: " + d.frpc + "°C, T: " + d.tmpc + "°C");
            } else {
                focus.select("text").text("T: " + d.tmpc + "°C");
            }
            focus2.select("text").text("Td: " + d.dwpc + "°C");
            if (unit_height == 'ft') {
                focus3.select("text").text("-" + Math.round(d.hghtagl*m2hft)*100 + ' '+ unit_height + ' agl');
            } else {
                focus3.select("text").text("-" + Math.round(d.hghtagl*(m2hft/10))*10 + ' '+ unit_height + ' agl');
            }

            var p_altiude = calc_pressure_altitude(d.pres); // m
            var p_altiude_hft = Math.round(p_altiude*(3.28084/100)); // hectofeet
            if (p_altiude_hft >= 50) { // only show FLs from FL050 and above
                if (p_altiude_hft < 100) {
                    focus4.select("text").text("FL0" + p_altiude_hft + '-');  
                } else {
                    focus4.select("text").text("FL" + p_altiude_hft + '-');
                }
            } else {
                focus4.select("text").text("");
            }
        }
    }
}

function updateData(i) {
    // update data for lines, barbs, dots, stats
    tlines.data(sounding[i]).attr("d", tline);
    tdlines.data(sounding[i]).attr("d", tdline);
    if (wetbulb_temperature) {
        wetlines.data(sounding[i]).attr("d", wetline);
    }
    if (frostpoint_temperature) {
        frostlines.data(sounding[i]).attr("d", frostline);
    }
    allbarbs.data(sounding[i][0])
        .attr("xlink:href", function (d) { 
            var wspdround = Math.ceil((d.wspd*ms2kt)/5)*5;
            if (d.pres >= topp) {
                return "#barb"+wspdround;
            } else {
                return "";
            } 
        })
        .attr("transform", function(d,i) {
            if (d.pres >= topp) { 
                return "translate("+w_barbs/2+","+y(d.pres)+") rotate("+(d.wdir+180)+")"; 
            } else {
                return "";
            }
        });
    holines01.data(hodoData[i][0][0]).attr("d", hodoline);
    holines13.data(hodoData[i][0][1]).attr("d", hodoline);
    holines36.data(hodoData[i][0][2]).attr("d", hodoline);
    holines69.data(hodoData[i][0][3]).attr("d", hodoline);

    // Storm motion
    maddoxline.data(conv_data[i].maddox).attr("d", storm_vector);
    bunkers_rightline.data(conv_data[i].bunkers_right).attr("d", storm_vector);
    bunkers_leftline.data(conv_data[i].bunkers_left).attr("d", storm_vector);
    corfidi_upline.data(conv_data[i].corfidi_upshear).attr("d", storm_vector);
    corfidi_downline.data(conv_data[i].corfidi_downshear).attr("d", storm_vector);

    mouseoverdata = sounding[i][0].slice(0).reverse();
    
    // Clear plot from previuosly lifted parcels
    parcelgroup.selectAll("*").remove();
    // Set pressure and dewpoint from current sounding
    sfc_press = sounding[i][0][0].pres;
    twom_dwpc = sounding[i][0][0].dwpc;
    twom_tmpc = sounding[i][0][0].tmpc;
    
    // Update circle (parcel)
    parcel_tmpc.attr("cx",  x(twom_tmpc) + (y(basep)-y(sfc_press))/tan).attr("cy", y(sfc_press));
    parcel_dwpc.attr("cx",  x(twom_dwpc) + (y(basep)-y(sfc_press))/tan).attr("cy", y(sfc_press));
    $('#parcel_tmpc').html(twom_tmpc + '&deg;C');
    $('#parcel_dwpc').html(twom_dwpc + '&deg;C');

    // Convective data
    $("#bs01").html(conv_data[i].bulk_shear01);
    $("#bs03").html(conv_data[i].bulk_shear03);
    $("#bs06").html(conv_data[i].bulk_shear06);

    $("#srh01").html(conv_data[i].srh01);
    $("#srh03").html(conv_data[i].srh03);
    
    $("#conv_tmpc").html(conv_data[i].conv_tmpc + '&deg;C');

    $("#pw").html(conv_data[i].prec_water + ' mm');

    if (conv_data[i].fzlvl == 'Sfc') {
        $("#fzlvl").html(conv_data[i].fzlvl);
    } else {
        $("#fzlvl").html(conv_data[i].fzlvl + ' '+ unit_height + ' agl');
    }
    
    $("#lcl").html(sb_parcel[i].lcl_hght);
    $("#lfc").html(sb_parcel[i].lfc1_hght);
    $("#el").html(sb_parcel[i].el_hght);
    $("#el_tmpc").html(sb_parcel[i].el_tmpc);
    $("#cape").html(sb_parcel[i].cape_val);
    $("#cin").html(sb_parcel[i].cin_val);
    
    $("#mulcl").html(mu_parcel[i].lcl_hght);
    $("#mulfc").html(mu_parcel[i].lfc1_hght);
    $("#muel").html(mu_parcel[i].el_hght);
    $("#muel_tmpc").html(mu_parcel[i].el_tmpc);
    $("#mucape").html(mu_parcel[i].cape_val);
    $("#mucin").html(mu_parcel[i].cin_val);
    
    $("#mllcl").html(ml_parcel[i].lcl_hght);
    $("#mllfc").html(ml_parcel[i].lfc1_hght);
    $("#mlel").html(ml_parcel[i].el_hght);
    $("#mlel_tmpc").html(ml_parcel[i].el_tmpc);
    $("#mlcape").html(ml_parcel[i].cape_val);
    $("#mlcin").html(ml_parcel[i].cin_val);

    $("#brn").html(conv_data[i].sb_brn);
    $("#mubrn").html(conv_data[i].mu_brn);
    $("#mlbrn").html(conv_data[i].ml_brn);

    // Draw new profile if switch is green
    $('.parcel-switch').each(function(){
        var front = $(this).find('.front');
        var parcelID = $(this).attr("id");
        if (front.position().left != 0){
            if (parcelID == 'surface_parcel') {
                drawProfile(i,sb_parcel[i]);
            } else if (parcelID == 'unstable_parcel') {
                drawProfile(i,mu_parcel[i]);
            } else if (parcelID == 'mixed_parcel') {
                drawProfile(i,ml_parcel[i]);
            } 
        }
    });

}

/////////////////////////////////
//
//      5. Parcel Profiles
//
/////////////////////////////////

function moveParcel(d) {
    // Clear plot from previuosly lifted parcels
    parcelgroup.selectAll("*").remove();
    
    // Update circle position
    var move_x = testBound(d3.event.x,d); 
    var x_tmp = Math.round(x.invert(move_x - (y(basep)-y(sfc_press))/tan)*10)/10;
    
    if (d == "tmp") {
        parcel_tmpc.attr("cx", move_x).attr("cy", y(sfc_press));
        $("#parcel_tmpc").html(x_tmp + "&deg;C");
    } else {
        parcel_dwpc.attr("cx", move_x).attr("cy", y(sfc_press));
        $("#parcel_dwpc").html(x_tmp + "&deg;C");
    }
}

function liftParcel(d) {

    var lift_x = d3.event.x;
    
    if (d == "tmp") {
        var td_x = parcel_dwpc.attr("cx");
        var lift_td = x.invert(td_x - (y(basep)-y(sfc_press))/tan);
        var lift_t = x.invert(lift_x - (y(basep)-y(sfc_press))/tan);
    } else {
        var t_x = parcel_tmpc.attr("cx");
        var lift_t = x.invert(t_x - (y(basep)-y(sfc_press))/tan);
        var lift_td = x.invert(lift_x - (y(basep)-y(sfc_press))/tan);
    }

    var profile = makeProfile(index,lift_t,lift_td,sfc_press,sfc_press);

    var parcel = {
        "lift_theta": profile[0],
        "pp_dry_parcel": profile[1],
        "lift_e": profile[2],
        "lcl": profile[3],
        "lcl_hght": profile[4],
        "pp_moist_parcel": profile[5],
        "lfc": profile[6],
        "lfc1_hght": profile[7],
        "lfc2_hght": profile[8],
        "el": profile[9],
        "el_hght": profile[10],
        "el_tmpc": profile[11],
        "cape": profile[12],
        "cape_val": profile[13],
        "cin": profile[14],
        "cin_val": profile[15]
    }

    drawProfile(index,parcel);

}

function makeProfile (step,lift_tmpc,lift_dwpc,lift_press,sfc_press) {

    // Potential temperature
    var lift_theta = calc_theta(lift_tmpc,lift_press);

    // Vapor pressure
    var lift_e = calc_e_es(lift_dwpc);

    // Mixing ratio
    var lift_r = calc_mixing_ratio(lift_e,lift_press);

    // Pressure range
    var pp_parcel_range = d3.range(topp,lift_press,dp);
    var pp_parcel = pp_parcel_range.sort((a,b)=>b-a); // flip order, bottom first

    // Lifting condensation level (LCL)
    var lcl = findLCL(lift_e,lift_theta,pp_parcel);
    var lcl_tmpk = lcl[0];
    var lcl_pres = lcl[1];

    var env_lcl_tmpc = env_t_td_from_pressure(step,lcl_pres)[0];
    var env_lcl_dwpc = env_t_td_from_pressure(step,lcl_pres)[1];
    var env_lcl_e = calc_e_es(env_lcl_dwpc);
    
    var lcl_hght = calc_hypsometric(sfc_press,lcl_pres,lift_tmpc+T0,env_lcl_tmpc+T0,lift_e,env_lcl_e);
    
    if (unit_height == 'ft') {
        var lcl_hght = Math.round(lcl_hght*m2hft)*100;
    } else {
        var lcl_hght = Math.round(lcl_hght*(m2hft/10))*10;
    }
    
    // Dry (->LCL) and moist (LCL->) pressure ranges
    var pp_dry_parcel_range = d3.range(lcl_pres,lift_press+dp,dp);
    var pp_dry_parcel = pp_dry_parcel_range.sort((a,b)=>b-a); 
    var pp_moist_parcel_range = d3.range(topp,lcl_pres+dp,dp);
    var pp_moist_parcel = pp_moist_parcel_range.sort((a,b)=>b-a);

    // Level of Free Convection (LFC)
    var lfc = findLFC(step,lcl_tmpk,pp_moist_parcel);
    // First LFC (for CAPE)
    var lfc1_tmpk = lfc[0].lfc_tmpk;
    var lfc1_pres = lfc[0].lfc_pres;
    var env_lfc1_tmpk = lfc[0].lfc_env_tmpk;
    var env_lfc1_dwpk = lfc[0].lfc_env_dwpk;
    var env_lfc1_e = calc_e_es(env_lfc1_dwpk - T0);
    // Second LFC (for EL and CIN) (most often identical to the first one...)
    var lfc2_tmpk = lfc[lfc.length-1].lfc_tmpk;
    var lfc2_pres = lfc[lfc.length-1].lfc_pres;
    var env_lfc2_tmpk = lfc[lfc.length-1].lfc_env_tmpk;
    var env_lfc2_dwpk = lfc[lfc.length-1].lfc_env_dwpk;
    var env_lfc2_e = calc_e_es(env_lfc2_dwpk - T0);

    var lfc1_hght = '---'; var lfc2_hght = '---'; var el = []; var el_hght = '---'; var el_tmpc = '---'; var cape_val = 0; var cape = []; var cin_val = 0; var cin = [];
    if (lfc1_tmpk != '---') {

        var lfc1_hght = calc_hypsometric(sfc_press,lfc1_pres,lift_tmpc+T0,env_lfc1_tmpk,lift_e,env_lfc1_e);
        var lfc2_hght = calc_hypsometric(sfc_press,lfc2_pres,lift_tmpc+T0,env_lfc2_tmpk,lift_e,env_lfc2_e);
        if (unit_height == 'ft') {
            var lfc1_hght = Math.round(lfc1_hght*m2hft)*100;
            var lfc2_hght = Math.round(lfc2_hght*m2hft)*100;
        } else {
            var lfc1_hght = Math.round(lfc1_hght*(m2hft/10))*10;
            var lfc2_hght = Math.round(lfc2_hght*(m2hft/10))*10;
        }

        var pp_lfc_parcel_range = d3.range(topp,lfc2_pres+dp,dp);
        var pp_lfc_parcel = pp_lfc_parcel_range.sort((a,b)=>b-a);
        // Equilibrium level (EL) (starting at the second LFC)
        var el = findEL(step,lfc2_tmpk,pp_lfc_parcel);
        var el_pres = el[1];
        var env_el_tmpk = el[2];
        var env_el_dwpk = el[3];

        var env_el_e = calc_e_es(env_el_dwpk - T0);

        var el_hght = calc_hypsometric(sfc_press,el_pres,twom_tmpc+T0,env_el_tmpk,lift_e,env_el_e);
        if (unit_height == 'ft') {
            var el_hght = Math.round(el_hght*m2hft)*100;
        } else {
            var el_hght = Math.round(el_hght*(m2hft/10))*10;
        }

        var el_tmpc = Math.round(env_el_tmpk - T0); // parcel tmp = env tmp at EL

        // Convective Available Potential Energy (CAPE) (starting at the lowest LFC)
        var pp_cape_range = d3.range(el_pres,lfc1_pres+dp,dp);
        var pp_cape = pp_cape_range.sort((a,b)=>b-a);
        var cape = calc_cape(step,lfc1_tmpk,pp_cape);
        var cape_val = Math.round(cape[0]);

        // Convective InhibitioN (CIN) (up to the highest LFC)
        var pp_cin_range = d3.range(lfc2_pres,lift_press,dp);
        var pp_cin = pp_cin_range.sort((a,b)=>b-a);
        var cin = calc_cin(step,lift_theta,lift_r,lcl_pres,pp_cin);
        var cin_val = Math.round(cin[0]);
        
    }

    return [lift_theta,pp_dry_parcel,lift_e,lcl,lcl_hght,pp_moist_parcel,lfc,lfc1_hght,lfc2_hght,el,el_hght,el_tmpc,cape,cape_val,cin,cin_val];

}

function drawProfile(step,profile) {
    var theta = profile.lift_theta;
    var pp_dry_parcel = profile.pp_dry_parcel;
    var lift_e = profile.lift_e;
    var lcl = profile.lcl;
    var lcl_hght = profile.lcl_hght;
    var pp_moist_parcel = profile.pp_moist_parcel;
    var lfc = profile.lfc;
    var lfc1_hght = profile.lfc1_hght;
    var lfc2_hght = profile.lfc2_hght;
    var el = profile.el;
    var el_hght = profile.el_hght;
    var cape = profile.cape;
    var cape_val = profile.cape_val;
    var cin = profile.cin;
    var cin_val = profile.cin_val;
    
    // If virtual temperature correction is ON draw virtual profile as well
    if (virtual_temperature_correction) {
        // Sounding virtual temperature line
        var virtualTemperature = d3.line()
        .curve(d3.curveLinear)
        .x(function(d,i) { 
            var e = calc_e_es(d.dwpc);
            var virt_tmpk = calc_virtual_temperature(d.tmpc+T0,d.pres,e);
            return x(virt_tmpk - T0) + (y(basep)-y(d.pres))/tan; 
        })
        .y(function(d,i) { return y(d.pres); });

        parcelgroup.selectAll(".virtual-temperature-line")
            .data(sounding[step]).enter().append("path")
            .attr("class", "virtual-temperature-line")
            .attr("clip-path", "url(#clipper)")
            .attr("d", virtualTemperature);

        
        var tmp_lift_tmpk = theta / Math.pow(1000/pp_dry_parcel[0], Rd/cpd);
        var virt_lift_tmpk = calc_virtual_temperature(tmp_lift_tmpk,pp_dry_parcel[0],lift_e);
        var virt_theta = calc_theta(virt_lift_tmpk - T0, pp_dry_parcel[0]);
        
        // Draw parcel profile
        // Dry adiabat
        var parcelVirtualDryLine = d3.line()
        .curve(d3.curveLinear)
        .x(function(d,i) {
            
            var dry_tmpk = virt_theta / Math.pow(1000/pp_dry_parcel[i], Rd/cpd);

            return x(dry_tmpk - T0) + (y(basep)-y(pp_dry_parcel[i]))/tan;
        })
        .y(function(d,i) { return y(pp_dry_parcel[i]) } );

        var all_dry = [];
        for (var i=0; i<1; i++) { 
            var z = [];
            for (var j=0; j<pp_dry_parcel.length; j++) { z.push(pp_dry_parcel[i]); }
            all_dry.push(z);
        }

        parcelgroup.selectAll(".parcel_virtual_dry_line")
            .data(all_dry)
            .enter().append("path")
            .attr("class", "dry_virtual_parcel_line")
            .attr("clip-path", "url(#clipper)")
            .attr("d", parcelVirtualDryLine);

        // Moist adiabat
        var deltaT = 0;
        var lcl_tmpk = lcl[0];
        var lcl_e = calc_e_es(lcl_tmpk - T0); // tmp = dwp
        var lcl_pres = lcl[1];
        var lcl_virt_tmpk = calc_virtual_temperature(lcl_tmpk,lcl_pres,lcl_e);

        var parcelVirtualMoistLine = d3.line()
        .curve(d3.curveLinear)
        .x(function(d,i) {
            
            var parc_tmpk =  lcl_tmpk + deltaT;
            var parc_pres = pp_moist_parcel[i];
            var dt = calc_moist_gradient(parc_tmpk,parc_pres,dp);

            var parc_e = calc_e_es(parc_tmpk - T0); //parcel tmp = dwp
            var parc_virt_tmpk = calc_virtual_temperature(parc_tmpk,parc_pres,parc_e);

            deltaT -= dt;

            return x(parc_virt_tmpk - dt - T0) + (y(basep)-y(pp_moist_parcel[i]))/tan;
        })
        .y(function(d,i) { return y(pp_moist_parcel[i]) } );

        var all_moist = [];
        for (var i=0; i<1; i++) { 
            var z = [];
            for (var j=0; j<pp_moist_parcel.length; j++) { z.push(pp_moist_parcel[i]); }
            all_moist.push(z);
        }
        
        parcelgroup.selectAll(".parcel_virtual_moist_line")
            .data(all_moist)
            .enter().append("path")
            .attr("class", "moist_virtual_parcel_line")
            .attr("clip-path", "url(#clipper)")
            .attr("d", parcelVirtualMoistLine);

    }
    
    // Draw parcel profile
    // Dry adiabat
    var parcelDryLine = d3.line()
    .curve(d3.curveLinear)
    .x(function(d,i) {
        
        var dry_tmpk = theta / Math.pow(1000/pp_dry_parcel[i], Rd/cpd);

        return x(dry_tmpk - T0) + (y(basep)-y(pp_dry_parcel[i]))/tan;
    })
    .y(function(d,i) { return y(pp_dry_parcel[i]) } );

    var all_dry = [];
    for (var i=0; i<1; i++) { 
        var z = [];
        for (var j=0; j<pp_dry_parcel.length; j++) { z.push(pp_dry_parcel[i]); }
        all_dry.push(z);
    }

    parcelgroup.selectAll(".parcel_dry_line")
        .data(all_dry)
        .enter().append("path")
        .attr("class", "dry_parcel_line")
        .attr("clip-path", "url(#clipper)")
        .attr("d", parcelDryLine);

    // Mixing ratio
    var parcelMixLine = d3.line()
    .curve(d3.curveLinear)
    .x(function(d,i) {
        
        var mix_ratio = 621.97*((lift_e)/(pp_dry_parcel[0] - lift_e))/1000;
        var mix_tmpc = calc_mix_tmpc(mix_ratio,pp_dry_parcel[i]);
        
        return x(mix_tmpc) + (y(basep)-y(pp_dry_parcel[i]))/tan;
    })
    .y(function(d,i) { return y(pp_dry_parcel[i]) } );

    parcelgroup.selectAll(".parcel_mix_line")
        .data(all_dry)
        .enter().append("path")
        .attr("class", "mix_parcel_line")
        .attr("clip-path", "url(#clipper)")
        .attr("d", parcelMixLine);

    // Moist adiabat
    var deltaT = 0;
    var lcl_tmpk = lcl[0];
    var lcl_pres = lcl[1];
    var parcelMoistLine = d3.line()
    .curve(d3.curveLinear)
    .x(function(d,i) {
        
        var parc_tmp =  lcl_tmpk + deltaT;
        var parc_pres = pp_moist_parcel[i];
        var dt = calc_moist_gradient(parc_tmp,parc_pres,dp);

        deltaT -= dt;

        return x(parc_tmp - dt - T0) + (y(basep)-y(pp_moist_parcel[i]))/tan;
    })
    .y(function(d,i) { return y(pp_moist_parcel[i]) } );

    var all_moist = [];
    for (var i=0; i<1; i++) { 
        var z = [];
        for (var j=0; j<pp_moist_parcel.length; j++) { z.push(pp_moist_parcel[i]); }
        all_moist.push(z);
    }
    
    parcelgroup.selectAll(".parcel_moist_line")
        .data(all_moist)
        .enter().append("path")
        .attr("class", "moist_parcel_line")
        .attr("clip-path", "url(#clipper)")
        .attr("d", parcelMoistLine);

    // Labels
    // First LFC
    var lfc1_tmpk = lfc[0].lfc_tmpk;
    var lfc1_pres = lfc[0].lfc_pres;
    // Second LFC
    var lfc2_tmpk = lfc[lfc.length-1].lfc_tmpk;
    var lfc2_pres= lfc[lfc.length-1].lfc_pres;
    // (Highest) EL
    var el_tmpk = el[0];
    var el_pres = el[1];
    if (virtual_temperature_correction && lfc1_tmpk !== '---') {
        lcl_tmpk = lcl_virt_tmpk;

        var lfc1_e = calc_e_es(lfc1_tmpk - T0);
        var lfc1_virt_tmpk = calc_virtual_temperature(lfc1_tmpk,lfc1_pres,lfc1_e);
        lfc1_tmpk = lfc1_virt_tmpk;

        var lfc2_e = calc_e_es(lfc2_tmpk - T0);
        var lfc2_virt_tmpk = calc_virtual_temperature(lfc2_tmpk,lfc2_pres,lfc2_e);
        lfc2_tmpk = lfc2_virt_tmpk;

        var el_e = calc_e_es(el_tmpk - T0);
        var el_virt_tmpk = calc_virtual_temperature(el_tmpk,el_pres,el_e);
        el_tmpk = el_virt_tmpk;
    }

    if (lcl_tmpk == lfc1_tmpk) {
        parcelgroup.append("text")
            .attr("class", "parcel_label")
            .attr("text-anchor", "left")
            .attr("x", x(lcl_tmpk - T0 + 4) + (y(basep)-y(lcl_pres))/tan)
            .attr("y", y(lcl_pres) + emToPx(0.2)) 
            .text('lcl, lfc: ' + Math.round(lcl_hght) + ' '+ unit_height + ' agl');   
        parcelgroup.append("line")
            .attr("x1", x(lcl_tmpk - T0) + (y(basep)-y(lcl_pres))/tan)
            .attr("x2", x(lcl_tmpk - T0 + 4) + (y(basep)-y(lcl_pres))/tan)
            .attr("y1", y(lcl_pres))
            .attr("y2", y(lcl_pres))
            .attr("class", "parcel_gridline");
    } else {
        parcelgroup.append("text")
            .attr("class", "parcel_label")
            .attr("text-anchor", "left")
            .attr("x", x(lcl_tmpk - T0 + 4) + (y(basep)-y(lcl_pres))/tan)
            .attr("y", y(lcl_pres) + emToPx(0.2)) 
            .text('lcl: ' + Math.round(lcl_hght) + ' '+ unit_height + ' agl');
        parcelgroup.append("line")
            .attr("x1", x(lcl_tmpk - T0) + (y(basep)-y(lcl_pres))/tan)
            .attr("x2", x(lcl_tmpk - T0 + 4) + (y(basep)-y(lcl_pres))/tan)
            .attr("y1", y(lcl_pres))
            .attr("y2", y(lcl_pres))
            .attr("class", "parcel_gridline");
        
        if (lfc1_tmpk != '---' && (el_hght - lfc1_hght) > 600*m2ft && (lfc1_hght - lcl_hght) > 600*m2ft) {
            parcelgroup.append("text")
                .attr("class", "parcel_label")
                .attr("text-anchor", "left")
                .attr("x", x(lfc1_tmpk - T0 + 4) + (y(basep)-y(lfc1_pres))/tan)
                .attr("y", y(lfc1_pres) + emToPx(0.2)) 
                .text('lfc: ' + Math.round(lfc1_hght) + ' '+ unit_height + ' agl');
            parcelgroup.append("line")
                .attr("x1", x(lfc1_tmpk - T0) + (y(basep)-y(lfc1_pres))/tan)
                .attr("x2", x(lfc1_tmpk - T0 + 4) + (y(basep)-y(lfc1_pres))/tan)
                .attr("y1", y(lfc1_pres))
                .attr("y2", y(lfc1_pres))
                .attr("class", "parcel_gridline");
        }
    }

    if (typeof el_tmpk !== 'undefined' && (el_hght - lcl_hght) > 500*m2ft) {
        parcelgroup.append("text")
            .attr("class", "parcel_label")
            .attr("text-anchor", "left")
            .attr("x", x(el_tmpk - T0 + 4) + (y(basep)-y(el_pres))/tan)
            .attr("y", y(el_pres) + emToPx(0.2)) 
            .text('el: ' + Math.round(el_hght) + ' ' + unit_height + ' agl');
        parcelgroup.append("line")
            .attr("x1", x(el_tmpk - T0) + (y(basep)-y(el_pres))/tan)
            .attr("x2", x(el_tmpk - T0 + 4) + (y(basep)-y(el_pres))/tan)
            .attr("y1", y(el_pres))
            .attr("y2", y(el_pres))
            .attr("class", "parcel_gridline");
    }

    // Fill CAPE area
    var cape_coords = cape[1];
    if (typeof cape_val !== 'undefined' && cape_val > 20) {
        
        var cape_label_tmpc = cape[2].tmpc;
        var cape_label_pres = cape[2].pres;
        // Draw polygon
        parcelgroup.selectAll("cape_polygon")
            .data([cape_coords])
            .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [
                        x(d.tmpc) + (y(basep)-y(d.pres))/tan,
                        y(d.pres)
                    ].join(",");
                }).join(" ");
            })
            .attr("class","cape_area");

        // Draw label
        if ((el_hght - lfc1_hght) > 600*m2ft) {
            parcelgroup.append("text")
                .attr("class", "parcel_label")
                .attr("text-anchor", "left")
                .attr("x", x(cape_label_tmpc + 4) + (y(basep)-y(cape_label_pres))/tan)
                .attr("y", y(cape_label_pres) + emToPx(0.2)) 
                .text('cape: ' + Math.round(cape_val) + ' J/kg');
            parcelgroup.append("line")
                .attr("x1", x(cape_label_tmpc) + (y(basep)-y(cape_label_pres))/tan)
                .attr("x2", x(cape_label_tmpc + 4) + (y(basep)-y(cape_label_pres))/tan)
                .attr("y1", y(cape_label_pres))
                .attr("y2", y(cape_label_pres))
                .attr("class", "parcel_gridline");
        }

    }

    // Fill CIN area
    if (typeof cin_val !== 'undefined' && cin_val <= -10) {
        var cin_coords = cin[1];  

        var cin_label_tmpc = cin[2].tmpc;
        var cin_label_pres = cin[2].pres;
        // Draw polygon
        parcelgroup.selectAll("cin_polygon")
            .data([cin_coords])
            .enter().append("polygon")
            .attr("points",function(d) { 
                return d.map(function(d) {
                    return [
                        x(d.tmpc) + (y(basep)-y(d.pres))/tan,
                        y(d.pres)
                    ].join(",");
                }).join(" ");
            })
            .attr("class","cin_area");

        // Draw label
        if ((lfc2_hght - lcl_hght) > 600*m2ft) {
            if (Math.abs(lcl_pres - cin_label_pres) < 40) {
                cin_label_pres = lcl_pres - 40; // Adjust if too close to the LCL
                cin_label_tmpc = lcl_tmpk - T0 - 2;
            }
            parcelgroup.append("text")
                .attr("class", "parcel_label")
                .attr("text-anchor", "right")
                .attr("x", x(cin_label_tmpc + 5) + (y(basep)-y(cin_label_pres))/tan)
                .attr("y", y(cin_label_pres) + emToPx(0.2)) 
                .text('cin: ' + Math.round(cin_val) + ' J/kg');
            parcelgroup.append("line")
                .attr("x1", x(cin_label_tmpc + 1) + (y(basep)-y(cin_label_pres))/tan)
                .attr("x2", x(cin_label_tmpc + 5) + (y(basep)-y(cin_label_pres))/tan)
                .attr("y1", y(cin_label_pres))
                .attr("y2", y(cin_label_pres))
                .attr("class", "parcel_gridline");
        }

    }
    
}

// Tests if pixel is within allowed range
// Temperature: sounding dwp -> +40 degC
// Dewpoint: -40 degC -> sounding tmp
function testBound(pxls,type) {

    // Position of dewpoint circle
    var td_x = parcel_dwpc.attr("cx");
    var lift_td = x.invert(td_x - (y(basep)-y(sfc_press))/tan);
    
    // Position of temperature circle
    var t_x = parcel_tmpc.attr("cx");
    var lift_t = x.invert(t_x - (y(basep)-y(sfc_press))/tan);

    if (type == "tmp") {
        var bound_x = [x(lift_td) + (y(basep)-y(sfc_press))/tan, x(40) + (y(basep)-y(sfc_press))/tan];
    } else {
        var bound_x = [x(-40) + (y(basep)-y(sfc_press))/tan, x(lift_t) + (y(basep)-y(sfc_press))/tan];
    }
    
    if (pxls > bound_x[1]) { pxls = bound_x[1]; }
    if (pxls < bound_x[0]) { pxls = bound_x[0]; }

    return pxls;

}

/////////////////////////////////
//
//      6. Copyrights
//
/////////////////////////////////

/*
The Skew-T diagram and hodograph are based on https://github.com/rsobash/d3-skewt

MIT License

Copyright (c) 2016 Ryan Sobash

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

*/

/////////////////////////////////
//
//      7. References
//
/////////////////////////////////

/*
Alduchov O. A. and R. E Eskridge, 1996: Improved Magnus Form Approximation
of Saturation Vapor Pressure, Notes and Correspondence April 1996

Bolton D., 1980: The Computation of Equivalent Potential Temperature, Monthly
Weather Review vol. 108

Bunkers, M. J., B. A. Klimowski, J. W. Zeitler, R. L. Thompson, and M. L. Weisman, 
2000: Predicting supercell motion using a new hodograph technique. Wea. Forecasting,
15, 61-79.

Corfidi S. F., 2003: Cold Pools and MCS Propagation: Forecasting the Motion 
of Downwind-Developing MCSs, Weather Forecast. 18: 997–1017.

Doswell C. A. and E. N Ramussen, 1994: The Effect of Neglecting the Virtual
Temperature Correction on CAPE Calculations, Notes and Correspondence December
1994

Maddox, R. A., 1976: An evaluation of tornado proximity wind and
stability data. Mon. Wea. Rev., 104, 133–142.

Markowski P. and Y. Richardson, 2010: Mesoscale Meteorology in Midlatitudes,
Wiley-Blackwell

Wallace J. M. and P. V. Hobbs, 2006: Atmospheric Science - An Introductory
Survey, University of Washington
*/