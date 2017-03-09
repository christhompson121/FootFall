var map;
var markers = [];
var heatmap;
var initialLoad = false;

function initAutocomplete() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 53.3804,
      lng: -1.4685
    },
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  map.addListener('click', function(e) {
    // placeMarker(e.latLng, map);
    map.panTo(e.latLng, map);
    getEvents(e.latLng.lat(), e.latLng.lng());
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });
  // var markers = [];
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();
    if (places.length == 0) {
      return;
    }
    clearMarkers();
    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };
      // Create a marker for each place.
      console.log("Searched latLng:");
      console.log(place.geometry.location.lat());
      console.log(place.geometry.location.lng());
      // get events and place markers
      getEvents(place.geometry.location.lat(), place.geometry.location.lng());
      markers.push(new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      }));
      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
    map.setZoom(15);
  });
}

// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
  markers = [];
  heatmap.setMap(null);
}

function placeMarker(latLng, map, event) {
  var marker = new google.maps.Marker({
    position: latLng,
    map: map
  });
  markers.push(marker);
  addInfoListener(marker, event);
  // console.log(latLng);
}

function getEvents(lat, lng, startCheckDate, endCheckDate) {
  if (initialLoad) {
    var url = 'events-test.json';
  } else {
    var url = 'http://localhost:3000/events?lat=' + lat + '&lng=' + lng + '&distance=10000&sort=time';
    //var url = 'http://XXXXXXXXXX.compute.amazonaws.com:3000/events?lat=' +
    //    lat + '&lng=' + lng + '&distance=10000&sort=time';
  }
  initialLoad = false;
  if ((typeof startCheckDate === 'undefined') || (typeof endCheckDate === 'undefined')) {
    tmp = "blah";
  } else {
    url = url + "&startCheckDate=" + startCheckDate + "&endCheckDate=" + endCheckDate;
  }

  $.get(url, function(data) {
    console.log(data);
    var heatMapData = [];
    $(data['events']).each(function(i, event) {
      // console.log(event);
      var lat = event['venueLocation']['latitude'];
      var lng = event['venueLocation']['longitude'];
      var latLng = {
        lat: lat,
        lng: lng
      };

      var weight = event['eventStats']['attendingCount'];
      console.log("weight:" + weight);
      var datum = {
        location: new google.maps.LatLng(lat, lng),
        weight: weight
      };
      heatMapData.push(datum);
      console.log(datum);
      placeMarker(latLng, map, event);
    });

    console.log(heatMapData);
    doHeatmap(heatMapData);
  });
}

function doHeatmap(data) {
  var oldData = heatmap.getData().j;
  var res = $.merge(oldData, data);
  heatmap.setData(res);
}

function toggleHeatmap() {
  heatmap.setMap(heatmap.getMap() ? null : map);
}

function addInfoListener(marker, event) {
  if (infowindow) {
    infowindow.close();
  }
  var eventName = event['eventName'];
  var eventDescription = event['eventDescription'];
  var eventProfilePicture = event['eventProfilePicture'];
  // var eventStarttime = new Date(event['eventStarttime']).toString();
  var eventStarttime = moment(event['eventStarttime']).format('llll');
  var venueName = event['venueName'];
  var eventId = event['eventId'];

  if (eventDescription != null) {
    if (eventDescription.length >= 100) {
      eventDescription = eventDescription.slice(0, 100) + "...";
    }
  }

  var contentString = '<div id="content">' + '<div id="siteNotice">' + '</div>' +
    '<img style="max-width: 76px; margin-right: 10px; margin-bottom: 10px;" src="' +
    eventProfilePicture + '" alt="">' +
    '<h1 style="display:inline; font-size: 20px;" id="firstHeading" class="firstHeading">' +
    eventName + '</h1>' + '<div id="bodyContent">' + '<p>' + eventDescription +
    '<br/><a href="http://www.facebook.com/events/' + eventId +
    '">See in Facebook</a> </p>' + '<p>' + 'Attending: ' + event['eventStats']['attendingCount'] + '</p>' + '<p>' + eventStarttime + '</p>' + '</div>';
  var infowindow = new google.maps.InfoWindow({
    content: contentString
  });

  marker.addListener('click', function() {
    infowindow.open(map, marker);
  });
}

$("#dateFilterForm").submit(function(e) {
  var startCheckDate = $("input[name='startCheckDate']").val();
  var endCheckDate = $("input[name='endCheckDate']").val();
  clearMarkers();
  getEvents(map.center.lat(), map.center.lng(), startCheckDate, endCheckDate);
  // console.log(map.center);
  e.preventDefault();
});

$("input[type='datetime-local']").each(function() {
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth().toString().length == 1 ? "0" + (today.getMonth() + 1) :
    today.getMonth() + 1;
  var date = today.getDate().toString().length == 1 ? "0" + today.getDate() : today.getDate();
  var dateStr = year + "-" + month + "-" + date + 'T00:00';
  console.log(dateStr);
  $(this).val(dateStr);
});

$("#heatmapCheckbox").change(function() {
  toggleHeatmap();
  console.log("Clicked");
});

$("#aboutButton").click(function() {
  alert("This site began at HackSheffield 2016 (a UK MLH hackathon at The University of Sheffield).\n\n" +
    "We believe that our target audience includes taxi companies, law enforcement, party goers and generally" +
    " anyone who wants to find events in a particular location.");
});


initAutocomplete();
heatmap = new google.maps.visualization.HeatmapLayer({
  data: [],
  radius: 90,
  map: map
});

getEvents(53.381061, -1.470109);
