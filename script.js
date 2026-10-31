// ============================================================
// DC STREET ART MAP
// Highlighted Wards 1, 2, and 6
// ============================================================


// ------------------------------------------------------------
// MAP
// ------------------------------------------------------------

const map = L.map('map', {
  boxZoom: false,
  minZoom: 11
}).setView([38.9072, -77.0369], 11);

let defaultDCViewBounds = null;


// ------------------------------------------------------------
// WARD LEGEND
// ------------------------------------------------------------

const wardLegend = L.control({
  position: 'bottomright'
});

wardLegend.onAdd = function() {

  const div = L.DomUtil.create(
    'div',
    'map-legend'
  );

  div.innerHTML = `
    <div class="legend-title">Wards</div>

    <div class="legend-item">
      <span class="legend-color"
            style="background:#5B8FF9"></span>
      Ward 1
    </div>

    <div class="legend-item">
      <span class="legend-color"
            style="background:#4CAF50"></span>
      Ward 2
    </div>

    <div class="legend-item">
      <span class="legend-color"
            style="background:#9B6EDB"></span>
      Ward 6
    </div>

    <div class="legend-item">
      <span class="legend-color"
            style="background:#8F969D"></span>
      Other Wards
    </div>
  `;

  return div;
};

wardLegend.addTo(map);


// ------------------------------------------------------------
// MAP CONTROLS
// ------------------------------------------------------------

map.addControl(new L.Control.FullScreen({
  position: 'bottomleft',
  forceSeparateButton: true,
  content: '<span class="custom-fullscreen-icon">⛶</span>'
}));

map.zoomControl.setPosition('bottomleft');


const recenterControl = L.control({
  position: 'bottomleft'
});

recenterControl.onAdd = function() {

  const button = L.DomUtil.create(
    'button',
    'leaflet-control-recenter'
  );

  button.type = 'button';
  button.innerHTML = '⌖';
  button.title = 'Recenter on Washington, D.C.';
  button.setAttribute(
    'aria-label',
    'Recenter on Washington, D.C.'
  );

  L.DomEvent.disableClickPropagation(button);

  L.DomEvent.on(button, 'click', function() {

    if (defaultDCViewBounds) {

      map.fitBounds(
        defaultDCViewBounds,
        {
          padding: [20, 20]
        }
      );

    }

  });

  return button;
};

recenterControl.addTo(map);


// ------------------------------------------------------------
// MAP PANE
// ------------------------------------------------------------

// Layer used to mask everything outside DC
map.createPane('dcMaskPane');

map.getPane('dcMaskPane').style.zIndex = 300;

map.getPane('dcMaskPane').style.pointerEvents =
  'none';


// ------------------------------------------------------------
// BASEMAP
// ------------------------------------------------------------

L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution:
      '&copy; OpenStreetMap contributors'
  }
).addTo(map);


// ------------------------------------------------------------
// VISUAL SETTINGS
// ------------------------------------------------------------

const WARD_STYLES = {

  '1': {
    fillColor: '#5B8FF9',
    label: 'Ward 1'
  },

  '2': {
    fillColor: '#4CAF50',
    label: 'Ward 2'
  },

  '6': {
    fillColor: '#9B6EDB',
    label: 'Ward 6'
  }

};

const OTHER_WARD_FILL =
  '#8F969D';

const OTHER_WARD_OPACITY =
  0.45;

const HIGHLIGHT_OPACITY =
  0.13;

const BORDER_COLOR =
  '#222222';

const BORDER_WIDTH =
  1.4;


// ============================================================
// OFFICIAL DC GIS 2022 WARD LAYER
// ============================================================

const wardURL =
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/' +
  'Administrative_Other_Boundaries/MapServer/53/query' +
  '?where=1%3D1' +
  '&outFields=*' +
  '&f=geojson' +
  '&outSR=4326';


// ------------------------------------------------------------
// LOAD WARDS
// ------------------------------------------------------------

fetch(wardURL)

  .then(response => {

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }

    return response.json();

  })

  .then(wardData => {

    const wards = L.geoJSON(
      wardData,
      {

        style: function(feature) {

          const ward =
            String(
              feature.properties.WARD
            );

          const highlighted =
            Boolean(
              WARD_STYLES[ward]
            );

          return {

            color:
              BORDER_COLOR,

            weight:
              BORDER_WIDTH,

            fillColor:
              highlighted
                ? WARD_STYLES[ward].fillColor
                : OTHER_WARD_FILL,

            fillOpacity:
              highlighted
                ? HIGHLIGHT_OPACITY
                : OTHER_WARD_OPACITY

          };

        },


        onEachFeature:
          function(feature, layer) {

            const ward =
              String(
                feature.properties.WARD
              );

            const highlighted =
              Boolean(
                WARD_STYLES[ward]
              );


            layer.on({

              click: function() {

                if (highlighted) {

                  layer
                    .bindPopup(`
                      <strong>
                        Ward ${ward}
                      </strong>
                    `)
                    .openPopup();

                } else {

                  layer
                    .bindPopup(`
                      <strong>
                        Ward ${ward}
                      </strong><br>
                      Not included in the highlighted dataset.
                    `)
                    .openPopup();

                }

              }

            });

          }

      }
    ).addTo(map);


    // ----------------------------------------------------------
    // WARD HOVER TRACKING
    // ----------------------------------------------------------

    let hoveredWard = null;


    map.on(
      'mousemove',
      function(e) {

        let currentWard = null;


        wards.eachLayer(
          function(layer) {

            // Quick bounds check
            if (
              !layer
                .getBounds()
                .contains(e.latlng)
            ) {

              return;

            }


            const point =
              map.latLngToLayerPoint(
                e.latlng
              );


            if (
              layer._containsPoint(point)
            ) {

              currentWard =
                layer;

            }

          }
        );


        // Nothing changed
        if (
          currentWard ===
          hoveredWard
        ) {

          return;

        }


        // Reset previous Ward
        if (hoveredWard) {

          wards.resetStyle(
            hoveredWard
          );

        }


        // Highlight new Ward
        if (currentWard) {

          currentWard.setStyle({

            weight:
              BORDER_WIDTH + 2

          });

          currentWard.bringToFront();

        }


        hoveredWard =
          currentWard;

      }
    );


    // ----------------------------------------------------------
    // WHITE MASK OUTSIDE THE DISTRICT
    // ----------------------------------------------------------

    const outerMask = [

      [85, -180],
      [85, 180],
      [-85, 180],
      [-85, -180],
      [85, -180]

    ];


    const dcHoles = [];


    wardData.features.forEach(
      function(feature) {

        const geometry =
          feature.geometry;


        if (
          geometry.type ===
          'Polygon'
        ) {

          dcHoles.push(

            geometry.coordinates[0]
              .map(
                ([lng, lat]) =>
                  [lat, lng]
              )

          );

        }


        else if (
          geometry.type ===
          'MultiPolygon'
        ) {

          geometry.coordinates.forEach(
            function(polygon) {

              dcHoles.push(

                polygon[0]
                  .map(
                    ([lng, lat]) =>
                      [lat, lng]
                  )

              );

            }
          );

        }

      }
    );


    L.polygon(
      [outerMask, ...dcHoles],
      {

        stroke: false,

        fillColor:
          '#FFFFFF',

        fillOpacity:
          1,

        pane:
          'dcMaskPane'

      }
    ).addTo(map);


    // ----------------------------------------------------------
    // FIT MAP TO DC
    // ----------------------------------------------------------

    const dcBounds =
      wards
        .getBounds()
        .pad(0.01);

    defaultDCViewBounds =
      dcBounds;


    const panBounds =
      wards
        .getBounds()
        .pad(0.12);


    map.fitBounds(
      defaultDCViewBounds,
      {
        padding: [20, 20]
      }
    );


    map.setMaxBounds(
      panBounds
    );

    map.setMaxBoundsViscosity(
      0.8
    );

  })


  .catch(error => {

    console.error(
      'Could not load Ward data:',
      error
    );

  });


// ============================================================
// WALKING COVERAGE
// ============================================================

const COVERAGE_URL =
  './dc-walking-coverage.geojson';

let coverageLayer = null;


fetch(COVERAGE_URL)

  .then(response => {

    if (!response.ok) {

      throw new Error(
        `Could not load walking coverage: ${response.status}`
      );

    }

    return response.json();

  })


  .then(coverageData => {

    coverageLayer =
      L.geoJSON(
        coverageData,
        {

          style: {

            color:
              '#8B5CF6',

            weight:
              2,

            opacity:
              0.65

          }

        }
      );

  })


  .catch(error => {

    console.error(
      'Walking coverage error:',
      error
    );

  });


// ============================================================
// STREET ART
// ============================================================

const STREET_ART_URL =
  './street-art-updated-poster-sticker-new-fixed.geojson';


// Currently selected street-art marker
let selectedStreetArtMarker =
  null;


// Currently displayed permanent name label
let selectedStreetArtTooltip =
  null;


// Currently active type filter
let activeStreetArtFilter =
  null;


// Current search text
let streetArtSearchQuery =
  '';


// All street-art records
const streetArtRecords =
  [];


// ------------------------------------------------------------
// CLEAR CURRENT STREET-ART SELECTION
// ------------------------------------------------------------

function clearStreetArtSelection() {

  if (
    selectedStreetArtMarker
  ) {

    const element =
      selectedStreetArtMarker
        .getElement();


    if (element) {

      element.classList.remove(
        'street-art-selected'
      );

    }


    selectedStreetArtMarker
      .setZIndexOffset(0);

  }


  if (
    selectedStreetArtTooltip
  ) {

    map.removeLayer(
      selectedStreetArtTooltip
    );

    selectedStreetArtTooltip =
      null;

  }


  selectedStreetArtMarker =
    null;


  updateStreetArtLegendFocus(
    null
  );

}


// ------------------------------------------------------------
// LEGEND FOCUS
// ------------------------------------------------------------

function updateStreetArtLegendFocus(
  type
) {

  document
    .querySelectorAll(
      '.legend-filter'
    )
    .forEach(
      function(button) {

        button.classList.toggle(

          'legend-filter-muted',

          type !== null &&
          button.dataset.type !== type

        );

      }
    );

}


// ------------------------------------------------------------
// CREATE STREET-ART MARKER
// ------------------------------------------------------------

function streetArtMarker(
  feature,
  latlng
) {

  const type =
    feature.properties.Type;


  const name =
    feature.properties[
      "Name/Descriptor"
    ] ||
    "Street Art";


  // Determine shape
  let shape =
    'circle';


  if (
    type === 'Graffiti'
  ) {

    shape =
      'square';

  }

  else if (
    type === 'Mural'
  ) {

    shape =
      'triangle';

  }


  // Create marker HTML
  let html =
    '';


  if (
    shape === 'circle'
  ) {

    html =
      '<div class="street-art-marker circle-marker"></div>';

  }

  else if (
    shape === 'square'
  ) {

    html =
      '<div class="street-art-marker square-marker"></div>';

  }

  else if (
    shape === 'triangle'
  ) {

    html =
      '<div class="street-art-marker triangle-marker"></div>';

  }


  // Create Leaflet marker
  const marker =
    L.marker(
      latlng,
      {

        icon:
          L.divIcon(
            {

              className:
                'street-art-icon',

              html:
                html,

              iconSize:
                [12, 12],

              iconAnchor:
                [6, 6]

            }
          )

      }
    );


  // ----------------------------------------------------------
  // NORMAL HOVER TOOLTIP
  // ----------------------------------------------------------

  marker.bindTooltip(
    name,
    {

      direction:
        'top',

      offset:
        [0, -6],

      opacity:
        0.9

    }
  );


  // ----------------------------------------------------------
  // HOVER EFFECT
  // ----------------------------------------------------------

  marker.on(
    'mouseover',
    function() {

      const element =
        marker.getElement();


      if (element) {

        element.classList.add(
          'street-art-hover'
        );

      }


      marker.setZIndexOffset(
        1000
      );


      updateStreetArtLegendFocus(
        type
      );

    }
  );


  marker.on(
    'mouseout',
    function() {

      const element =
        marker.getElement();


      if (element) {

        element.classList.remove(
          'street-art-hover'
        );

      }


      marker.setZIndexOffset(

        marker ===
        selectedStreetArtMarker

          ? 2000
          : 0

      );


      if (
        marker !==
        selectedStreetArtMarker
      ) {

        updateStreetArtLegendFocus(
          null
        );

      }

    }
  );


  // ----------------------------------------------------------
  // CLICK / SELECT
  // ----------------------------------------------------------

  marker.on(
    'click',
    function() {


    // Street-art markers are not selectable while
    // the photo gallery is open.
      if (
        photoGallery &&
        photoGallery.classList.contains('open')
      ) {
        return;
      }
      
      
      // Clicking the currently selected point
      // deselects it.
      if (
        selectedStreetArtMarker ===
        marker
      ) {

        clearStreetArtSelection();

        closeStreetArtPanel();

        return;

      }


      // Clear previous selection
      clearStreetArtSelection();


      // Select this marker
      selectedStreetArtMarker =
        marker;


      updateStreetArtLegendFocus(
        type
      );


      const element =
        marker.getElement();


      if (element) {

        element.classList.add(
          'street-art-selected'
        );

      }


      marker.setZIndexOffset(
        2000
      );


      // --------------------------------------------------------
      // CREATE PERMANENT NAME LABEL
      // --------------------------------------------------------

      selectedStreetArtTooltip =
        L.tooltip(
          {

            direction:
              'top',

            offset:
              [0, -6],

            opacity:
              0.9,

            permanent:
              true

          }
        )
        .setLatLng(
          latlng
        )
        .setContent(
          name
        )
        .addTo(map);


      // Open information panel
      openStreetArtPanel(
        feature.properties
      );

    }
  );


  return marker;

}


// ============================================================
// LOAD STREET ART
// ============================================================

fetch(STREET_ART_URL)

  .then(response => {

    if (!response.ok) {

      throw new Error(
        `Could not load street-art data: ${response.status}`
      );

    }

    return response.json();

  })


  .then(streetArtData => {

    L.geoJSON(
      streetArtData,
      {

        pointToLayer:
          streetArtMarker,


        onEachFeature:
          function(
            feature,
            marker
          ) {

            streetArtRecords.push(

              {

                marker:
                  marker,

                type:
                  feature.properties.Type ||
                  '',

                name:
                  feature.properties[
                    "Name/Descriptor"
                  ] ||
                  '',

                keywords:
                  feature.properties.Notes ||
                  '',

                properties:
                  feature.properties

              }

            );

          }

      }
    );


    // Start with every record visible
    streetArtRecords.forEach(
      function(record) {

        record.marker.addTo(
          map
        );

      }
    );


    // Apply initial Poster opacity
    updateStreetArtZoom();


    // Show initial result count
    updateStreetArtResultCount(
      streetArtRecords.length
    );

  })


  .catch(error => {

    console.error(
      'Street-art data error:',
      error
    );

  });


// ============================================================
// STREET ART FILTERING
// ============================================================

function applyStreetArtFilters() {

  const query =
    streetArtSearchQuery
      .trim()
      .toLowerCase();


  let visibleCount =
    0;


  // Check whether the currently
  // selected point still matches
  // the active filters.
  let selectedMarkerStillMatches =
    false;


  if (
    selectedStreetArtMarker
  ) {

    const selectedRecord =
      streetArtRecords.find(
        function(record) {

          return (
            record.marker ===
            selectedStreetArtMarker
          );

        }
      );


    if (selectedRecord) {

      const matchesType =
        !activeStreetArtFilter ||
        selectedRecord.type ===
          activeStreetArtFilter;


      const searchableText =
        `${selectedRecord.name} ${selectedRecord.keywords}`
          .toLowerCase();


      const matchesSearch =
        !query ||
        searchableText.includes(
          query
        );


      selectedMarkerStillMatches =
        matchesType &&
        matchesSearch;

    }

  }


  // ----------------------------------------------------------
  // APPLY FILTERS TO ALL RECORDS
  // ----------------------------------------------------------

  streetArtRecords.forEach(
    function(record) {

      const matchesType =
        !activeStreetArtFilter ||
        record.type ===
          activeStreetArtFilter;


      const searchableText =
        `${record.name} ${record.keywords}`
          .toLowerCase();


      const matchesSearch =
        !query ||
        searchableText.includes(
          query
        );


      const shouldShow =
        matchesType &&
        matchesSearch;


      if (shouldShow) {

        if (
          !map.hasLayer(
            record.marker
          )
        ) {

          record.marker.addTo(
            map
          );

        }

        visibleCount++;

      }

      else {

        if (
          map.hasLayer(
            record.marker
          )
        ) {

          map.removeLayer(
            record.marker
          );

        }

      }

    }
  );


  // ----------------------------------------------------------
  // CLEAR SELECTION ONLY IF IT NO LONGER MATCHES
  // ----------------------------------------------------------

  if (
    selectedStreetArtMarker &&
    !selectedMarkerStillMatches
  ) {

    clearStreetArtSelection();

    closeStreetArtPanel();

  }


  // Preserve current Poster zoom behavior
  updateStreetArtZoom();


  // Update result count
  updateStreetArtResultCount(
    visibleCount
  );

}


// ============================================================
// STREET ART TYPE FILTER
// ============================================================

function setStreetArtTypeFilter(
  type
) {

  // Clicking the active type
  // turns the filter off
  if (
    activeStreetArtFilter ===
    type
  ) {

    activeStreetArtFilter =
      null;

  }

  else {

    activeStreetArtFilter =
      type;

  }


  // Update legend appearance
  document
    .querySelectorAll(
      '.legend-filter'
    )
    .forEach(
      function(button) {

        button.classList.toggle(

          'legend-filter-active',

          button.dataset.type ===
          activeStreetArtFilter

        );

      }
    );


  applyStreetArtFilters();

}


// ============================================================
// SEARCH
// ============================================================

function setStreetArtSearch(
  query
) {

  streetArtSearchQuery =
    query;


  applyStreetArtFilters();

}


// ============================================================
// SEARCH RESULT COUNT
// ============================================================

let streetArtResultCount =
  null;


function updateStreetArtResultCount(
  visibleCount
) {

  if (!streetArtResultCount) {

    return;

  }


  if (
    activeStreetArtFilter
  ) {

    streetArtResultCount.textContent =
      `${visibleCount} ${activeStreetArtFilter}`;

  }

  else {

    streetArtResultCount.textContent =
      `${visibleCount} results`;

  }

}


// ============================================================
// POSTER ZOOM BEHAVIOR
// ============================================================

function updateStreetArtZoom() {

  const zoom =
    map.getZoom();


  let posterOpacity;
  let posterSize;


  if (
    zoom <= 11
  ) {

    posterOpacity =
      0.40;

    posterSize =
      10;

  }

  else if (
    zoom <= 13
  ) {

    posterOpacity =
      0.65;

    posterSize =
      11;

  }

  else {

    posterOpacity =
      0.80;

    posterSize =
      12;

  }


  document
    .querySelectorAll(
      '.circle-marker'
    )
    .forEach(
      function(marker) {

        marker.style.opacity =
          posterOpacity;

        marker.style.width =
          `${posterSize}px`;

        marker.style.height =
          `${posterSize}px`;

      }
    );

}


map.on(
  'zoomend',
  updateStreetArtZoom
);


map.whenReady(
  updateStreetArtZoom
);


// ============================================================
// STREET ART LEGEND / FILTER
// ============================================================

const streetArtLegend =
  L.control(
    {
      position:
        'topleft'
    }
  );


streetArtLegend.onAdd =
  function() {

    const div =
      L.DomUtil.create(
        'div',
        'street-art-legend'
      );


    div.innerHTML = `

      <div class="legend-title">
        Street Art Type
      </div>

      <div class="street-art-legend-items">

        <button
          type="button"
          class="legend-item legend-filter"
          data-type="Poster/Sticker"
        >
          <span
            class="legend-symbol poster-symbol"
          ></span>

          <span>
            Poster/Sticker
          </span>

        </button>


        <button
          type="button"
          class="legend-item legend-filter"
          data-type="Graffiti"
        >
          <span
            class="legend-symbol graffiti-symbol"
          ></span>

          <span>
            Graffiti
          </span>

        </button>


        <button
          type="button"
          class="legend-item legend-filter"
          data-type="Mural"
        >
          <span
            class="legend-symbol mural-symbol"
          ></span>

          <span>
            Mural
          </span>

        </button>

      </div>

    `;


    L.DomEvent.disableClickPropagation(
      div
    );


    div
      .querySelectorAll(
        '.legend-filter'
      )
      .forEach(
        function(button) {

          button.addEventListener(
            'click',
            function() {

              setStreetArtTypeFilter(
                button.dataset.type
              );

            }
          );

        }
      );


    return div;

  };


streetArtLegend.addTo(
  map
);


// ============================================================
// WALKING COVERAGE TOGGLE
// ============================================================

const coverageControl =
  L.control(
    {
      position:
        'topleft'
    }
  );


coverageControl.onAdd =
  function() {

    const div =
      L.DomUtil.create(
        'div',
        'coverage-toggle'
      );


    div.innerHTML = `

      <label
        class="coverage-toggle-label"
      >

        <input
          type="checkbox"
          id="coverage-checkbox"
        >

        <span
          class="coverage-checkbox"
        ></span>

        <span
          class="coverage-toggle-text"
        >
          Show coverage
        </span>

      </label>


      <label
        class="coverage-toggle-label coverage-hide-markers"
        style="display: none;"
      >

        <input
          type="checkbox"
          id="hide-markers-checkbox"
        >

        <span
          class="coverage-checkbox"
        ></span>

        <span
          class="coverage-toggle-text"
        >
          Hide markers
        </span>

      </label>

    `;


    L.DomEvent.disableClickPropagation(
      div
    );


    const checkbox =
      div.querySelector(
        '#coverage-checkbox'
      );


    const hideMarkersCheckbox =
      div.querySelector(
        '#hide-markers-checkbox'
      );


    const hideMarkersLabel =
      div.querySelector(
        '.coverage-hide-markers'
      );


    checkbox.addEventListener(
      'change',
      function() {

        if (!coverageLayer) {

          checkbox.checked =
            false;

          return;

        }


        if (
          checkbox.checked
        ) {

          coverageLayer.addTo(
            map
          );


          hideMarkersLabel.style.display =
            'flex';

        }

        else {

          map.removeLayer(
            coverageLayer
          );


          // Hide-marker option disappears
          hideMarkersLabel.style.display =
            'none';


          // Reset hide-marker checkbox
          hideMarkersCheckbox.checked =
            false;


          // Markers must come back
          streetArtRecords.forEach(
            function(record) {

              if (
                !map.hasLayer(
                  record.marker
                )
              ) {

                record.marker.addTo(
                  map
                );

              }

            }
          );


          // Reapply existing filters
          applyStreetArtFilters();

        }

      }
    );


    hideMarkersCheckbox.addEventListener(
      'change',
      function() {

        if (
          hideMarkersCheckbox.checked
        ) {

          streetArtRecords.forEach(
            function(record) {

              if (
                map.hasLayer(
                  record.marker
                )
              ) {

                map.removeLayer(
                  record.marker
                );

              }

            }
          );

        }

        else {

          applyStreetArtFilters();

        }

      }
    );


    return div;

  };


coverageControl.addTo(
  map
);


// ============================================================
// STREET ART SEARCH CONTROL
// ============================================================

const streetArtSearchControl =
  L.control(
    {
      position:
        'topright'
    }
  );


streetArtSearchControl.onAdd =
  function() {

    const div =
      L.DomUtil.create(
        'div',
        'street-art-search-control'
      );


    div.innerHTML = `

      <div class="street-art-search-box">

        <input
          type="text"
          id="street-art-search"
          placeholder="Search street art..."
          aria-label="Search street art"
        />


        <button
          type="button"
          id="street-art-search-clear"
          aria-label="Clear search"
        >
          ×
        </button>

      </div>


      <div
        class="street-art-search-footer"
      >

        <div
          id="street-art-result-count"
          class="street-art-result-count"
        ></div>


        <button
          type="button"
          id="street-art-reset"
          class="street-art-reset"
        >
          Reset filters
        </button>

      </div>

    `;


    L.DomEvent.disableClickPropagation(
      div
    );


    const input =
      div.querySelector(
        '#street-art-search'
      );


    const clearButton =
      div.querySelector(
        '#street-art-search-clear'
      );


    streetArtResultCount =
      div.querySelector(
        '#street-art-result-count'
      );


    const streetArtResetButton =
      div.querySelector(
        '#street-art-reset'
      );


    // ----------------------------------------------------------
    // RESET FILTERS
    // ----------------------------------------------------------

    streetArtResetButton.addEventListener(
      'click',
      function() {

        input.value =
          '';

        streetArtSearchQuery =
          '';

        activeStreetArtFilter =
          null;


        document
          .querySelectorAll(
            '.legend-filter'
          )
          .forEach(
            function(button) {

              button.classList.remove(
                'legend-filter-active',
                'legend-filter-muted'
              );

            }
          );


        applyStreetArtFilters();


        input.focus();

      }
    );


    // ----------------------------------------------------------
    // SEARCH INPUT
    // ----------------------------------------------------------

    input.addEventListener(
      'input',
      function() {

        setStreetArtSearch(
          input.value
        );

      }
    );


    // ----------------------------------------------------------
    // CLEAR SEARCH
    // ----------------------------------------------------------

    clearButton.addEventListener(
      'click',
      function() {

        input.value =
          '';

        setStreetArtSearch(
          ''
        );

        input.focus();

      }
    );


    return div;

  };


streetArtSearchControl.addTo(
  map
);




// ============================================================
// PHOTO GALLERY BUTTON
// ============================================================

const photoGalleryControl =
  L.control({
    position: 'bottomright'
  });


photoGalleryControl.onAdd =
  function() {

    const div =
      L.DomUtil.create(
        'div',
        'photo-gallery-control'
      );


    div.innerHTML = `
      <button
        type="button"
        class="photo-gallery-button"
      >
        See photos
      </button>
    `;


    L.DomEvent.disableClickPropagation(
      div
    );


    const button =
      div.querySelector(
        '.photo-gallery-button'
      );


    const gallery =
      document.getElementById(
        'photo-gallery'
      );


    button.addEventListener(
  'click',
  function() {

    rememberPhotoGalleryMapView();

    gallery.classList.add(
      'open'
    );
    
    map.getContainer().classList.add(
     'photo-gallery-mode'
    );
    
    map.invalidateSize();

    updatePhotoGallery();

  }
);


    return div;

  };


photoGalleryControl.addTo(
  map
);







// ============================================================
// INFORMATION PANEL
// ============================================================

const streetArtPanel =
  document.getElementById(
    'street-art-panel'
  );


const streetArtPanelContent =
  document.getElementById(
    'street-art-panel-content'
  );


const streetArtPanelClose =
  document.getElementById(
    'street-art-panel-close'
  );


// ------------------------------------------------------------
// OPEN PANEL
// ------------------------------------------------------------

function openStreetArtPanel(
  properties
) {

  const name =
    properties[
      "Name/Descriptor"
    ] ||
    "Unnamed";


  const type =
    properties.Type ||
    "Street Art";


  const dateFound =
    properties[
      "Date Found"
    ]

      ? new Date(
          properties[
            "Date Found"
          ]
        )
        .toLocaleDateString(
          'en-US',
          {
            year:
              'numeric',

            month:
              'long',

            day:
              'numeric'
          }
        )

      : "Not recorded";


  const notes =
    properties.Notes ||
    "No keywords recorded.";


  streetArtPanelContent
    .replaceChildren();


  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  const title =
    document.createElement(
      'div'
    );


  title.className =
    'street-art-panel-title';


  title.textContent =
    name;


  // ----------------------------------------------------------
  // TYPE
  // ----------------------------------------------------------

  const typeElement =
    document.createElement(
      'div'
    );


  typeElement.className =
    'street-art-panel-type';


  const typeSymbol =
    document.createElement(
      'span'
    );


  typeSymbol.className =
    `panel-type-symbol panel-${
      type
        .toLowerCase()
        .replace(/[^a-z]+/g, '-')
    }`;


  const typeText =
    document.createElement(
      'span'
    );


  typeText.textContent =
    type;


  typeElement.append(
    typeSymbol,
    typeText
  );


  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  const dateField =
    document.createElement(
      'div'
    );


  dateField.className =
    'street-art-panel-field';


  const dateLabel =
    document.createElement(
      'div'
    );


  dateLabel.className =
    'street-art-panel-label';


  dateLabel.textContent =
    'Date Found';


  const dateValue =
    document.createElement(
      'div'
    );


  dateValue.className =
    'street-art-panel-value';


  dateValue.textContent =
    dateFound;


  dateField.append(
    dateLabel,
    dateValue
  );


  // ----------------------------------------------------------
  // KEYWORDS
  // ----------------------------------------------------------

  const keywordsField =
    document.createElement(
      'div'
    );


  keywordsField.className =
    'street-art-panel-field';


  const keywordsLabel =
    document.createElement(
      'div'
    );


  keywordsLabel.className =
    'street-art-panel-label';


  keywordsLabel.textContent =
    'Keywords';


  const keywordsValue =
    document.createElement(
      'div'
    );


  keywordsValue.className =
    'street-art-panel-value';


  keywordsValue.textContent =
    notes;


  keywordsField.append(
    keywordsLabel,
    keywordsValue
  );


  // ----------------------------------------------------------
  // PUT EVERYTHING INTO PANEL
  // ----------------------------------------------------------

  streetArtPanelContent.append(
    title,
    typeElement,
    dateField,
    keywordsField
  );


  streetArtPanel.classList.add(
    'open'
  );

}


// ------------------------------------------------------------
// CLOSE PANEL
// ------------------------------------------------------------

function closeStreetArtPanel() {

  streetArtPanel.classList.remove(
    'open'
  );


  // Remove selected marker styling
  if (
    selectedStreetArtMarker
  ) {

    const element =
      selectedStreetArtMarker
        .getElement();


    if (element) {
      element.blur();
      
      element.classList.remove(
        'street-art-selected'
      );

    }


    selectedStreetArtMarker
      .setZIndexOffset(0);


    selectedStreetArtMarker =
      null;

  }


  // Remove permanent name label
  if (
    selectedStreetArtTooltip
  ) {

    map.removeLayer(
      selectedStreetArtTooltip
    );

    selectedStreetArtTooltip =
      null;

  }

}


streetArtPanelClose.addEventListener(
  'click',
  closeStreetArtPanel
);


// ============================================================
// ESCAPE KEY
// ============================================================

document.addEventListener(
  'keydown',
  function(event) {

    if (
      event.key === 'Escape' &&
      selectedStreetArtMarker
    ) {

      clearStreetArtSelection();

      closeStreetArtPanel();

    }

  }
);




const photoGallery =
  document.getElementById(
    'photo-gallery'
  );

L.DomEvent.disableClickPropagation(photoGallery);
L.DomEvent.disableScrollPropagation(photoGallery);

L.DomEvent.on(
  photoGallery,
  'dblclick',
  L.DomEvent.stopPropagation
);

const photoGalleryClose =
  document.getElementById(
    'photo-gallery-close'
  );


photoGalleryClose.addEventListener(
  'click',
  function() {

    photoGallery.classList.remove(
      'open'
    );
    
    map.getContainer().classList.remove(
      'photo-gallery-mode'
    );


    restorePhotoGalleryMap();

  }
);


document.addEventListener(
  'keydown',
  function(event) {

    if (
      !photoGallery.classList.contains(
        'open'
      )
    ) {
      return;
    }

    // ----------------------------------------------------------
    // ESCAPE — CLOSE GALLERY
    // ----------------------------------------------------------

    if (event.key === 'Escape') {

      photoGallery.classList.remove(
        'open'
      );

      map.getContainer().classList.remove(
        'photo-gallery-mode'
      );

      restorePhotoGalleryMap();

      return;
    }

    // ----------------------------------------------------------
    // LEFT ARROW — PREVIOUS PHOTO
    // ----------------------------------------------------------

    if (
      event.key === 'ArrowLeft' &&
      currentPhotoIndex > 0
    ) {

      event.preventDefault();

      currentPhotoIndex--;

      updatePhotoGallery();

      return;
    }

    // ----------------------------------------------------------
    // RIGHT ARROW — NEXT PHOTO
    // ----------------------------------------------------------

    if (
      event.key === 'ArrowRight' &&
      currentPhotoIndex <
        photoGalleryData.length - 1
    ) {

      event.preventDefault();

      currentPhotoIndex++;

      updatePhotoGallery();

      return;
    }

  }
);

// ============================================================
// PHOTO GALLERY NAVIGATION
// ============================================================

const photoGalleryData = [

  {
    image: 'Photo_1.jpg',
    name: 'Fuck Trump',
    type: 'Graffiti',
    date: 'August 12, 2026',
    latitude: '38.917612',
    longitude: '-77.031303',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_2.jpg',
    name: 'Hands off birth control',
    type: 'Poster/Sticker',
    date: 'August 17, 2026',
    latitude: '38.905577',
    longitude: '-77.010995',
    keywords: 'RFK Jr.'
  },

  {
    image: 'Photo_3.jpg',
    name: 'Marsha Law drag queen',
    type: 'Poster/Sticker',
    date: 'July 31, 2026',
    latitude: '38.909381',
    longitude: '-77.055960',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_4.jpg',
    name: 'McPherson mural - LIVE',
    type: 'Mural',
    date: 'June 19, 2026',
    latitude: '38.902083',
    longitude: '-77.034056',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_5.jpg',
    name: 'Free babysitting',
    type: 'Poster/Sticker',
    date: 'August 21, 2026',
    latitude: '38.881942',
    longitude: '-76.983656',
    keywords: 'Donald Trump, Epstein Files'
  },

  {
    image: 'Photo_6.jpg',
    name: 'Dick tater',
    type: 'Poster/Sticker',
    date: 'August 12, 2026',
    latitude: '38.926719',
    longitude: '-77.029356',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_7.jpg',
    name: 'Guitar case, ICE',
    type: 'Poster/Sticker',
    date: 'July 29, 2026',
    latitude: '38.909081',
    longitude: '-77.043957',
    keywords: 'ICE'
  },

  {
    image: 'Photo_8.jpg',
    name: 'Mitch McConnell Missing',
    type: 'Poster/Sticker',
    date: 'August 17, 2026',
    latitude: '38.897359',
    longitude: '-77.010759',
    keywords: 'Mitch McConnell'
  },

  {
    image: 'Photo_9.jpg',
    name: 'Be prepared to stop fascism',
    type: 'Graffiti',
    date: 'August 3, 2026',
    latitude: '38.920064',
    longitude: '-77.041755',
    keywords: 'Fascism'
  },

  {
    image: 'Photo_10.jpg',
    name: 'Ray-Bans',
    type: 'Poster/Sticker',
    date: 'July 29, 2026',
    latitude: '38.912681',
    longitude: '-77.047388',
    keywords: 'Fascism'
  },

  {
    image: 'Photo_11.jpg',
    name: 'When tyranny becomes law...',
    type: 'Poster/Sticker',
    date: 'August 17, 2026',
    latitude: '38.892272',
    longitude: '-77.014637',
    keywords: 'Tyranny'
  },

  {
    image: 'Photo_12.jpg',
    name: 'Fuck ICE',
    type: 'Graffiti',
    date: 'August 12, 2026',
    latitude: '38.917107',
    longitude: '-77.026967',
    keywords: 'ICE'
  },

  {
    image: 'Photo_13.jpg',
    name: 'National Guard protest wheatpaste - LIVE',
    type: 'Poster/Sticker',
    date: 'August 14, 2026',
    latitude: '38.936531',
    longitude: '-77.032836',
    keywords: 'National Guard'
  },

  {
    image: 'Photo_14.jpg',
    name: 'Kill Elon',
    type: 'Graffiti',
    date: 'August 27, 2026',
    latitude: '38.914503',
    longitude: '-77.027251',
    keywords: 'Elon Musk'
  },

  {
    image: 'Photo_15.jpg',
    name: 'Fuck ICE clowns',
    type: 'Poster/Sticker',
    date: 'August 3, 2026',
    latitude: '38.920086',
    longitude: '-77.046663',
    keywords: 'ICE'
  },

  {
    image: 'Photo_16.jpg',
    name: 'UglyFuck.org',
    type: 'Poster/Sticker',
    date: 'August 12, 2026',
    latitude: '38.926437',
    longitude: '-77.033444',
    keywords: 'Stephen Miller'
  },

  {
    image: 'Photo_17.jpg',
    name: 'Trump is trash',
    type: 'Poster/Sticker',
    date: 'June 19, 2026',
    latitude: '38.911228',
    longitude: '-77.034608',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_18.jpg',
    name: 'Kristi Noem demon poster',
    type: 'Poster/Sticker',
    date: 'August 21, 2026',
    latitude: '38.885637',
    longitude: '-76.998360',
    keywords: 'Kristi Noem'
  },

  {
    image: 'Photo_19.jpg',
    name: 'Destroys diaper, destroys economy',
    type: 'Poster/Sticker',
    date: 'June 19, 2026',
    latitude: '38.904850',
    longitude: '-77.034567',
    keywords: 'Donald Trump'
  },

  {
    image: 'Photo_20.jpg',
    name: 'Gagged Washington',
    type: 'Graffiti',
    date: 'August 12, 2026',
    latitude: '38.917081',
    longitude: '-77.034693',
    keywords: 'N/A'
  }

];


let currentPhotoIndex = 0;

let photoWaypointHighlight = null;
let photoFeaturedMarker = null;
let photoGalleryPreviousView = null;
let photoGalleryPreviousMaxBounds = null;
let photoGalleryPreviousMaxBoundsViscosity = 0.8;

const photoHighlightPane = map.createPane('photo-highlight-pane');
photoHighlightPane.style.zIndex = 650;


function rememberPhotoGalleryMapView() {

  photoGalleryPreviousView = {
    center: map.getCenter(),
    zoom: map.getZoom()
  };

  // Remember the normal map bounds so we can restore them later.
  photoGalleryPreviousMaxBounds =
    map.options.maxBounds;

  photoGalleryPreviousMaxBoundsViscosity =
    map.options.maxBoundsViscosity;

  // Temporarily remove the bounds while the gallery is open.
  // This allows us to position the photo waypoint anywhere
  // within the visible left side of the map.
  map.setMaxBounds(null);
}

function positionPhotoGalleryMap(photo) {

  const latitude = Number(photo.latitude);
  const longitude = Number(photo.longitude);

  const photoLocation =
    L.latLng(latitude, longitude);

  // ----------------------------------------------------------
  // FIND THE ACTUAL STREET-ART MARKER
  // ----------------------------------------------------------

  if (photoFeaturedMarker) {
    photoFeaturedMarker.setZIndexOffset(0);

    const oldElement =
      photoFeaturedMarker.getElement();

    if (oldElement) {
      oldElement.classList.remove(
        'photo-featured-marker'
      );
    }

    photoFeaturedMarker = null;
  }

  const matchingRecord =
    streetArtRecords.find(
      function(record) {

        const recordLat =
          Number(
            record.marker.getLatLng().lat
          );

        const recordLng =
          Number(
            record.marker.getLatLng().lng
          );

        return (
          Math.abs(recordLat - latitude) < 0.000001 &&
          Math.abs(recordLng - longitude) < 0.000001
        );

      }
    );

  if (matchingRecord) {

    photoFeaturedMarker =
      matchingRecord.marker;

    photoFeaturedMarker.setZIndexOffset(3000);

    const element =
      photoFeaturedMarker.getElement();

    if (element) {
      element.classList.add(
        'photo-featured-marker'
      );
    }

  }

  // ----------------------------------------------------------
  // WHITE HIGHLIGHT RING
  // ----------------------------------------------------------

  if (photoWaypointHighlight) {
    map.removeLayer(
      photoWaypointHighlight
    );
  }

  photoWaypointHighlight =
    L.circleMarker(
      photoLocation,
      {
        pane: 'photo-highlight-pane',
        radius: 22,
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillColor: '#ffffff',
        fillOpacity: 0,
        interactive: false
      }
    ).addTo(map);

  // ----------------------------------------------------------
  // POSITION MAP
  // ----------------------------------------------------------

  if (window.innerWidth > 700) {

    map.invalidateSize();

    map.setView(
      photoLocation,
      14,
      { animate: false }
    );

    map.invalidateSize();

    const mapSize =
      map.getSize();

    const desiredPoint =
      L.point(
        mapSize.x * 0.15,
        mapSize.y * 0.50
      );

    const actualPoint =
      map.latLngToContainerPoint(
        photoLocation
      );

    const offset =
      actualPoint.subtract(
        desiredPoint
      );

    map.panBy(
      [offset.x, offset.y],
      { animate: false }
    );

  }

}

function restorePhotoGalleryMap() {

  if (photoWaypointHighlight) {

    map.removeLayer(
      photoWaypointHighlight
    );

    photoWaypointHighlight = null;
  }

  if (photoFeaturedMarker) {

    photoFeaturedMarker.setZIndexOffset(0);

    const element =
      photoFeaturedMarker.getElement();

    if (element) {
      element.classList.remove(
        'photo-featured-marker'
      );
    }

    photoFeaturedMarker = null;
  }

  if (photoGalleryPreviousView) {

    map.setView(
      photoGalleryPreviousView.center,
      photoGalleryPreviousView.zoom,
      { animate: false }
    );

    photoGalleryPreviousView = null;
  }

  map.setMaxBounds(
    photoGalleryPreviousMaxBounds
  );

  map.setMaxBoundsViscosity(
    photoGalleryPreviousMaxBoundsViscosity
  );

  photoGalleryPreviousMaxBounds = null;
}



const photoGalleryImage =
  document.getElementById(
    'photo-gallery-image'
  );

const photoGalleryPrevious =
  document.getElementById(
    'photo-gallery-previous'
  );

const photoGalleryNext =
  document.getElementById(
    'photo-gallery-next'
  );

const photoGalleryCounter =
  document.querySelector(
    '.photo-gallery-counter'
  );


const photoGalleryInfoTitle =
  document.getElementById(
    'photo-gallery-info-title'
  );

const photoGalleryInfoMeta =
  document.getElementById(
    'photo-gallery-info-meta'
  );

const photoGalleryInfoLocation =
  document.getElementById(
    'photo-gallery-info-location'
  );

const photoGalleryInfoKeywords =
  document.getElementById(
    'photo-gallery-info-keywords'
  );


function updatePhotoGallery() {

  const photo =
    photoGalleryData[
      currentPhotoIndex
    ];


  const imageURL =
    `./${photo.image}`;


  // ----------------------------------------------------------
  // IMAGE
  // ----------------------------------------------------------

  photoGalleryImage.src =
    imageURL;

  photoGalleryImage.alt =
    photo.name;


  // ----------------------------------------------------------
  // COUNTER
  // ----------------------------------------------------------

  photoGalleryCounter.textContent =
    `${currentPhotoIndex + 1} / ${photoGalleryData.length}`;


  // ----------------------------------------------------------
  // INFORMATION
  // ----------------------------------------------------------

  photoGalleryInfoTitle.textContent =
    photo.name;


  photoGalleryInfoMeta.innerHTML = `
    <span>${photo.type}</span>
    <span>${photo.date}</span>
  `;


  photoGalleryInfoLocation.textContent =
    `${photo.latitude}, ${photo.longitude}`;


  if (photo.keywords) {

    photoGalleryInfoKeywords.innerHTML =
      `<strong>Keywords:</strong> ${photo.keywords}`;

  } else {

    photoGalleryInfoKeywords.textContent =
      '';

  }


  // ----------------------------------------------------------
  // NAVIGATION VISIBILITY
  // ----------------------------------------------------------

  photoGalleryPrevious.style.display =
    currentPhotoIndex === 0
      ? 'none'
      : 'block';

  photoGalleryNext.style.display =
    currentPhotoIndex ===
    photoGalleryData.length - 1
      ? 'none'
      : 'block';
  
  
// MOVE THE MAP
  
  positionPhotoGalleryMap(photo);
  

}


/* ------------------------------------------------------------
   PREVIOUS
   ------------------------------------------------------------ */

photoGalleryPrevious.addEventListener(
  'click',
  function() {

    if (currentPhotoIndex > 0) {
      currentPhotoIndex--;
    }

    updatePhotoGallery();

  }
);


/* ------------------------------------------------------------
   NEXT
   ------------------------------------------------------------ */

photoGalleryNext.addEventListener(
  'click',
  function() {

    if (
      currentPhotoIndex <
      photoGalleryData.length - 1
    ) {

      currentPhotoIndex++;

      updatePhotoGallery();

    }

  }
);
