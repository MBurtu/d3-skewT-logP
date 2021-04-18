//-
//      math.js
//-

//      Table of Contents
//      1. Constants      
//      2. Functions
//          2.1 Convert Units
//          2.2 Temperature & Pressure
//          2.3 Shear
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

    var el = document.getElementById('lift-air-parcel');
    var style = window.getComputedStyle(el, null).getPropertyValue('font-size');
    var fontSize = parseFloat(style); 
    var px = em*fontSize;

    return px;

}

//////////////////////////////////////
//      2.2 Temperature & Pressure

// Calculates potential temperature
function calc_theta(tmpc,pres) {
    
    tmpk = tmpc + T0;
    var theta = tmpk*Math.pow((1000/pres), Rd/cpd);

    return theta;

}

// Calculates vapor pressure from dewpoint (degC)
function calc_e(dwpc) {
    
    var e = 6.11*Math.pow(10,((7.5*dwpc)/(237.3 + dwpc)));

    return e;

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
    var lift_e = calc_e(td_twom);
    if (t_twom >= 0) {
        for (var p=0; p<pp.length; p++) {
            var env = env_t_td_from_pressure(index,pp[p]);
            var env_t = env[0];
            var env_td = env[1];
            var env_e = calc_e(env_td);
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

//////////////////////////////////////
//      2.3 Shear

// Calculates bulk shear between sfc and given lvl [km]
function calc_bulk_shear(step,top_km) {

    const shear_lvls = [0,1,3,6];
    var lvl_index = shear_lvls.indexOf(top_km);

    // Sfc
    var wdir10m = deg2rad*hodoData[step][0][0][0][0].wdir;
    var wspd10m = hodoData[step][0][0][0][0].wspd;
    var u10m = wspd10m * Math.sin(wdir10m);
    var v10m = wspd10m * Math.cos(wdir10m);

    // Top
    var wdirTop = deg2rad*hodoData[step][0][lvl_index][0][0].wdir;
    var wspdTop = hodoData[step][0][lvl_index][0][0].wspd;
    var uTop = wspdTop * Math.sin(wdirTop);
    var vTop = wspdTop * Math.cos(wdirTop);

    // Bulk shear
    var bulk_shear = Math.sqrt(Math.pow((v10m-vTop),2) + Math.pow((u10m-uTop),2));

    return Math.round(bulk_shear);

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

    var mix_ratio = 621.97*((lift_e)/(sfc_press - lift_e))/1000;

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
    
    for (var j=0; j<pp_moist_range.length; j++) { 
        var parc_pres = pp_moist_range[j];

        var parc_tmpk =  lcl_tmpk + deltaT;
        var dt = calc_moist_gradient(parc_tmpk,parc_pres,dp);
        deltaT -= dt;

        var env = env_t_td_from_pressure(step,parc_pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;

        if (virtual_temperature_correction) {
            var parc_e = calc_e(parc_tmpk - T0)
            parc_tmpk = calc_virtual_temperature(parc_tmpk, parc_pres, parc_e);
        
            var env_e = calc_e(env_dwpk - T0);
            env_tmpk = calc_virtual_temperature(env_tmpk, parc_pres, env_e);       
        }

        if (parc_tmpk >= env_tmpk && (nr_of_lfcs == 0 || nr_of_els == 1)) {
            lfcs[nr_of_lfcs] = {
                "lfc_tmpk":parc_tmpk,
                "lfc_pres":parc_pres,
                "lfc_env_tmpk":env_tmpk,
                "lfc_env_dwpk": env_dwpk
            };
            nr_of_lfcs += 1;
            if (nr_of_lfcs == 2) { //max two lfcs
                break;
            }
        }
        if (parc_tmpk <= env_tmpk && nr_of_lfcs == 1) { // check for equilibrium level
            nr_of_els += 1;
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
            var parc_e = calc_e(parc_tmpk - T0)
            parc_tmpk = calc_virtual_temperature(parc_tmpk, parc_pres, parc_e);
        
            var env_e = calc_e(env_dwpk - T0);
            env_tmpk = calc_virtual_temperature(env_tmpk,parc_pres,env_e);
        }

        if (parc_tmpk <= env_tmpk) {
            el_tmpk = parc_tmpk;
            el_pres = parc_pres;
            el_env_tmpk = env_tmpk;
            el_env_dwpk = env_dwpk;

            break;
        }

    }

    return [el_tmpk, el_pres, el_env_tmpk, el_env_dwpk];

}

// Finds convective temperature, i.e. surface temperature when lcl=lfc
function find_convective_temperature(step,pp,twom_tmpc,twom_dwpc,sfc_press) {

    var conv_tmpc = '&geq;45';
    for (var t=twom_tmpc; t<45; t+=0.1) {
        var theta = calc_theta(t,sfc_press);
        var e = calc_e(twom_dwpc);

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
// Returns CAPE
function calc_cape (step,lfc_tmpk,pp_cape) {

    var deltaT = 0; var cape = 0; var cape_coords = []; var cape_env_coords = []; var cape_label_tmpc = 0;
    for (var j=0; j<pp_cape.length; j++) {
        
        var parc_tmpk =  lfc_tmpk + deltaT;
        var pres = pp_cape[j];
        var dt = calc_moist_gradient(parc_tmpk,pres,dp);
        
        var env = env_t_td_from_pressure(step,pres);
        var env_tmpk = env[0] + T0;
        var env_dwpk = env[1] + T0;

        if (virtual_temperature_correction) {
            var parc_e = calc_e(parc_tmpk - T0); //parcel tmp = dwp
            parc_tmpk = calc_virtual_temperature(parc_tmpk,pres,parc_e);
            
            var env_e = calc_e(env_dwpk - T0); 
            env_tmpk = calc_virtual_temperature(env_tmpk,pres,env_e);
        }
        
        var tmp_cape = Rd*(parc_tmpk - env_tmpk)*Math.log(pres/(pres-dp)); // Wallace & Hobbs (2006) p.345
        if (tmp_cape > 0) {
            cape += tmp_cape;
            cape_coords.push({"tmpc":parc_tmpk-T0, "pres":pres});
            cape_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
        } else {
            cape_coords.push({"tmpc":env_tmpk-T0, "pres":pres}); // Don't include cape < 0 (i.e. cin) in cape area (if multiple cape areas)
            cape_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
        }

        deltaT -= dt;

    }

    if (cape_coords.length > 0) {
        cape_label_tmpc = cape_coords[Math.round(cape_coords.length/2)].tmpc;
        for (var j=0; j<cape_env_coords.length; j++) {
            cape_coords.push(cape_env_coords[cape_env_coords.length-j-1]);
        }
    }

    return [cape, cape_coords, cape_label_tmpc];

}

// Integrates between the SFC and LFC
// Returns CIN (and parcel coords of cin area)
function calc_cin (step,lift_theta,lift_r,lcl_pres,pp_cin) {

    var cin = 0; var cin_coords = []; var cin_env_coords = []; 
    var parc_tmpk; var env_tmpk; var parc_e;
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
                parc_e = calc_e(parc_tmpk - T0); //parcel tmp = dwp above the LCL
            }
            parc_virt_tmpk = calc_virtual_temperature(parc_tmpk,pres,parc_e);
            
            var env_e = calc_e(env_dwpk - T0); 
            env_virt_tmpk = calc_virtual_temperature(env_tmpk,pres,env_e);

            var tmp_cin = Rd*(parc_virt_tmpk - env_virt_tmpk)*Math.log(pres/(pres-dp));
            if (tmp_cin < 0) {
                cin += tmp_cin;
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
                cin_coords.push({"tmpc":parc_tmpk-T0, "pres":pres});
                cin_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            } else {
                cin_coords.push({"tmpc":env_tmpk-T0, "pres":pres}); // Don't include cin > 0 (i.e. cape) in cin area (if multiple cin areas)
                cin_env_coords.push({"tmpc":env_tmpk-T0, "pres":pres});
            }
        }

    }
   
    if (cin_coords.length > 0) {
        for (var j=0; j<cin_env_coords.length; j++) {
            cin_coords.push(cin_env_coords[cin_env_coords.length-j-1]);
        }
    }

    return [cin, cin_coords];

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