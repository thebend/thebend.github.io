// polyfills
Array.prototype.find || Object.defineProperty(Array.prototype, "find", { value: function (a) { if (null == this)
        throw new TypeError('"this" is null or not defined'); var b = Object(this), c = b.length >>> 0; if ("function" != typeof a)
        throw new TypeError("predicate must be a function"); for (var d = arguments[1], e = 0; e < c;) {
        var f = b[e];
        if (a.call(d, f, e, b))
            return f;
        e++;
    } } });
Array.prototype.includes || Object.defineProperty(Array.prototype, "includes", { value: function (a, b) { function g(a, b) { return a === b || "number" == typeof a && "number" == typeof b && isNaN(a) && isNaN(b); } if (null == this)
        throw new TypeError('"this" is null or not defined'); var c = Object(this), d = c.length >>> 0; if (0 === d)
        return !1; for (var e = 0 | b, f = Math.max(e >= 0 ? e : d - Math.abs(e), 0); f < d;) {
        if (g(c[f], a))
            return !0;
        f++;
    } return !1; } });
var zones = [
    {
        "type": "residential",
        "codes": ['R1', 'R1-A', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'RS1'],
        "color": "green"
    }, {
        "type": "agricultural",
        "codes": ['AR1', 'AR2'],
        "color": "darkred",
    }, {
        "type": "commercial",
        "codes": ['C1', 'C1-A', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'ASC', 'GSC'],
        "color": "royalblue"
    }, {
        "type": "industrial",
        "codes": ['M1', 'M2', 'M3'],
        "color": "orange"
    }, {
        "type": "public",
        "codes": ['AO', 'P1', 'P2', 'P3'],
        "color": "slategrey"
    }
];
var color = {
    gray: 'rgb(191,191,191)',
    lightgray: 'rgb(211,211,211)',
    green: 'rgb(0,191,0)',
    red: 'rgb(191,0,0)'
};
color.goodBad = [color.green, color.gray];
color.badGood = [color.gray, color.green];
color.posNeg = [color.red, color.gray, color.green];
function getZoneColor(d) {
    return d.zone ? d.zone.color : color.gray;
}
var currencyFormat = d3.format('$,');
Handlebars.registerHelper('currencyFormat', currencyFormat);
Handlebars.registerHelper('yesNo', function (d) { return d ? 'Yes' : 'No'; });
var tooltipTemplate;
var scaleControls;
var Domain = (function () {
    function Domain(x, y) {
        this.x = d3.extent(x);
        this.y = d3.extent(y);
    }
    Domain.scaleSide = function (side, difference) {
        difference /= 2;
        side[0] -= difference;
        side[1] += difference;
    };
    Domain.prototype.scaleToRatio = function (targetRatio) {
        var width = this.x[1] - this.x[0];
        var height = this.y[1] - this.y[0];
        var thisRatio = height / width;
        if (thisRatio > targetRatio) {
            Domain.scaleSide(this.x, height / targetRatio - width);
        }
        else {
            Domain.scaleSide(this.y, width * targetRatio - height);
        }
    };
    return Domain;
}());
var MIN_ZOOM_SIZE = 5;
var MapUI = (function () {
    function MapUI(mapElement, histogramElement, tooltipElement, searchElement) {
        var _this = this;
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.focusedDataScale = d3.scaleLinear();
        this.isUpdatingUI = false;
        this.colorInterpolator = d3.interpolateRgbBasis([color.gray, color.green]);
        this.colorScale = d3.scaleLinear();
        this.zoom = function () {
            _this.zoomRect.remove();
            var x1 = d3.event.clientX;
            var y1 = d3.event.clientY;
            var distance = Math.sqrt(Math.pow((x1 - _this.x0), 2) + Math.pow((y1 - _this.y0), 2));
            if (distance >= MIN_ZOOM_SIZE) {
                _this.resize(new Domain([_this.xScale.invert(x1), _this.xScale.invert(_this.x0)], [_this.yScale.invert(y1), _this.yScale.invert(_this.y0)]));
            }
            _this.x0 = undefined;
        };
        this.scaledPointString = function (point) {
            return _this.xScale(point[0]) + ',' + _this.yScale(point[1]);
        };
        /** Return a string in "1,2 3,4 5,6" format from a property's points array */
        this.getPointString = function (d) {
            return d.points.map(_this.scaledPointString).join(' ');
        };
        /**
         * Redraw the map, to be called after a resize event or after zooming.
         * @param domain - the specific extent of the backing data we want to render
         */
        this.resize = function (domain) {
            domain = domain || MapUI.getDomain(_this.activeData);
            var range = _this.mapD3.node().getBoundingClientRect();
            domain.scaleToRatio(range.height / range.width);
            _this.xScale.domain(domain.x).range([0, range.width]);
            _this.yScale.domain(domain.y).range([range.height, 0]);
            _this.mapD3.selectAll('polygon').attr('points', _this.getPointString);
        };
        this.getColor = function (d) {
            var val = _this.focusedDataAccessor(d);
            return val ? _this.colorScale(_this.focusedDataScale(val)) : '#444';
        };
        this.doZoneColor = function () {
            // why do I need to manually set the CSS classes on bootstrap buttons?
            // don't want to be touching buttons in this object
            scaleControls.addClass('disabled').removeClass('active');
            _this.mapD3.selectAll('polygon').style('fill', getZoneColor);
        };
        this.filterAddress = function () {
            _this.mapD3.selectAll('polygon').style('stroke', null);
            var searchVal = _this.searchInput.val().toUpperCase();
            if (!searchVal)
                return;
            function hasMatchingAddress(d) {
                return d.address.indexOf(searchVal) > -1;
            }
            var isMatch = _this.mapD3.selectAll('polygon').
                filter(hasMatchingAddress).style('stroke', 'white').size() > 0;
            _this.search.
                addClass(isMatch ? 'has-success' : 'has-error').
                removeClass(isMatch ? 'has-error' : 'has-success');
            _this.searchIcon.
                addClass(isMatch ? 'glyphicon-ok' : 'glyphicon-remove').
                removeClass(isMatch ? 'glyphicon-remove' : 'glyphicon-ok');
        };
        this.mapD3 = d3.select(mapElement).
            on('mousedown', function () {
            _this.x0 = d3.event.clientX;
            _this.y0 = d3.event.clientY;
            _this.zoomRect = _this.mapD3.append('rect').
                attr('id', 'zoom-rect');
        }).
            on('mousemove', function () {
            if (!_this.x0)
                return;
            var x = d3.extent([_this.x0, d3.event.clientX]);
            var y = d3.extent([_this.y0, d3.event.clientY]);
            _this.zoomRect.
                attr('x', x[0]).attr('width', x[1] - x[0]).
                attr('y', y[0]).attr('height', y[1] - y[0]);
        }).
            on('mouseup', this.zoom);
        this.histogramD3 = d3.select(histogramElement);
        this.tooltip = $(tooltipElement);
        this.search = $(searchElement).on('input', updateAddressFilter);
        this.searchInput = this.search.find('input');
        this.searchIcon = this.search.find('.glyphicon');
    }
    MapUI.getDomain = function (data) {
        var points = d3.merge(data.map(function (p) { return p.points; }));
        return new Domain(d3.extent(points, function (p) { return p[0]; }), d3.extent(points, function (p) { return p[1]; }));
    };
    MapUI.prototype.setData = function (data) {
        var _this = this;
        this.propertyData = data;
        this.activeData = data;
        this.mapD3.append('g').attr('id', 'properties').selectAll('polygon').
            data(data, function (d) { return d.oid_evbc_b64; }).enter().append('polygon').
            on('mouseover', function (d) { return _this.tooltip.html(tooltipTemplate(d)); });
        this.resize();
    };
    MapUI.prototype.drawHistogram = function () {
        var histogram = d3.histogram().thresholds(this.focusedDataScale.ticks(20));
        var bins = histogram(this.focusedData);
        var boundary = this.histogramD3.node().getBoundingClientRect();
        var barAreaHeight = boundary.height / bins.length;
        var maxSize = d3.max(bins, function (i) { return i.length; });
        this.histogramD3.selectAll('g').remove();
        var barGroups = this.histogramD3.selectAll('g').data(bins).enter().append('g').
            attr('transform', function (d, i) { return 'translate(0,' + (boundary.height / bins.length * i) + ')'; });
        barGroups.append('rect').
            attr('width', function (d) { return boundary.width / maxSize * d.length; }).
            attr('height', MapUI.BAR_THICKNESS).
            attr('rx', MapUI.BAR_THICKNESS / 2).
            attr('y', (barAreaHeight - MapUI.BAR_THICKNESS) / 2);
        barGroups.append('text').
            attr('y', barAreaHeight / 2 - (2 * MapUI.BAR_THICKNESS)).
            text(function (d) { return MapUI.legendPrecision(d.x0) + '-' + MapUI.legendPrecision(d.x1); });
    };
    MapUI.prototype.redraw = function () {
        this.isUpdatingUI = false;
        this.mapD3.selectAll('polygon').style('fill', this.getColor);
        this.drawHistogram();
    };
    MapUI.prototype.toggleFilter = function (zone, isActive) {
        function isFilterZone(d) { return d.zone && d.zone.type == zone; }
        if (isActive) {
            this.activeData = this.activeData.concat(this.propertyData.filter(isFilterZone));
        }
        else {
            this.activeData = this.activeData.filter(function (d) { return !isFilterZone(d); });
        }
        this.mapD3.selectAll('polygon').filter(isFilterZone).style('display', isActive ? 'none' : null);
        this.updateFocusedData();
        this.redraw();
    };
    /** Get a new set of focused data based on the given accessor */
    MapUI.prototype.updateFocusedData = function (accessor) {
        if (accessor)
            this.focusedDataAccessor = accessor;
        this.focusedData = this.activeData.map(this.focusedDataAccessor);
        var domain = d3.extent(this.focusedData);
        var multiRange = this.focusedDataScale.range().length == 3;
        this.focusedDataScale.domain(multiRange ? [domain[0], 1, domain[1]] : domain);
    };
    /**
     * Replace scale with a new one using the same domain and range.
     * Used to change from linear to log scale type.
     */
    MapUI.prototype.setFocusedDataScale = function (scale) {
        this.focusedDataScale = scale.
            domain(this.focusedDataScale.domain()).
            range(this.focusedDataScale.range());
        if (!this.isUpdatingUI)
            this.redraw();
    };
    MapUI.prototype.setColorParameters = function (accessor, scaleRange, scaleType) {
        this.isUpdatingUI = true;
        scaleControls.removeClass('disabled');
        this.updateFocusedData(accessor);
        this.colorInterpolator = d3.interpolateRgbBasis(scaleRange);
        $('#simple').click();
        $('#' + scaleType).click();
        this.redraw();
    };
    MapUI.prototype.setViridisColor = function (isViridis) {
        var _this = this;
        this.colorScale.interpolate(function () { return isViridis ? d3.interpolateViridis : _this.colorInterpolator; });
        if (!this.isUpdatingUI)
            this.redraw();
    };
    return MapUI;
}());
MapUI.legendPrecision = d3.format('.2s');
MapUI.BAR_THICKNESS = 6;
function getGlyph(before, after) {
    return 'glyphicon-arrow-' + (after - before > 0 ? 'up' : 'down');
}
var currentYear = new Date().getFullYear();
function getAge(d) {
    return d.year_built ? currentYear - d.year_built : null;
}
function getLandValueDensity(d) {
    if (!d.total_assessed_land)
        return null;
    // 60.3-60.5m areas are just placeholders with no accurate size
    if (d.area >= 60 && d.area <= 61)
        return null;
    return d.total_assessed_land / d.area;
}
function getChangeRatio(current, previous) {
    if (current && previous) {
        var ratio = current / previous;
        // use clamping here?
        // deal with outliers better than this!
        if (ratio > 0.5 && ratio < 2.5)
            return ratio;
    }
    return 1;
}
var filterAddressTimeout;
function updateAddressFilter() {
    clearTimeout(filterAddressTimeout);
    filterAddressTimeout = setTimeout(mapUi.filterAddress, 500);
}
var mapUi;
$(function () {
    tooltipTemplate = Handlebars.compile($('#tooltip-template').html());
    scaleControls = $('#scale label, #color label');
    mapUi = new MapUI($('#map svg')[0], $('#histogram svg')[0], document.getElementById('tooltip'), document.getElementById('search'));
    // configure UI events
    ['residential', 'commercial', 'industrial', 'agricultural', 'public'].forEach(function (zone) {
        var btn = $('#' + zone);
        btn.on('click', function () { return mapUi.toggleFilter(zone, btn.hasClass('active')); });
    });
    var clickActions = {
        "zoomout": function () { return mapUi.resize(); },
        "linear": function () { return mapUi.setFocusedDataScale(d3.scaleLinear()); },
        "log": function () { return mapUi.setFocusedDataScale(d3.scaleLog()); },
        "simple": function () { return mapUi.setViridisColor(false); },
        "viridis": function () { return mapUi.setViridisColor(true); },
        "land-value": function () { return mapUi.setColorParameters(getLandValueDensity, color.badGood, 'linear'); },
        "age": function () { return mapUi.setColorParameters(getAge, color.goodBad, 'log'); },
        "total-value": function () { return mapUi.setColorParameters(function (d) { return d.total_assessed_value; }, color.badGood, 'log'); },
        "change-building": function () { return mapUi.setColorParameters(function (d) { return getChangeRatio(d.total_assessed_building, d.previous_building); }, color.posNeg, 'log'); },
        "change-land": function () { return mapUi.setColorParameters(function (d) { return getChangeRatio(d.total_assessed_land, d.previous_land); }, color.posNeg, 'linear'); },
        "zone-type": mapUi.doZoneColor,
        "bedroom": function () { return mapUi.setColorParameters(function (d) { return d.bedrooms; }, color.goodBad, 'log'); },
        "bathroom": function () { return mapUi.setColorParameters(function (d) { return d.bathrooms; }, color.goodBad, 'log'); }
    };
    for (var key in clickActions) {
        $('#' + key).on('click', clickActions[key]);
    }
    // domain estimated at 980736 units wide, translates to roughly 5300 meters wide
    var METERS_PER_UNIT = 5300 / 980736;
    var METERS_PER_UNIT_AREA = Math.pow(METERS_PER_UNIT, 2);
    d3.csv('terrace.csv').row(function (r) {
        var d = {
            oid_evbc_b64: r.oid_evbc_b64,
            pid: r.pid,
            total_assessed_land: +r.total_assessed_land,
            total_assessed_building: +r.total_assessed_building,
            total_assessed_value: +r.total_assessed_value,
            previous_land: +r.previous_land,
            previous_building: +r.previous_building,
            previous_total: +r.previous_total,
            year_built: +r.year_built,
            address: r.address,
            geometry: r.geometry,
            points: eval(r.geometry),
            sales_history: eval(r.sales_history),
            zoning: r.zoning,
            bedrooms: +r.bedrooms || null,
            bathrooms: +r.bathrooms || null,
            carport: !!+r.carport,
            garage: !!+r.garage,
            storeys: +r.storeys
        };
        d.area = d.points ? Math.round(Math.abs(d3.polygonArea(d.points)) * METERS_PER_UNIT_AREA) : null;
        d.land_glyph = getGlyph(d.previous_land, d.total_assessed_land);
        d.building_glyph = getGlyph(d.previous_building, d.total_assessed_building);
        d.total_glyph = getGlyph(d.previous_total, d.total_assessed_value);
        d.zone = zones.find(function (z) { return z.codes.includes(d.zoning); });
        return d;
    }).get(function (error, data) {
        mapUi.setData(data);
        $('#land-value').click();
    });
});
