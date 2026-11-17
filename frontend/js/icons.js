/**
 * EcoTrack SVG icon helper.
 * Usage: icon("dashboard")  =>  <svg class="icon"><use href="/images/icons.svg#icon-dashboard"/></svg>
 */
function icon(name, cls) {
  return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false">' +
    '<use href="/images/icons.svg#icon-' + name + '"></use></svg>';
}
