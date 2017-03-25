/// <reference path="types.ts" />
var MIN_ZOOM_SIZE = 5;
var DEFAULT_COLOR = '#444';
var HIGHLIGHT_COLOR = 'white';
var BAR_THICKNESS = 6;
var legendPrecision = d3.format('.2s');
var MapAnalyzer = (function () {
    function MapAnalyzer(mapElement, histogramElement, histogramOrientation, tooltipElement, tooltipTemplate) {
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
            domain = domain || MapAnalyzer.getDomain(_this.activeData);
            var range = _this.mapSvg.getBoundingClientRect();
            domain.scaleToRatio(range.height / range.width);
            _this.xScale.domain(domain.x).range([0, range.width]);
            _this.yScale.domain(domain.y).range([range.height, 0]);
            _this.mapD3.selectAll('polygon').attr('points', _this.getPointString);
        };
        this.getColor = function (d) {
            var val = _this.focusedDataAccessor(d);
            return val == null ? DEFAULT_COLOR : _this.colorScale(_this.focusedDataScale(val));
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
        this.recolorManual = function (accessor) {
            _this.mapD3.selectAll('polygon').style('fill', accessor);
        };
        this.highlight = function (filter) {
            return _this.mapD3.selectAll('polygon').
                style('stroke', null).
                filter(filter).
                style('stroke', HIGHLIGHT_COLOR).
                size();
        };
        this.mapSvg = mapElement;
        this.mapD3 = d3.select(mapElement).
            // on('mousedown', () => {
            //     this.pos0 = d3.mouse(this.mapSvg);
            //     this.zoomRect = this.mapD3.append('rect').
            //         attr('id', 'zoom-rect');
            // }).
            // on('mousemove', () => {
            //     if (!this.pos0) return;
            //     var pos1 = d3.mouse(this.mapSvg);
            //     var x = d3.extent([this.pos0[0], pos1[0]]);
            //     var y = d3.extent([this.pos0[1], pos1[1]]);
            //     this.zoomRect.
            //         attr('x', x[0]).attr('width', x[1] - x[0]).
            //         attr('y', y[0]).attr('height', y[1] - y[0]);
            // }).
            // on('mouseup', this.zoom).
            call(d3.zoom().on('zoom', function () {
            _this.mapD3.attr("transform", d3.event.transform);
        })).
            append('g').attr('id', 'properties');
        this.histogramD3 = d3.select(histogramElement);
        this.histogramOrientation = histogramOrientation;
        this.tooltip = $(tooltipElement);
        this.tooltipTemplate = tooltipTemplate;
        this.setViridisColor(false);
    }
    MapAnalyzer.getDomain = function (data) {
        var points = d3.merge(data.map(function (p) { return p.points; }));
        return new Domain(d3.extent(points, function (p) { return p[0]; }), d3.extent(points, function (p) { return p[1]; }));
    };
    MapAnalyzer.prototype.setData = function (data) {
        var _this = this;
        this.allData = data;
        this.activeData = data;
        this.mapD3.selectAll('polygon').
            data(data, function (d) { return d.id; }).enter().append('polygon').
            on('mouseover', function (d) { return _this.tooltip.html(_this.tooltipTemplate(d)); });
        this.resize();
    };
    MapAnalyzer.prototype.drawHistogram = function () {
        var histogram = d3.histogram().thresholds(this.focusedDataScale.ticks(20));
        var bins = histogram(this.focusedData);
        var maxAmplitude = d3.max(bins, function (i) { return i.length; });
        var boundary = this.histogramD3.node().getBoundingClientRect();
        var distributionSpace;
        var amplitudeSpace;
        if (this.histogramOrientation == 'vertical') {
            distributionSpace = boundary.height;
            amplitudeSpace = boundary.width;
        }
        else {
            distributionSpace = boundary.width;
            amplitudeSpace = boundary.height;
        }
        var barAreaThickness = distributionSpace / bins.length;
        var textOffset = barAreaThickness / 2 - (2 * BAR_THICKNESS);
        var offset = (barAreaThickness - BAR_THICKNESS) / 2;
        var amplitude = function (d) { return amplitudeSpace / maxAmplitude * d.length; };
        this.histogramD3.selectAll('g').remove();
        var barGroups = this.histogramD3.selectAll('g').data(bins).enter().append('g');
        if (this.histogramOrientation == 'vertical') {
            barGroups.
                attr('transform', function (d, i) { return 'translate(0,' + (barAreaThickness * i) + ')'; }).
                append('rect').
                attr('width', amplitude).
                attr('height', BAR_THICKNESS).
                attr('rx', BAR_THICKNESS / 2).
                attr('y', offset);
            barGroups.append('text').
                attr('y', textOffset);
        }
        else {
            barGroups.
                attr('transform', function (d, i) { return 'translate(' + (barAreaThickness * i) + ',0)'; }).
                append('rect').
                attr('width', BAR_THICKNESS).
                attr('height', amplitude).
                attr('x', offset).
                attr('y', function (d) { return amplitudeSpace - amplitude(d); }).
                attr('ry', BAR_THICKNESS / 2);
            barGroups.append('text').
                attr('transform', 'translate(' + textOffset + ',' + amplitudeSpace + ')rotate(270)');
        }
        barGroups.selectAll('text').
            text(function (d) { return legendPrecision(d.x0) + '-' + legendPrecision(d.x1); });
    };
    MapAnalyzer.prototype.redraw = function () {
        this.mapD3.selectAll('polygon').style('fill', this.getColor);
        this.drawHistogram();
    };
    MapAnalyzer.prototype.toggleFilter = function (filter, enable) {
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
    MapAnalyzer.prototype.updateFocusedData = function (accessor) {
        if (accessor)
            this.focusedDataAccessor = accessor;
        this.focusedData = this.activeData.map(this.focusedDataAccessor);
        var domain = d3.extent(this.focusedData);
        var multiRange = this.focusedDataScale.range().length == 3;
        this.focusedDataScale.domain(multiRange ? [domain[0], 1, domain[1]] : domain);
    };
    return MapAnalyzer;
}());
