
import fs from 'fs';
import path from 'path';

const sourceDir = "C:/Users/Asus/.gemini/antigravity/brain/7c48b4b8-965a-4787-8fe4-dcf8a16b5966";
const destDir = "d:/vincentapp/server/uploads/Catering";

const mappings = {
    "welcome": path.join(sourceDir, "catering_welcome_drink_jpg_1773570854989.png"),
    "soup": path.join(sourceDir, "catering_soup_jpg_1773570876372.png"),
    "starter": path.join(sourceDir, "catering_starter_jpg_1773570892092.png"),
    "main": path.join(sourceDir, "catering_main_course_jpg_1773570908468.png"),
    "dessert": path.join(sourceDir, "catering_dessert_jpg_1773570927019.png")
};

const itemToCategory = {
    // Packages
    "pkg_classic.jpg": "main",
    "pkg_premium.jpg": "main",
    "pkg_royal.jpg": "main",

    // Drinks
    "jaljeera.jpg": "welcome",
    "masala_buttermilk.jpg": "welcome",
    "lemon_mint_cooler.jpg": "welcome",
    "mango_shake.jpg": "welcome",
    "fruit_punch.jpg": "welcome",
    "thandai.jpg": "welcome",
    "mocktail.jpg": "welcome",

    // Soup
    "tomato_soup.jpg": "soup",
    "sweet_corn_soup.jpg": "soup",
    "manchow_soup.jpg": "soup",
    "mushroom_soup.jpg": "soup",

    // Starters
    "paneer_tikka.jpg": "starter",
    "malai_tikka.jpg": "starter",
    "paneer_angara.jpg": "starter",
    "spring_roll.jpg": "starter",
    "hara_bhara_kabab.jpg": "starter",
    "dahi_kebab.jpg": "starter",
    "crispy_corn.jpg": "starter",
    "baby_corn.jpg": "starter",
    "stuffed_mushroom.jpg": "starter",
    "cheese_balls.jpg": "starter",
    "seekh_kabab_veg.jpg": "starter",
    "corn_tikki.jpg": "starter",

    // Main
    "paneer_butter_masala.jpg": "main",
    "shahi_paneer.jpg": "main",
    "paneer_lababdar.jpg": "main",
    "paneer_pasanda.jpg": "main",
    "malai_kofta.jpg": "main",
    "veg_handi.jpg": "main",
    "navratan_korma.jpg": "main",
    "veg_jaipuri.jpg": "main",
    "undhiyu.jpg": "main",
    "dum_aloo.jpg": "main",
    "sev_tamatar.jpg": "main",
    "bhindi_masala.jpg": "main",
    "dal_fry.jpg": "main",
    "dal_tadka.jpg": "main",
    "dal_makhani.jpg": "main",
    "dal_bukhara.jpg": "main",
    "gujarati_dal.jpg": "main",
    "gujarati_kadhi.jpg": "main",
    "naan.jpg": "main",
    "tandoori_roti.jpg": "main",
    "garlic_naan.jpg": "main",
    "paratha.jpg": "main",
    "kulcha.jpg": "main",
    "missi_roti.jpg": "main",
    "roomali_roti.jpg": "main",
    "steam_rice.jpg": "main",
    "jeera_rice.jpg": "main",
    "veg_pulao.jpg": "main",
    "kashmiri_pulao.jpg": "main",
    "biryani_veg.jpg": "main",

    // Desserts
    "gulab_jamun.jpg": "dessert",
    "rasmalai.jpg": "dessert",
    "jalebi.jpg": "dessert",
    "jalebi_rabdi.jpg": "dessert",
    "moong_dal_halwa.jpg": "dessert",
    "gajar_halwa.jpg": "dessert",
    "rasgulla.jpg": "dessert",
    "ice_cream.jpg": "dessert",

    // Counters
    "pav_bhaji.jpg": "starter",
    "pasta.jpg": "starter",
    "chaat.jpg": "starter",
    "dosa.jpg": "main",
    "noodles.jpg": "starter"
};

for (const [filename, cat] of Object.entries(itemToCategory)) {
    const src = mappings[cat];
    const dest = path.join(destDir, filename);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${cat} to ${filename}`);
    } else {
        console.error(`Source not found: ${src}`);
    }
}
