//// <reference path="types.ts" />
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
function getZoneColor(d) {
    return d.zone ? d.zone.color : color.gray;
}
function doZoneColor() {
    scaleControls.addClass('disabled').removeClass('active');
    mapUi.mapD3.selectAll('polygon').style('fill', getZoneColor);
}
var currencyFormat = d3.format('$,');
Handlebars.registerHelper('currencyFormat', currencyFormat);
Handlebars.registerHelper('yesNo', function (d) { return d ? 'Yes' : 'No'; });
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
    function MapUI(mapElement, histogramElement, tooltipElement, tooltipTemplate) {
        var _this = this;
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.focusedDataScale = d3.scaleLinear();
        this.colorInterpolator = d3.interpolateRgbBasis([color.gray, color.green]);
        this.colorScale = d3.scaleLinear();
        this.zoom = function () {
            _this.zoomRect.remove();
            var pos1 = d3.mouse(_this.mapSvg);
            var distance = Math.sqrt(Math.pow((pos1[0] - _this.pos0[0]), 2) + Math.pow((pos1[1] - _this.pos0[1]), 2));
            if (distance >= MIN_ZOOM_SIZE) {
                _this.resize(new Domain([_this.xScale.invert(_this.pos0[0]), _this.xScale.invert(pos1[0])], [_this.yScale.invert(_this.pos0[1]), _this.yScale.invert(pos1[1])]));
            }
            _this.pos0 = undefined;
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
            var range = _this.mapSvg.getBoundingClientRect();
            domain.scaleToRatio(range.height / range.width);
            _this.xScale.domain(domain.x).range([0, range.width]);
            _this.yScale.domain(domain.y).range([range.height, 0]);
            _this.mapD3.selectAll('polygon').attr('points', _this.getPointString);
        };
        this.getColor = function (d) {
            var val = _this.focusedDataAccessor(d);
            return val == null ? '#444' : _this.colorScale(_this.focusedDataScale(val));
        };
        /**
         * Replace scale with a new one using the same domain and range.
         * Used to change from linear to log scale type.
         */
        this.setLogScale = function (isLog) {
            var scale = isLog ? d3.scaleLog() : d3.scaleLinear();
            _this.focusedDataScale = scale.
                domain(_this.focusedDataScale.domain()).
                range(_this.focusedDataScale.range());
        };
        this.setViridisColor = function (isViridis) {
            _this.colorScale.interpolate(function () { return isViridis ? d3.interpolateViridis : _this.colorInterpolator; });
        };
        this.recolor = function (parameters) {
            if ('accessor' in parameters)
                _this.updateFocusedData(parameters.accessor);
            if ('scale' in parameters)
                _this.setLogScale(parameters.scale == 'log');
            if ('colorRange' in parameters)
                _this.colorInterpolator = d3.interpolateRgbBasis(parameters.colorRange);
            if ('viridis' in parameters)
                _this.setViridisColor(parameters.viridis);
            _this.redraw();
        };
        this.highlight = function (filter) {
            return _this.mapD3.selectAll('polygon').
                style('stroke', null).
                filter(filter).
                style('stroke', 'white').
                size();
        };
        this.mapSvg = mapElement;
        this.mapD3 = d3.select(mapElement).
            on('mousedown', function () {
            _this.pos0 = d3.mouse(_this.mapSvg);
            _this.zoomRect = _this.mapD3.append('rect').
                attr('id', 'zoom-rect');
        }).
            on('mousemove', function () {
            if (!_this.pos0)
                return;
            var pos1 = d3.mouse(_this.mapSvg);
            var x = d3.extent([_this.pos0[0], pos1[0]]);
            var y = d3.extent([_this.pos0[1], pos1[1]]);
            _this.zoomRect.
                attr('x', x[0]).attr('width', x[1] - x[0]).
                attr('y', y[0]).attr('height', y[1] - y[0]);
        }).
            on('mouseup', this.zoom);
        this.mapD3.append('g').attr('id', 'properties');
        this.histogramD3 = d3.select(histogramElement);
        this.tooltip = $(tooltipElement);
        this.tooltipTemplate = tooltipTemplate;
        this.setViridisColor(false);
    }
    MapUI.getDomain = function (data) {
        var points = d3.merge(data.map(function (p) { return p.points; }));
        return new Domain(d3.extent(points, function (p) { return p[0]; }), d3.extent(points, function (p) { return p[1]; }));
    };
    MapUI.prototype.setData = function (data) {
        var _this = this;
        this.allData = data;
        this.activeData = data;
        this.mapD3.select('#properties').selectAll('polygon').
            data(data, function (d) { return d.id; }).enter().append('polygon').
            on('mouseover', function (d) { return _this.tooltip.html(_this.tooltipTemplate(d)); });
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
        this.mapD3.selectAll('polygon').style('fill', this.getColor);
        this.drawHistogram();
    };
    MapUI.prototype.toggleFilter = function (filter, enable) {
        if (enable) {
            this.activeData = this.activeData.concat(this.allData.filter(filter));
        }
        else {
            this.activeData = this.activeData.filter(function (d) { return !filter(d); });
        }
        this.mapD3.selectAll('polygon').filter(filter).style('display', enable ? 'none' : null);
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
    filterAddressTimeout = setTimeout(filterAddress, 500);
}
function filterAddress() {
    var searchVal = searchInput.val().toUpperCase();
    if (!searchVal)
        return;
    var hasMatches = mapUi.highlight(function (d) { return d.address.indexOf(searchVal) > -1; }) > 0;
    search.
        addClass(hasMatches ? 'has-success' : 'has-error').
        removeClass(hasMatches ? 'has-error' : 'has-success');
    searchIcon.
        addClass(hasMatches ? 'glyphicon-ok' : 'glyphicon-remove').
        removeClass(hasMatches ? 'glyphicon-remove' : 'glyphicon-ok');
}
// domain estimated at 980736 units wide, translates to roughly 5300 meters wide
var METERS_PER_UNIT = 5300 / 980736;
var METERS_PER_UNIT_AREA = Math.pow(METERS_PER_UNIT, 2);
function cleanLandPropertyRow(r) {
    var d = {
        id: r.oid_evbc_b64,
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
}
var mapUi;
var search;
var searchInput;
var searchIcon;
function setColorParameters(params) {
    scaleControls.removeClass('disabled');
    if ('viridis' in params) {
        var scale = params.viridis ? 'viridis' : 'simple';
        var otherScale = params.viridis ? 'simple' : 'viridis';
        $('#' + scale).addClass('active');
        $('#' + otherScale).removeClass('active');
    }
    if ('scale' in params) {
        var otherScale = params.scale == 'linear' ? 'log' : 'linear';
        $('#' + params.scale).addClass('active');
        $('#' + otherScale).removeClass('active');
    }
    mapUi.recolor(params);
}
$(function () {
    scaleControls = $('#scale label, #color label');
    search = $('#search').on('input', updateAddressFilter);
    searchInput = search.find('input');
    searchIcon = search.find('.glyphicon');
    mapUi = new MapUI($('#map svg')[0], $('#histogram svg')[0], document.getElementById('tooltip'), Handlebars.compile($('#tooltip-template').html()));
    // configure UI events
    ['residential', 'commercial', 'industrial', 'agricultural', 'public'].forEach(function (zone) {
        var btn = $('#' + zone);
        btn.on('click', function () { return mapUi.toggleFilter(function (d) { return d.zone && d.zone.type == zone; }, btn.hasClass('active')); });
    });
    var clickActions = {
        "zoomout": function () { return mapUi.resize(); },
        "linear": function () { return setColorParameters({ scale: 'linear' }); },
        "log": function () { return setColorParameters({ scale: 'log' }); },
        "simple": function () { return setColorParameters({ viridis: false }); },
        "viridis": function () { return setColorParameters({ viridis: true }); },
        "land-value": function () { return setColorParameters({ accessor: getLandValueDensity, colorRange: color.badGood, scale: 'linear' }); },
        "age": function () { return setColorParameters({ accessor: getAge, colorRange: color.goodBad, scale: 'log' }); },
        "total-value": function () { return setColorParameters({ accessor: function (d) { return d.total_assessed_value; }, colorRange: color.goodBad, scale: 'log' }); },
        "change-building": function () { return setColorParameters({
            accessor: function (d) { return getChangeRatio(d.total_assessed_building, d.previous_building); },
            colorRange: color.posNeg,
            scale: 'log'
        }); },
        "change-land": function () { return setColorParameters({
            accessor: function (d) { return getChangeRatio(d.total_assessed_land, d.previous_land); },
            colorRange: color.posNeg,
            scale: 'linear'
        }); },
        "zone-type": function () { return doZoneColor(); },
        "bedroom": function () { return setColorParameters({ accessor: function (d) { return d.bedrooms; }, colorRange: color.goodBad, scale: 'log' }); },
        "bathroom": function () { return setColorParameters({ accessor: function (d) { return d.bathrooms; }, colorRange: color.goodBad, scale: 'log' }); }
    };
    for (var key in clickActions) {
        $('#' + key).on('click', clickActions[key]);
    }
    d3.csv('terrace.csv').row(cleanLandPropertyRow).get(function (error, data) {
        mapUi.setData(data);
        $('#land-value').click();
    });
});
