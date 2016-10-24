//
// Biligram 2.0
// Javascript version
//

/*
 *  Biligram: plot Bhutani nomograms and phototherapy + exchange transfusion thresholds
 *  for newborns, to help prevent clinically significant neonatal jaundice.
 *
 *  Copyright © 2013-2016 Daniel Rosenberg MD, Portland Oregon
 *  Daniel.Rosenberg (at sign) Providence.ORG
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

// First, we define some global objects that describe the logic:

// Bhutani risk zones literal object
// Bhutani risk zones start at 12 hours of life
var riskZone = {
	interval: 4,	// How many hours apart are each data point
	startsAt: 12,
	// Each line in the series, followed by literal index identifiers
	// We're using an array rather than an object in order to guarantee order
	series: [
		[25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25],
		[7.1, 7.2, 7.4, 7.8, 8.9, 10.0, 11.1, 12.2, 12.5, 13.2, 13.8, 14.4, 15.2, 15.4, 15.6, 15.9, 16.2, 16.4, 16.7, 17.0, 17.2, 17.4, 17.4, 17.5, 17.5, 17.5, 17.6, 17.7, 17.6, 17.5, 17.4, 17.4, 17.3, 17.3, 17.4],
		[5.1, 5.5, 5.9, 6.1, 7.0, 8.0, 8.9, 9.9, 10.3, 10.8, 11.3, 12.0, 12.6, 12.9, 13.1, 13.4, 13.8, 14.3, 14.7, 14.7, 15.0, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.7, 15.6, 15.5, 15.4, 15.3, 15.2, 15.3],
		[3.9, 4.3, 4.7, 4.9, 5.5, 6.3, 7.0, 7.8, 8.1, 8.6, 9.0, 9.3, 9.6, 10.2, 10.7, 11.2, 11.3, 11.4, 11.6, 11.8, 12.2, 12.3, 12.5, 12.7, 12.8, 13.0, 13.1, 13.2, 13.2, 13.2, 13.2, 13.2, 13.2, 13.2, 13],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]   // Array.fill not supported in IE11 or below
	],
	zero: 4,
	low: 3,
	lowIntermediate: 2,
	highIntermediate: 1,
	high: 0,
	undefined: -2,

	// Given an age in hours, what threshold (if any) is a bilirubin level above?
	exceeds: function (hours, level) {
		var xDistance, y1, y2, x1, x1Index, threshold;
		// Get the nearest (on the left side) x value in hours
		// So if an age is, say, 29 hours, and our interval is 4, we're looking for 28 hours (x1), or position 7 in the array (the x1Index)
		x1Index = Math.floor((hours - this.startsAt)/this.interval);
		x1 = Math.floor(hours/this.interval) * this.interval;

		// If we are looking for a risk level prior to when they're defined, return undefined
		if (hours < this.startsAt) {
			return this.undefined;
		}
		// If the hour is so late it falls off the right side of the nomogram, we'll use the rightmost data
		// point available, which assumes it more or less goes off forever at the same bilirubin level
		if (x1Index >= this.series[0].length) {
			x1Index = this.series[0].length - 1;
		}

		// Go through each series at the age in hours
		// If we exceed that zones ceiling, we return the next zone "up"
		// We get to skip the high risk zone, since if we exceed high-int risk we're high risk
		// We get to skip the low risk zone, since if it doesn't exceed any of the other zones it's low risk
		for (var i = 1; i < this.series.length - 1; i++) {
			y1 = this.series[i][x1Index];
			if (x1Index  < this.series[0].length) {
				y2 = this.series[i][x1Index + 1];
			} else {
				// We're at the right edge of the series, so assume it's a straight line
				y2 = y1;
			}
			// Rate of y increase between two data points is (y2 - y1)/interval
			// Since that's a linear function, the threshold we're looking for is (y2 - y1)/interval
			// Slope = rise/run; rise is y2-y1; run is always the interval
			// So given a slope and two points, the point slope formula says
			// y2-y1 = slope * (x2-x1), or
			// y2 = y1 + slope * (x2 - x1)
			// xDistance is how far it is from x1 to hours
			xDistance = hours - x1;
			threshold = y1 + (xDistance * ((y2 - y1)/this.interval));
			if (level >= threshold) {
				return i - 1;	// If we exceeded this zone's ceiling, return the next zone "up"
				// E.g., if we exceeded the ceiling of the low risk zone, return low-intermediate risk
			}
		}
		// If we made it here, we didn't cross a threshold
		return this.low;
	}
};



// Phototherapy treatment zone thresholds literal object
// For phototherapy, we exceed the treatment threshold for infants at low risk (>= 38 weeks GA and well) at the top line,
// at medium risk (>= 38 week + risk factors of isoimmune hemolytic disease, G6PD deficiency, asphyxia, significant lethargy,
// temperature instability, sepsis, acidosis or an albumin level < 3.0 g/dL if measured) or 35-37w6d and well
// or for high risk infants 35-37w6d + risk factors
// Phototherapy zones start at 0 hours of life
var treatmentZone = {
	interval: 12,
	startsAt: 0,
	phototherapySeries: [
		[6.7, 9, 11.5, 13.5, 15.2, 16.4, 17.6, 18.8, 19.8, 20.3, 21, 21, 21],
		[5, 7.6, 9.8, 11.7, 13.1, 14.5, 15.4, 16.4, 17.2, 18, 18, 18, 18],
		[3.8, 6.0, 7.8, 9.5, 11.1, 12.4, 13.4, 14, 14.5, 14.9, 15, 15, 15]
	],
	transfusionSeries: [
		[16, 17.7, 19, 20.8, 22.1, 23, 23.9, 24.4, 24.9, 24.9, 24.9, 24.9, 24.9],
		[13.8, 15.1, 16.5, 17.9, 19.1, 20.1, 21.2, 22, 22.4, 22.4, 22.4, 22.4, 22.4],
		[12, 13.5, 15, 16, 17.1, 18, 18.5, 18.8, 19, 19, 19, 19, 19]
	],
	phototherapyVisible: false,
	transfusiontherapyVisible: false,
	high: 2,
	medium: 1,
	low: 0,
	none: -1,
	undefined: -2,
	phototherapylineColor: '#1016FF',  // #1016FF or 00A8FF is 460 nm blue-indigo, typical phototherapy light
	transfusionLineColor: 'DarkViolet',
	lineWidth: 1.5,


	// Given an age in hours and bilirubin level, for a given gestational age at birth, is the bilirubin level above
	// a phototherapy or transfusion treatment threshold?
	// So long as we know the gestational age of the baby, we can only cross one variety of zone; the low risk (highest)
	// phototherapy line cross the high risk (lowest) transfusion therapy line at the right of the nomogram,
	// but because the high risk lines are for 35-37w6d babies and the low risk lines are only for 38w0d babies, a baby
	// can't exceed both the high risk photoTx line and the low risk transfusionTx line
	// Still, there could be ambiguity where a 38 week sick baby might need transfusion but the same baby who is
	// well only needs phototherapy, so in that case we'd need to report exceeds threshold for phototherapy if well
	// and transfusion if sick
	//
	// Skip checking the low line if GA >= 38:
	// Return undefined if GA < 35 weeks
	// If GA is 38+ weeks and the baby is well, the treatment threshold is the highest line
	// If the GA is 38+ weeks and baby is sick, or 35-37w6d and the baby is well, it's the medium line
	// If the GA is 35-37w6d and sick, it's the low line
	//
	// We'll go through transfusiontherapy first, then phototherapy
	//
	// Returns an object: { exceedsPhoto, exceedsTranfusion }
	exceeds: function (hours, level, gaBirth) {
		var xDistance, y1, y2, x1, x1Index, threshold;
		var returnValue = { phototherapy: this.none, transfusion: this.none };

		x1Index = Math.floor((hours - this.startsAt)/this.interval);
		x1 = Math.floor(hours/this.interval) * this.interval;


		// if the hours fall off the right edge of the graph, assume for the purposes of treatment levels
		// we're at the rightmost edge
		if (x1Index > this.phototherapySeries[0].length) {
			x1Index = this.phototherapySeries[0].length - 1;
		}

		for(i = 0; i < this.phototherapySeries.length -  (gaBirth >= 38); i++) {  // started out with 0 + (gaBirth >= 38)
			y1 = this.phototherapySeries[i][x1Index];

			if (x1Index < this.phototherapySeries[0].length) {
				y2 = this.phototherapySeries[i][x1Index + 1];
			} else {
				y2 = y1;
			}
			xDistance = hours - x1;
			threshold = y1 + (xDistance * ((y2 - y1)/this.interval));
			if (level >= threshold) {
				returnValue.phototherapy = i;
				this.phototherapyVisible = true;		// Show the series if we're exceeding it (otherwise it's clutter)
				break;
			}
		}

		for(i = 0; i < this.transfusionSeries.length - (gaBirth >= 38); i++) { // also needs to add back 0 + gaBirth >= 38
			y1 = this.transfusionSeries[i][x1Index];
			if (x1Index < this.transfusionSeries[0].length) {
				y2 = this.transfusionSeries[i][x1Index + 1];
			} else {
				y2 = y1;
			}
			xDistance = hours - x1;
			threshold = y1 + (xDistance * ((y2 - y1) / this.interval));
			if (level >= threshold) {
				returnValue.transfusion = i;
				this.transfusiontherapyVisible = true;
				break;
			}
		}
		return returnValue;
	}
};


// Incoming results from Epic
var results = {};

// The actual array of objects we'll plot on the graph, based on the results
var resultsSeries = [];


// Load this function (JQuery-style) when the document is loaded
$(function () {


	// Follow-up recommendations per 2009 Pediatrics article, stratified according
	// to Bhutani risk, GA and a second set of risk factors which we'll show
	// with a hover div
	var followupRecommendations = {
		young: {					// 35-37w6d
			noRiskFactors: {
				highRisk: 'Evaluate for phototherapy, TSB in 4-24 h (inpatient or outpatient)',
				highIntRisk: 'Evaluate for phototherapy, TcB/TSB within 24 h (inpatient or outpatient)',
				lowIntRisk: 'If discharging < 72 h of age, follow up within 2 d',
				lowRisk: 'If discharging in < 72 h of age, follow up within 2-3 d'
			},
			withRiskFactors: {
				highRisk: 'Evaluate for phototherapy, TSB in 4-8 h (inpatient)',
				highIntRisk: 'Evaluate for phototherapy, TSB in 4-24 h (inpatient or outpatient)',
				lowIntRisk: 'If discharging < 72 h of age, follow-up within 2 d, consider TSB/TcB at follow-up',
				lowRisk: 'If discharging < 72 h of age, follow up within 2 d'
			}
		},							// 38+ weeks
		notYoung: {
			noRiskFactors: {
				highRisk: 'Evaluate for phototherapy, TSB in 4-24 h (inpatient or outpatient)',
				highIntRisk: 'Follow up within 2 d, consider TcB/TSB at follow-up',
				lowIntRisk: 'If discharging < 72 h of age, follow up within 2-3 d',
				lowRisk: 'If discharging < 72 h of age, time follow-up according to age at discharge or concerns other than jaundice (e.g., breastfeeding)'
			},
			withRiskFactors: {		// Apparently I can't do this: =  this.young.noRiskFactors
				highRisk: 'Evaluate for phototherapy, TSB in 4-24 h (inpatient or outpatient)',
				highIntRisk: 'Evaluate for phototherapy, TcB/TSB within 24 h (inpatient or outpatient)',
				lowIntRisk: 'If discharging < 72 h of age, follow up within 2 d',
				lowRisk: 'If discharging in < 72 h of age, follow up within 2-3 d'
			}
		}
	};

	// Main entry point of logic
	// When the chart is ready, load up the results

	function getBiliResults() {

		var hours, level, method, resultTable;

        /*
		results = {
			birthGA: 35.6,
			birthWeight: 2.630,
			birthDay: birthDateTime.getMonth() + '/' + birthDateTime.getDate() + '/' + birthDateTime.getFullYear(),
			birthTime: '00:23',
			serum: [{drawtime:addHours(24), level:4.0}, {drawtime:addHours(36), level:7.1}, {drawtime:addHours(48), level:11.1}, {drawtime: addHours(72), level: 16}],
			POC: [{drawtime: addHours(26), level:4.3}, {drawtime: addHours(30), level:7.5}, {drawtime:addHours(40), level:10.0}, {drawtime: addHours(78), level: 10}],
			TCLab: [{drawtime: addHours(16), level:7.3}, {drawtime: addHours(85), level:14.5}],
			sortedResults: [],
			photoTx: '',
			mini: false

		};
		*/


        // Give a div component with Epic EMR @lablast@ output, convert to a JSON object
        function translateData(component) {
            var data = [];
            $("#" + component + " tr").each(function(index) {
                if (index > 1) {			// Skip the first index since it's the header row
                    var cells = $("td", this);
                    data.push({
                        drawtime : cells[0].innerText,
                        level : parseFloat(cells[1].innerText)	// Parsefloat gets rid of things like asterisks for out of range values
                    });
                }
            });
            return data;
        }

		// Given a photoTherapy div (output of an LPG which yields phototherapy flowsheet rows)
		// generate an array of phototherapy start times. Note that there are no end times, but nurses document at least every 4 hours,
		// so we'll try to make a vague line that stretches out to 4 hours
		// Results will come in two rows: columns of timestamps (6/3/2016 1518) followed by a row of methods (bank lights,
		// triple lights, double lights, blanket/pad, overhead, bed — multiple therapies will be separated by a semicolon
		function translatePhotoTherapy(component) {
			var data = [];
			var phototherapyOutput = $("textarea#photoTherapy").val();

            if (typeof phototherapyOutput == "undefined") {
                return;
            } else {
				// var datetime = /([0-9+]\/[0-9]+\/[0-9]+)\s([0-9]{4})/g.exec(phototherapyOutput);
				// First we grab a list of datetimes
				var datetime = phototherapyOutput.match(/([0-9+]\/[0-9]+\/[0-9]+)\s([0-9]{4})/g);

				// Then we remove the datetimes from the string
				phototherapyOutput = phototherapyOutput.replace(/([0-9+]\/[0-9]+\/[0-9]+)\s([0-9]{4})/g, '');

				// Then we get rid of the Source (Phototherapy): headers
				phototherapyOutput = phototherapyOutput.replace(/Source \(Phototherapy\):\s/g, '');

				// Get rid of the main Phototherapy header on top
				phototherapyOutput = phototherapyOutput.replace(/Phototherapy/, '');

				// Replace triple tabs with a single
				phototherapyOutput = phototherapyOutput.replace(/\t\t\t/g, '\t');
				phototherapyOutput = phototherapyOutput.replace(/[\n|\r]/g, '\t');

				// var method = phototherapyOutput.match()
				/*
				 data.push({
				 starttime: ,
				 method:
				 });
				 */
				return data;
			}
		}
		
		
		// for testing, our fake results will be some number of hours ahead of the birthdate-time
		// given a number of hours
		function addHours(hours) {
			var returnDate = new Date;
			// returnDate = birthDateTime;
			returnDate = (5).days().ago().add(hours).hours();
			return returnDate;
		}

		// Put the name of the method (serum, POC, transcut) in the result array of objects
		// IE10+ compatible, so re-written as addMethod2 to handle older versions of IE
		function addMethod(method, element) {
			var newElement = {
				drawtime: element.drawtime,
				level: element.level,
				method: method
			};
			return newElement;
		}

		function addMethod2(objectArray, method) {
			var returnArray = [];
			for (var i = 0; i < objectArray.length; i++ ) {
				returnArray.push( {
					drawtime: objectArray[i].drawtime,
					level: objectArray[i].level,
					method: method
				})
			}

			return returnArray;
		}

        // Convert an array with drawtimes in text ("6/4/16 12:02") to its Javascript equivalent
        function convertDateTime(element) {
            var newElement = {
                drawtime: Date.parse(element.drawtime),
                level: element.level

            };
            return newElement;
        }

		function stickAColonInIt(time) {
			if (time.indexOf(':') >= 0) {
				return time;
			} else {
				var len = time.length;
				if (len == 4) {
					return time.slice(0,2) + ':' + time.slice(2,4);
				} else {
					return time.slice(0,1) + ':' + time.slice(1,3);
				}

			}
		}

        // Given a birth gestational age like 36 6/7 weeks, convert to 36.85...
        // We could use eval, and it seems unlikely that someone would pass us bogus stuff to evaluate,
        // But I thought we'd be paranoid
        function convertWholePlusFrac(birthGA) {
            var wholePlusFrac = birthGA.split(' ');
            if (wholePlusFrac.length > 1) {
                var frac = wholePlusFrac[1].split('/');
                var whole = parseInt(wholePlusFrac[0]);
                var result = whole + (parseInt(frac[0])/parseInt(frac[1]));
                return result;
            } else {
                return birthGA;
            }
        }
        // Grab the results from the data div on the ETX HTML page
        results.serum = translateData("biliSerum");
        results.POC = translateData("biliPOC");
        results.TCLab = translateData("biliTCLab");
		results.photoTherapy = translatePhotoTherapy("photoTherapy");
		
        results.birthDay = $("textarea#birthDay").val();
        results.birthTime = $("textarea#birthTime").val();

		results.birthTime = stickAColonInIt(results.birthTime);

        birthDateTime = Date.parse(results.birthDay + ' ' + results.birthTime);
        if (birthDateTime == null) {
            $('#resultTable').append('<div class="alert alert-danger"><b>Warning:</b> Could not figure out the birth date/time or it doesn\'t seem valid (' + birthDateTime + '</div>');

        }

        results.birthGA = convertWholePlusFrac($("textarea#birthGA").val());

        // These come as "2.930 kg (6 lb 10 oz)" - we'll just grab the floating point value in front
        results.birthWeight = parseFloat($("textarea#birthWeight").val());
        if (results.birthWeight < 0.5) {
            $('#resultTable').append('<div class="alert alert-danger"><b>Warning:</b> Could not figure out the birth weight or it doesn\'t seem valid (' + results.birthWeight + ' kg)</div>');

        }

        // Convert the text date/times (6/4/16 12:02) to their Javascript equivalents
		// Switched from JS map method to JQuery for IE compatibility
        // results.serum = results.serum.map(convertDateTime);
		results.serum = $.map(results.serum, convertDateTime);
		// results.POC = results.POC.map(convertDateTime);
		results.POC = $.map(results.POC, convertDateTime);
		// results.TCLab = results.TCLab.map(convertDateTime);
		results.TCLab = $.map(results.TCLab, convertDateTime);

		// results.photoTherapy = 

        // Add the methodology of the bilirubin assay to the array of objects (so, the array of serum levels adds a reference to each
		// object to the method being serum
		// Using the map method for brevity, and the .bind(null... in order to pass in an extra argument (the method),
		// so we don't need 3 different functions
		// Turns out this works in IE10+, but sometimes our EMR seems to insist on IE5 mode, so switched to a custom function
		// results.serum = results.serum.map(addMethod.bind(null, 'serum'));
		results.serum = addMethod2(results.serum, 'serum');

		// results.POC = results.POC.map(addMethod.bind(null, 'POC'));
		results.POC = addMethod2(results.POC, 'POC');

		// results.TCLab = results.TCLab.map(addMethod.bind(null, 'transcut'));
		results.TCLab = addMethod2(results.TCLab, 'transcut');


		// Now, merge all the arrays of results (from the different methodologies) into one big sorted array
		results.sortedResults = results.serum.concat(results.POC, results.TCLab).sort(function(a, b) {
			if (a.drawtime < b.drawtime) return -1;
			if (a.drawtime > b.drawtime) return 1;
			return 0;
		});

		var sickKidWarning  = 'with these risk factors: isoimmune disease, G6PD deficiency,<br> asphysxia, lethargy, temp instability, sepis, albumin < 3.0 g/dL (if measured)</span>';
		var youngKidWarning = '';
		if (results.birthGA < 38) {
			youngKidWarning = 'for infants 35w-37w6d GA';
		}

		// Start building the result table
		resultTable = '<div class="row"><div class="col-md-10"><div class="text-right" id="resultTableCheckbox"> </div><table class="table table-striped table-hover table-condensed">' +
			'<thead><tr><th class="result-row-first">Draw time</th><th class="result-row-first">Age</th><th class="result-row-first">Bilirubin level</th><th class="result-row-first">Risk level</th>' +
			'<th colspan="2" class="result-row-first">Follow-up recommendations</th><th><div class="radio result-row-first" id="resultTableRadioDiv">Rows to show: </div></th></tr>' +
			'<tr class="result-row-first"><th></th><th></th><th></th><th></th>' +
			'<th>Without <a href="" class="trigger">risk factors</a>' +
			'</th><th>With <a href="" class="trigger">risk factors</a></th><th></tr>' +
			'</thead><tbody>\n';


		if (!((results.birthGA >= 36 && results.birthWeight > 2) || (results.birthGA >= 35 && results.birthWeight > 2.5))) {
			resultTable += '<tr class="danger"><td colspan="5"><b>Warning</b>: the Bhutani risk zones are only valid for birth GA 36+ weeks and birth weight > 2 kg, ' +
				' or 35+ weeks and birth weight > 2.5 kg. See the UpToDate article on Hyperbilirubinemia in the Premature Infant to see alternative thresholds.</td></tr>';

		} else if (results.birthGA < 35) {
			resultTable += '<tr class="danger"><td colspan="5"><b>Warning</b>: the Bhutani nomogram does not define risk for infants with a birth gestational age under 35 weeks.<br>' +
				'See the UpToDate article on Hyperbilirubinemia in the Premature Infant to see alternative thresholds.</td></tr>';
		}

		// Given a data point, give it its decorations based on risk zone
		function decorateDataPoint (dataPoint, hours, level, method, color, description) {
			dataPoint.customTooltip = '<span style="font-size: 0.85em"><b>' + hours + '</b> hours of age &mdash; <b>' + level + '</b> mg/dL (' + method + ')</span><br/>' +
				'<span style="color: ' + color + '"> &#9673; </span>' + description + ' risk zone';
			dataPoint.marker.lineColor = color;
			dataPoint.dataLabels.formatter = function () {
				return this.y + ' (' + description + ' risk)';
			};
		}

		// Given a result and risk zone, add it to the result table, along with corresponding follow-up recommendations
		function addRiskToTableRow (color, description, birthGA) {
			resultTable += '<td style="background-color:' + color + ';">' + description + '</td>';

			switch (description) {
				case 'Low':
					if (birthGA >= 35 && birthGA < 38) {
						resultTable += '<td>' + followupRecommendations.young.noRiskFactors.lowRisk +
							'</td><td>' + followupRecommendations.young.withRiskFactors.lowRisk + '</td>';
					} else if (birthGA > 38) {
						resultTable += '<td>' + followupRecommendations.notYoung.noRiskFactors.lowRisk +
							'</td><td>' + followupRecommendations.notYoung.withRiskFactors.lowRisk + '</td>';
					} else {
						resultTable += '<td colspan="2">(Not applicable under 35 weeks)</td>';
					}
					break;
				case 'Low-intermediate':
					if (birthGA >= 35 && birthGA < 38) {
						resultTable += '<td>' + followupRecommendations.young.noRiskFactors.lowIntRisk +
							'</td><td>' + followupRecommendations.young.withRiskFactors.lowIntRisk + '</td>';
					} else if (birthGA > 38) {
						resultTable += '<td>' + followupRecommendations.notYoung.noRiskFactors.lowIntRisk +
							'</td><td>' + followupRecommendations.notYoung.withRiskFactors.lowIntRisk + '</td>';
					} else {
						resultTable += '<td colspan="2">(Not applicable under 35 weeks)</td>';
					}
					break;
				case 'High-intermediate':
					if (birthGA >= 35 && birthGA < 38) {
						resultTable += '<td>' + followupRecommendations.young.noRiskFactors.highIntRisk +
							'</td><td>' + followupRecommendations.young.withRiskFactors.highIntRisk + '</td>';
					} else if (birthGA > 38) {
						resultTable += '<td>' + followupRecommendations.notYoung.noRiskFactors.highIntRisk +
							'</td><td>' + followupRecommendations.notYoung.withRiskFactors.highIntRisk + '</td>';
					} else {
						resultTable += '<td colspan="2">(Not applicable under 35 weeks)</td>';
					}
					break;
				case 'High':
					if (birthGA >= 35 && birthGA < 38) {
						resultTable += '<td>' + followupRecommendations.young.noRiskFactors.highRisk +
							'</td><td>' + followupRecommendations.young.withRiskFactors.highRisk + '</td>';
					} else if (birthGA > 38) {
						resultTable += '<td>' + followupRecommendations.notYoung.noRiskFactors.highRisk +
							'</td><td>' + followupRecommendations.notYoung.withRiskFactors.highRisk + '</td>';
					} else {
						resultTable += '<td colspan="2">(Not applicable under 35 weeks)</td>';
					}
					break;
			}


		}

		// Go through each data point, and decorate it with appropriate colors and tooltips for thresholds exceeded
		// We go through backwards here so the data table shows the most recent values on top; the commented line
		// if used for the For statement will go in forward order instead
		// Note that highcharts returns an error 15 for the final sort (since it wants the series sorted forward, not backward)
		// ... so maybe we need a fancier table using a sortedtable plugin ...

		var rowClass = "result-row-first";

		for (var i = results.sortedResults.length - 1; i >= 0; i--) {
		// for (var i = 0; i < results.sortedResults.length; i++) {
			hours = ((results.sortedResults[i].drawtime - birthDateTime) / 3600000).toFixed(1);
			level = results.sortedResults[i].level;
			method = results.sortedResults[i].method;

			var drawtime = results.sortedResults[i].drawtime;
			var drawtimeAbbreviated = (1 + drawtime.getMonth()) + '/' + drawtime.getDate() + ' ' + drawtime.getHours() + ':' +  ('0' + drawtime.getMinutes()).slice(-2);
			var riskZonePlacement = riskZone.exceeds(hours, level);

			var treatmentZoneExceeded = treatmentZone.exceeds(hours, level, results.birthGA);

			resultTable += '<tr class="' + rowClass + '"><td>' + drawtimeAbbreviated + '</td><td>' + hours + ' hours</td><td>' + level + ' (' + method + ')</td>';
			rowClass = "result-row";		// The first row is result-first, after that result, for radio button use

			var markerShape;

			switch (method) {
				case 'serum':
					markerShape = 'circle';
					break;
				case 'POC':
					markerShape = 'diamond';
					break;
				case 'transcut':
					markerShape = 'square';
					break;
			}
			// Make a new object for each data point
			// The data labels for each point are hidden to start
			var dataPoint = {
				x: hours,
				y: level,
				marker: {
					enabled: true,
					lineWidth: 3,
					lineColor: 'black',
					fillColor: 'black',
					symbol: markerShape
				},
				dataLabels: {						// Not actually visible, but considering a button to make them show up
					backgroundColor: 'green',
					borderColor: 'black',
					align: 'right',
					x: -5,
					y: -6,
					enabled: false,
					formatter: function () {
						return this.y + " (low risk)"
					}
				}
			};



			// Given a risk zone placement, decorate the datapoint and tooltip, and add detail to the table row
			switch (riskZonePlacement) {
				case riskZone.low:
					decorateDataPoint(dataPoint, hours, level, method, 'green', 'Low');
					addRiskToTableRow('green', 'Low', results.birthGA);
					break;

				case riskZone.lowIntermediate:
					decorateDataPoint(dataPoint, hours, level, method, 'yellow', 'Low-intermediate');
					addRiskToTableRow('yellow', 'Low-intermediate', results.birthGA);
					break;

				case riskZone.highIntermediate:
					decorateDataPoint(dataPoint, hours, level, method, 'orange', 'High-intermediate');
					addRiskToTableRow('orange', 'High-intermediate', results.birthGA);
					break;
				case riskZone.high:
					decorateDataPoint(dataPoint, hours, level, method, 'red', 'High');
					addRiskToTableRow('red', 'High', results.birthGA);
					break;

			}

			// If GA is 38+ weeks and the baby is well, the treatment threshold is the highest (low risk) line
			// If the GA is 38+ weeks and baby is sick, or 35-37w6d and the baby is well, it's the medium line
			// If the GA is 35-37w6d and sick, it's the low line (high risk)
			// First handle infants exceeding a phototherapy threshold
			switch (treatmentZoneExceeded.phototherapy) {

				case treatmentZone.high: // If we are 38+ weeks, we should never hit this case
					// redecorateDataPointForTreatment(dataPoint, 5, "phototherapy");
					dataPoint.marker.fillColor = treatmentZone.phototherapylineColor;
					dataPoint.marker.radius = 5;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.phototherapylineColor + ';"> &#9673; </span>Exceeds phototherapy threshold for ' + youngKidWarning + ' ' + sickKidWarning;
					resultTable += '<td style="color:' + treatmentZone.phototherapylineColor + ';">Exceeds phototherapy threshold for ' + youngKidWarning + ' ' + sickKidWarning + '</td>';
					break;
				case treatmentZone.medium:
					dataPoint.marker.fillColor = treatmentZone.phototherapylineColor;
					dataPoint.marker.radius = 5;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.phototherapylineColor + ';"> &#9673; </span>Exceeds phototherapy threshold for 35-37w6d healthy, or 38w+ GA infants ' + sickKidWarning;
					resultTable += '<td style="color:' + treatmentZone.phototherapylineColor + ';">Exceeds phototherapy threshold for 35-37w6d healthy, or 38w+ GA infants ' + sickKidWarning + '</td>';
					break;
				case treatmentZone.low:
					dataPoint.marker.fillColor = treatmentZone.phototherapylineColor;
					dataPoint.marker.radius = 5;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.phototherapylineColor + ';"> &#9673; </span>Exceeds phototherapy threshold for 38+ infants who are well';
					resultTable += '<td style="color:' + treatmentZone.phototherapylineColor + ';">Exceeds phototherapy threshold for 38+ infants who are well</td>';
					break;
			}


			// Then handle the case of infants exceeding the exchange transfusion threshold (one kid may exceed both)
			switch (treatmentZoneExceeded.transfusion) {
				case treatmentZone.high:
					dataPoint.marker.fillColor = treatmentZone.transfusionLineColor;
					dataPoint.marker.radius = 6;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.transfusionLineColor +
						'"> &#9673; </span>Exceeds transfusion threshold for ' + youngKidWarning + ' ' + sickKidWarning;
					resultTable += '<td style="color:' + treatmentZone.transfusionLineColor + ';">Exceeds transfusion threshold for ' + youngKidWarning + ' ' + sickKidWarning + '</td>';

					break;
				case treatmentZone.medium:
					dataPoint.marker.fillColor = treatmentZone.transfusionLineColor;
					dataPoint.marker.radius = 6;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.transfusionLineColor +
						'"> &#9673; </span>Exceeds transfusion threshold for 35-37w6d healthy, or 38w+ GA infants with ' + sickKidWarning;
					resultTable += '<td style="color:' + treatmentZone.transfusionLineColor + ';">Exceeds transfusion threshold for 35-37w6d healthy, or 38w+ GA infants ' + sickKidWarning + '</td>';

					break;
				case treatmentZone.low:
					dataPoint.marker.fillColor = treatmentZone.transfusionLineColor;
					dataPoint.marker.radius = 6;

					dataPoint.customTooltip += '<br><span style="color: ' + treatmentZone.transfusionLineColor +
						'"> &#9673; </span>Exceeds transfusion threshold for 38+ GA infants who are well';
					resultTable += '<td style="color:' + treatmentZone.transfusionLineColor + ';">Exceeds transfusion threshold for 38+ infants who are well</td>';

					break;
			}
			resultTable += '</tr>\n';
			resultsSeries.push(dataPoint);
		}
		resultTable += '</tbody></table>\n';


		$('#resultTable').append(resultTable);
		$('#resultTableRadioDiv').append('<form role="form">' +
			'<div class="radio"><label class="radio-inline"><input type="radio" name="showTableRows" id="all">All rows</label>' +
			'<label class="radio-inline"><input type="radio" name="showTableRows" id="latest" checked="checked">Latest</label>' +
			'<label class="radio-inline"><input type="radio" name="showTableRows" id="none">None</label></div></form>');
		$('#resultTableCheckbox').append('<form role="form"><label class="checkbox-inline">' +
			'<input type="checkbox" id="showTable" value="">Show table</label></form>');


		// Set up table row display: just the latest result by default so as not to have too tall a display
		$(".result-row-first").show();
		$(".result-row").hide();
		$("#resultTableCheckbox").hide();

		// If the Show table checkbox gets checked, show the result table
		$('input[type=checkbox]').change(function(e) {
			if (this.id == 'showTable') {
				$(".result-row-first").slideDown();
				if ((location.pathname).indexOf('table-only.html') >= 0) {
					$(".result-row").slideDown();
					$("#all").prop('checked', true);
				} else {
					$(".result-row").slideUp();
					$("#latest").prop('checked', true);
				}
				$("#resultTableCheckbox").slideUp();
				$("#showTable").prop('checked', false);
			}
		});

		// Handle users changing the number of result rows to display
		// If they hide everything, hide the radio buttons (which look odd when nothing is there)
		// and display a hidden checkbox instead, which looks more reasonable when copying and
		// pasting into the EMR
		$('input[type=radio]').change(function(e) {
			if (this.id == 'all') {
				$(".result-row-first,.result-row").slideDown();

			} else if (this.id == 'latest') {
				$(".result-row-first").slideDown();
				$(".result-row").slideUp();
				$("#resultTableCheckbox").slideUp();

			} else if (this.id == 'none') {
				// $('#resultTableRadioDiv').text("None radio check");
				$(".result-row-first,.result-row").slideUp();
				$("#resultTableCheckbox").slideDown();
			}
		});


		// Set up the tooltip for the result table (that displays the risk factors peculiar to follow-up guidelines)
		$(".trigger").tooltip({ position: "bottom center", opacity: 0.95, tip: "#followUpRiskFactors"});


	}		// End function getBiliResults

	// Main execution entry point
	getBiliResults();

	// In mini mode, we don't show the graph; otherwise, show the graph
	if ( /* (results.mini == false  || */ !(location.pathname).indexOf('table-only.html') >= 0) {
		renderChart();
	} else {
		// In table only mode, show the whole table, not just the latest row
		$(".result-row-first,.result-row").slideDown();
		$("#all").prop('checked', true);

	}
});			// End function()

// Support functions for setting up series for plotting

// Given an two arrays of y coordinates, replace it with an array of datapoint objects that includes
// x coordinates at a given interval of hours (and low and high values for the y coordinates for a range plot)
// We use this to make an area plot for each zone of the Bhutani nomogram (low, low-int, high-int and high)
function addXCoordinatesWithRange(yCoordinatesLow, yCoordinatesHigh, interval, startsAt) {
	var arrayLength = yCoordinatesHigh.length;
	var x = startsAt;
	var returnArray = [];

	for (var i = 0; i < arrayLength; i++) {
		var dataPoint = {x: x, low: yCoordinatesLow[i], high: yCoordinatesHigh[i]};

		returnArray.push(dataPoint);
		x += interval;
	}
	return(returnArray);
}

// Given an array of y coordinates, replace it with an array of datapoint objects that includes
// x coordinates at a given interval of hours
// We use this to plot the phototherapy and transfusion therapy thresholds
function addXCoordinates(yCoordinates, interval, startsAt) {
	var arrayLength = yCoordinates.length;
	var x = startsAt;
	var returnArray = [];

	for (var i = 0; i < arrayLength; i++) {
		var dataPoint = {x: x, y: yCoordinates[i]};

		returnArray.push(dataPoint);
		x += interval;
	}
	return(returnArray);
}



// $('#container').highcharts({
function renderChart () {
		var chartOptions = {
			title: {
				// text: 'Bilirubin nomogram',
				text: '',
				x: -120 //center
			},

			credits: {
				enabled: false
			},
			chart: {
				type: 'arearange',
				// events: getBiliResults(),
				zoomType: 'xy',
				panning: true,
				panKey: 'shift',
				animation: false,
				renderTo: 'container'
			},
			subtitle: {
				// text: 'Source: <a href="http://pediatrics.aappublications.org/content/114/1/297">Pediatrics 2004; 114(1)</a>',
				x: -20
			},
			xAxis: [{
				title: {
					text: 'Age <i>(hours)</i>'
				},
				tickInterval: 24,
				minorTickInterval: 12
			}, {
				title: {
					text: 'Age <i>(days)</i>'
				},
				labels: {
					formatter: function () {
						return this.value / 24;
					}
				},
				linkedTo: 0,	// this secondary access just re-displays the primary (0) axis in a different format
				opposite: true
			}],
			yAxis: {
				title: {
					text: 'Total serum bilirubin (mg/dL)'
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: 'gray'

				}],
				floor: 0
				// max: 25
				// ceiling: 25
			},
			legend: {
				layout: 'vertical',
				align: 'right',
				verticalAlign: 'middle',
				borderWidth: 0,
				useHTML: true,
				itemHoverStyle: {
					color: 'DarkGray'
				}
			},
			tooltip: {
				useHTML: true,
				opacity: 0.9,
				formatter: function () {
					// return this.series.name;
					return this.point.customTooltip;
				}

			},
			plotOptions: {
				series: {
					allowPointSelect: false,
					enableMouseTracking: false,
					fillOpacity: 0.6,
					lineWidth: 0,
					marker: {
						enabled: false
					},
					animation: false

				}

			},

			series: [{
				id: 'HRZ',
				name: 'High risk zone',
				color: 'red',
				type: 'arearange',
				data: addXCoordinatesWithRange(riskZone.series[riskZone.highIntermediate], riskZone.series[riskZone.high], riskZone.interval, riskZone.startsAt)
			}, {
				id: 'HIRZ',
				name: 'High-intermediate risk zone',
				color: 'orange',
				data: addXCoordinatesWithRange(riskZone.series[riskZone.lowIntermediate], riskZone.series[riskZone.highIntermediate], riskZone.interval, riskZone.startsAt)
			}, {
				id: 'LIRZ',
				name: 'Low-intermediate risk zone',
				color: 'yellow',
				data: addXCoordinatesWithRange(riskZone.series[riskZone.low], riskZone.series[riskZone.lowIntermediate], riskZone.interval, riskZone.startsAt)
			}, {
				id: 'LRZ',
				name: 'Low risk zone',
				color: 'green',
				// xAxis: 1,
				data: addXCoordinatesWithRange(riskZone.series[riskZone.zero], riskZone.series[riskZone.low], riskZone.interval, riskZone.startsAt)
			}, {
				id: 'photoHighRisk',
				name: 'Phototherapy thresholds', // photoTxHighRisk, Infants at higher risk (35-37w6d and risk factors)
				color: treatmentZone.phototherapylineColor,
				type: 'spline',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.phototherapyVisible,
				data: addXCoordinates(treatmentZone.phototherapySeries[treatmentZone.high], treatmentZone.interval, treatmentZone.startsAt)
			}, {
				id: 'photoMediumRisk',
				name: 'Infants at medium risk (38+ weeks and risk factors, or 35-37w6d and well)', // photoTxMediumRisk
				color: treatmentZone.phototherapylineColor,
				type: 'spline',
				dashStyle: 'dash',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.phototherapyVisible,
				linkedTo: ':previous',
				data: addXCoordinates(treatmentZone.phototherapySeries[treatmentZone.medium], treatmentZone.interval, treatmentZone.startsAt)
			}, {
				id: 'photoLowRisk',
				name: 'Phototherapy thresholds', // 'Infants at lower risk (38+ weeks and well)', // photoTxLowRisk
				color: treatmentZone.phototherapylineColor,
				type: 'spline',
				dashStyle: 'dot',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.phototherapyVisible,
				linkedTo: ':previous',
				data: addXCoordinates(treatmentZone.phototherapySeries[treatmentZone.low], treatmentZone.interval, treatmentZone.startsAt)
			}, {
				id: 'transfusionHighRisk',
				name: 'Transfusion thresholds<br>(low risk &#8943;, medium --, high risk &#8213;)', // 'Infants at higher risk (35-37w6d and risk factors: isoimmune disease, G6PD, asphysxia, lethargy, temp instability, sepis, albumin < 3.0 g/dL if measured)', // transfusionHighRisk
				color: treatmentZone.transfusionLineColor,
				type: 'spline',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.transfusiontherapyVisible,
				data: addXCoordinates(treatmentZone.transfusionSeries[treatmentZone.high], treatmentZone.interval, treatmentZone.startsAt)
			}, {
				id: 'transfusionMediumRisk',
				name: 'Infants at medium risk (38+ weeks and risk factors, or 35-37w6d and well)', // transfusionMediumRisk
				color: treatmentZone.transfusionLineColor,
				type: 'spline',
				dashStyle: 'dash',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.transfusiontherapyVisible,
				linkedTo: ':previous',
				data: addXCoordinates(treatmentZone.transfusionSeries[treatmentZone.medium], treatmentZone.interval, treatmentZone.startsAt)
			}, {
				id: 'transfusionLowRisk',
				name: 'Infants at lower risk (38+ weeks and well)', // 'Infants at lower risk (38+ weeks and well)', // transfusionLowRisk
				color: treatmentZone.transfusionLineColor,
				type: 'spline',
				dashStyle: 'dot',
				lineWidth: treatmentZone.lineWidth,
				visible: treatmentZone.transfusiontherapyVisible,
				linkedTo: ':previous',
				data: addXCoordinates(treatmentZone.transfusionSeries[treatmentZone.low], treatmentZone.interval, treatmentZone.startsAt)
			}, { // Serum level is a filled black dot, POC is a filled diamond, and POC is a filled square
				name: 'Bilirubin level<br>(serum: &#9679;, POC: &diams;, transcut: &#9632;)<br><br>' +
					// '<button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#copyModal">Click to copy graph</button>',
                    // We gave up on the modal version (where we copy the image into a modal window)
                    // since that fails in IE10
                    '<button type="button" class="btn btn-info btn-sm" onclick="copyGraphToPNG()">Click to copy graph</button>',

                color: 'black',
				type: 'line',
				animation: true,
				events: {
					afterAnimate: function () {
						// $('#container svg').toImage('#copyImage');
						// convertSVGtoPNG('#copyImage');
					},
					legendItemClick: false
				},
				allowPointSelect: false,
				enableMouseTracking: true,
				fillOpacity: 1,
				lineWidth: treatmentZone.lineWidth,
				marker: {
					enabled: true
				},
				data: resultsSeries
			}
			]
		}; // end chartOptions definition

	var chart = new Highcharts.Chart(chartOptions);

	// SVG can't be copied and pasted as of 2016, but clinicians will reasonably want to paste this chart
	// into their progress notes.
	// Make a PNG version of the chart that can show up in a modal dialog for copy/pasting
	// We can grab the <svg> element, and convert it on the fly to a PNG img that can be displayed in a modal dialog
	// for copying and pasting the usual way

	// $('#container svg').toImage('#copyImage');




}			// End function renderChart

// Convert the Highcharts SVG to a PNG so it can be copied and pasted
function convertSVGtoPNG2(dest) {
	var svg = $('#container svg').html();

	window.onbeforeunload = null;
	var mycanvas = document.createElement('canvas');
	canvg(mycanvas, svg);
	var png = mycanvas.toDataURL("image/png");

	// $("body").append("<image src='" + mycanvas.toDataURL("image/png") + "'/>");
	$("#copyImageDiv").append("<image src='" + png + "'/>");

	/*
	var svg = Highcharts.getSVG(chart);
	var width = svg.width() / 1.5;
	var height = svg.height() / 1.5;

	// var svg = document.getElementById('container#svg');
	var canvas = document.createElement('canvas');
	canvg(canvas, svg); // .html()
	var png = canvas.toDataURL("image/png");

	$(dest)
		.attr('src', png)
		.width(width)
		.height(height);
	*/


}

// Convert the Highcharts SVG to a PNG so it can be copied and pasted
function copyGraphToPNG3() {
    var svg = $('#container svg').html();

    window.onbeforeunload = null;
    var mycanvas = document.createElement('canvas');
    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    // canvg(mycanvas, svg);
    var png = canvas.toDataURL("image/png");

    // $("body").append("<image src='" + mycanvas.toDataURL("image/png") + "'/>");
    $("#copyImageDiv").append("<image src='" + png + "'/>");

    /*
     var svg = Highcharts.getSVG(chart);
     var width = svg.width() / 1.5;
     var height = svg.height() / 1.5;

     // var svg = document.getElementById('container#svg');
     var canvas = document.createElement('canvas');
     canvg(canvas, svg); // .html()
     var png = canvas.toDataURL("image/png");

     $(dest)
     .attr('src', png)
     .width(width)
     .height(height);
     */


}

// Convert the Highcharts SVG to a PNG so it can be copied and pasted
function copyGraphToPNG() {
    var svghtml = $('#container svg').html();
    var svg = $('#container svg');
    var dest = $("#copyImage");

    var width = svg.width(); // / 1.8;
    var height = svg.height(); // / 1.8;

    window.onbeforeunload = null;
    var canvas = document.createElement('canvas');
    // canvas.height = height;
    // canvas.width = width;

    // the ToDataURL method doesn't work in IE (it considers the canvas to be tained once we render an SVG image, as a malicious site could read from the user file system
    // canvg renders the SVG onto a canvas element
    canvg(canvas, svghtml, {
        scaleWidth: width,
        scaleHeight: height,
        ignoreDimensions: true
    });

	// http://stackoverflow.com/questions/33392591/in-browser-conversion-of-svg-to-png-image-cross-browser-including-ie

    var image = new Image;
    image.onload = function() {
        canvas.getContext('2d').drawImage(this, 0, 0, width, height);
    };
    image.src = 'data:image/svg+xml;base64,' + window.btoa(svghtml);

    var png = canvas.toDataURL("image/png");
	// document.body.appendChild(canvas);
	// $("body").append("<image src='" + png + "'/>");
	$("body").append("<image src='" + canvas.toDataURL("image/png") + "'/>");

    // imagesrc = 'data:image/svg+xml;base64,' + window.btoa(svghtml);

    // $("body").append("<image src='" + mycanvas.toDataURL("image/png") + "'/>");
    // $("#copyImageDiv").append("<image src='" + image.src + "'/>");

    /*
     var svg = Highcharts.getSVG(chart);
     var width = svg.width() / 1.5;
     var height = svg.height() / 1.5;

     // var svg = document.getElementById('container#svg');
     var canvas = document.createElement('canvas');
     canvg(canvas, svg); // .html()
     var png = canvas.toDataURL("image/png");

     $(dest)
     .attr('src', png)
     .width(width)
     .height(height);
     */


}


// JQuery function to convert SVG to a copy/pastable img - thanks Tim Vasil (www.timvasil.com)
// Well, it works ok in Chrome, but won't work if opened in a new window in IE10 due to a bug Microsoft won't fix with createObjectURL
// claiming the blob is cross-server (when it isn't)r
// $.fn.toImage = function(dest) {
function copyGraphToPNG4() {
    var dest = $("#copyImage");
    var svg = $('#highcharts-container svg');

    var svghtml = $('#highcharts-container svg').html();

    var width = svg.width(); // / 1.8;
    var height = svg.height(); // / 1.8;

    // Create a blob from the SVG data
    var svgData = new XMLSerializer().serializeToString(svg);

    if (typeof Blob !== "undefined") {
        // New version, should work with IE10 but it doesn't seem to in Epic
        var blob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    } else if (window.MSBlobBuilder) { 	// would need separate versions for window.WebKitBlobBuilder || window.MozBobBuilder) {
        var msblob = new MSBlobBuilder();
        msblob.append([svgData]);
        var blob = msblob.getBlob("image/svg+xml;charset=utf-8");
    }

    // Get the blob's URL
    var blobUrl = (self.URL || self.webkitURL || self).createObjectURL(blob);

    // Load the blob into an image
    $(dest)
        .width(width)
        .height(height)
        .on('load', function() {
            // Overwrite the SVG tag with the img tag
            svg.replaceWith(this);
        })
        .attr('src', blobUrl);
};

// JQuery function to convert SVG to a copy/pastable img - thanks Tim Vasil (www.timvasil.com)
// Well, it works ok in Chrome, but won't work if opened in a new window in IE10 due to a bug Microsoft won't fix with createObjectURL
// claiming the blob is cross-server (when it isn't)
$.fn.toImage = function(dest) {
    $(this).each(function() {
        var svg$ = $(this);
        var width = svg$.width() / 1.8;
        var height = svg$.height() / 1.8;

        // Create a blob from the SVG data
        var svgData = new XMLSerializer().serializeToString(this);

        if (typeof Blob !== "undefined") {
            // New version, should work with IE10 but it doesn't seem to in Epic
            var blob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
        } else if (window.MSBlobBuilder) { 	// would need separate versions for window.WebKitBlobBuilder || window.MozBobBuilder) {
            var msblob = new MSBlobBuilder();
            msblob.append([svgData]);
            var blob = msblob.getBlob("image/svg+xml;charset=utf-8");
        }

        // Get the blob's URL
        var blobUrl = (self.URL || self.webkitURL || self).createObjectURL(blob);

        // Load the blob into an image
        $(dest)
            .width(width)
            .height(height)
            .on('load', function() {
                // Overwrite the SVG tag with the img tag
                svg$.replaceWith(this);
            })
            .attr('src', blobUrl);
    });
};