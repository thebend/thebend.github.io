/// <reference path="types.ts" />
var currentYear = new Date().getFullYear();
var LandProperty = (function () {
    function LandProperty() {
    }
    LandProperty.getGlyph = function (before, after) {
        return 'glyphicon-arrow-' + (after - before > 0 ? 'up' : 'down');
    };
    LandProperty.getAge = function (d) {
        return d.year_built ? currentYear - d.year_built : null;
    };
    LandProperty.getLandValueDensity = function (d) {
        if (!d.total_assessed_land)
            return null;
        // 60.3-60.5m areas are just placeholders with no accurate size
        if (d.area >= 60 && d.area <= 61)
            return null;
        return d.total_assessed_land / d.area;
    };
    LandProperty.getChangeRatio = function (current, previous) {
        if (current && previous) {
            var ratio = current / previous;
            // use clamping here?
            // deal with outliers better than this!
            if (ratio > 0.5 && ratio < 2.5)
                return ratio;
        }
        return 1;
    };
    LandProperty.getZoneColor = function (d) {
        return d.zone ? d.zone.color : color.gray;
    };
    return LandProperty;
}());
