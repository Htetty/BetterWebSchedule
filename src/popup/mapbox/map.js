document.addEventListener('DOMContentLoaded', function() {
  mapboxgl.accessToken = 'pk.eyJ1IjoiaHRldHR5IiwiYSI6ImNtYTRreXRjdzA4ZTkycnB5bnFlZTVjNTAifQ.lNpc5t2USJrlL2wOrVRIAw';
  
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [-122.4672, 37.6302],
    zoom: 17,
    maxZoom: 18,
    minZoom: 16
  });

  const skyline = {
    center: [-122.4672, 37.6302],
    buildings: [
      { name: "Building 1", lat: 37.629384772467276, lng: -122.4675831529004, description: "Social Science/Creative Arts/Art Gallery/Dream Center/Equity Institute/SparkPoint/Strategic Partnerships & Workforce Programs/Career Readiness & Job Placement/Theater" },
      { name: "Building 2", lat: 37.629725070532444, lng: -122.4669940107139, description: "Under Construction" },
      { name: "Building 3", lat: 37.630214243285394, lng: -122.46625670796597, description: "Gymnasium/Kinesiology (PE) Athletics/Dance" },
      { name: "Building 4", lat: 37.630725791575344, lng: -122.4669038890277, description: "Administration/Cosmetology/Wellness Program" },
      { name: "Building 5", lat: 37.63032728990936, lng: -122.46730338282548, description: "Academic Support & Learning Technologies/Center for Transformative Teaching & Learning (CTTL)/Educational Access Center/Learning Center/Library/Student Equity & Support Programs/Nursing Room" },
      { name: "Building 6", lat: 37.63018290904274, lng: -122.4678523773909, description: "Bookstore/Center for Student Life & Leadership Development/Fireside Dining Room/Public Safety/Student & Community Center" },
      { name: "Building 7", lat: 37.62999831743263, lng: -122.46836142404025, description: "Sciences & Allied Health/STEM Center/Fabrication Lab" },
      { name: "Building 8", lat: 37.629399285606596, lng: -122.46838652747053, description: "Language Arts/Business" },
      { name: "Building 9", lat: 37.62887945672159, lng: -122.4681111775878, description: "Automotive Technology/Smog Referee Station" },
      { name: "Building 10", lat: 37.62881566954688, lng: -122.46842649587272, description: "Automotive Technology" },
      { name: "Building 11", lat: 37.62848160551082, lng: -122.46796810286438, description: "Automotive Technology" },
      { name: "Building 12", lat: 37.628716171140645, lng: -122.46954206212229, description: "Environmental Science/The Farallon Room" },
      { name: "Building 14", lat: 37.631289945599754, lng: -122.46900134039849, description: "Child Development Laboratory Center" },
      { name: "Building 19", lat: 37.63222330761118, lng: -122.46847162330658, description: "Admissions & Records/Counseling/Financial Aid/Global Learning Programs/Graphic Arts & Production/Health & Wellness Center/Middle College/Passport Office/Promise Scholars/Shipping & Receiving/Student Services/Veterans Resource Center" }
    ],
    studentParking: [
      { name: "Student Parking", lat: 37.631958665396475 , lng: -122.46941147441711, description: "Lot L" },
      { name: "Student Parking", lat: 37.63155743423953, lng: -122.46802184385947, description: "Lot M" },
      { name: "Student Parking", lat: 37.63213826340347, lng: -122.46616900311673, description: "Lot N" },
      { name: "Student Parking", lat: 37.6317019878391, lng: -122.46444382854999, description: "Lot P" },
      { name: "Student Parking", lat: 37.62939961600415, lng: -122.46918764361585, description: "Lot G" },
      { name: "Student Parking", lat: 37.62803005395165, lng: -122.46803344941858, description: "Lot F" },
      { name: "Student Parking", lat: 37.62850340774717, lng: -122.46584400914823, description: "Lot C" }
    ]
  };

  const canada = {
    center: [-122.2658, 37.4480],
    buildings: [
      { name: "Building 1", lat: 37.4469223508707, lng: -122.264653999981866, description: "Athletic Center" },
      { name: "Building 3", lat: 37.447958245225934, lng: -122.26509199962953, description: "Theater/ESL Office/Humanities & Social Sciences Division" },
      { name: "Building 5", lat: 37.44743551197134, lng: -122.26616778277452, description: "Career Center/SparkPoint/Health Center/Outreach Program/Personal Counseling Center/Student Housing Info/Student Life & Leadership/ASCC Office" },
      { name: "Building 6", lat: 37.447366791555744, lng: -122.26674706390561, description: "Dual Enrollment Program/Public Information Office" }, 
      { name: "Building 8", lat: 37.4477501989256, lng: -122.26611090363542, description: "Marketing Department/PRIE Office/President and VP's Office" },
      { name: "Building 9", lat: 37.448769578542496, lng: -122.26550518659754, description: "Admissions & Records / Counseling / Financial Aid / Learning Center / Library / STEM Center / Transfer Center / DRC (Disability Resource Center)" },
      { name: "Building 13", lat: 37.44835590000375, lng: -122.2661000187428, description: "Library and Services" },
      { name: "Building 17", lat: 37.44903632697656, lng: -122.2663281840168, description: "Cultural Center" },
      { name: "Building 18", lat: 37.44931031471645, lng: -122.26614083360019, description: "Business Office/Business Skills Center/Middle College HS Program" },
      { name: "Building 22", lat: 37.4495925676783, lng: -122.2670141661921, description: "Lost & Found/Public Safety" }
    ],
    studentParking: [
      { name: "Student Parking", lat: 37.445870912011195, lng: -122.26538148608283, description: "Lot 6" }, 
      { name: "Student Parking", lat: 37.44744145756464, lng: -122.26534767493165, description: "Lot 4" }, 
      { name: "Student Parking", lat: 37.449559611704224, lng: -122.26517047071015, description: "Lot 1" },
      { name: "Student Parking", lat: 37.450364180129796, lng: -122.26517674940818, description: "Lot 7" },
      { name: "Student Parking", lat: 37.44930431105378, lng: -122.26144557767775, description: "Lot 3" }, 
      { name: "Student Parking", lat: 37.44816324987829, lng: -122.26875754053901, description: "Lot 10" }
    ]
  };

  const csm = {
    center: [-122.3367, 37.5340],
    buildings: [
      { name: "Building 3", lat: 37.53407565829239, lng: -122.3367570729059, description: "Theatre"},
      { name: "Building 2", lat: 37.5343789915618, lng: -122.33675026630365, description: "Music" },
      { name: "Building 4", lat: 37.53410972449318, lng: -122.33633867650023, description: "Art"},
      { name: "Building 5", lat: 37.53434915119889, lng: -122.33526064781915, description: "Health & Wellness" },
      { name: "Building 8", lat: 37.53494490601137, lng: -122.33404541450744, description: "Gymnasium" },
      { name: "Building 1", lat: 37.53507806491546, lng: -122.33592536743373, description: "CSM Public Safety Office" },
      { name: "Building 9", lat: 37.535663453812816, lng: -122.33465954328231, description: "Library" },
      { name: "Building 14", lat: 37.535765687224206, lng: -122.33618101341857, description: "South Hall / accounting/business classes, and computer labs" },
      { name: "Building 16", lat: 37.53628768473055, lng: -122.33685612087935, description: "Central Hall" },
      { name: "Building 15", lat: 37.53587075099612, lng: -122.33671518811683, description: "Faculty Offices" },
      { name: "Building 10", lat: 37.53678773918195, lng: -122.33527617204025, description: "College Center" },
      { name: "Building 12", lat: 37.537197838527966, lng: -122.33576426391771, description: "East Hall" },
      { name: "Building 18", lat: 37.53667647133751, lng: -122.33774144442187, description: "Math Resource Center / North Hall" },
      { name: "Building 17", lat: 37.53639218227254, lng: -122.33737136205094, description: "Student Life / Center for Equity, Leadership & Community" },
      { name: "Building 19", lat: 37.5371043391626, lng: -122.33663704648241, description: "Emerging Technologies" },
      { name: "Building 36", lat: 37.53749636025285, lng: -122.33738807040183, description: "Science Building and Planetarium" },
      { name: "Building 30", lat: 37.53655037976039, lng: -122.33222037344268, description: "Team House" },
      { name: "Building 30A", lat: 37.53642698277653, lng: -122.3324170937426, description: "Training Room" },
      { name: "Building 35", lat: 37.53713755425199, lng: -122.33331520278448, description: "Public Safety Center" },
      { name: "Building 33", lat: 37.53897270845821, lng: -122.33368455261046, description: "Child Development Center" },
      { name: "Building 34", lat: 37.53783180534355, lng: -122.33496079958402, description: "Fire Technology, ITS, Shipping & Receiving / TV and Radio Support" },
      { name: "Building 7", lat: 37.53420036652241, lng: -122.33343375899236, description: "Facilities" },
      { name: "SMCCCD District Office", lat: 37.53129528106988, lng: -122.33763980642048, description: "District Office" },
      { name: "College Vista", lat: 37.53067193844908, lng: -122.33729070892248, description: "College Vista" },
    ],
    studentParking: [
      { name: "Lot A", lat: 37.53314779310903, lng: -122.33773855662179, description: "Student Parking"},
      { name: "Lot B", lat: 37.532504337083516, lng: -122.3364566096643, description: "Student & Athletic Center Member Parking"},
      { name: "Lot D", lat: 37.535668505268085, lng: -122.3325598767232, description: "Student Parking" },
      { name: "Lot F", lat: 37.53727030872364, lng: -122.33434101291526, description: "Student Parking" },
      { name: "Lot H", lat: 37.53753819800402, lng: -122.33399387832361, description: "Student Parking" },
      { name: "Lot J", lat: 37.53782083244, lng: -122.33359405366005, description: "Student Parking" },
      { name: "Lot K", lat: 37.53808134671046, lng: -122.33322212374041, description: "Student Parking" },
      { name: "Lot N", lat: 37.53849503528913, lng: -122.3382200881747, description: "Student Parking" },
      { name: "Lot P", lat: 37.53895952979979, lng: -122.33939806666704, description: "Student Parking" },
      { name: "Lot Q", lat: 37.537896836118875, lng: -122.33886441361729, description: "Student Parking" },
      { name: "Lot V", lat: 37.53330947508117, lng: -122.3391930914307, description: "Student Parking" },
      { name: "Lot W", lat: 37.53201387002562, lng: -122.33878562207792, description: "Student Parking" }
    ]
  };

  let currentMarkers = [];

  function clearMarkers() {
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];
  }

  function setBounds(center, padding = 0.01) {
    const bounds = [
      [center[0] - padding, center[1] - padding],
      [center[0] + padding, center[1] + padding]  
    ];
    map.setMaxBounds(bounds);
  }

  function addMarkers(school, iconRed, iconCar) {
    setBounds(school.center);
    map.flyTo({ center: school.center, zoom: 17 });
    school.buildings.forEach(loc => {
      const marker = createMarker(loc, iconRed);
      currentMarkers.push(marker);
    });
    school.studentParking.forEach(loc => {
      const marker = createMarker(loc, iconCar);
      currentMarkers.push(marker);
    });
  }

  function createMarker(location, iconUrl) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${iconUrl})`;
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.backgroundSize = 'cover';

    return new mapboxgl.Marker(el)
      .setLngLat([location.lng, location.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <strong>${location.name}</strong><br><span style="font-size: 13px;">${location.description}</span>
      `))
      .addTo(map);
  }

  document.getElementById('skylineBtn').addEventListener('click', () => {
    clearMarkers();
    addMarkers(skyline, 'redpin.png', 'car-park.png');
  });

  document.getElementById('canadaBtn').addEventListener('click', () => {
    clearMarkers();
    addMarkers(canada, 'redpin.png', 'car-park.png');
  });

  document.getElementById('csmBtn').addEventListener('click', () => {
    clearMarkers();
    addMarkers(csm, 'redpin.png', 'car-park.png');
  });

  map.on('load', () => {
    setBounds(skyline.center);
    addMarkers(skyline, 'redpin.png', 'car-park.png');
  });
});