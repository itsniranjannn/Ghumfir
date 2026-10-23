// Wikimedia Commons photos (all require attribution: author, licence, link).
const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
const C = 'https://commons.wikimedia.org/wiki/File:';

// slug: [thumb path, file name, author, licence]
const raw = {
  kathmandu: ['4/41/Swayambhunath_temple_-_an_ancient_religious_architecture_of_Nepal.jpg/1280px-Swayambhunath_temple_-_an_ancient_religious_architecture_of_Nepal.jpg', 'Swayambhunath_temple_-_an_ancient_religious_architecture_of_Nepal.jpg', 'Nirmal Dulal', 'CC BY-SA 4.0'],
  bhaktapur: ['0/0e/Nyatapola%2C_Bhaktapur_Durbar_Square.jpg/1280px-Nyatapola%2C_Bhaktapur_Durbar_Square.jpg', 'Nyatapola,_Bhaktapur_Durbar_Square.jpg', 'Shadow Ayush', 'CC BY-SA 4.0'],
  pokhara: ['0/0c/Phewa_Lake_of_Pokhara_city.jpg/1280px-Phewa_Lake_of_Pokhara_city.jpg', 'Phewa_Lake_of_Pokhara_city.jpg', 'Iamavinashk', 'CC BY-SA 4.0'],
  chitwan: ['e/eb/Chitwan_national_Park.jpg/1280px-Chitwan_national_Park.jpg', 'Chitwan_national_Park.jpg', 'Sanjaya Adhikari', 'CC BY-SA 4.0'],
  lumbini: ['7/7a/Lumbini_Maya_Devi_Temple_1.jpg/1280px-Lumbini_Maya_Devi_Temple_1.jpg', 'Lumbini_Maya_Devi_Temple_1.jpg', 'Rangan Datta Wiki', 'CC BY-SA 4.0'],
  bandipur: ['5/5f/Bandipur%2C_Nepal-WLV-1911.jpg/1280px-Bandipur%2C_Nepal-WLV-1911.jpg', 'Bandipur,_Nepal-WLV-1911.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'],
  nagarkot: ['f/fd/Morning_view_of_Nagarkot_2017.jpg/1280px-Morning_view_of_Nagarkot_2017.jpg', 'Morning_view_of_Nagarkot_2017.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'],
  'upper-mustang': ['d/d3/Lo_Manthang%2C_Upper_Mustang%2C_Nepal.jpg/1280px-Lo_Manthang%2C_Upper_Mustang%2C_Nepal.jpg', 'Lo_Manthang,_Upper_Mustang,_Nepal.jpg', 'Safalphotos', 'CC BY-SA 4.0'],
  ilam: ['4/44/Ilam_tea_garden.jpg/1280px-Ilam_tea_garden.jpg', 'Ilam_tea_garden.jpg', 'Pravinchapagain', 'CC BY-SA 4.0'],
  janakpur: ['6/6c/Janaki_Temple_Janakpur-Janakpur030315_MG_36680059.jpg/1280px-Janaki_Temple_Janakpur-Janakpur030315_MG_36680059.jpg', 'Janaki_Temple_Janakpur-Janakpur030315_MG_36680059.jpg', 'Bijaya 2043', 'CC BY-SA 4.0'],
  gorkha: ['0/09/Gorkha_Palace_durbar.jpg/1280px-Gorkha_Palace_durbar.jpg', 'Gorkha_Palace_durbar.jpg', 'Anuj Devkota', 'CC BY-SA 4.0'],
  rara: ['c/c1/The_Heavenly_Rara_Lake_-_edited_2.jpg/1280px-The_Heavenly_Rara_Lake_-_edited_2.jpg', 'The_Heavenly_Rara_Lake_-_edited_2.jpg', 'Prabeshsdev', 'CC BY-SA 4.0'],
  namche: ['6/61/Namche_Bazaar_facing_Kongde_Ri_towards_west.jpg/1280px-Namche_Bazaar_facing_Kongde_Ri_towards_west.jpg', 'Namche_Bazaar_facing_Kongde_Ri_towards_west.jpg', 'Nirojsedhai', 'CC BY-SA 4.0'],
  ghandruk: ['e/e7/Pokhara-Sarangkot-16-Machhapuchhre-Fishtail-2015-gje.jpg/1280px-Pokhara-Sarangkot-16-Machhapuchhre-Fishtail-2015-gje.jpg', 'Pokhara-Sarangkot-16-Machhapuchhre-Fishtail-2015-gje.jpg', 'Gerd Eichmann', 'CC BY-SA 4.0'],
  tansen: ['9/9c/Tansen%2C_Palpa%2C_Nepal.jpg/1280px-Tansen%2C_Palpa%2C_Nepal.jpg', 'Tansen,_Palpa,_Nepal.jpg', 'Vyacheslav Argenberg', 'CC BY 4.0'],
  dhulikhel: ['2/27/Dhulikhel_as_seen_from_Kali_temple.jpg/1280px-Dhulikhel_as_seen_from_Kali_temple.jpg', 'Dhulikhel_as_seen_from_Kali_temple.jpg', 'Prabesh.poudel123', 'CC BY-SA 4.0'],
  bardiya: ['7/7b/Aerial_shot_of_the_Khaura_River_and_the_tree_canopy%2C_Bardiya_National_Park.jpg/1280px-Aerial_shot_of_the_Khaura_River_and_the_tree_canopy%2C_Bardiya_National_Park.jpg', 'Aerial_shot_of_the_Khaura_River_and_the_tree_canopy,_Bardiya_National_Park.jpg', 'Shadow Ayush', 'CC BY-SA 4.0'],
  gosaikunda: ['0/03/Lake_Gosaikunda.jpg/1280px-Lake_Gosaikunda.jpg', 'Lake_Gosaikunda.jpg', 'Sergey Pesterev', 'CC BY-SA 4.0'],
  biratnagar: ['0/0f/Aerial_View_of_Biratnagar-IMG_8813.jpg/1280px-Aerial_View_of_Biratnagar-IMG_8813.jpg', 'Aerial_View_of_Biratnagar-IMG_8813.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'],
  dharan: ['2/23/Dharan_Clock_tower.jpg/1280px-Dharan_Clock_tower.jpg', 'Dharan_Clock_tower.jpg', 'Mithun Kunwar', 'CC BY-SA 4.0'],
  nepalgunj: ['2/2d/Bageshwori_Temple_Nepalgunj_Banke_Nepal_Rajesh_Dhungana_%282%29.jpg/1280px-Bageshwori_Temple_Nepalgunj_Banke_Nepal_Rajesh_Dhungana_%282%29.jpg', 'Bageshwori_Temple_Nepalgunj_Banke_Nepal_Rajesh_Dhungana_(2).jpg', 'Rajesh Dhungana', 'CC BY-SA 4.0'],
  butwal: ['c/c0/Butwal.jpg/1280px-Butwal.jpg', 'Butwal.jpg', 'Mithunkunwar9', 'CC BY-SA 4.0'],
  kalinchowk: ['c/cb/Kalinchowk_Bhagawati_temple.jpg/1280px-Kalinchowk_Bhagawati_temple.jpg', 'Kalinchowk_Bhagawati_temple.jpg', 'Janak Bhatta', 'CC BY-SA 4.0'],
  shuklaphanta: ['7/73/Shuklaphanta_National_Park-1.jpg/1280px-Shuklaphanta_National_Park-1.jpg', 'Shuklaphanta_National_Park-1.jpg', 'Hopingyousuf', 'CC BY-SA 4.0'],
  manang: ['3/3c/Manang_village.jpg/1280px-Manang_village.jpg', 'Manang_village.jpg', 'Schutz', 'CC BY-SA 3.0'],
  muktinath: ['9/92/Muktinath_Valley%2C_View_of_Thorong_La_Pass%2C_Mountains%2C_Nepal.jpg/1280px-Muktinath_Valley%2C_View_of_Thorong_La_Pass%2C_Mountains%2C_Nepal.jpg', 'Muktinath_Valley,_View_of_Thorong_La_Pass,_Mountains,_Nepal.jpg', 'Vyacheslav Argenberg', 'CC BY 4.0'],
};

// Generic accommodation photos for the SAMPLE hotels, grouped by kind (Wikimedia Commons).
// The real places in these photos are not the fictional listings; they are credited only.
const h = (path, file, author, licence) => ({ url: `${W}${path}`, credit: `${author} · ${licence} · ${C}${file}` });
export const hotelImages = {
  teahouse: [
    h('9/93/Teahouse_in_Himalayan_Region-3169.jpg/960px-Teahouse_in_Himalayan_Region-3169.jpg', 'Teahouse_in_Himalayan_Region-3169.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'),
    h('d/d9/Tea_House_in_Tadapani%2C_Ghandruk-Nepal-4402.jpg/960px-Tea_House_in_Tadapani%2C_Ghandruk-Nepal-4402.jpg', 'Tea_House_in_Tadapani,_Ghandruk-Nepal-4402.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'),
    h('6/68/Annapurna_Guest_House_and_Resturant_at_Annapurna_Base_Camp_%284130m%29-3331.jpg/960px-Annapurna_Guest_House_and_Resturant_at_Annapurna_Base_Camp_%284130m%29-3331.jpg', 'Annapurna_Guest_House_and_Resturant_at_Annapurna_Base_Camp_(4130m)-3331.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'),
  ],
  homestay: [
    h('2/29/Ghandruk_houses_%284525918826%29.jpg/960px-Ghandruk_houses_%284525918826%29.jpg', 'Ghandruk_houses_(4525918826).jpg', 'Greg Willis', 'CC BY-SA 2.0'),
    h('2/2b/Typical_rural_Nepali_house_with_Mt._Fistail_in_backfround.JPG/960px-Typical_rural_Nepali_house_with_Mt._Fistail_in_backfround.JPG', 'Typical_rural_Nepali_house_with_Mt._Fistail_in_backfround.JPG', 'Smnbhattarai', 'CC BY-SA 4.0'),
    h('3/3e/Namche_Bazaar%2C_Homestay%2C_Nepal.jpg/960px-Namche_Bazaar%2C_Homestay%2C_Nepal.jpg', 'Namche_Bazaar,_Homestay,_Nepal.jpg', 'Vyacheslav Argenberg', 'CC BY 4.0'),
  ],
  guesthouse: [
    h('b/ba/Hotel_Blue_Horizon%2CThamel%2CKathmandu_%283%29.jpg/960px-Hotel_Blue_Horizon%2CThamel%2CKathmandu_%283%29.jpg', 'Hotel_Blue_Horizon,Thamel,Kathmandu_(3).jpg', 'Saddam Hussain Ansari', 'CC BY 4.0'),
    h('7/7c/New-pokhara-lodge.jpg/960px-New-pokhara-lodge.jpg', 'New-pokhara-lodge.jpg', 'Poklodge', 'CC BY-SA 4.0'),
    h('e/e3/Lukla%2C_Shop%2C_Guesthouse%2C_Homestay%2C_Nepal.jpg/960px-Lukla%2C_Shop%2C_Guesthouse%2C_Homestay%2C_Nepal.jpg', 'Lukla,_Shop,_Guesthouse,_Homestay,_Nepal.jpg', 'Vyacheslav Argenberg', 'CC BY 4.0'),
  ],
  city: [
    h('0/0a/Pokhara-04-Hotel_Barahi-Pool-2013-gje.jpg/960px-Pokhara-04-Hotel_Barahi-Pool-2013-gje.jpg', 'Pokhara-04-Hotel_Barahi-Pool-2013-gje.jpg', 'Gerd Eichmann', 'CC BY-SA 4.0'),
    h('e/e6/Hotel_Peninsula.JPG/960px-Hotel_Peninsula.JPG', 'Hotel_Peninsula.JPG', 'Nirmal Dulal', 'CC BY-SA 3.0'),
    h('f/f0/Hotel_Lobby%2C_Kathmandu%2C_Nepal_2020.jpg/960px-Hotel_Lobby%2C_Kathmandu%2C_Nepal_2020.jpg', 'Hotel_Lobby,_Kathmandu,_Nepal_2020.jpg', 'Gaurav Dhwaj Khadka', 'CC BY-SA 4.0'),
  ],
  heritage: [
    h('5/53/Kathmandu-Hotel-04-Kantipur_Temple_House-Innenhof-2014-gje.jpg/960px-Kathmandu-Hotel-04-Kantipur_Temple_House-Innenhof-2014-gje.jpg', 'Kathmandu-Hotel-04-Kantipur_Temple_House-Innenhof-2014-gje.jpg', 'Gerd Eichmann', 'CC BY-SA 4.0'),
    h('d/d7/Kathmandu-Hotel-14-Kantipur_Temple_House-Fenster-2014-gje.jpg/960px-Kathmandu-Hotel-14-Kantipur_Temple_House-Fenster-2014-gje.jpg', 'Kathmandu-Hotel-14-Kantipur_Temple_House-Fenster-2014-gje.jpg', 'Gerd Eichmann', 'CC BY-SA 4.0'),
    h('0/09/Hotel_shanker_kathmandu.jpg/960px-Hotel_shanker_kathmandu.jpg', 'Hotel_shanker_kathmandu.jpg', 'Sgroey', 'CC BY-SA 4.0'),
  ],
  resort: [
    h('6/60/Mt_Kailash_Resort-8.jpg/960px-Mt_Kailash_Resort-8.jpg', 'Mt_Kailash_Resort-8.jpg', 'MMuzammils', 'CC BY-SA 3.0'),
    h('c/ca/Dhulikhel_Mountain_Resort_Khawa_Panchkhal.jpg/960px-Dhulikhel_Mountain_Resort_Khawa_Panchkhal.jpg', 'Dhulikhel_Mountain_Resort_Khawa_Panchkhal.jpg', 'KavreliKiranAd', 'CC BY-SA 4.0'),
    h('0/0a/Jungle_Safari_Resort-18.jpg/960px-Jungle_Safari_Resort-18.jpg', 'Jungle_Safari_Resort-18.jpg', 'MMuzammils', 'CC BY-SA 3.0'),
  ],
  jungle: [
    h('9/9e/USAID_Measuring_Impact_Conservation_Enterprise_Retrospective_%28Nepal%3B_National_Trust_for_Nature_Conservation%29_%2840256316772%29.jpg/960px-USAID_Measuring_Impact_Conservation_Enterprise_Retrospective_%28Nepal%3B_National_Trust_for_Nature_Conservation%29_%2840256316772%29.jpg', 'USAID Biodiversity & Forestry', 'Public domain'),
    h('3/34/Sauraha-018.JPG/960px-Sauraha-018.JPG', 'Sauraha-018.JPG', 'Sigismund von Dobschütz', 'CC BY-SA 3.0'),
    h('3/32/Jungle_Safari_Resort-27.jpg/960px-Jungle_Safari_Resort-27.jpg', 'Jungle_Safari_Resort-27.jpg', 'MMuzammils', 'CC BY-SA 3.0'),
  ],
  room: [
    h('1/1b/Room_of_Hotel_Simrik_Lahan-2506.jpg/960px-Room_of_Hotel_Simrik_Lahan-2506.jpg', 'Room_of_Hotel_Simrik_Lahan-2506.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'),
    h('4/4d/2-osobowy_comfort_Hotel_Bartis.jpg/960px-2-osobowy_comfort_Hotel_Bartis.jpg', '2-osobowy_comfort_Hotel_Bartis.jpg', 'Maz3LT0v92', 'CC BY-SA 4.0'),
    h('d/db/Room_of_Hotel_Simrik_Lahan-2509.jpg/960px-Room_of_Hotel_Simrik_Lahan-2509.jpg', 'Room_of_Hotel_Simrik_Lahan-2509.jpg', 'Bijay Chaurasia', 'CC BY-SA 4.0'),
  ],
};

export const images = Object.fromEntries(
  Object.entries(raw).map(([slug, [path, file, author, licence]]) => [
    slug,
    { url: W + path, credit: `${author} · ${licence} · ${C}${file}` },
  ])
);
