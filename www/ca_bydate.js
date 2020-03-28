var table;
var countySel;
var ageGroupSel;
var locationTypeSel;
var counties = [];
var locationTypes = [];

const urlParams = new URLSearchParams(window.location.search);
var datafilename = urlParams.get('datafilename');

function fileDataToHighcharts(fileDataToPlot) {
  return _.map(fileDataToPlot, function(fileDataRow) {
    var date = fileDataRow.date;
    var year = date.slice(0, 4);
    var month = date.slice(5, 7);
    var day = date.slice(8, 10);
    return [Date.UTC(year, month-1, day), parseInt(fileDataRow.visit_index)];
  });
}

function styleSeries(series) {
  series.lineWidth = 1;
  series.marker = {radius: 5};
  return series;
}

function seriesToPlot() {
  if (countySel.value && !locationTypeSel.value) {
    var fileDataToPlot = _.where(fileData, { county: countySel.value });
    var results = _.map(locationTypes, function(locationType) {
      return styleSeries({
        name: locationType,
        data: fileDataToHighcharts(_.where(fileDataToPlot, { location_type: locationType }))
      });
    });
    results = _.filter(results, function(series) {
      return series.data.length > 0;
    });
    return results;
  }
  if (!countySel.value && locationTypeSel.value) {
    var fileDataToPlot = _.where(fileData, { location_type: locationTypeSel.value });
    var results = _.map(counties, function(county) {
      return styleSeries({
        name: county,
        data: fileDataToHighcharts(_.where(fileDataToPlot, { county: county }))
      });
    });
    results = _.filter(results, function(series) {
      return series.data.length > 0;
    });
    return results;
  }
  if (countySel.value && locationTypeSel.value) {
    var fileDataToPlot = _.where(fileData, { location_type: locationTypeSel.value, county: countySel.value });
    return [styleSeries({
      name: locationTypeSel.value + " in " + countySel.value,
      data: fileDataToHighcharts(fileDataToPlot)
    })];
  }
}

function drawChart() {
  Highcharts.chart('chartcontainer', {
    chart: {
      animation: false
    },
    title: {   text: '% of Usual Visits'  },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: {
        day: '%a %b %e',
        week: '%a %b %e',
        month: '%a %b %e',
      },
      title: {
        text: 'Date'
      }
    },
    yAxis: { title: { text: '% of Usual Visits' }, min: 0 },
    tooltip: {
        headerFormat: '<b>{series.name}</b><br>',
        pointFormat: '{point.x:%a %b %e}: {point.y}%'
    },
    plotOptions: {  series: {    animation: false   }   },
    series: seriesToPlot()
  });
}

function cleanLocType(string) {
  if (string == "Cafￃﾩs") {
    return "Cafes";
  }
  return string;
}


function redoFilter() {
  table.clearFilter();
  if (countySel.value) {
    table.addFilter("county", "=", countySel.value);
  }
  if (locationTypeSel.value) {
    table.addFilter("location_type", "=", locationTypeSel.value);
  }
//  if (ageGroupSel.value) {
//    table.addFilter("agegroup", "=", ageGroupSel.value);
//  }

  if (countySel.value || locationTypeSel.value) {
    drawChart();
  }
}

function populateSelect(selectElement, stringList) {
  _.each(stringList, function(theString) {
    var option = document.createElement("option");
    option.value = theString;
    option.text = theString;
    selectElement.add(option);
  });
}

function parseGroupedRow(row) {
  return {
    date: row[0],
    state: row[1],
    county: row[2],
    location_type: row[3],
    visit_index: row[4],
    visit_index_over65: row[5],
    visit_index_under65: row[6],
    rank: row[7]
  };
}

function parseRawRow(row) {
  return {
    date: row[0],
    state: row[1],
    county: row[2],
    location_type: row[4],
    visit_index: row[5],
    visit_index_over65: row[6],
    visit_index_under65: row[7],
    rank: row[8]
  };
}

function parseRow(row) {
  // WARNING hack
  if (datafilename.includes('raw')) {
    return parseRawRow(row);
  }
  return parseGroupedRow(row);
}


function parsingDone(results, file) {

  fileData = _.map(results.data.slice(1), function (row) {
    var parsed = parseRow(row);
    counties.push(parsed.county);
    locationTypes.push(parsed.location_type);
    return parsed;
  });

  counties = _.uniq(counties).sort();
  locationTypes = _.uniq(locationTypes).sort();

  table = new Tabulator("#data-table", {
    data:fileData,
    columns:[
      {title:"Location Type", field:"location_type"},
      {title:"% of Usual Visits", field:"visit_index"},
//      {title:"% Usual, Over 65", field:"visit_index_over65"},
//      {title:"% Usual, Under 65", field:"visit_index_under65"},
      {title:"County", field:"county"},
      {title:"Date", field:"date"},
    ],
    height:"600px",
    layout:"fitColumns",
    initialSort:[
      {column:"date", dir:"asc"},
      {column:"county", dir:"asc"},
    ],
  });

  countySel = document.getElementById('county-select');
  populateSelect(countySel, counties);

  locationTypeSel = document.getElementById('location-type-select');
  populateSelect(locationTypeSel, locationTypes);

  _.each([countySel, locationTypeSel], function(sel) { sel.addEventListener('change', redoFilter); });
}

if (!datafilename) {
  datafilename = 'data/grouped.csv';
} else {
  datafilename = 'data/' + datafilename + '.csv';
}

Papa.parse(datafilename, {download: true, complete: parsingDone});
