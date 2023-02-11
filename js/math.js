//-
//      math.js
//-

//      Table of Contents
//      1. Constants      
//      2. Functions
//          2.1 Convert Units
//          2.2 Temperature & Pressure
//          2.3 Shear & Storm motion
//          2.4 Convection
//          2.5 Aviation

//-
//-
//-

/////////////////////////////////
//
//      1. Constants
//
/////////////////////////////////

const Lv = 2.5 * Math.pow(10,6),
      Rd = 287.04,
      eps = 0.62197,
      cpd = 1005,
      cw = 4218,
      e0 = 0.61078 * Math.pow(10,3),
      T0 = 273.16,
      g = 9.82,
      densW = 997;  // Density of water

const deg2rad = (Math.PI/180), // Converts degrees to radians
      rad2deg = (180/Math.PI), // Converts radians to degrees
      tan = Math.tan(55*deg2rad);

/////////////////////////////////
//
//      2. Functions
//
/////////////////////////////////

/////////////////////////////////
//      2.1 Convert Units

// Converts em to px
function emToPx(em) {

    var el = document.getElementById('convection');
    var style = window.getComputedStyle(el, null).getPropertyValue('font-size');
    var fontSize = parseFloat(style); 
    var px = em*fontSize;

    return px;

}

// Converts between arithmetic and geographic degrees (works both ways)
function arith_geo_deg(deg) {

    if (deg < 0) { deg += 360; }

    return (450 - deg) % 360;

}

//////////////////////////////////////
//      2.2 Temperature & Pressure


// Calculates the wet-bulb temperature (degC) using Normand's rule
function calc_wetbulb(tmpc,dwpc,pres) {
    
    // Starting point
    var e = calc_e_es(dwpc);
    var theta = calc_theta(tmpc,pres);

    // Find the LCL
    const deltaP = 1;
    var pp_range = d3.range(10,pres,deltaP);
    var pp = pp_range.sort((a,b)=>b-a); // flip order, bottom first

    var lcl = findLCL(e,theta,pp);
    var lcl_tmpk = lcl[0];
    var lcl_pres = lcl[1];

    // Go moist adiabatically from the LCL to the starting point
    var deltaT = 0;
    for (var p=lcl_pres; p<=pres; p+=deltaP) {

        var moist_tmpk = lcl_tmpk + deltaT;
        var dt = calc_moist_gradient(moist_tmpk,p,deltaP);
        deltaT += dt;

    }

    var wetblbc = moist_tmpk - T0; 
    
    return Math.round(wetblbc * 10) / 10;

}

// Calculates potential temperature [K]
function calc_theta(tmpc,pres) {
    
    var tmpk = tmpc + T0;
    var theta = tmpk*Math.pow((1000/pres), Rd/cpd);

    return theta;

}

// Calculates vapor pressure from dewpoint or saturation vapor pressure from temperature (degC)
function calc_e_es(tmp) {
    
    var e_es = 6.11*Math.pow(10,((7.5*tmp)/(237.3 + tmp)));

    return e_es;

}

// Calculates mixing ratio from vapor pressure and pressure
function calc_mixing_ratio(e,p) {
    
    var r = (eps*e)/(p - e);

    return r; //[kg/kg]

}

// Calculates the virtual temperature
function calc_virtual_temperature(tmpk,pres,e) {

    var virt_tmpk = tmpk/(1 - (e/pres)*(1 - eps));

    return virt_tmpk;

}

// Calculates temperature from saturation mixing ratio and pressure
function calc_mix_tmpc(mix_ratio,pres) {
    
    var es = (mix_ratio*pres)/(mix_ratio + eps); // saturation vapor pressure, Wallace & Hobbs (2006) eqn 3.63 
    var mix_tmpc = (Math.log(es)*243.5 - 440.8)/(19.48 - Math.log(es)); // Bolton (1980) eqn 11
    
    return mix_tmpc

}

// Calculates dewpoint temperature from mixing ratio and pressure (Same as calc_mix_tmpc...)
function calc_mix_dwpc(r,p) {

    var e = (r*p)/(r + eps); // vapor pressure, Wallace & Hobbs (2006) eqn 3.63 
    var mix_dwpc = (Math.log(e)*243.5 - 440.8)/(19.48 - Math.log(e)); // Bolton (1980) eqn 11

    return mix_dwpc;

}

// Returns height between two pressure surfaces
function calc_hypsometric(p1,p2,t1,t2,e1,e2) {

    var virt_tmpk1 = calc_virtual_temperature(t1,p1,e1);
    var virt_tmpk2 = calc_virtual_temperature(t2,p2,e2);
        
    var avg_virt_tmpk = (virt_tmpk1 + virt_tmpk2)/2;

    var z = ((Rd*avg_virt_tmpk)/g)*Math.log(p1/p2);

    return z;
}

// Returns environmental temperature and dewpoint at given pressure
function env_t_td_from_pressure(index,pres) {

    for (var t=1; t<sounding[index][0].length; t++) {
        if (pres >= sounding[index][0][t].pres) {

            var t1 = sounding[index][0][t].tmpc;
            var t2 = sounding[index][0][t-1].tmpc;
            var td1 = sounding[index][0][t].dwpc;
            var td2 = sounding[index][0][t-1].dwpc;
            var p1 = sounding[index][0][t].pres;
            var p2 = sounding[index][0][t-1].pres;

            break;

        }
    }

    // Environmental temperature att given pressure
    tmpc = (t1 - t2)*((pres - p2)/(p1 - p2)) + t2;
    dwpc = (td1 - td2)*((pres - p2)/(p1 - p2)) + td2;

    return [tmpc, dwpc];

}

// Finds the (lowest) freezing level [m | ft]
function find_freezing_lvl(index,pp,p_sfc,t_twom,td_twom) {

    var fzlvl = 'Sfc';
    var lift_e = calc_e_es(td_twom);
    if (t_twom >= 0) {
        for (var p=0; p<pp.length; p++) {
            var env = env_t_td_from_pressure(index,pp[p]);
            var env_t = env[0];
            var env_td = env[1];
            var env_e = calc_e_es(env_td);
            if (env_t <= 0) {
                fzlvl = calc_hypsometric(p_sfc,pp[p],t_twom + T0,env_t + T0,lift_e,env_e);
                if (unit_height == 'ft') {
                    fzlvl = Math.round(fzlvl*m2hft)*100;
                } else {
                    fzlvl = Math.round(fzlvl*(m2hft/10))*10;
                }
                break;
            }
        }
    }
    
    return fzlvl;
}

function interpolate_height(step, i, height) {

    const interpolator = d3.interpolateObject(sounding[step][0][i-1], sounding[step][0][i]);
    let interpolatedObj = interpolator(1 - (height - sounding[step][0][i].hghtagl)/(sounding[step][0][i-1].hghtagl - sounding[step][0][i].hghtagl));
 
    return interpolatedObj;

}

//////////////////////////////////////
//      2.3 Shear & Storm motion

// Calculates mean wind from two arrays (of equal length), one with wind speeds
// and one with the corresponding wind directions [deg]
// http://www.webmet.com/met_monitoring/622.html
function calc_mean_wind(wdirs,wspds) {

    let w_ew = 0; // east-west component
    let w_ns = 0; // north-south component
    for (let i=0; i<wdirs.length; i++) {
        let wdir = wdirs[i];
        w_ew += wspds[i] * Math.sin(wdir*deg2rad);
        w_ns += wspds[i] * Math.cos(wdir*deg2rad);
    }
    w_ew = -1*(1/wdirs.length)*w_ew;
    w_ns = -1*(1/wdirs.length)*w_ns;

    let mean_wspd = Math.sqrt(Math.pow(w_ew,2) + Math.pow(w_ns,2));
    let mean_wdir = Math.atan2(w_ew, w_ns) * rad2deg;
    mean_wdir = mean_wdir > 180 ? mean_wdir - 180 : mean_wdir + 180;

    return {"wspd": mean_wspd, "wdir": mean_wdir};

}

// Returns the absolute value of a vector
function vector_abs_val(u, v) {

    let abs_val = Math.sqrt(Math.pow(u,2) + Math.pow(v,2));

    return abs_val;

}

// Returns the u, v components of a vector
function vector_components(vector) {

    let wdir = arith_geo_deg(vector.wdir);

    let u = -1*vector.wspd * Math.sin(wdir*deg2rad);
    let v = -1*vector.wspd * Math.cos(wdir*deg2rad);

    return {"u": u, "v": v};

}

// Converts vector components to a vector (wspd & wdir)
function comp_to_wind_vector(u, v) {

    let wspd = vector_abs_val(u, v);
    let wdir = Math.atan2(-1*v,-1*u) * rad2deg;
    if (wdir <= 0) { wdir += 360; }

    return {"wspd": wspd, "wdir": wdir}; 

}

// Calculates the absolute difference between two vectors
function calc_vector_diff(vector1, vector2) {

    let vector1_comp = vector_components(vector1);
    let u1 = vector1_comp.u;
    let v1 = vector1_comp.v;
    
    let vector2_comp = vector_components(vector2);
    let u2 = vector2_comp.u;
    let v2 = vector2_comp.v;
    
    let vector_diff = Math.sqrt(Math.pow((v1-v2),2) + Math.pow((u1-u2),2));

    return vector_diff;

}

// Calculates the cross product between two vectors
function cross_product(v1, v2) {

    let x = v1[1]*v2[2] - v1[2]*v2[1];
    let y = v1[2]*v2[0] - v1[0]*v2[2];
    let z = v1[0]*v2[1] - v1[1]*v2[0];
    
    return [x, y, z];

}

// Calculates bulk shear [m/s] between sfc and given level [km]
function calc_bulk_shear(step,top_km) {

    const shear_lvls = [0,1,3,6];
    let lvl_index = shear_lvls.indexOf(top_km);

    let top = {
                "wdir": deg2rad*hodoData[step][0][lvl_index][0][0].wdir,
                "wspd": hodoData[step][0][lvl_index][0][0].wspd
            };

    let sfc = {
                "wdir": deg2rad*hodoData[step][0][0][0][0].wdir,
                "wspd": hodoData[step][0][0][0][0].wspd
            };

    let bulk_shear = calc_vector_diff(top, sfc);

    return Math.round(bulk_shear);

}

// Calculates the bulk richardson number (brn)
function calc_brn(step,cape) {

    // Collect wind from sounding
    let wdirs06 = [], wspds06 = [], wdirs005 = [], wspds005 = [];
    for (let i=0; i<sounding[step][0].length; i++) {
        let height_agl = sounding[step][0][i].hghtagl;
        if (height_agl <= 6000) {
            wdirs06.push(sounding[step][0][i].wdir);
            wspds06.push(sounding[step][0][i].wspd);
            if (height_agl <= 500) {
                wdirs005.push(sounding[step][0][i].wdir);
                wspds005.push(sounding[step][0][i].wspd);
            }
        } else {
            break;
        }
    }

    // Mean wind
    let mean_wind06 = calc_mean_wind(wdirs06, wspds06); // Mean wind 0-6 km [m/s]
    let mean_wind005 = calc_mean_wind(wdirs005, wspds005); // Mean wind 0-0.5 km [m/s]
    
    // Vector difference
    let mean_wind_diff = calc_vector_diff(mean_wind06, mean_wind005);

    // BRN
    let brn = Math.round(cape / (0.5 * Math.pow(mean_wind_diff,2))); // Markowski and Richardson (2010), eqn 8.1
    
    return brn;

}

// Calculates the storm relative helicity (srh)
function calc_srh(step,top_km,storm_motion) {

    // Collect wind from sounding
    let u = [], v = [];
    for (let i=0; i<sounding[step][0].length; i++) {
        let height_agl = sounding[step][0][i].hghtagl;
        if (height_agl < top_km*1000) {
            let wspd = sounding[step][0][i].wspd;
            let wdir = sounding[step][0][i].wdir;
            let vector_comp = vector_components({"wspd": wspd, "wdir": wdir});
            u.push(vector_comp.u);
            v.push(vector_comp.v);
        } else {
            // Interpolate to and add top_km
            let interpolated = interpolate_height(step, i, top_km*1000); 
            let vector_comp = vector_components({"wspd": interpolated.wspd, "wdir": interpolated.wdir});
            u.push(vector_comp.u);
            v.push(vector_comp.v);
            break;
        }
    }

    // Storm motion
    let storm_comp = vector_components(storm_motion);
    let cx = storm_comp.u;
    let cy = storm_comp.v;

    // Storm relative helicity
    let srh = 0;
    for (let i=0; i<u.length-1; i++) {
        srh -= (u[i+1] - cx) * (v[i] - cy) - (u[i] - cx) * (v[i+1] - cy); // Markowski and Richardson (2010), eqn 8.15
    } 

    return Math.round(srh);

}

// "30R75" storm motion presented in Maddox (1976)
// 75% of the mean wind speed and +30deg of the 
// mean wind direction of 850 - 200 hPa
function maddox_storm_motion(step) {

    // Collect wind from sounding
    let wspds = [], wdirs = [];
    for (let i=0; i<sounding[step][0].length; i++) {
        let pres = sounding[step][0][i].pres;
        if (pres <= 850 && pres >= 200) {
            wspds.push(sounding[step][0][i].wspd);
            wdirs.push(sounding[step][0][i].wdir);
        }
    }
    
    let mean_wind = calc_mean_wind(wdirs, wspds);

    let maddox_wspd = mean_wind.wspd * 0.75;
    let maddox_wdir = mean_wind.wdir + 30 > 360 ? mean_wind.wdir + 30 - 360 : mean_wind.wdir + 30;

    return {"wspd": maddox_wspd, "wdir": maddox_wdir};

}

// Calculates Bunkers storm motion (Bunkers et al. 2000)
function bunkers_storm_motion(step) {

    const D = 7.5; // Deviation from the mean wind 

    // Collect wind from sounding
    let wspds06 = [], wdirs06 = [], wspds005 = [], wdirs005 = [], wspds556 = [], wdirs556 = [];
    for (let i=0; i<sounding[step][0].length; i++) {
        let height_agl = sounding[step][0][i].hghtagl;
        if (height_agl <= 6000) {
            wspds06.push(sounding[step][0][i].wspd);
            wdirs06.push(sounding[step][0][i].wdir);
            if (height_agl <= 500) {
                wspds005.push(sounding[step][0][i].wspd);
                wdirs005.push(sounding[step][0][i].wdir);
            }
            if (height_agl >= 5500 && height_agl <= 6000) {
                wspds556.push(sounding[step][0][i].wspd);
                wdirs556.push(sounding[step][0][i].wdir);
            }
        } else {
            let interpolated = interpolate_height(step, i, 6000);
            wspds06.push(interpolated.wspd);
            wdirs06.push(interpolated.wdir);
            wspds556.push(interpolated.wspd);
            wdirs556.push(interpolated.wdir);
            break;
        }
    }

    // Mean wind
    let mean_wind06 = calc_mean_wind(wdirs06,wspds06); // sfc - 6 km
    let mean_wind06_comp = vector_components(mean_wind06);

    let mean_wind005 = calc_mean_wind(wdirs005,wspds005); // sfc - 500 m
    let mean_wind005_comp = vector_components(mean_wind005);
    
    let mean_wind556 = calc_mean_wind(wdirs556,wspds556); // 5.5 km - 6 km
    let mean_wind556_comp = vector_components(mean_wind556);

    // Shear
    let shear06_comp_u = mean_wind556_comp.u - mean_wind005_comp.u;
    let shear06_comp_v = mean_wind556_comp.v - mean_wind005_comp.v;
    let shear06_abs = vector_abs_val(shear06_comp_u,shear06_comp_v);
    
    // Cross product between shear vector and k (unit vector)
    let cross = cross_product([shear06_comp_u,shear06_comp_v,0], [0,0,-1]);
    
    // Right mover
    let bunkers_right_u = mean_wind06_comp.u + (D / shear06_abs) * cross[0];
    let bunkers_right_v = mean_wind06_comp.v + (D / shear06_abs) * cross[1];

    let bunkers_right = comp_to_wind_vector(bunkers_right_u,bunkers_right_v);

    // Left mover
    let bunkers_left_u = mean_wind06_comp.u - (D / shear06_abs) * cross[0];
    let bunkers_left_v = mean_wind06_comp.v - (D / shear06_abs) * cross[1];

    let bunkers_left = comp_to_wind_vector(bunkers_left_u,bunkers_left_v);

    return {"right_mover": bunkers_right, "left_mover": bunkers_left};

}

// Calculates corfidi vectors (Corfidi 2003)
function corfidi_storm_motion(step) {

    // Collect wind from sounding
    let wspds = [], wdirs = [], llj = {"wdir": 0, "wspd": 0};
    for (let i=0; i<sounding[step][0].length; i++) {
        let pres = sounding[step][0][i].pres;
        let wspd = sounding[step][0][i].wspd;
        if (pres <= 850 && pres >= 300) {           // Cloud layer (cl) (850-300 hPa)
            wspds.push(sounding[step][0][i].wspd);
            wdirs.push(sounding[step][0][i].wdir);
        }
        if (pres >= 850 && wspd > llj.wspd) {      // Low level jet (llj), strongest wind sfc -> 850 hPa
            llj.wspd = wspd;
            llj.wdir = sounding[step][0][i].wdir;
        }
    }
    
    let cl = calc_mean_wind(wdirs, wspds);
    let cl_comp = vector_components(cl);
    let llj_comp = vector_components(llj);
    
    // Corfidi upshear vector
    let corfidi_upshear_u = cl_comp.u - llj_comp.u;
    let corfidi_upshear_v = cl_comp.v - llj_comp.v;
    let corfidi_upshear = comp_to_wind_vector(corfidi_upshear_u, corfidi_upshear_v);

    // Corfidi downshear vector
    let corfidi_downshear_u = cl_comp.u + corfidi_upshear_u;
    let corfidi_downshear_v = cl_comp.v + corfidi_upshear_v;
    let corfidi_downshear = comp_to_wind_vector(corfidi_downshear_u, corfidi_downshear_v);

    return {"upshear": corfidi_upshear, "downshear": corfidi_downshear}; // 180 gr fel?

}

// Adds an arrow to storm motion vector
function storm_arrow (storm_motion) {

    let stormVector = [[{"wdir": 0, "wspd": 0}, {"wdir": storm_motion.wdir, "wspd": storm_motion.wspd*ms2kt}]];

    stormVector[0].push({"wdir": storm_motion.wdir + 50/storm_motion.wspd*ms2kt, "wspd": storm_motion.wspd*ms2kt - 5});
    stormVector[0].push({"wdir": storm_motion.wdir - 50/storm_motion.wspd*ms2kt, "wspd": storm_motion.wspd*ms2kt - 5});
    stormVector[0].push({"wdir": storm_motion.wdir, "wspd": storm_motion.wspd*ms2kt});

    return stormVector;

}

//////////////////////////////////////
//      2.4 Convection

// Calculates deltaT using the moist adiabatic lapse rate
function calc_moist_gradient(m_tmp,m_pres,dp) {

    var m_tmp_c = m_tmp - T0; // deg C
    var es = 6.112*Math.exp((17.67*m_tmp_c)/(m_tmp_c+243.5)); // saturation vapor pressure, Bolton (1980) eqn 10 
    var rs = eps*(es/(m_pres-es)); // saturation mixing ratio, Wallace & Hobbs (2006) eqn 3.63
    var moist_gradient = (1/m_pres)*((Rd*m_tmp+Lv*rs)/((cpd-cw*rs) + (Math.pow(Lv,2)*rs*eps)/(Rd*Math.pow(m_tmp,2)))); // Bakhshaii & Stull (2013) eqn 10

    var dt = moist_gradient*dp;

    return dt;

}

// Returns temperature and pressure of LCL 
function findLCL (lift_e,theta,pp) {

    var mix_ratio = 621.97*((lift_e)/(pp[0] - lift_e))/1000;

    var lcl_tmpk; var lcl_pres
    for (var k=0; k<pp.length; k++) {
        var dry_tmpk = theta / Math.pow(1000/pp[k], Rd/cpd);
        var mix_tmpc = calc_mix_tmpc(mix_ratio,pp[k]);
        var mix_tmpk = mix_tmpc + T0;

        if (dry_tmpk <= mix_tmpk) {
            lcl_tmpk = dry_tmpk;
            lcl_pres = pp[k];
            break;
        }
    }

    return [lcl_tmpk, lcl_pres];

}

// Going moist adiabatic from the LCL to find where parcel_tmp >= env_tmp
// Returns temperature and pressure of LFC (might be two LFCs in case of capping inversion) 
function findLFC (step,lcl_tmpk,pp_moist_range) {

    var lfcs = [];
    var deltaT = 0; var nr_of_lfcs = 0; var nr_of_els = 0;
    var free_convection; // true if parcel is warmer than environment above the (first) lfc 
    
    for (var j=0; j<pp_moist_range.length; j++) { 
        var parc_pres = pp_moist_range[j];

        var parc_tmpk =  lcl_tmpk + deltaT;
        var dt = calc_moist_gradient(parc_tmpk,parc_pres,dp);
        deltaT -= dt;

        var env = env_t_td_from_pressure(step,parc_pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;

        if (virtual_temperature_correction) {
            var parc_e = calc_e_es(parc_tmpk - T0); //parcel tmp = dwp above the LCL
            var parc_virt_tmpk = calc_virtual_temperature(parc_tmpk, parc_pres, parc_e);
            
            var env_e = calc_e_es(env_dwpk - T0);
            var env_virt_tmpk = calc_virtual_temperature(env_tmpk, parc_pres, env_e);       

            if (parc_virt_tmpk >= env_virt_tmpk && (nr_of_lfcs == 0 || nr_of_els == 1)) {
                lfcs[nr_of_lfcs] = {
                    "lfc_tmpk":parc_tmpk,
                    "lfc_pres":parc_pres,
                    "lfc_env_tmpk":env_tmpk,
                    "lfc_env_dwpk": env_dwpk
                };
                nr_of_lfcs += 1;
                free_convection = true;
                if (nr_of_lfcs == 2) { //max two lfcs
                    break;
                }
            }
            if (parc_virt_tmpk <= env_virt_tmpk && nr_of_lfcs == 1 && free_convection) { // check for equilibrium level
                nr_of_els += 1;
                free_convection = false;
            }
        } else {
            if (parc_tmpk >= env_tmpk && (nr_of_lfcs == 0 || nr_of_els == 1)) {
                lfcs[nr_of_lfcs] = {
                    "lfc_tmpk":parc_tmpk,
                    "lfc_pres":parc_pres,
                    "lfc_env_tmpk":env_tmpk,
                    "lfc_env_dwpk": env_dwpk
                };
                nr_of_lfcs += 1;
                free_convection = true;
                if (nr_of_lfcs == 2) { //max two lfcs
                    break;
                }
            }
            if (parc_tmpk <= env_tmpk && nr_of_lfcs == 1 && free_convection) { // check for equilibrium level
                nr_of_els += 1;
                free_convection =  false;
            }
        }
    }
    if (nr_of_lfcs == 0) { // if no LFC can be found
        lfcs[nr_of_lfcs] = {
            "lfc_tmpk":'---',
            "lfc_pres":'---',
            "lfc_env_tmpk":'---',
            "lfc_env_dwpk": '---'
        };
    }

    return lfcs;

}

// Going moist adiabatic from the LFC to find where parcel_tmp <= env_tmp
// Returns temperature and pressure of the EL
function findEL (step,lfc_tmpk,pp_lfc_range) {

    var el_tmpk = '---'; var el_pres = '---'; var el_env_tmpk = '---'; var el_env_dwpk = '---';
    
    var deltaT = 0;
    for (var j=0; j<pp_lfc_range.length; j++) {
        var parc_pres = pp_lfc_range[j];

        var parc_tmpk =  lfc_tmpk + deltaT;
        var dt = calc_moist_gradient(parc_tmpk,parc_pres,dp);
        deltaT -= dt;
       
        var env = env_t_td_from_pressure(step,parc_pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;

        if (virtual_temperature_correction) {
            var parc_e = calc_e_es(parc_tmpk - T0); //parcel tmp = dwp above the LCL
            var parc_virt_tmpk = calc_virtual_temperature(parc_tmpk, parc_pres, parc_e);
            
            var env_e = calc_e_es(env_dwpk - T0);
            var env_virt_tmpk = calc_virtual_temperature(env_tmpk,parc_pres,env_e);

            if (parc_virt_tmpk <= env_virt_tmpk) {
                el_tmpk = parc_tmpk;
                el_pres = parc_pres;
                el_env_tmpk = env_tmpk;
                el_env_dwpk = env_dwpk;
                break;
            }
        } else {
            if (parc_tmpk <= env_tmpk) {
                el_tmpk = parc_tmpk;
                el_pres = parc_pres;
                el_env_tmpk = env_tmpk;
                el_env_dwpk = env_dwpk;
                break;
            }
        }

    }

    return [el_tmpk, el_pres, el_env_tmpk, el_env_dwpk];

}

// Finds convective temperature, i.e. surface temperature when lcl=lfc
function find_convective_temperature(step,pp,twom_tmpc,twom_dwpc,sfc_press) {

    var conv_tmpc = '&geq;45';
    for (var t=twom_tmpc-5; t<45; t+=0.1) {  // -5 to account for superadiabatic conditions
        var theta = calc_theta(t,sfc_press);
        var e = calc_e_es(twom_dwpc);

        var lcl = findLCL(e,theta,pp);
        var lcl_tmpk = lcl[0];
        var lcl_pres = lcl[1];

        var pp_lfc_range = d3.range(topp,lcl_pres+dp,dp);
        var pp_lfc = pp_lfc_range.sort((a,b)=>b-a);

        var lfc = findLFC(step,lcl_tmpk,pp_lfc);
        var lfc_pres = lfc[0].lfc_pres;

        if (lfc_pres == lcl_pres) {
            conv_tmpc = Math.round(t*10)/10;
            break;
        }
    }

    return conv_tmpc;

}

// Integrates between the (lowest) LFC and (highest) EL
// Returns CAPE and coordinates to CAPE area
function calc_cape (step,lfc_tmpk,pp_cape) {

    var deltaT = 0; var cape = 0; var cape_coords = []; var cape_env_coords = []; var cape_label_tmpc = 0; var cape_label = [];
    var max_diff = 0;
    for (var j=0; j<pp_cape.length; j++) {
        
        var parc_tmpk =  lfc_tmpk + deltaT;
        var pres = pp_cape[j];
        var dt = calc_moist_gradient(parc_tmpk,pres,dp);
        
        var env = env_t_td_from_pressure(step,pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;
       
        var parc_e = calc_e_es(parc_tmpk - T0); //parcel tmp = dwp
        var parc_virt_tmpk = calc_virtual_temperature(parc_tmpk,pres,parc_e);
        
        var env_e = calc_e_es(env_dwpk - T0); 
        var env_virt_tmpk = calc_virtual_temperature(env_tmpk,pres,env_e);
        
        if (virtual_temperature_correction) {
            var tmp_cape = Rd*(parc_virt_tmpk - env_virt_tmpk)*Math.log(pres/(pres-dp)); // Wallace & Hobbs (2006) p.345
            if (tmp_cape > 0) {
                cape += tmp_cape;
                if ((parc_virt_tmpk - env_virt_tmpk) > max_diff) {
                    // CAPE label where we have max difference between parcel and environment
                    max_diff = parc_virt_tmpk - env_virt_tmpk;
                    cape_label = {"tmpc":parc_virt_tmpk-T0, "pres":pres};
                }
                cape_coords.push({"tmpc":parc_virt_tmpk-T0, "pres":pres});
                cape_env_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres});
            } else {
                cape_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres}); // Don't include cape < 0 (i.e. cin) in cape area (if multiple cape areas)
                cape_env_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres});
            }
        } else {
            var tmp_cape = Rd*(parc_tmpk - env_tmpk)*Math.log(pres/(pres-dp)); // Wallace & Hobbs (2006) p.345
            if (tmp_cape > 0) {
                cape += tmp_cape;
                if ((parc_tmpk - env_tmpk) > max_diff) {
                    // CAPE label where we have max difference between parcel and environment
                    max_diff = parc_tmpk - env_tmpk;
                    cape_label = {"tmpc":parc_tmpk-T0, "pres":pres};
                }
                cape_coords.push({"tmpc":parc_tmpk-T0, "pres":pres});
                cape_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            } else {
                cape_coords.push({"tmpc":env_tmpk-T0, "pres":pres}); // Don't include cape < 0 (i.e. cin) in cape area (if multiple cape areas)
                cape_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            }
        }

        deltaT -= dt;

    }

    if (cape_coords.length > 1) {
        for (var j=0; j<cape_env_coords.length; j++) {
            cape_coords.push(cape_env_coords[cape_env_coords.length-j-1]);
        }
    }

    return [cape, cape_coords, cape_label];

}

// Integrates between the SFC and LFC
// Returns CIN (and parcel coords of cin area)
function calc_cin (step,lift_theta,lift_r,lcl_pres,pp_cin) {

    var cin = 0; var cin_coords = []; var cin_env_coords = []; var cin_label = [];
    var max_diff = 0; var parc_tmpk; var env_tmpk; var parc_e;
    for (var j=0; j<pp_cin.length; j++) {
        
        var pres = pp_cin[j];

        if (pres > lcl_pres) {
            parc_tmpk = lift_theta / Math.pow(1000/pres, Rd/cpd);
        } else {
            var dt = calc_moist_gradient(parc_tmpk,pres,dp);
            parc_tmpk -= dt;
        }            
            
        var env = env_t_td_from_pressure(step,pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;

        if (virtual_temperature_correction) {
            if (pres > lcl_pres) {
                parc_e = (lift_r*pres)/(lift_r + eps); // vapor pressure, Wallace & Hobbs (2006) eqn 3.63
            } else {
                parc_e = calc_e_es(parc_tmpk - T0); //parcel tmp = dwp above the LCL
            }
            parc_virt_tmpk = calc_virtual_temperature(parc_tmpk,pres,parc_e);
            
            var env_e = calc_e_es(env_dwpk - T0); 
            env_virt_tmpk = calc_virtual_temperature(env_tmpk,pres,env_e);

            var tmp_cin = Rd*(parc_virt_tmpk - env_virt_tmpk)*Math.log(pres/(pres-dp));
            if (tmp_cin < 0) {
                cin += tmp_cin;
                if ((parc_virt_tmpk - env_virt_tmpk) < max_diff) {
                    // CIN label where we have max difference between parcel and environment
                    max_diff = parc_virt_tmpk - env_virt_tmpk;
                    cin_label = {"tmpc":parc_virt_tmpk-T0, "pres":pres};
                }
                cin_coords.push({"tmpc":parc_virt_tmpk-T0, "pres":pres});
                cin_env_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres});
            } else {
                cin_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres}); // Don't include cin > 0 (i.e. cape) in cin area (if multiple cin areas)
                cin_env_coords.push({"tmpc":env_virt_tmpk-T0, "pres":pres});
            }

        } else {
            var tmp_cin = Rd*(parc_tmpk - env_tmpk)*Math.log(pres/(pres-dp));
            if (tmp_cin < 0) {
                cin += tmp_cin;
                if ((parc_tmpk - env_tmpk) < max_diff) {
                    // CIN label where we have max difference between parcel and environment
                    max_diff = parc_tmpk - env_tmpk;
                    cin_label = {"tmpc":parc_tmpk-T0, "pres":pres};
                }
                cin_coords.push({"tmpc":parc_tmpk-T0, "pres":pres});
                cin_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            } else {
                cin_coords.push({"tmpc":env_tmpk-T0, "pres":pres}); // Don't include cin > 0 (i.e. cape) in cin area (if multiple cin areas)
                cin_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            }
        }

    }
   
    if (cin_coords.length > 1) {
        for (var j=0; j<cin_env_coords.length; j++) {
            cin_coords.push(cin_env_coords[cin_env_coords.length-j-1]);
        }
    }

    return [cin, cin_coords, cin_label];

}

// https://glossary.ametsoc.org/wiki/Precipitable_water
function calc_precipitable_water(step,sfc_press) {

    var pw = 0;

    for (var p=topp; p<=sfc_press; p+=dp) {

        var td = env_t_td_from_pressure(step, p)[1]; // dewpoint temperature
        var e = calc_e_es(td); // vapor pressure
        var r = calc_mixing_ratio(e, p); //mixing ratio, kg/kg
        
        pw += (1/(g*densW))*r*dp*100;

    }

    pw = Math.round(pw*1000); // rounds and converts from m to mm

    return pw

}

//////////////////////////////////////////////////////
//      2.5 Aviation

// (https://www.skybrary.aero/bookshelf/books/2263.pdf)
function calc_pressure_altitude(p) {

    // ISA
    // Sfc
    var isa_p0 = isa[0].pres; //hPa
    var isa_T0 = isa[0].tmpc + T0; //K
    const alpha = 0.0065; //degC/m
    // Tropopause
    const p_tropo = 226.32; //hPa
    const T_tropo = 216.65; //K
    const h_tropo = 11000; //m

    if (p > p_tropo) {
        var pres_alt = (1 - Math.pow((p/isa_p0),(alpha*Rd)/g))*(isa_T0/alpha);
    } else {
        var pres_alt = h_tropo - ((Rd*T_tropo)/g)*Math.log(p/p_tropo);
    }
    return pres_alt;

}