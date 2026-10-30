
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const baseUrl = "https://images.unsplash.com/photo-";
const images = {
    "pkg_classic.jpg": "1519225421980-715bd0215aed?w=800&q=80",
    "pkg_premium.jpg": "1464366420600-d13062670741?w=800&q=80",
    "pkg_royal.jpg": "1533174072545-7a4b6ad7a6c3?w=800&q=80",
    
    // Welcome Drinks
    "jaljeera.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "masala_buttermilk.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "lemon_mint_cooler.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "mango_shake.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "fruit_punch.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "thandai.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",
    "mocktail.jpg": "1513558161293-cdaf765ed2fd?w=400&q=80",

    // Soup
    "tomato_soup.jpg": "1547592166-23ac45744acd?w=400&q=80",
    "sweet_corn_soup.jpg": "1547592166-23ac45744acd?w=400&q=80",
    "manchow_soup.jpg": "1547592166-23ac45744acd?w=400&q=80",
    "mushroom_soup.jpg": "1547592166-23ac45744acd?w=400&q=80",

    // Starters
    "paneer_tikka.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "malai_tikka.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "paneer_angara.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "spring_roll.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "hara_bhara_kabab.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "dahi_kebab.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "crispy_corn.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "stuffed_mushroom.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "seekh_kabab_veg.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "baby_corn.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "cheese_balls.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "corn_tikki.jpg": "1567184109-21bd040375cd?w=400&q=80",

    // Main Course
    "paneer_butter_masala.jpg": "1631233039082-89854440c6aa?w=400&q=80",
    "shahi_paneer.jpg": "1631233039082-89854440c6aa?w=400&q=80",
    "paneer_lababdar.jpg": "1631233039082-89854440c6aa?w=400&q=80",
    "paneer_pasanda.jpg": "1631233039082-89854440c6aa?w=400&q=80",
    "malai_kofta.jpg": "1631233039082-89854440c6aa?w=400&q=80",
    "veg_handi.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "navratan_korma.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "veg_jaipuri.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "undhiyu.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "dum_aloo.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "sev_tamatar.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "bhindi_masala.jpg": "1601050694111-993d5a40a831?w=400&q=80",

    // Dal
    "dal_fry.jpg": "1546833999-2310b4485eb5?w=400&q=80",
    "dal_tadka.jpg": "1546833999-2310b4485eb5?w=400&q=80",
    "dal_makhani.jpg": "1546833999-2310b4485eb5?w=400&q=80",
    "dal_bukhara.jpg": "1546833999-2310b4485eb5?w=400&q=80",
    "gujarati_dal.jpg": "1546833999-2310b4485eb5?w=400&q=80",
    "gujarati_kadhi.jpg": "1546833999-2310b4485eb5?w=400&q=80",

    // Breads
    "naan.jpg": "1533777857888-217a10613958?w=400&q=80",
    "tandoori_roti.jpg": "1533777857888-217a10613958?w=400&q=80",
    "garlic_naan.jpg": "1533777857888-217a10613958?w=400&q=80",
    "paratha.jpg": "1533777857888-217a10613958?w=400&q=80",
    "kulcha.jpg": "1533777857888-217a10613958?w=400&q=80",
    "missi_roti.jpg": "1533777857888-217a10613958?w=400&q=80",
    "roomali_roti.jpg": "1533777857888-217a10613958?w=400&q=80",

    // Rice
    "steam_rice.jpg": "1512058564366-18510be2db19?w=400&q=80",
    "jeera_rice.jpg": "1512058564366-18510be2db19?w=400&q=80",
    "veg_pulao.jpg": "1512058564366-18510be2db19?w=400&q=80",
    "kashmiri_pulao.jpg": "1512058564366-18510be2db19?w=400&q=80",
    "biryani_veg.jpg": "1512058564366-18510be2db19?w=400&q=80",

    // Desserts
    "gulab_jamun.jpg": "1589301880007-080517417558?w=400&q=80",
    "rasmalai.jpg": "1589301880007-080517417558?w=400&q=80",
    "jalebi.jpg": "1589301880007-080517417558?w=400&q=80",
    "jalebi_rabdi.jpg": "1589301880007-080517417558?w=400&q=80",
    "moong_dal_halwa.jpg": "1589301880007-080517417558?w=400&q=80",
    "gajar_halwa.jpg": "1589301880007-080517417558?w=400&q=80",
    "rasgulla.jpg": "1589301880007-080517417558?w=400&q=80",
    "ice_cream.jpg": "1589301880007-080517417558?w=400&q=80",

    // Live Counters
    "pav_bhaji.jpg": "1567184109-21bd040375cd?w=400&q=80",
    "pasta.jpg": "1473093295043-da09a7940121?w=400&q=80",
    "chaat.jpg": "1601050694111-993d5a40a831?w=400&q=80",
    "dosa.jpg": "1512058564366-18510be2db19?w=400&q=80",
    "noodles.jpg": "1601050694111-993d5a40a831?w=400&q=80"
};

const destPath = "d:/vincentapp/server/uploads/Catering";
if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
}

for (const [filename, suffix] of Object.entries(images)) {
    const url = baseUrl + suffix;
    const file = path.join(destPath, filename);
    console.log(`Downloading ${filename}...`);
    try {
        // Use curl.exe directly
        execSync(`curl.exe -L -k -A "Mozilla/5.0" "${url}" -o "${file}" --connect-timeout 10 --retry 3`);
    } catch (error) {
        console.warn(`Failed to download ${filename}: ${error.message}`);
    }
}
console.log("Download cycle finished.");
